import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/requireRole";
import { Card } from "@/components/common/Card";
import { BackButton } from "@/components/common/BackButton";

const DICKEN = new Intl.NumberFormat("en-US");

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

  return (
    <>
      <div className="top-row">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1>{event.event_name}</h1>
            <span
              className={`status ${statusVariant(event.status)}`.trim()}
            >
              {(event.status ?? "unknown").toUpperCase()}
            </span>
          </div>
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
        </div>
      </div>

      {event.banner_image && (
        <div
          style={{
            width: "100%",
            height: 240,
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            marginBottom: 24,
            background: "var(--secondary)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.banner_image}
            alt={`${event.event_name} banner`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      <section className="grid-3" style={{ marginBottom: 24 }}>
        <Card
          variant="metric"
          value={DICKEN.format(totalSold)}
          title={`Sold / ${DICKEN.format(totalSupply)} total`}
        />
        <Card
          variant="metric"
          value={DICKEN.format(totalSupply - totalSold)}
          title="Remaining supply"
        />
        <Card
          variant="metric"
          value={`${DICKEN.format(totalRevenue)} DICKEN`}
          title="Total revenue"
        />
      </section>

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
                        `${DICKEN.format(tt.price as number)} DICKEN`}
                    </strong>
                  </td>
                  <td>{DICKEN.format((tt.price as number) ?? 0)} DICKEN</td>
                  <td>
                    {DICKEN.format(tt.sold as number)} /{" "}
                    {DICKEN.format((tt.total_supply as number) ?? 0)}
                  </td>
                  <td>{DICKEN.format(tt.revenue as number)} DICKEN</td>
                  <td>{DICKEN.format((tt.remaining_supply as number) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
