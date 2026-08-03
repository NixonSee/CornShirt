import {
  OrganizerDashboardClient,
  type OrganizerDashboardTransaction,
} from "@/components/organizer/OrganizerDashboardClient";
import {
  buildDailyRevenueSeries,
  buildOrganizerEventSummaries,
  type OrganizerEventRow,
  type OrganizerTicketRow,
  type OrganizerTicketTypeRow,
} from "@/lib/organizerDashboard";
import { synchronizeFinishedEvents } from "@/lib/eventLifecycle.server";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function OrganizerDashboardPage() {
  const { user } = await requireRole(["organizer"]);
  await synchronizeFinishedEvents();

  const eventsResult = await supabaseAdmin
    .from("events")
    .select(
      "event_id, event_name, artist_name, venue, status, event_date, banner_image",
    )
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  if (eventsResult.error) {
    return (
      <OrganizerDashboardClient
        events={[]}
        revenueSeries={buildDailyRevenueSeries([], [])}
        transactions={[]}
        loadError={eventsResult.error.message}
      />
    );
  }

  const eventRows = (eventsResult.data ?? []) as OrganizerEventRow[];
  const eventIds = eventRows.map((event) => event.event_id);

  if (eventIds.length === 0) {
    return (
      <OrganizerDashboardClient
        events={[]}
        revenueSeries={buildDailyRevenueSeries([], [])}
        transactions={[]}
      />
    );
  }

  const [ticketTypesResult, ticketsResult, transactionsResult] =
    await Promise.all([
      supabaseAdmin
        .from("ticket_types")
        .select("ticket_type_id, event_id, price, total_supply")
        .in("event_id", eventIds),
      supabaseAdmin
        .from("tickets")
        .select("event_id, ticket_type_id, created_at, status")
        .in("event_id", eventIds),
      supabaseAdmin
        .from("transactions")
        .select(
          "transaction_id, transaction_hash, transaction_type, amount, created_at, tickets!inner(wallet_address, events!inner(event_name, organizer_id))",
        )
        .eq("tickets.events.organizer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const ticketTypes = (ticketTypesResult.data ??
    []) as OrganizerTicketTypeRow[];
  const tickets = (ticketsResult.data ?? []) as OrganizerTicketRow[];
  const events = buildOrganizerEventSummaries(
    eventRows,
    ticketTypes,
    tickets,
  );
  const revenueSeries = buildDailyRevenueSeries(tickets, ticketTypes);
  const transactions = (transactionsResult.data ??
    []) as unknown as OrganizerDashboardTransaction[];
  const loadError = [
    ticketTypesResult.error?.message,
    ticketsResult.error?.message,
    transactionsResult.error?.message,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <OrganizerDashboardClient
      events={events}
      revenueSeries={revenueSeries}
      transactions={transactions}
      loadError={loadError || undefined}
    />
  );
}
