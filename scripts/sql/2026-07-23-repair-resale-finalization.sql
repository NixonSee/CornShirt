begin;

-- Older Marketplace schemas can reject the final resale transition even
-- though Stripe payment and the NFT transfer have already succeeded.
do $$
declare
  v_constraint record;
  v_status_attnum smallint;
begin
  select attnum
  into v_status_attnum
  from pg_attribute
  where attrelid = 'public.resale_listings'::regclass
    and attname = 'status'
    and not attisdropped;

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.resale_listings'::regclass
      and contype = 'c'
      and array_length(conkey, 1) = 1
      and v_status_attnum = any(conkey)
  loop
    execute format(
      'alter table public.resale_listings drop constraint %I',
      v_constraint.conname
    );
  end loop;
end
$$;

alter table public.resale_listings
  add constraint resale_listings_status_check
  check (status in ('active', 'cancelled', 'purchased'));

do $$
declare
  v_constraint record;
  v_type_attnum smallint;
begin
  select attnum
  into v_type_attnum
  from pg_attribute
  where attrelid = 'public.transactions'::regclass
    and attname = 'transaction_type'
    and not attisdropped;

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and array_length(conkey, 1) = 1
      and v_type_attnum = any(conkey)
  loop
    execute format(
      'alter table public.transactions drop constraint %I',
      v_constraint.conname
    );
  end loop;
end
$$;

alter table public.transactions
  add constraint transactions_transaction_type_check
  check (
    transaction_type in ('purchase', 'refund', 'transfer', 'resale', 'topup')
  );

create or replace function public.finalize_resale_purchase(
  p_operation_id uuid,
  p_asset_transaction_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.ticket_operations%rowtype;
begin
  select *
  into v_operation
  from public.ticket_operations
  where operation_id = p_operation_id
    and operation_kind = 'resale_purchase'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'operation_not_found';
  end if;

  if v_operation.state = 'completed' then
    return v_operation.ticket_id;
  end if;

  if v_operation.state not in (
    'payment_confirmed',
    'asset_submitted',
    'asset_confirmed'
  ) then
    raise exception using errcode = 'P0001', message = 'operation_not_ready';
  end if;

  if p_asset_transaction_hash is null or p_asset_transaction_hash = '' then
    raise exception using
      errcode = 'P0001',
      message = 'asset_transaction_missing';
  end if;

  update public.tickets
  set
    user_id = v_operation.actor_user_id,
    wallet_address = v_operation.recipient_wallet_address,
    stripe_payment_intent = v_operation.stripe_payment_intent_id,
    status = 'valid',
    owner_updated_at = now()
  where ticket_id = v_operation.ticket_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'ticket_not_found';
  end if;

  update public.resale_listings
  set
    status = 'purchased',
    buyer_user_id = v_operation.actor_user_id,
    purchased_at = now(),
    reserved_operation_id = null,
    reserved_by = null,
    reserved_until = null,
    updated_at = now()
  where listing_id = v_operation.listing_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  update public.ticket_operations
  set
    state = 'completed',
    asset_transaction_hash = p_asset_transaction_hash,
    safe_error_category = null,
    updated_at = now(),
    completed_at = now()
  where operation_id = p_operation_id;

  insert into public.seller_proceeds (
    operation_id,
    listing_id,
    ticket_id,
    seller_user_id,
    amount_sen,
    currency
  )
  values (
    v_operation.operation_id,
    v_operation.listing_id,
    v_operation.ticket_id,
    v_operation.seller_user_id,
    v_operation.amount_sen,
    v_operation.currency
  )
  on conflict (operation_id) do nothing;

  insert into public.transactions (
    transaction_id,
    ticket_id,
    buyer_id,
    seller_id,
    transaction_hash,
    transaction_type,
    amount,
    amount_sen,
    currency,
    record_source,
    operation_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    blockchain_transaction_hash,
    status
  )
  values (
    gen_random_uuid(),
    v_operation.ticket_id,
    v_operation.actor_user_id,
    v_operation.seller_user_id,
    v_operation.stripe_checkout_session_id,
    'resale',
    v_operation.amount_sen::numeric / 100,
    v_operation.amount_sen,
    v_operation.currency,
    'stripe_nft',
    v_operation.operation_id,
    v_operation.stripe_checkout_session_id,
    v_operation.stripe_payment_intent_id,
    p_asset_transaction_hash,
    'completed'
  )
  on conflict (operation_id, transaction_type)
    where operation_id is not null
    do nothing;

  return v_operation.ticket_id;
end
$$;

revoke all on function public.finalize_resale_purchase(uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_resale_purchase(uuid, text)
  to service_role;

commit;
