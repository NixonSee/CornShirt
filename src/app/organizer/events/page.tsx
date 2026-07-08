import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/requireRole";
import { Card } from "@/components/common/Card";
import { formatMyr } from "@/lib/currency";

const NUMBER = new Intl.NumberFormat("en-US");

function statusVariant(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return "good";
    case "pending":
      return "warn";
    case "rejected":
    case "cancelled":
    case "canceled":
      return "bad";
    default:
      return "";
  }
}

export default async function MyEventsPage() {
  const { user } = await requireRole(["organizer"]);

  const { data: events } = await supabaseAdmin
    .from("events")
    .select(
      "event_id, event_name, artist_name, venue, status, event_date, banner_image"
    )
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const eventIds = (events ?? []).map((e) => e.event_id);

  let ticketTypes: {
    event_id: string;
    price: number;
    total_supply: number;
    remaining_supply: number;
  }[] = [];
  if (eventIds.length > 0) {
    const { data: tt } = await supabaseAdmin
      .from("ticket_types")
      .select("event_id, price, total_supply, remaining_supply")
      .in("event_id", eventIds);
    ticketTypes = (tt ?? []) as typeof ticketTypes;
  }

  const ticketMap = new Map<
    string,
    { sold: number; supply: number; revenue: number }
  >();
  for (const event of events ?? []) {
    const types = ticketTypes.filter((t) => t.event_id === event.event_id);
    const supply = types.reduce((s, t) => s + (t.total_supply ?? 0), 0);
    const sold = types.reduce(
      (s, t) => s + ((t.total_supply ?? 0) - (t.remaining_supply ?? 0)),
      0
    );
    const revenue = types.reduce(
      (s, t) =>
        s + (t.price ?? 0) * ((t.total_supply ?? 0) - (t.remaining_supply ?? 0)),
      0
    );
    ticketMap.set(event.event_id, { sold, supply, revenue });
  }

  return (
    <>
      <div className="top-row">
        <div>
          <h1>My Events</h1>
          <p className="muted dashboard-subtitle">
            Your created events, approval status, and sales at a glance.
          </p>
        </div>
        <Link className="button" href="/organizer/create-event">
          <PlusCircle size={18} />
          Create Event
        </Link>
      </div>

      {(events ?? []).length === 0 ? (
        <div className="empty-state dashboard-empty">
          <p>
            No events yet
            <span className="muted">
              Create your first event to start selling tickets.
            </span>
          </p>
        </div>
      ) : (
        <Card variant="table">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((event) => {
                const info = ticketMap.get(event.event_id);
                return (
                  <tr key={event.event_id}>
                    <td>
                      <strong>{event.event_name}</strong>
                      <br />
                      <span className="muted event-meta">
                        {[event.artist_name, event.venue]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status ${statusVariant(event.status)}`.trim()}
                      >
                        {(event.status ?? "unknown").toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {info
                        ? `${NUMBER.format(info.sold)} / ${NUMBER.format(info.supply)}`
                        : "—"}
                    </td>
                    <td>
                      {info ? formatMyr(info.revenue) : "—"}
                    </td>
                    <td>
                      <Link
                        className="button"
                        href={`/organizer/events/${event.event_id}`}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
