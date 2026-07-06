begin;

alter table public.profiles
  add column if not exists wallet_address text,
  add column if not exists wallet_status text,
  add column if not exists wallet_error text;

do $$
begin
  alter table public.profiles
    add constraint profiles_wallet_status_check
    check (
      wallet_status is null
      or wallet_status in ('pending', 'ready', 'failed')
    );
exception
  when duplicate_object then null;
end
$$;

update public.profiles
set wallet_status = 'ready', wallet_error = null
where role in ('customer', 'user')
  and wallet_address is not null
  and wallet_status is null;

update public.profiles
set wallet_status = 'pending'
where role in ('customer', 'user')
  and wallet_address is null
  and wallet_status is null;

create table if not exists public.custodial_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text not null,
  encrypted_private_key text not null,
  encryption_iv text not null,
  encryption_auth_tag text not null,
  key_version integer not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custodial_wallets_address_lower_uidx
  on public.custodial_wallets (lower(wallet_address));

alter table public.custodial_wallets enable row level security;

revoke all on table public.custodial_wallets
  from public, anon, authenticated;
grant select, insert, update on table public.custodial_wallets
  to service_role;

create or replace function public.provision_customer_wallet(
  p_user_id uuid,
  p_wallet_address text,
  p_encrypted_private_key text,
  p_encryption_iv text,
  p_encryption_auth_tag text,
  p_key_version integer
)
returns table(wallet_address text, wallet_status text, created boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
    raise exception using
      errcode = 'P0002',
      message = 'customer_profile_missing';
  end if;

  if v_role not in ('customer', 'user') then
    raise exception using
      errcode = '42501',
      message = 'customer_role_required';
  end if;

  select c.wallet_address
    into v_existing_address
  from public.custodial_wallets c
  where c.user_id = p_user_id;

  if found then
    if v_profile_address is distinct from v_existing_address
       or v_profile_status is distinct from 'ready' then
      raise exception using
        errcode = '23514',
        message = 'wallet_records_inconsistent';
    end if;

    return query select v_existing_address, 'ready'::text, false;
    return;
  end if;

  if v_profile_address is not null or v_profile_status = 'ready' then
    raise exception using
      errcode = '23514',
      message = 'wallet_records_inconsistent';
  end if;

  if p_wallet_address !~ '^0x[0-9A-Fa-f]{40}$'
     or coalesce(p_encrypted_private_key, '') = ''
     or coalesce(p_encryption_iv, '') = ''
     or coalesce(p_encryption_auth_tag, '') = ''
     or coalesce(p_key_version, 0) < 1 then
    raise exception using
      errcode = '22023',
      message = 'invalid_wallet_payload';
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
    raise exception using
      errcode = 'P0002',
      message = 'customer_profile_missing';
  end if;

  return query select p_wallet_address, 'ready'::text, true;
end;
$$;

revoke all on function public.provision_customer_wallet(
  uuid, text, text, text, text, integer
) from public, anon, authenticated;

grant execute on function public.provision_customer_wallet(
  uuid, text, text, text, text, integer
) to service_role;

commit;
