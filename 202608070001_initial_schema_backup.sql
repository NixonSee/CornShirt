--
-- PostgreSQL database dump
--

\restrict L9vpu5epYhpk4QeDvZpLZsEgAHSaVN2WmdCFv0bkchVihZPuHBffrSL1TgnNx5Y

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA private;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: is_event_organizer(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.is_event_organizer(requested_event_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.events e
    where e.event_id = requested_event_id
      and e.organizer_id = (select auth.uid())
  );
$$;


--
-- Name: is_ticket_event_organizer(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.is_ticket_event_organizer(requested_ticket_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.tickets t
    join public.events e
      on e.event_id = t.event_id
    where t.ticket_id = requested_ticket_id
      and e.organizer_id = (select auth.uid())
  );
$$;


--
-- Name: profile_role_is_unchanged(uuid, text); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.profile_role_is_unchanged(requested_user_id uuid, requested_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = requested_user_id
      and p.role::text = requested_role
  );
$$;


--
-- Name: claim_stripe_webhook(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_stripe_webhook(p_event_id text, p_event_type text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: claim_transactional_email(text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_transactional_email(p_notification_key text, p_notification_type text, p_operation_id uuid, p_recipient_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_claimed boolean := false;
begin
  insert into public.transactional_email_deliveries (
    notification_key,
    notification_type,
    operation_id,
    recipient_email,
    status
  )
  values (
    p_notification_key,
    p_notification_type,
    p_operation_id,
    lower(trim(p_recipient_email)),
    'sending'
  )
  on conflict (notification_key) do update
  set
    status = 'sending',
    attempts = public.transactional_email_deliveries.attempts + 1,
    safe_error_category = null,
    updated_at = now()
  where public.transactional_email_deliveries.status = 'failed'
     or (
       public.transactional_email_deliveries.status = 'sending'
       and public.transactional_email_deliveries.updated_at < now() - interval '5 minutes'
     )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end
$$;


--
-- Name: complete_finished_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_finished_events() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_completed integer := 0;
begin
  -- Close listings before expiring their tickets so no completed event can be sold.
  update public.resale_listings listing
  set
    status = 'expired',
    reserved_operation_id = null,
    reserved_by = null,
    reserved_until = null,
    updated_at = now()
  where listing.status in ('contract_pending', 'active')
    and exists (
      select 1
      from public.tickets ticket
      join public.events event on event.event_id = ticket.event_id
      where ticket.ticket_id = listing.ticket_id
        and lower(coalesce(event.status, '')) = 'active'
        and event.event_date + interval '3 hours' <= now()
    );

  update public.tickets ticket
  set status = 'expired'
  where lower(coalesce(ticket.status, '')) in ('active', 'valid')
    and exists (
      select 1
      from public.events event
      where event.event_id = ticket.event_id
        and lower(coalesce(event.status, '')) = 'active'
        and event.event_date + interval '3 hours' <= now()
    );

  update public.events
  set status = 'completed', completed_at = now()
  where lower(coalesce(status, '')) = 'active'
    and event_date + interval '3 hours' <= now();

  get diagnostics v_completed = row_count;
  return v_completed;
end;
$$;


--
-- Name: event_is_live(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.event_is_live(p_status text, p_event_date timestamp with time zone) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select lower(coalesce(p_status, '')) = 'active'
    and p_event_date is not null
    and p_event_date + interval '3 hours' > now();
$$;


--
-- Name: finalize_direct_transfer(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_direct_transfer(p_operation_id uuid, p_asset_transaction_hash text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: finalize_primary_purchase(uuid, bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_primary_purchase(p_operation_id uuid, p_token_id bigint, p_asset_transaction_hash text, p_qr_code text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: finalize_resale_purchase(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_resale_purchase(p_operation_id uuid, p_asset_transaction_hash text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: finalize_ticket_refund(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_ticket_refund(p_operation_id uuid, p_asset_transaction_hash text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: finish_stripe_webhook(text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_stripe_webhook(p_event_id text, p_succeeded boolean, p_error_category text DEFAULT NULL::text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.stripe_webhook_events
  set
    status = case when p_succeeded then 'completed' else 'failed' end,
    safe_error_category = case when p_succeeded then null else p_error_category end,
    completed_at = case when p_succeeded then now() else null end,
    last_received_at = now()
  where stripe_event_id = p_event_id;
$$;


--
-- Name: finish_transactional_email(text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_transactional_email(p_notification_key text, p_sent boolean, p_error_category text DEFAULT NULL::text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.transactional_email_deliveries
  set
    status = case when p_sent then 'sent' else 'failed' end,
    safe_error_category = case when p_sent then null else p_error_category end,
    sent_at = case when p_sent then now() else null end,
    updated_at = now()
  where notification_key = p_notification_key;
$$;


--
-- Name: mark_primary_refunded(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_primary_refunded(p_operation_id uuid, p_refund_id text, p_error_category text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: mark_resale_refunded(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_resale_refunded(p_operation_id uuid, p_refund_id text, p_error_category text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: provision_customer_wallet(uuid, text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.provision_customer_wallet(p_user_id uuid, p_wallet_address text, p_encrypted_private_key text, p_encryption_iv text, p_encryption_auth_tag text, p_key_version integer) RETURNS TABLE(wallet_address text, wallet_status text, created boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_role text;
  v_profile_address text;
  v_profile_status text;
  v_existing_address text;
begin
  select p.role, p.wallet_address, p.wallet_status
    into v_role, v_profile_address, v_profile_status
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'customer_profile_missing';
  end if;

  if v_role not in ('customer', 'user') then
    raise exception using errcode = '42501', message = 'customer_role_required';
  end if;

  select c.wallet_address
    into v_existing_address
  from public.custodial_wallets c
  where c.user_id = p_user_id;

  if found then
    if v_profile_address is distinct from v_existing_address
       or v_profile_status is distinct from 'ready' then
      raise exception using errcode = '23514', message = 'wallet_records_inconsistent';
    end if;

    return query select v_existing_address, 'ready'::text, false;
    return;
  end if;

  if v_profile_address is not null or v_profile_status = 'ready' then
    raise exception using errcode = '23514', message = 'wallet_records_inconsistent';
  end if;

  insert into public.custodial_wallets (
    user_id,
    wallet_address,
    encrypted_private_key,
    encryption_iv,
    encryption_auth_tag,
    key_version
  ) values (
    p_user_id,
    p_wallet_address,
    p_encrypted_private_key,
    p_encryption_iv,
    p_encryption_auth_tag,
    p_key_version
  );

  update public.profiles
  set wallet_address = p_wallet_address,
      wallet_status = 'ready',
      wallet_error = null
  where user_id = p_user_id
    and role in ('customer', 'user');

  if not found then
    raise exception using errcode = 'P0002', message = 'customer_profile_missing';
  end if;

  return query select p_wallet_address, 'ready'::text, true;
end;
$$;


--
-- Name: reserve_primary_ticket(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_primary_ticket(p_buyer_id uuid, p_event_id uuid, p_ticket_type_id uuid, p_idempotency_key text) RETURNS TABLE(operation_id uuid, amount_sen bigint, currency text, event_name text, ticket_type_name text, wallet_address text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: reserve_resale_purchase(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_resale_purchase(p_buyer_id uuid, p_listing_id uuid, p_idempotency_key text) RETURNS TABLE(operation_id uuid, amount_sen bigint, currency text, event_name text, ticket_type_name text, buyer_wallet_address text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action_type text NOT NULL,
    target_type text,
    target_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: custodial_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custodial_wallets (
    user_id uuid NOT NULL,
    wallet_address text NOT NULL,
    encrypted_private_key text NOT NULL,
    encryption_iv text NOT NULL,
    encryption_auth_tag text NOT NULL,
    key_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custodial_wallets_key_version_check CHECK ((key_version > 0))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    document_id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    application_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    document_type text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    organizer_id uuid,
    event_name text NOT NULL,
    artist_name text,
    venue text,
    event_date timestamp with time zone,
    description text,
    banner_image text,
    status text DEFAULT 'pending'::text,
    contract_event_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    category text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancellation_reason text,
    venue_id uuid,
    layout jsonb,
    completed_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejected_by uuid,
    rejection_reason text,
    CONSTRAINT events_status_check CHECK ((lower(status) = ANY (ARRAY['draft'::text, 'pending'::text, 'active'::text, 'rejected'::text, 'cancelled'::text, 'canceled'::text, 'completed'::text])))
);


--
-- Name: partner_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_applications (
    application_id uuid DEFAULT gen_random_uuid() NOT NULL,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    phone text,
    company_name text,
    business_reg_no text,
    tax_id text,
    website text,
    description text,
    address text,
    city text,
    state text,
    postal_code text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    review_notes text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    applicant_user_id uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    wallet_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text,
    deactivation_type text,
    deactivated_at timestamp with time zone,
    deactivated_by uuid,
    deactivation_reason text,
    deactivation_notice_end timestamp with time zone,
    reactivated_at timestamp with time zone,
    wallet_status text,
    wallet_error text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'organizer'::text, 'customer'::text, 'user'::text]))),
    CONSTRAINT profiles_wallet_status_check CHECK (((wallet_status IS NULL) OR (wallet_status = ANY (ARRAY['pending'::text, 'ready'::text, 'failed'::text]))))
);


--
-- Name: resale_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resale_listings (
    listing_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    seller_wallet_address text NOT NULL,
    price numeric(12,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    purchased_at timestamp with time zone,
    price_sen bigint NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    seller_user_id uuid NOT NULL,
    buyer_user_id uuid,
    reserved_operation_id uuid,
    reserved_by uuid,
    reserved_until timestamp with time zone,
    contract_listing_reference text,
    marketplace_approval_hash text,
    marketplace_listing_hash text,
    CONSTRAINT resale_listings_price_check CHECK ((price > (0)::numeric)),
    CONSTRAINT resale_listings_status_check CHECK ((status = ANY (ARRAY['contract_pending'::text, 'active'::text, 'cancelled'::text, 'expired'::text, 'purchased'::text])))
);


--
-- Name: seller_proceeds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_proceeds (
    proceeds_id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    seller_user_id uuid NOT NULL,
    amount_sen bigint NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL,
    status text DEFAULT 'credited'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reversed_at timestamp with time zone,
    CONSTRAINT seller_proceeds_amount_sen_check CHECK ((amount_sen > 0)),
    CONSTRAINT seller_proceeds_status_check CHECK ((status = ANY (ARRAY['credited'::text, 'reversed'::text])))
);


--
-- Name: TABLE seller_proceeds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.seller_proceeds IS 'Simulated MYR resale proceeds. No Stripe Connect payout is created.';


--
-- Name: stripe_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_webhook_events (
    stripe_event_id text NOT NULL,
    event_type text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    safe_error_category text,
    first_received_at timestamp with time zone DEFAULT now() NOT NULL,
    last_received_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT stripe_webhook_events_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE stripe_webhook_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stripe_webhook_events IS 'Exactly-once claim state for verified Stripe webhook event IDs.';


--
-- Name: ticket_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_operations (
    operation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_kind text NOT NULL,
    state text DEFAULT 'pending'::text NOT NULL,
    idempotency_key text NOT NULL,
    actor_user_id uuid NOT NULL,
    seller_user_id uuid,
    recipient_user_id uuid,
    event_id uuid,
    ticket_type_id uuid,
    ticket_id uuid,
    listing_id uuid,
    related_operation_id uuid,
    amount_sen bigint,
    currency text DEFAULT 'MYR'::text NOT NULL,
    wallet_address text,
    recipient_wallet_address text,
    stripe_checkout_session_id text,
    stripe_payment_intent_id text,
    stripe_refund_id text,
    token_id bigint,
    asset_transaction_hash text,
    reserved_until timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    safe_error_category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT ticket_operations_operation_kind_check CHECK ((operation_kind = ANY (ARRAY['primary_purchase'::text, 'resale_purchase'::text, 'direct_transfer'::text, 'refund'::text]))),
    CONSTRAINT ticket_operations_state_check CHECK ((state = ANY (ARRAY['pending'::text, 'checkout_created'::text, 'payment_confirmed'::text, 'asset_submitted'::text, 'asset_confirmed'::text, 'completed'::text, 'delivery_failed'::text, 'refund_pending'::text, 'refunded'::text, 'expired'::text, 'cancelled'::text, 'failed'::text])))
);


--
-- Name: TABLE ticket_operations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_operations IS 'Idempotent Stripe and NFT workflow state. Contains public references only.';


--
-- Name: ticket_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_types (
    ticket_type_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    type_name text NOT NULL,
    price numeric(10,2) NOT NULL,
    total_supply integer NOT NULL,
    remaining_supply integer NOT NULL,
    purchase_limit integer DEFAULT 1,
    transfer_allowed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    venue_zone_id uuid,
    zone_ref text,
    price_sen bigint NOT NULL,
    currency text DEFAULT 'MYR'::text NOT NULL
);


--
-- Name: COLUMN ticket_types.price_sen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ticket_types.price_sen IS 'Authoritative Stripe price in integer Malaysian sen.';


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    ticket_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    ticket_type_id uuid,
    user_id uuid,
    wallet_address text,
    contract_ticket_id bigint,
    qr_code text,
    status text DEFAULT 'valid'::text,
    transaction_hash text,
    created_at timestamp with time zone DEFAULT now(),
    token_id bigint,
    mint_transaction_hash text,
    burn_transaction_hash text,
    stripe_payment_intent text,
    refund_eligible boolean DEFAULT false NOT NULL,
    refund_beneficiary text,
    refunded_at timestamp with time zone,
    record_source text DEFAULT 'legacy'::text NOT NULL,
    acquisition_operation_id uuid,
    owner_updated_at timestamp with time zone,
    chain_id bigint,
    contract_address text,
    CONSTRAINT tickets_status_check CHECK ((lower(status) = ANY (ARRAY['active'::text, 'valid'::text, 'used'::text, 'expired'::text, 'cancelled'::text, 'canceled'::text, 'refunded'::text, 'transferred'::text])))
);


--
-- Name: COLUMN tickets.record_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tickets.record_source IS 'legacy for historical mock records; stripe_nft for receipt-confirmed Ticket NFTs.';


--
-- Name: topup_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topup_records (
    topup_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    amount_rm numeric(10,2) NOT NULL,
    token_amount numeric(10,2) NOT NULL,
    stripe_session_id text,
    payment_status text DEFAULT 'pending'::text,
    transaction_hash text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT topup_records_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: transactional_email_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactional_email_deliveries (
    notification_key text NOT NULL,
    notification_type text NOT NULL,
    operation_id uuid,
    recipient_email text NOT NULL,
    status text DEFAULT 'sending'::text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    safe_error_category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT transactional_email_deliveries_notification_type_check CHECK ((notification_type = ANY (ARRAY['purchase_success'::text, 'refund_success'::text, 'direct_transfer_sent'::text, 'direct_transfer_received'::text, 'resale_sold'::text, 'resale_purchased'::text, 'event_cancelled'::text, 'event_approved'::text, 'event_rejected'::text]))),
    CONSTRAINT transactional_email_deliveries_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    transaction_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    buyer_id uuid,
    seller_id uuid,
    transaction_hash text,
    transaction_type text NOT NULL,
    amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    amount_sen bigint,
    currency text DEFAULT 'MYR'::text NOT NULL,
    record_source text DEFAULT 'legacy'::text NOT NULL,
    operation_id uuid,
    stripe_checkout_session_id text,
    stripe_payment_intent_id text,
    blockchain_transaction_hash text,
    status text DEFAULT 'completed'::text NOT NULL,
    CONSTRAINT transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['purchase'::text, 'refund'::text, 'transfer'::text, 'resale'::text, 'topup'::text])))
);


--
-- Name: venue_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_zones (
    zone_id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    capacity integer NOT NULL,
    category text,
    shape jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT venue_zones_category_check CHECK ((category = ANY (ARRAY['seated'::text, 'standing'::text])))
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    venue_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    venue_type text,
    total_capacity integer NOT NULL,
    layout jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT venues_venue_type_check CHECK ((venue_type = ANY (ARRAY['stadium'::text, 'arena'::text, 'theatre'::text, 'hall'::text, 'other'::text])))
);


--
-- Name: verification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    verified_by uuid,
    verification_status text NOT NULL,
    verified_at timestamp with time zone DEFAULT now(),
    CONSTRAINT verification_logs_verification_status_check CHECK ((verification_status = ANY (ARRAY['valid'::text, 'invalid'::text, 'already_used'::text, 'refunded'::text, 'cancelled'::text])))
);


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (log_id);


--
-- Name: custodial_wallets custodial_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custodial_wallets
    ADD CONSTRAINT custodial_wallets_pkey PRIMARY KEY (user_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (document_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);


--
-- Name: partner_applications partner_applications_applicant_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_applications
    ADD CONSTRAINT partner_applications_applicant_email_key UNIQUE (applicant_email);


--
-- Name: partner_applications partner_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_applications
    ADD CONSTRAINT partner_applications_pkey PRIMARY KEY (application_id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: resale_listings resale_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_pkey PRIMARY KEY (listing_id);


--
-- Name: seller_proceeds seller_proceeds_operation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_proceeds
    ADD CONSTRAINT seller_proceeds_operation_id_key UNIQUE (operation_id);


--
-- Name: seller_proceeds seller_proceeds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_proceeds
    ADD CONSTRAINT seller_proceeds_pkey PRIMARY KEY (proceeds_id);


--
-- Name: stripe_webhook_events stripe_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (stripe_event_id);


--
-- Name: ticket_operations ticket_operations_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: ticket_operations ticket_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: ticket_operations ticket_operations_stripe_checkout_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_stripe_checkout_session_id_key UNIQUE (stripe_checkout_session_id);


--
-- Name: ticket_types ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_pkey PRIMARY KEY (ticket_type_id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (ticket_id);


--
-- Name: topup_records topup_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topup_records
    ADD CONSTRAINT topup_records_pkey PRIMARY KEY (topup_id);


--
-- Name: transactional_email_deliveries transactional_email_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactional_email_deliveries
    ADD CONSTRAINT transactional_email_deliveries_pkey PRIMARY KEY (notification_key);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: venue_zones venue_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_zones
    ADD CONSTRAINT venue_zones_pkey PRIMARY KEY (zone_id);


--
-- Name: venue_zones venue_zones_venue_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_zones
    ADD CONSTRAINT venue_zones_venue_id_code_key UNIQUE (venue_id, code);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (venue_id);


--
-- Name: verification_logs verification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_logs
    ADD CONSTRAINT verification_logs_pkey PRIMARY KEY (log_id);


--
-- Name: admin_activity_logs_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_activity_logs_admin_id_idx ON public.admin_activity_logs USING btree (admin_id);


--
-- Name: custodial_wallets_address_lower_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX custodial_wallets_address_lower_uidx ON public.custodial_wallets USING btree (lower(wallet_address));


--
-- Name: documents_application_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_application_id_idx ON public.documents USING btree (application_id);


--
-- Name: documents_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_owner_id_idx ON public.documents USING btree (owner_id);


--
-- Name: events_organizer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_organizer_id_idx ON public.events USING btree (organizer_id);


--
-- Name: events_venue_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_venue_id_idx ON public.events USING btree (venue_id);


--
-- Name: idx_documents_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_application ON public.documents USING btree (application_id);


--
-- Name: idx_documents_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_owner ON public.documents USING btree (owner_id);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_type ON public.documents USING btree (owner_id, document_type);


--
-- Name: idx_events_cancelled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_cancelled_at ON public.events USING btree (cancelled_at);


--
-- Name: idx_partner_app_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_app_email ON public.partner_applications USING btree (applicant_email);


--
-- Name: idx_partner_app_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_app_status ON public.partner_applications USING btree (status);


--
-- Name: idx_profiles_deactivation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_deactivation ON public.profiles USING btree (deactivation_notice_end) WHERE (deactivation_notice_end IS NOT NULL);


--
-- Name: idx_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);


--
-- Name: partner_applications_applicant_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_applications_applicant_user_id_idx ON public.partner_applications USING btree (applicant_user_id);


--
-- Name: resale_listings_active_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_active_created_idx ON public.resale_listings USING btree (created_at DESC) WHERE (status = 'active'::text);


--
-- Name: resale_listings_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_active_idx ON public.resale_listings USING btree (status, created_at DESC);


--
-- Name: resale_listings_buyer_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_buyer_user_id_idx ON public.resale_listings USING btree (buyer_user_id);


--
-- Name: resale_listings_contract_reference_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resale_listings_contract_reference_unique ON public.resale_listings USING btree (contract_listing_reference) WHERE (contract_listing_reference IS NOT NULL);


--
-- Name: resale_listings_one_active_ticket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resale_listings_one_active_ticket_idx ON public.resale_listings USING btree (ticket_id) WHERE (status = ANY (ARRAY['contract_pending'::text, 'active'::text]));


--
-- Name: resale_listings_seller_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_seller_idx ON public.resale_listings USING btree (seller_user_id, status);


--
-- Name: resale_listings_seller_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_seller_status_idx ON public.resale_listings USING btree (seller_wallet_address, status, created_at DESC);


--
-- Name: resale_listings_seller_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_seller_user_id_idx ON public.resale_listings USING btree (seller_user_id);


--
-- Name: resale_listings_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resale_listings_ticket_id_idx ON public.resale_listings USING btree (ticket_id);


--
-- Name: seller_proceeds_seller_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seller_proceeds_seller_user_id_idx ON public.seller_proceeds USING btree (seller_user_id);


--
-- Name: seller_proceeds_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seller_proceeds_ticket_id_idx ON public.seller_proceeds USING btree (ticket_id);


--
-- Name: ticket_operations_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_operations_actor_idx ON public.ticket_operations USING btree (actor_user_id, created_at DESC);


--
-- Name: ticket_operations_one_active_ticket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ticket_operations_one_active_ticket_idx ON public.ticket_operations USING btree (ticket_id) WHERE ((ticket_id IS NOT NULL) AND (state = ANY (ARRAY['pending'::text, 'checkout_created'::text, 'payment_confirmed'::text, 'asset_submitted'::text, 'asset_confirmed'::text, 'delivery_failed'::text, 'refund_pending'::text])));


--
-- Name: ticket_operations_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_operations_state_idx ON public.ticket_operations USING btree (state, updated_at);


--
-- Name: ticket_types_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_types_event_id_idx ON public.ticket_types USING btree (event_id);


--
-- Name: ticket_types_venue_zone_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_types_venue_zone_id_idx ON public.ticket_types USING btree (venue_zone_id);


--
-- Name: tickets_blockchain_identity_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tickets_blockchain_identity_uidx ON public.tickets USING btree (chain_id, lower(contract_address), token_id) WHERE (token_id IS NOT NULL);


--
-- Name: tickets_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_event_id_idx ON public.tickets USING btree (event_id);


--
-- Name: tickets_stripe_acquisition_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tickets_stripe_acquisition_idx ON public.tickets USING btree (transaction_hash) WHERE ((record_source = 'stripe_nft'::text) AND (transaction_hash IS NOT NULL));


--
-- Name: tickets_ticket_type_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_ticket_type_id_idx ON public.tickets USING btree (ticket_type_id);


--
-- Name: tickets_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_user_id_idx ON public.tickets USING btree (user_id);


--
-- Name: topup_records_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX topup_records_user_id_idx ON public.topup_records USING btree (user_id);


--
-- Name: transactions_buyer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_buyer_id_idx ON public.transactions USING btree (buyer_id);


--
-- Name: transactions_operation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_operation_id_idx ON public.transactions USING btree (operation_id);


--
-- Name: transactions_operation_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX transactions_operation_type_idx ON public.transactions USING btree (operation_id, transaction_type) WHERE (operation_id IS NOT NULL);


--
-- Name: transactions_seller_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_seller_id_idx ON public.transactions USING btree (seller_id);


--
-- Name: transactions_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_ticket_id_idx ON public.transactions USING btree (ticket_id);


--
-- Name: venue_zones_venue_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX venue_zones_venue_id_idx ON public.venue_zones USING btree (venue_id);


--
-- Name: verification_logs_ticket_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_logs_ticket_id_idx ON public.verification_logs USING btree (ticket_id);


--
-- Name: verification_logs_verified_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_logs_verified_by_idx ON public.verification_logs USING btree (verified_by);


--
-- Name: admin_activity_logs admin_activity_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: custodial_wallets custodial_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custodial_wallets
    ADD CONSTRAINT custodial_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.partner_applications(application_id);


--
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id);


--
-- Name: events events_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(user_id);


--
-- Name: events events_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: events events_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.profiles(user_id);


--
-- Name: events events_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(venue_id);


--
-- Name: partner_applications partner_applications_applicant_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_applications
    ADD CONSTRAINT partner_applications_applicant_user_id_fkey FOREIGN KEY (applicant_user_id) REFERENCES public.profiles(user_id);


--
-- Name: partner_applications partner_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_applications
    ADD CONSTRAINT partner_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(user_id);


--
-- Name: profiles profiles_deactivated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.profiles(user_id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: resale_listings resale_listings_buyer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES public.profiles(user_id);


--
-- Name: resale_listings resale_listings_reserved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.profiles(user_id);


--
-- Name: resale_listings resale_listings_reserved_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_reserved_operation_id_fkey FOREIGN KEY (reserved_operation_id) REFERENCES public.ticket_operations(operation_id);


--
-- Name: resale_listings resale_listings_seller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_seller_user_id_fkey FOREIGN KEY (seller_user_id) REFERENCES public.profiles(user_id);


--
-- Name: resale_listings resale_listings_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resale_listings
    ADD CONSTRAINT resale_listings_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE RESTRICT;


--
-- Name: seller_proceeds seller_proceeds_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_proceeds
    ADD CONSTRAINT seller_proceeds_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.resale_listings(listing_id);


--
-- Name: seller_proceeds seller_proceeds_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_proceeds
    ADD CONSTRAINT seller_proceeds_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.ticket_operations(operation_id);


--
-- Name: seller_proceeds seller_proceeds_seller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_proceeds
    ADD CONSTRAINT seller_proceeds_seller_user_id_fkey FOREIGN KEY (seller_user_id) REFERENCES public.profiles(user_id);


--
-- Name: seller_proceeds seller_proceeds_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_proceeds
    ADD CONSTRAINT seller_proceeds_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id);


--
-- Name: ticket_operations ticket_operations_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(user_id);


--
-- Name: ticket_operations ticket_operations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id);


--
-- Name: ticket_operations ticket_operations_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.resale_listings(listing_id);


--
-- Name: ticket_operations ticket_operations_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(user_id);


--
-- Name: ticket_operations ticket_operations_related_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_related_operation_id_fkey FOREIGN KEY (related_operation_id) REFERENCES public.ticket_operations(operation_id);


--
-- Name: ticket_operations ticket_operations_seller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_seller_user_id_fkey FOREIGN KEY (seller_user_id) REFERENCES public.profiles(user_id);


--
-- Name: ticket_operations ticket_operations_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id);


--
-- Name: ticket_operations ticket_operations_ticket_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_operations
    ADD CONSTRAINT ticket_operations_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(ticket_type_id);


--
-- Name: ticket_types ticket_types_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: ticket_types ticket_types_venue_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_venue_zone_id_fkey FOREIGN KEY (venue_zone_id) REFERENCES public.venue_zones(zone_id);


--
-- Name: tickets tickets_acquisition_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_acquisition_operation_id_fkey FOREIGN KEY (acquisition_operation_id) REFERENCES public.ticket_operations(operation_id);


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: tickets tickets_ticket_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(ticket_type_id) ON DELETE SET NULL;


--
-- Name: tickets tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: topup_records topup_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topup_records
    ADD CONSTRAINT topup_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: transactional_email_deliveries transactional_email_deliveries_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactional_email_deliveries
    ADD CONSTRAINT transactional_email_deliveries_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.ticket_operations(operation_id);


--
-- Name: transactions transactions_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: transactions transactions_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.ticket_operations(operation_id);


--
-- Name: transactions transactions_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: transactions transactions_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE SET NULL;


--
-- Name: venue_zones venue_zones_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_zones
    ADD CONSTRAINT venue_zones_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(venue_id) ON DELETE CASCADE;


--
-- Name: verification_logs verification_logs_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_logs
    ADD CONSTRAINT verification_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: verification_logs verification_logs_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_logs
    ADD CONSTRAINT verification_logs_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: venue_zones Anyone can read venue zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read venue zones" ON public.venue_zones FOR SELECT TO authenticated, anon USING (true);


--
-- Name: venues Anyone can read venues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read venues" ON public.venues FOR SELECT TO authenticated, anon USING (true);


--
-- Name: partner_applications Applicants can create own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Applicants can create own application" ON public.partner_applications FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = applicant_user_id));


--
-- Name: partner_applications Applicants can read own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Applicants can read own application" ON public.partner_applications FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = applicant_user_id));


--
-- Name: partner_applications Applicants can update own pending application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Applicants can update own pending application" ON public.partner_applications FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = applicant_user_id) AND (status = 'pending'::text))) WITH CHECK (((( SELECT auth.uid() AS uid) = applicant_user_id) AND (status = 'pending'::text)));


--
-- Name: tickets Customers can read own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can read own tickets" ON public.tickets FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: topup_records Customers can read own topup records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can read own topup records" ON public.topup_records FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: transactions Customers can read related transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can read related transactions" ON public.transactions FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = buyer_id) OR (( SELECT auth.uid() AS uid) = seller_id)));


--
-- Name: verification_logs Organizers can read logs for own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizers can read logs for own events" ON public.verification_logs FOR SELECT TO authenticated USING (private.is_ticket_event_organizer(ticket_id));


--
-- Name: events Organizers can read own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizers can read own events" ON public.events FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = organizer_id));


--
-- Name: ticket_types Organizers can read ticket types for own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizers can read ticket types for own events" ON public.ticket_types FOR SELECT TO authenticated USING (( SELECT private.is_event_organizer(ticket_types.event_id) AS is_event_organizer));


--
-- Name: tickets Organizers can read tickets for own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizers can read tickets for own events" ON public.tickets FOR SELECT TO authenticated USING (( SELECT private.is_event_organizer(tickets.event_id) AS is_event_organizer));


--
-- Name: profiles Users can create own customer profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own customer profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id) AND (role = 'customer'::text)));


--
-- Name: documents Users can delete own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: documents Users can read own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own documents" ON public.documents FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: documents Users can update own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: profiles Users can update own profile without changing role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile without changing role" ON public.profiles FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT private.profile_role_is_unchanged(profiles.user_id, profiles.role) AS profile_role_is_unchanged)));


--
-- Name: documents Users can upload own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: admin_activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: custodial_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custodial_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions organizers can read own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "organizers can read own transactions" ON public.transactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.tickets
     JOIN public.events ON ((events.event_id = tickets.event_id)))
  WHERE ((tickets.ticket_id = transactions.ticket_id) AND (events.organizer_id = auth.uid())))));


--
-- Name: partner_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: resale_listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resale_listings ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_proceeds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_proceeds ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_operations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_operations ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: topup_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topup_records ENABLE ROW LEVEL SECURITY;

--
-- Name: transactional_email_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactional_email_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: venue_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venue_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: venues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict L9vpu5epYhpk4QeDvZpLZsEgAHSaVN2WmdCFv0bkchVihZPuHBffrSL1TgnNx5Y

