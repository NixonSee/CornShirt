begin;

alter table public.events
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(user_id),
  add column if not exists rejection_reason text;

alter table public.transactional_email_deliveries
  drop constraint if exists transactional_email_deliveries_notification_type_check;

alter table public.transactional_email_deliveries
  add constraint transactional_email_deliveries_notification_type_check
  check (notification_type in (
    'purchase_success',
    'refund_success',
    'direct_transfer_sent',
    'direct_transfer_received',
    'resale_sold',
    'resale_purchased',
    'event_cancelled',
    'event_approved',
    'event_rejected'
  ));

commit;
