begin;

alter table public.transactional_email_deliveries
  alter column operation_id drop not null;

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
    'event_cancelled'
  ));

commit;
