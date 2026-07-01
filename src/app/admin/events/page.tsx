import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { EventsPageClient } from "@/components/admin/EventsPageClient";

export default async function EventsPage() {
  const [eventsRes, ticketTypesRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("ticket_types")
      .select("event_id, ticket_type_id, total_supply"),
    supabaseAdmin
      .from("profiles")
      .select("user_id, name")
      .eq("role", "organizer"),
  ]);

  const events = eventsRes.data ?? [];
  const ticketTypes = ticketTypesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const ticketCountByEvent: Record<string, { count: number; supply: number }> = {};
  for (const tt of ticketTypes) {
    if (!ticketCountByEvent[tt.event_id]) {
      ticketCountByEvent[tt.event_id] = { count: 0, supply: 0 };
    }
    ticketCountByEvent[tt.event_id].count++;
    ticketCountByEvent[tt.event_id].supply += tt.total_supply;
  }

  const profileMap: Record<string, string> = {};
  for (const p of profiles) {
    profileMap[p.user_id] = p.name;
  }

  const displayEvents = events.map((ev) => ({
    event_id: ev.event_id,
    event_name: ev.event_name,
    organizer_name: ev.organizer_id
      ? profileMap[ev.organizer_id] ?? "Unknown"
      : undefined,
    organizer_id: ev.organizer_id,
    status: ev.status ?? "unknown",
    ticket_type_count: ticketCountByEvent[ev.event_id]?.count ?? 0,
    total_supply: ticketCountByEvent[ev.event_id]?.supply ?? 0,
    created_at: ev.created_at,
    event_date: ev.event_date,
  }));

  return (
    <div
      className="main"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
    >
      <div className="top-row">
        <div>
          <h1 style={{ fontSize: 28, color: "var(--primary)" }}>
            All Events ({events.length})
          </h1>
          <p
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 14,
              color: "var(--foreground)",
            }}
          >
            Browse all events. Filter by status or organizer.
          </p>
        </div>
      </div>

      <EventsPageClient events={displayEvents} organizers={profiles} />
    </div>
  );
}
