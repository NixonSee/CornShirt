import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Card from "@/components/common/Card";
import QuickStat from "@/components/admin/QuickStat";
import AdminCharts from "@/components/admin/AdminCharts";
import TrendCharts from "@/components/admin/TrendCharts";
import EventPipeline from "@/components/admin/EventPipeline";
import TicketAnalytics from "@/components/admin/TicketAnalytics";
import ActivityFeed from "@/components/admin/ActivityFeed";
import RecentEventsTable from "@/components/admin/RecentEventsTable";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 200;
  const h = 36;
  const pad = 2;
  const stepX = w / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - pad - ((v / max) * (h - 2 * pad));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function computeTrend(
  values: number[]
): { value: number; direction: "up" | "down" } | undefined {
  if (values.length < 4) return undefined;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avg1 = first.reduce((s, v) => s + v, 0) / first.length;
  const avg2 = second.reduce((s, v) => s + v, 0) / second.length;
  if (avg1 === 0) return undefined;
  const pct = Math.round(((avg2 - avg1) / avg1) * 100);
  if (pct === 0) return undefined;
  return { value: Math.abs(pct), direction: pct > 0 ? "up" : "down" };
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    rolesResult,
    { count: totalEventsCount },
    eventStatusesResult,
    recentEventsResult,
    { count: totalTickets },
    { count: totalTopups },
    { count: totalVerifications },
    eventsTimeResult,
    { count: totalTransactions },
    revenueResult,
    ticketTypesResult,
    topupsFeedResult,
    verificationsFeedResult,
    adminLogsResult,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("role"),
    supabaseAdmin.from("events").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("events").select("status"),
    supabaseAdmin
      .from("events")
      .select("event_name, artist_name, venue, event_date, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin.from("tickets").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("topup_records").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("verification_logs").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("events").select("created_at"),
    supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("transactions").select("amount, transaction_type, created_at"),
    supabaseAdmin
      .from("ticket_types")
      .select("type_name, price, total_supply, remaining_supply, event_id, events ( event_name )"),
    supabaseAdmin
      .from("topup_records")
      .select("amount_rm, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("verification_logs")
      .select("verification_status, verified_at")
      .order("verified_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("admin_activity_logs")
      .select("action_type, target_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // --- Role counts ---
  const roles = rolesResult.data ?? [];
  const roleCounts: Record<string, number> = {};
  for (const p of roles) {
    roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
  }
  const roleData = Object.entries(roleCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  const totalUsers = roleCounts["user"] ?? 0;
  const totalOrganizers = roleCounts["organizer"] ?? 0;

  // --- Event pipeline ---
  const statuses = eventStatusesResult.data ?? [];
  const statusCounts: Record<string, number> = {};
  for (const e of statuses) {
    statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
  }
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  const pendingEvents = statusCounts["pending"] ?? 0;

  // --- Events trend ---
  const eventDates = eventsTimeResult.data ?? [];
  const eventsByDate: Record<string, number> = {};
  for (const e of eventDates) {
    const d = new Date(e.created_at).toISOString().slice(0, 10);
    eventsByDate[d] = (eventsByDate[d] ?? 0) + 1;
  }
  const eventsTrend = Object.entries(eventsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // --- Recent events ---
  const recentEvents = recentEventsResult.data ?? [];

  // --- Revenue ---
  const allTx = revenueResult.data ?? [];
  const totalTicketRevenue = allTx
    .filter((t) => t.transaction_type === "purchase")
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const revByDate: Record<string, number> = {};
  for (const t of allTx) {
    if (t.transaction_type !== "purchase") continue;
    const d = new Date(t.created_at).toISOString().slice(0, 10);
    revByDate[d] = (revByDate[d] ?? 0) + (t.amount ?? 0);
  }
  const revenueTrend = Object.entries(revByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // --- Most recent purchases for activity feed ---
  const recentPurchases = allTx
    .filter((t) => t.transaction_type === "purchase")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // --- Event name lookup (from join data) ---
  const eventLookup: Record<string, string> = {};
  for (const tt of ticketTypesResult.data ?? []) {
    const ev = (tt as Record<string, unknown>).events as
      | { event_name?: string }
      | { event_name?: string }[]
      | null;
    const name = ev && !Array.isArray(ev) ? ev.event_name : ev?.[0]?.event_name;
    if (name) {
      eventLookup[tt.event_id] = name;
    }
  }

  // --- Ticket analytics ---
  const ttData = ticketTypesResult.data ?? [];

  const totalTicketsSold = ttData.reduce(
    (sum, tt) => sum + (tt.total_supply - tt.remaining_supply),
    0
  );

  // --- Top performing events ---
  const soldPerEvent: Record<
    string,
    { eventId: string; name: string; sold: number }
  > = {};
  for (const tt of ttData) {
    const sold = tt.total_supply - tt.remaining_supply;
    const eventName = eventLookup[tt.event_id] ?? `Event ${tt.event_id.slice(0, 8)}`;
    if (!soldPerEvent[tt.event_id]) {
      soldPerEvent[tt.event_id] = { eventId: tt.event_id, name: eventName, sold: 0 };
    }
    soldPerEvent[tt.event_id].sold += sold;
  }
  const topEvents = Object.values(soldPerEvent)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  // --- Activity feed ---
  const feedTopups = (topupsFeedResult.data ?? []).map((t) => ({
    id: `topup-${t.created_at}`,
    type: "topup" as const,
    message: `Wallet topped up RM${t.amount_rm} (${t.payment_status})`,
    timestamp: t.created_at,
  }));

  const feedVerifications = (verificationsFeedResult.data ?? []).map((v) => ({
    id: `ver-${v.verified_at}`,
    type: "verification" as const,
    message:
      v.verification_status === "valid"
        ? "Ticket verified successfully"
        : "Ticket verification failed",
    timestamp: v.verified_at,
  }));

  const feedAdmin = (adminLogsResult.data ?? []).map((a) => ({
    id: `admin-${a.created_at}`,
    type: "admin" as const,
    message: a.description ?? `${a.action_type} ${a.target_type ?? ""}`,
    timestamp: a.created_at,
  }));

  const feedEvents = (recentEventsResult.data ?? []).map((e) => ({
    id: `evt-${e.created_at}`,
    type: "event" as const,
    message: `"${e.event_name}" created (${e.status})`,
    timestamp: e.created_at,
  }));

  const feedPurchases = recentPurchases.map((t) => ({
    id: `tx-${t.created_at}`,
    type: "purchase" as const,
    message: `Ticket purchased (RM${t.amount})`,
    timestamp: t.created_at,
  }));

  const feedItems = [
    ...feedEvents,
    ...feedPurchases,
    ...feedTopups,
    ...feedVerifications,
    ...feedAdmin,
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 10);

  const eventsValues = eventsTrend.map((d) => d.count);
  const revenueValues = revenueTrend.map((d) => d.revenue);
  const eventsTrendArrow = computeTrend(eventsValues);
  const revenueTrendArrow = computeTrend(revenueValues);

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:px-11 lg:py-9">
      <header className="mb-9 flex flex-col items-start gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.01em] text-[#0f172a]">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-[13px] text-[#64748b]">
            Platform overview and statistics
          </p>
        </div>
        <div className="text-[12px] text-[#94a3b8] md:text-right">
          Last updated{" "}
          <strong className="font-semibold text-[#0f172a]">
            {new Date().toLocaleString()}
          </strong>
        </div>
      </header>

      {/* Row 1 — KPI cards */}
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Total Users"
          value={totalUsers}
          description="Registered user accounts"
          sparkline={<Sparkline values={eventsValues} color="#2563eb" />}
        />
        <Card
          title="Total Organizers"
          value={totalOrganizers}
          description="Event organizers"
          sparkline={<Sparkline values={eventsValues} color="#2563eb" />}
        />
        <Card
          title="Total Events"
          value={totalEventsCount ?? 0}
          description="All events"
          trend={eventsTrendArrow}
          sparkline={<Sparkline values={eventsValues} color="#2563eb" />}
        />
        <Card
          title="Pending Events"
          value={pendingEvents}
          description="Awaiting approval"
          sparkline={<Sparkline values={eventsValues} color="#2563eb" />}
        />
        <Card
          title="Ticket Revenue (RM)"
          value={totalTicketRevenue}
          description="From ticket purchases"
          trend={revenueTrendArrow}
          sparkline={<Sparkline values={revenueValues} color="#2563eb" />}
        />
        <Card
          title="Tickets Sold"
          value={totalTicketsSold}
          description="Across all events"
          sparkline={<Sparkline values={eventsValues} color="#2563eb" />}
        />
      </div>

      {/* Row 2 — Trend charts */}
      <section className="mt-9">
        <TrendCharts eventsTrend={eventsTrend} revenueTrend={revenueTrend} />
      </section>

      {/* Row 3 — Event pipeline + Ticket analytics */}
      <section className="mt-9 grid gap-5 sm:grid-cols-2">
        <EventPipeline statusData={statusData} />
        <TicketAnalytics ticketTypes={ttData} eventLookup={eventLookup} />
      </section>

      {/* Row 4 — User roles + Quick stats */}
      <section className="mt-9 grid gap-5 sm:grid-cols-2">
        <AdminCharts roleData={roleData} />
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickStat
            value={totalTickets ?? 0}
            label="Tickets Issued"
          />
          <QuickStat
            value={totalTransactions ?? 0}
            label="Transactions"
          />
          <QuickStat
            value={totalTopups ?? 0}
            label="DICKEN Top-Ups"
          />
          <QuickStat
            value={totalVerifications ?? 0}
            label="Verifications"
          />
        </div>
      </section>

      {/* Row 5 — Top Performing Events */}
      {topEvents.length > 0 && (
        <section className="card-dashboard mt-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748b]">
            Top Performing Events
          </p>
          <div className="mt-4">
            {topEvents.map((ev, i) => {
              const maxSold = topEvents[0]?.sold ?? 1;
              const barPct = Math.round((ev.sold / maxSold) * 100);
              return (
                <div
                  key={ev.eventId}
                  className="flex items-center justify-between border-b border-[#f1f5f9] py-3 last:border-0"
                >
                  <span className="w-8 shrink-0 text-[13px] font-extrabold text-[#d97706]">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[13px] font-semibold text-[#0f172a]">
                    {ev.name}
                  </span>
                  <div className="mx-4 h-[6px] max-w-[140px] flex-1 overflow-hidden rounded-[3px] bg-[#f1f5f9]">
                    <div
                      className="h-full rounded-[3px] transition-all"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: "#2563eb",
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[12px] font-bold text-[#64748b]">
                    {ev.sold} sold
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Row 6 — Activity Feed */}
      <section className="mt-9">
        <ActivityFeed items={feedItems} />
      </section>

      {/* Row 7 — Recent Events Table */}
      <section className="mt-9">
        <RecentEventsTable events={recentEvents} />
      </section>
      </div>
    </main>
  );
}
