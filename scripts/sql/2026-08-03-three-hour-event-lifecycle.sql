-- CornShirt events remain live for three hours from events.event_date.
-- Apply this migration before deploying the matching application release.

begin;

alter table public.events
  add column if not exists completed_at timestamptz;

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (lower(status) in (
    'draft', 'pending', 'active', 'rejected', 'cancelled', 'canceled', 'completed'
  ));

alter table public.tickets
  drop constraint if exists tickets_status_check;

alter table public.tickets
  add constraint tickets_status_check
  check (lower(status) in (
    'active', 'valid', 'used', 'expired', 'cancelled', 'canceled',
    'refunded', 'transferred'
  ));

alter table public.resale_listings
  add column if not exists contract_listing_reference text,
  add column if not exists marketplace_approval_hash text,
  add column if not exists marketplace_listing_hash text;

create unique index if not exists resale_listings_contract_reference_unique
  on public.resale_listings (contract_listing_reference)
  where contract_listing_reference is not null;

drop index if exists public.resale_listings_one_active_ticket_idx;

create unique index resale_listings_one_active_ticket_idx
  on public.resale_listings (ticket_id)
  where status in ('contract_pending', 'active');

alter table public.resale_listings
  drop constraint if exists resale_listings_status_check;

alter table public.resale_listings
  add constraint resale_listings_status_check
  check (status in (
    'contract_pending', 'active', 'cancelled', 'expired', 'purchased'
  ));

create or replace function public.complete_finished_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.complete_finished_events() from public;
grant execute on function public.complete_finished_events() to service_role;

-- Enforce the same live-window rule inside checkout reservations, even if a
-- caller reaches the database before the synchronization function runs.
create or replace function public.event_is_live(
  p_status text,
  p_event_date timestamptz
)
returns boolean
language sql
stable
as $$
  select lower(coalesce(p_status, '')) = 'active'
    and p_event_date is not null
    and p_event_date + interval '3 hours' > now();
$$;

revoke all on function public.event_is_live(text, timestamptz) from public;
grant execute on function public.event_is_live(text, timestamptz) to service_role;

commit;
