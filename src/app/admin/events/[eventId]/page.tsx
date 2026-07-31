import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/requireRole";
import { Card } from "@/components/common/Card";
import { BackButton } from "@/components/common/BackButton";
import { CancelEventButton } from "@/components/common/CancelEventButton";
import { formatMyr } from "@/lib/currency";
import { EventBanner } from "@/components/events/EventBanner";
import { EventMetricCard } from "@/components/events/EventMetricCard";
import {
  buildEventChartPoints,
  type EventTransactionRow,
} from "@/lib/eventChartData";

const NUMBER = new Intl.NumberFormat("en-US");

function statusClass(status: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "active";
  if (s === "pending") return "pending";
  if (s === "rejected" || s === "cancelled" || s === "canceled") return "rejected";
  return "";
}

function formatDate(value: string | null): string {
  if (!value) return "Date TBC";
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireRole(["admin"]);
  const { eventId } = await params;

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  const { data: ticketTypes } = await supabaseAdmin
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId);

  const types = (ticketTypes ?? []).map((tt: Record<string, unknown>) => {
    const totalSupply = (tt.total_supply as number) ?? 0;
    const remainingSupply = (tt.remaining_supply as number) ?? 0;
    const price = (tt.price as number) ?? 0;
    const sold = totalSupply - remainingSupply;
    const revenue = price * sold;
    return { ...tt, sold, revenue };
  });

  const totalSold = types.reduce((s: number, t: Record<string, unknown>) => s + (t.sold as number), 0);
  const totalSupply = types.reduce((s: number, t: Record<string, unknown>) => s + ((t.total_supply as number) ?? 0), 0);
  const totalRevenue = types.reduce((s: number, t: Record<string, unknown>) => s + (t.revenue as number), 0);

  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("ticket_id")
    .eq("event_id", eventId);

  const ticketIds = (tickets ?? []).map(
    (ticket) => ticket.ticket_id as string,
  );

  let chartTransactions: EventTransactionRow[] = [];
  if (ticketIds.length > 0) {
    const CHUNK_SIZE = 1000;
    const chunks = Array.from(
      { length: Math.ceil(ticketIds.length / CHUNK_SIZE) },
      (_, index) =>
        ticketIds.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );

    const results = await Promise.all(
      chunks.map((chunk) =>
        supabaseAdmin
          .from("transactions")
          .select("amount, created_at")
          .in("ticket_id", chunk)
          .eq("transaction_type", "purchase")
          .order("created_at", { ascending: true }),
      ),
    );

    chartTransactions = results.flatMap(
      (result) => (result.data ?? []) as EventTransactionRow[],
    );
  }

  const chartData = buildEventChartPoints(chartTransactions, totalSupply);

  return (
    <>
      <div className="top-row">
        <span
          className={`admin-event-status-badge admin-event-status-badge--${statusClass(event.status)}`.trim()}
        >
          {(event.status ?? "unknown").toUpperCase()}
        </span>
        <div>
          <h1>{event.event_name}</h1>
          <p className="muted dashboard-subtitle">
            {event.artist_name && (
              <>
                {event.artist_name}
                {" · "}
              </>
            )}
            {event.venue ?? "Venue TBC"}
            {" · "}
            {formatDate(event.event_date)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <BackButton />
          {event.status === "active" && (
            <CancelEventButton
              eventName={event.event_name}
              cancelUrl={`/api/admin/events/${eventId}/cancel`}
            />
          )}
        </div>
      </div>

      {event.banner_image ? (
        <div className="admin-event-hero">
          <EventBanner
            src={event.banner_image}
            alt={`${event.event_name} banner`}
          />
          <div className="admin-event-hero-metrics">
            <EventMetricCard
              value={NUMBER.format(totalSold)}
              title={`Sold / ${NUMBER.format(totalSupply)} total`}
              data={chartData}
              dataKey="sales"
              color="#36b56a"
            />
            <EventMetricCard
              value={NUMBER.format(totalSupply - totalSold)}
              title="Remaining supply"
              data={chartData}
              dataKey="remaining"
              color="#f6a730"
            />
            <EventMetricCard
              value={formatMyr(totalRevenue)}
              title="Total revenue"
              data={chartData}
              dataKey="revenue"
              color="#58a6ff"
              className="metric-full"
            />
          </div>
        </div>
      ) : (
        <section className="grid-3" style={{ marginBottom: 24 }}>
          <EventMetricCard
            value={NUMBER.format(totalSold)}
            title={`Sold / ${NUMBER.format(totalSupply)} total`}
            data={chartData}
            dataKey="sales"
            color="#36b56a"
          />
          <EventMetricCard
            value={NUMBER.format(totalSupply - totalSold)}
            title="Remaining supply"
            data={chartData}
            dataKey="remaining"
            color="#f6a730"
          />
          <EventMetricCard
            value={formatMyr(totalRevenue)}
            title="Total revenue"
            data={chartData}
            dataKey="revenue"
            color="#58a6ff"
          />
        </section>
      )}

      {event.description && (
        <Card
          variant="panel"
          title="Description"
          style={{ marginBottom: 24 }}
        >
          <p className="muted dashboard-panel-text">
            {event.description}
          </p>
        </Card>
      )}

      {types.length === 0 ? (
        <Card variant="panel" title="Ticket Types">
          <p className="muted dashboard-panel-text">
            No ticket types defined yet.
          </p>
        </Card>
      ) : (
        <Card variant="table">
          <table>
            <thead>
              <tr>
                <th>Ticket Type</th>
                <th>Price</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {types.map((tt: Record<string, unknown>) => (
                <tr key={tt.ticket_type_id as string}>
                  <td>
                    <strong>
                      {(tt.type_name as string) ||
                        formatMyr(tt.price as number)}
                    </strong>
                  </td>
                  <td>{formatMyr((tt.price as number) ?? 0)}</td>
                  <td>
                    {NUMBER.format(tt.sold as number)} /{" "}
                    {NUMBER.format((tt.total_supply as number) ?? 0)}
                  </td>
                  <td>{formatMyr(tt.revenue as number)}</td>
                  <td>{NUMBER.format((tt.remaining_supply as number) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
