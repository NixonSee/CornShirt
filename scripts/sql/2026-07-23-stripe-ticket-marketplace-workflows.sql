begin;

create extension if not exists pgcrypto;

-- Prices shown to customers remain MYR. Stripe receives the exact integer
-- number of sen stored in these columns.
alter table public.ticket_types
  add column if not exists price_sen bigint,
  add column if not exists currency text not null default 'MYR';

update public.ticket_types
set price_sen = round(price * 100)::bigint
where price_sen is null
  and price is not null;

do $$
begin
  if exists (
    select 1
    from public.ticket_types
    where price_sen is null or price_sen <= 0
  ) then
    raise exception
      'Every ticket type needs a positive MYR price before enabling Stripe checkout';
  end if;
end
$$;

alter table public.ticket_types alter column price_sen set not null;

alter table public.resale_listings
  add column if not exists price_sen bigint,
  add column if not exists currency text not null default 'MYR',
  add column if not exists seller_user_id uuid references public.profiles(user_id),
  add column if not exists buyer_user_id uuid references public.profiles(user_id),
  add column if not exists reserved_operation_id uuid,
  add column if not exists reserved_by uuid references public.profiles(user_id),
  add column if not exists reserved_until timestamptz;

alter table public.resale_listings
  alter column price type numeric(12, 2)
  using price::numeric;

update public.resale_listings
set price_sen = price * 100
where price_sen is null;

update public.resale_listings listing
set seller_user_id = ticket.user_id
from public.tickets ticket
where listing.ticket_id = ticket.ticket_id
  and listing.seller_user_id is null;

alter table public.resale_listings alter column price_sen set not null;
alter table public.resale_listings alter column seller_user_id set not null;

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

alter table public.tickets
  add column if not exists record_source text not null default 'legacy',
  add column if not exists acquisition_operation_id uuid,
  add column if not exists owner_updated_at timestamptz;

update public.tickets
set record_source = 'legacy'
where token_id is null;

alter table public.transactions
  add column if not exists amount_sen bigint,
  add column if not exists currency text not null default 'MYR',
  add column if not exists record_source text not null default 'legacy',
  add column if not exists operation_id uuid,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists blockchain_transaction_hash text,
  add column if not exists status text not null default 'completed';

update public.transactions
set amount_sen = round(abs(amount) * 100)::bigint
where amount_sen is null
  and amount is not null;

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

create table if not exists public.ticket_operations (
  operation_id uuid primary key default gen_random_uuid(),
  operation_kind text not null
    check (operation_kind in ('primary_purchase', 'resale_purchase', 'direct_transfer', 'refund')),
  state text not null default 'pending'
    check (state in (
      'pending',
      'checkout_created',
      'payment_confirmed',
      'asset_submitted',
      'asset_confirmed',
      'completed',
      'delivery_failed',
      'refund_pending',
      'refunded',
      'expired',
      'cancelled',
      'failed'
    )),
  idempotency_key text not null unique,
  actor_user_id uuid not null references public.profiles(user_id),
  seller_user_id uuid references public.profiles(user_id),
  recipient_user_id uuid references public.profiles(user_id),
  event_id uuid references public.events(event_id),
  ticket_type_id uuid references public.ticket_types(ticket_type_id),
  ticket_id uuid references public.tickets(ticket_id),
  listing_id uuid references public.resale_listings(listing_id),
  related_operation_id uuid,
  amount_sen bigint,
  currency text not null default 'MYR',
  wallet_address text,
  recipient_wallet_address text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_refund_id text,
  token_id bigint,
  asset_transaction_hash text,
  reserved_until timestamptz,
  retry_count integer not null default 0,
  safe_error_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.ticket_operations
  add column if not exists related_operation_id uuid;

alter table public.ticket_operations
  drop constraint if exists ticket_operations_related_operation_id_fkey;

alter table public.ticket_operations
  add constraint ticket_operations_related_operation_id_fkey
  foreign key (related_operation_id)
  references public.ticket_operations(operation_id);

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  attempts integer not null default 1,
  safe_error_category text,
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.seller_proceeds (
  proceeds_id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique references public.ticket_operations(operation_id),
  listing_id uuid not null references public.resale_listings(listing_id),
  ticket_id uuid not null references public.tickets(ticket_id),
  seller_user_id uuid not null references public.profiles(user_id),
  amount_sen bigint not null check (amount_sen > 0),
  currency text not null default 'MYR',
  status text not null default 'credited'
    check (status in ('credited', 'reversed')),
  created_at timestamptz not null default now(),
  reversed_at timestamptz
);

alter table public.ticket_operations enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.seller_proceeds enable row level security;

revoke all on table public.ticket_operations from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;
revoke all on table public.seller_proceeds from anon, authenticated;

grant all on table public.ticket_operations to service_role;
grant all on table public.stripe_webhook_events to service_role;
grant all on table public.seller_proceeds to service_role;

create unique index if not exists resale_listings_one_active_ticket_idx
  on public.resale_listings(ticket_id)
  where status = 'active';

create index if not exists resale_listings_active_idx
  on public.resale_listings(status, created_at desc);

create index if not exists resale_listings_seller_idx
  on public.resale_listings(seller_user_id, status);

create index if not exists ticket_operations_actor_idx
  on public.ticket_operations(actor_user_id, created_at desc);

create index if not exists ticket_operations_state_idx
  on public.ticket_operations(state, updated_at);

create unique index if not exists ticket_operations_one_active_ticket_idx
  on public.ticket_operations(ticket_id)
  where ticket_id is not null
    and state in (
      'pending',
      'checkout_created',
      'payment_confirmed',
      'asset_submitted',
      'asset_confirmed',
      'delivery_failed',
      'refund_pending'
    );

create unique index if not exists transactions_operation_type_idx
  on public.transactions(operation_id, transaction_type)
  where operation_id is not null;

create unique index if not exists tickets_stripe_acquisition_idx
  on public.tickets(transaction_hash)
  where record_source = 'stripe_nft' and transaction_hash is not null;

alter table public.resale_listings
  drop constraint if exists resale_listings_reserved_operation_id_fkey;

alter table public.resale_listings
  add constraint resale_listings_reserved_operation_id_fkey
  foreign key (reserved_operation_id)
  references public.ticket_operations(operation_id);

alter table public.tickets
  drop constraint if exists tickets_acquisition_operation_id_fkey;

alter table public.tickets
  add constraint tickets_acquisition_operation_id_fkey
  foreign key (acquisition_operation_id)
  references public.ticket_operations(operation_id);

alter table public.transactions
  drop constraint if exists transactions_operation_id_fkey;

alter table public.transactions
  add constraint transactions_operation_id_fkey
  foreign key (operation_id)
  references public.ticket_operations(operation_id);

create or replace function public.reserve_primary_ticket(
  p_buyer_id uuid,
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_idempotency_key text
)
returns table (
  operation_id uuid,
  amount_sen bigint,
  currency text,
  event_name text,
  ticket_type_name text,
  wallet_address text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_existing public.ticket_operations%rowtype;
  v_owned integer;
  v_pending integer;
  v_expired integer;
  v_operation_id uuid;
begin
  select *
  into v_profile
  from public.profiles
  where user_id = p_buyer_id
    and role in ('customer', 'user')
  for update;

  if not found or v_profile.wallet_status <> 'ready' or v_profile.wallet_address is null then
    raise exception using errcode = 'P0001', message = 'wallet_unavailable';
  end if;

  select *
  into v_event
  from public.events
  where event_id = p_event_id
  for share;

  if not found or lower(coalesce(v_event.status, '')) <> 'active' then
    raise exception using errcode = 'P0001', message = 'event_unavailable';
  end if;

  select *
  into v_type
  from public.ticket_types
  where ticket_type_id = p_ticket_type_id
    and event_id = p_event_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ticket_type_unavailable';
  end if;

  select *
  into v_existing
  from public.ticket_operations op
  where op.idempotency_key = p_idempotency_key
    and op.actor_user_id = p_buyer_id
    and op.operation_kind = 'primary_purchase';

  if found then
    return query
    select
      v_existing.operation_id,
      v_existing.amount_sen,
      v_existing.currency,
      v_event.event_name,
      v_type.type_name,
      v_profile.wallet_address;
    return;
  end if;

  with expired as (
    update public.ticket_operations op
    set state = 'expired', updated_at = now()
    where op.operation_kind = 'primary_purchase'
      and op.ticket_type_id = p_ticket_type_id
      and op.state in ('pending', 'checkout_created')
      and op.reserved_until < now()
    returning 1
  )
  select count(*) into v_expired from expired;

  if v_expired > 0 then
    update public.ticket_types
    set remaining_supply = remaining_supply + v_expired
    where ticket_type_id = p_ticket_type_id;
    v_type.remaining_supply := v_type.remaining_supply + v_expired;
  end if;

  if coalesce(v_type.remaining_supply, 0) <= 0 then
    raise exception using errcode = 'P0001', message = 'sold_out';
  end if;

  select count(*)
  into v_owned
  from public.tickets t
  where t.user_id = p_buyer_id
    and t.ticket_type_id = p_ticket_type_id
    and lower(coalesce(t.status, '')) not in ('cancelled', 'canceled', 'refunded', 'transferred');

  select count(*)
  into v_pending
  from public.ticket_operations op
  where op.actor_user_id = p_buyer_id
    and op.ticket_type_id = p_ticket_type_id
    and op.operation_kind = 'primary_purchase'
    and op.state in ('pending', 'checkout_created', 'payment_confirmed', 'asset_submitted', 'asset_confirmed');

  if v_owned + v_pending >= coalesce(v_type.purchase_limit, 1) then
    raise exception using errcode = 'P0001', message = 'purchase_limit';
  end if;

  update public.ticket_types
  set remaining_supply = remaining_supply - 1
  where ticket_type_id = p_ticket_type_id;

  insert into public.ticket_operations as op (
    operation_kind,
    state,
    idempotency_key,
    actor_user_id,
    event_id,
    ticket_type_id,
    amount_sen,
    currency,
    wallet_address,
    reserved_until
  )
  values (
    'primary_purchase',
    'pending',
    p_idempotency_key,
    p_buyer_id,
    p_event_id,
    p_ticket_type_id,
    v_type.price_sen,
    v_type.currency,
    v_profile.wallet_address,
    now() + interval '35 minutes'
  )
  returning op.operation_id into v_operation_id;

  return query
  select
    v_operation_id,
    v_type.price_sen,
    v_type.currency,
    v_event.event_name,
    v_type.type_name,
    v_profile.wallet_address;
end
$$;

create or replace function public.claim_stripe_webhook(
  p_event_id text,
  p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
begin
  insert into public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    status
  )
  values (p_event_id, p_event_type, 'processing')
  on conflict (stripe_event_id) do update
  set
    status = 'processing',
    attempts = public.stripe_webhook_events.attempts + 1,
    last_received_at = now(),
    safe_error_category = null
  where public.stripe_webhook_events.status = 'failed'
     or (
       public.stripe_webhook_events.status = 'processing'
       and public.stripe_webhook_events.last_received_at < now() - interval '5 minutes'
     )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end
$$;

create or replace function public.finish_stripe_webhook(
  p_event_id text,
  p_succeeded boolean,
  p_error_category text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stripe_webhook_events
  set
    status = case when p_succeeded then 'completed' else 'failed' end,
    safe_error_category = case when p_succeeded then null else p_error_category end,
    completed_at = case when p_succeeded then now() else null end,
    last_received_at = now()
  where stripe_event_id = p_event_id;
$$;

create or replace function public.finalize_primary_purchase(
  p_operation_id uuid,
  p_token_id bigint,
  p_asset_transaction_hash text,
  p_qr_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.ticket_operations%rowtype;
  v_ticket_id uuid;
begin
  select *
  into v_operation
  from public.ticket_operations
  where operation_id = p_operation_id
    and operation_kind = 'primary_purchase'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'operation_not_found';
  end if;

  if v_operation.state = 'completed' and v_operation.ticket_id is not null then
    return v_operation.ticket_id;
  end if;

  if v_operation.state not in ('payment_confirmed', 'asset_submitted', 'asset_confirmed') then
    raise exception using errcode = 'P0001', message = 'operation_not_ready';
  end if;

  v_ticket_id := coalesce(v_operation.ticket_id, gen_random_uuid());

  insert into public.tickets (
    ticket_id,
    event_id,
    ticket_type_id,
    user_id,
    wallet_address,
    qr_code,
    status,
    transaction_hash,
    token_id,
    mint_transaction_hash,
    stripe_payment_intent,
    record_source,
    acquisition_operation_id,
    owner_updated_at
  )
  values (
    v_ticket_id,
    v_operation.event_id,
    v_operation.ticket_type_id,
    v_operation.actor_user_id,
    v_operation.wallet_address,
    p_qr_code,
    'valid',
    v_operation.stripe_checkout_session_id,
    p_token_id,
    p_asset_transaction_hash,
    v_operation.stripe_payment_intent_id,
    'stripe_nft',
    v_operation.operation_id,
    now()
  )
  on conflict (ticket_id) do update
  set
    status = 'valid',
    token_id = excluded.token_id,
    mint_transaction_hash = excluded.mint_transaction_hash,
    qr_code = excluded.qr_code,
    owner_updated_at = now();

  update public.ticket_operations
  set
    state = 'completed',
    ticket_id = v_ticket_id,
    token_id = p_token_id,
    asset_transaction_hash = p_asset_transaction_hash,
    updated_at = now(),
    completed_at = now()
  where operation_id = p_operation_id;

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
    v_ticket_id,
    v_operation.actor_user_id,
    null,
    v_operation.stripe_checkout_session_id,
    'purchase',
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

  return v_ticket_id;
end
$$;

create or replace function public.reserve_resale_purchase(
  p_buyer_id uuid,
  p_listing_id uuid,
  p_idempotency_key text
)
returns table (
  operation_id uuid,
  amount_sen bigint,
  currency text,
  event_name text,
  ticket_type_name text,
  buyer_wallet_address text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer public.profiles%rowtype;
  v_listing public.resale_listings%rowtype;
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_existing public.ticket_operations%rowtype;
  v_operation_id uuid;
begin
  select *
  into v_buyer
  from public.profiles
  where user_id = p_buyer_id
    and role in ('customer', 'user')
  for update;

  if not found or v_buyer.wallet_status <> 'ready' or v_buyer.wallet_address is null then
    raise exception using errcode = 'P0001', message = 'wallet_unavailable';
  end if;

  select *
  into v_existing
  from public.ticket_operations
  where idempotency_key = p_idempotency_key
    and actor_user_id = p_buyer_id
    and operation_kind = 'resale_purchase';

  if found then
    select e.event_name, tt.type_name
    into v_event.event_name, v_type.type_name
    from public.events e
    join public.ticket_types tt on tt.event_id = e.event_id
    where e.event_id = v_existing.event_id
      and tt.ticket_type_id = v_existing.ticket_type_id;

    return query
    select
      v_existing.operation_id,
      v_existing.amount_sen,
      v_existing.currency,
      v_event.event_name,
      v_type.type_name,
      v_buyer.wallet_address;
    return;
  end if;

  select *
  into v_listing
  from public.resale_listings
  where listing_id = p_listing_id
  for update;

  if not found
     or v_listing.status <> 'active'
     or v_listing.price_sen is null
     or v_listing.price_sen <= 0 then
    raise exception using errcode = 'P0001', message = 'listing_unavailable';
  end if;

  if v_listing.reserved_until is not null and v_listing.reserved_until < now() then
    update public.ticket_operations
    set state = 'expired', updated_at = now()
    where operation_id = v_listing.reserved_operation_id
      and state in ('pending', 'checkout_created');

    update public.resale_listings
    set reserved_operation_id = null, reserved_by = null, reserved_until = null
    where listing_id = p_listing_id;
    v_listing.reserved_operation_id := null;
    v_listing.reserved_by := null;
    v_listing.reserved_until := null;
  end if;

  if v_listing.reserved_operation_id is not null then
    raise exception using errcode = 'P0001', message = 'listing_reserved';
  end if;

  if v_listing.seller_user_id = p_buyer_id then
    raise exception using errcode = 'P0001', message = 'own_listing';
  end if;

  select *
  into v_ticket
  from public.tickets
  where ticket_id = v_listing.ticket_id
  for update;

  if not found
     or v_ticket.token_id is null
     or v_ticket.record_source <> 'stripe_nft'
     or lower(coalesce(v_ticket.status, '')) not in ('active', 'valid') then
    raise exception using errcode = 'P0001', message = 'ticket_unavailable';
  end if;

  select * into v_event
  from public.events
  where event_id = v_ticket.event_id;

  select * into v_type
  from public.ticket_types
  where ticket_type_id = v_ticket.ticket_type_id;

  if lower(coalesce(v_event.status, '')) <> 'active'
     or v_type.transfer_allowed is not true then
    raise exception using errcode = 'P0001', message = 'ticket_ineligible';
  end if;

  insert into public.ticket_operations as op (
    operation_kind,
    state,
    idempotency_key,
    actor_user_id,
    seller_user_id,
    event_id,
    ticket_type_id,
    ticket_id,
    listing_id,
    amount_sen,
    currency,
    wallet_address,
    recipient_wallet_address,
    token_id,
    reserved_until
  )
  values (
    'resale_purchase',
    'pending',
    p_idempotency_key,
    p_buyer_id,
    v_listing.seller_user_id,
    v_ticket.event_id,
    v_ticket.ticket_type_id,
    v_ticket.ticket_id,
    v_listing.listing_id,
    v_listing.price_sen,
    v_listing.currency,
    v_listing.seller_wallet_address,
    v_buyer.wallet_address,
    v_ticket.token_id,
    now() + interval '35 minutes'
  )
  returning op.operation_id into v_operation_id;

  update public.resale_listings
  set
    reserved_operation_id = v_operation_id,
    reserved_by = p_buyer_id,
    reserved_until = now() + interval '35 minutes',
    updated_at = now()
  where listing_id = p_listing_id;

  return query
  select
    v_operation_id,
    v_listing.price_sen,
    v_listing.currency,
    v_event.event_name,
    v_type.type_name,
    v_buyer.wallet_address;
end
$$;

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

  if v_operation.state not in ('payment_confirmed', 'asset_submitted', 'asset_confirmed') then
    raise exception using errcode = 'P0001', message = 'operation_not_ready';
  end if;

  update public.tickets
  set
    user_id = v_operation.actor_user_id,
    wallet_address = v_operation.recipient_wallet_address,
    stripe_payment_intent = v_operation.stripe_payment_intent_id,
    status = 'valid',
    owner_updated_at = now()
  where ticket_id = v_operation.ticket_id;

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

  update public.ticket_operations
  set
    state = 'completed',
    asset_transaction_hash = p_asset_transaction_hash,
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

create or replace function public.finalize_direct_transfer(
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
  v_current_wallet text;
begin
  select *
  into v_operation
  from public.ticket_operations
  where operation_id = p_operation_id
    and operation_kind = 'direct_transfer'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'operation_not_found';
  end if;

  if v_operation.state = 'completed' then
    return v_operation.ticket_id;
  end if;

  select wallet_address
  into v_current_wallet
  from public.tickets
  where ticket_id = v_operation.ticket_id
  for update;

  if lower(coalesce(v_current_wallet, '')) <>
     lower(coalesce(v_operation.wallet_address, '')) then
    raise exception using errcode = 'P0001', message = 'owner_changed';
  end if;

  update public.tickets
  set
    user_id = v_operation.recipient_user_id,
    wallet_address = v_operation.recipient_wallet_address,
    status = 'valid',
    owner_updated_at = now()
  where ticket_id = v_operation.ticket_id;

  update public.ticket_operations
  set
    state = 'completed',
    asset_transaction_hash = p_asset_transaction_hash,
    updated_at = now(),
    completed_at = now()
  where operation_id = p_operation_id;

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
    blockchain_transaction_hash,
    status
  )
  values (
    gen_random_uuid(),
    v_operation.ticket_id,
    v_operation.recipient_user_id,
    v_operation.actor_user_id,
    p_asset_transaction_hash,
    'transfer',
    0,
    0,
    'MYR',
    'stripe_nft',
    v_operation.operation_id,
    p_asset_transaction_hash,
    'completed'
  )
  on conflict (operation_id, transaction_type)
    where operation_id is not null
    do nothing;

  return v_operation.ticket_id;
end
$$;

create or replace function public.mark_resale_refunded(
  p_operation_id uuid,
  p_refund_id text,
  p_error_category text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
begin
  update public.ticket_operations
  set
    state = 'refunded',
    stripe_refund_id = p_refund_id,
    safe_error_category = p_error_category,
    updated_at = now(),
    completed_at = now()
  where operation_id = p_operation_id
    and operation_kind = 'resale_purchase'
    and state <> 'completed'
  returning listing_id into v_listing_id;

  if v_listing_id is not null then
    update public.resale_listings
    set
      reserved_operation_id = null,
      reserved_by = null,
      reserved_until = null,
      updated_at = now()
    where listing_id = v_listing_id
      and reserved_operation_id = p_operation_id;
  end if;
end
$$;

create or replace function public.mark_primary_refunded(
  p_operation_id uuid,
  p_refund_id text,
  p_error_category text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_type_id uuid;
begin
  update public.ticket_operations
  set
    state = 'refunded',
    stripe_refund_id = p_refund_id,
    safe_error_category = p_error_category,
    updated_at = now(),
    completed_at = now()
  where operation_id = p_operation_id
    and operation_kind = 'primary_purchase'
    and state not in ('completed', 'refunded', 'expired')
  returning ticket_type_id into v_ticket_type_id;

  if v_ticket_type_id is not null then
    update public.ticket_types
    set remaining_supply = remaining_supply + 1
    where ticket_type_id = v_ticket_type_id;
  end if;
end
$$;

create or replace function public.finalize_ticket_refund(
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
    and operation_kind = 'refund'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'operation_not_found';
  end if;

  if v_operation.state = 'completed' then
    return v_operation.ticket_id;
  end if;

  if v_operation.state not in ('refund_pending', 'asset_submitted', 'asset_confirmed') then
    raise exception using errcode = 'P0001', message = 'operation_not_ready';
  end if;

  update public.tickets
  set
    status = 'refunded',
    refund_eligible = false,
    refunded_at = now(),
    refund_beneficiary = v_operation.recipient_user_id::text,
    burn_transaction_hash = p_asset_transaction_hash
  where ticket_id = v_operation.ticket_id;

  update public.ticket_operations
  set
    state = 'completed',
    asset_transaction_hash = p_asset_transaction_hash,
    updated_at = now(),
    completed_at = now()
  where operation_id = p_operation_id;

  update public.seller_proceeds
  set status = 'reversed', reversed_at = now()
  where operation_id = v_operation.related_operation_id
    and status = 'credited';

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
    stripe_payment_intent_id,
    blockchain_transaction_hash,
    status
  )
  values (
    gen_random_uuid(),
    v_operation.ticket_id,
    v_operation.recipient_user_id,
    null,
    v_operation.stripe_refund_id,
    'refund',
    -(v_operation.amount_sen::numeric / 100),
    v_operation.amount_sen,
    v_operation.currency,
    'stripe_nft',
    v_operation.operation_id,
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

revoke all on function public.reserve_primary_ticket(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.claim_stripe_webhook(text, text)
  from public, anon, authenticated;
revoke all on function public.finish_stripe_webhook(text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.finalize_primary_purchase(uuid, bigint, text, text)
  from public, anon, authenticated;
revoke all on function public.reserve_resale_purchase(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.finalize_resale_purchase(uuid, text)
  from public, anon, authenticated;
revoke all on function public.finalize_direct_transfer(uuid, text)
  from public, anon, authenticated;
revoke all on function public.mark_resale_refunded(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_primary_refunded(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.finalize_ticket_refund(uuid, text)
  from public, anon, authenticated;

grant execute on function public.reserve_primary_ticket(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.claim_stripe_webhook(text, text)
  to service_role;
grant execute on function public.finish_stripe_webhook(text, boolean, text)
  to service_role;
grant execute on function public.finalize_primary_purchase(uuid, bigint, text, text)
  to service_role;
grant execute on function public.reserve_resale_purchase(uuid, uuid, text)
  to service_role;
grant execute on function public.finalize_resale_purchase(uuid, text)
  to service_role;
grant execute on function public.finalize_direct_transfer(uuid, text)
  to service_role;
grant execute on function public.mark_resale_refunded(uuid, text, text)
  to service_role;
grant execute on function public.mark_primary_refunded(uuid, text, text)
  to service_role;
grant execute on function public.finalize_ticket_refund(uuid, text)
  to service_role;

comment on table public.ticket_operations is
  'Idempotent Stripe and NFT workflow state. Contains public references only.';
comment on table public.stripe_webhook_events is
  'Exactly-once claim state for verified Stripe webhook event IDs.';
comment on table public.seller_proceeds is
  'Simulated MYR resale proceeds. No Stripe Connect payout is created.';
comment on column public.ticket_types.price_sen is
  'Authoritative Stripe price in integer Malaysian sen.';
comment on column public.tickets.record_source is
  'legacy for historical mock records; stripe_nft for receipt-confirmed Ticket NFTs.';

commit;

-- Safe verification queries to run after the transaction commits.
select count(*) as ticket_types_without_price_sen
from public.ticket_types
where price_sen is null or price_sen <= 0;

select record_source, count(*) as tickets
from public.tickets
group by record_source
order by record_source;

select
  to_regclass('public.ticket_operations') as ticket_operations,
  to_regclass('public.stripe_webhook_events') as stripe_webhook_events,
  to_regclass('public.seller_proceeds') as seller_proceeds;
