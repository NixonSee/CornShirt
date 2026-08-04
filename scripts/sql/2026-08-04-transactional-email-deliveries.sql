begin;

create table if not exists public.transactional_email_deliveries (
  notification_key text primary key,
  notification_type text not null check (notification_type in (
    'purchase_success',
    'refund_success',
    'direct_transfer_sent',
    'direct_transfer_received',
    'resale_sold',
    'resale_purchased',
    'event_cancelled'
  )),
  operation_id uuid references public.ticket_operations(operation_id),
  recipient_email text not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  attempts integer not null default 1,
  safe_error_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.transactional_email_deliveries enable row level security;
revoke all on table public.transactional_email_deliveries from anon, authenticated;
grant all on table public.transactional_email_deliveries to service_role;

create or replace function public.claim_transactional_email(
  p_notification_key text,
  p_notification_type text,
  p_operation_id uuid,
  p_recipient_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.finish_transactional_email(
  p_notification_key text,
  p_sent boolean,
  p_error_category text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactional_email_deliveries
  set
    status = case when p_sent then 'sent' else 'failed' end,
    safe_error_category = case when p_sent then null else p_error_category end,
    sent_at = case when p_sent then now() else null end,
    updated_at = now()
  where notification_key = p_notification_key;
$$;

revoke all on function public.claim_transactional_email(text, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.finish_transactional_email(text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.claim_transactional_email(text, text, uuid, text)
  to service_role;
grant execute on function public.finish_transactional_email(text, boolean, text)
  to service_role;

commit;
