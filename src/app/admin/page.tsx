import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Card from "@/components/common/Card";
import AdminCharts from "@/components/admin/AdminCharts";
import TrendCharts from "@/components/admin/TrendCharts";
import EventPipeline from "@/components/admin/EventPipeline";
import TicketAnalytics from "@/components/admin/TicketAnalytics";
import ActivityFeed from "@/components/admin/ActivityFeed";
import RecentEventsTable from "@/components/admin/RecentEventsTable";

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

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-black uppercase tracking-wide text-slate-950">
        Admin Dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Platform overview and statistics
      </p>

      {/* Row 1 — Metric cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Total Users"
          value={totalUsers}
          description="Registered user accounts"
        />
        <Card
          title="Total Organizers"
          value={totalOrganizers}
          description="Event organizers"
        />
        <Card
          title="Total Events"
          value={totalEventsCount ?? 0}
          description="All events"
        />
        <Card
          title="Pending Events"
          value={pendingEvents}
          description="Awaiting approval"
        />
        <Card
          title="Ticket Revenue (RM)"
          value={totalTicketRevenue}
          description="From ticket purchases"
        />
        <Card
          title="Tickets Sold"
          value={totalTicketsSold}
          description="Across all events"
        />
      </div>

      {/* Row 2 — Trend charts */}
      <div className="mt-10">
        <TrendCharts eventsTrend={eventsTrend} revenueTrend={revenueTrend} />
      </div>

      {/* Row 3 — Event pipeline + Ticket analytics */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <EventPipeline statusData={statusData} />
        <TicketAnalytics ticketTypes={ttData} eventLookup={eventLookup} />
      </div>

      {/* Row 4 — User roles + Quick stats */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <AdminCharts roleData={roleData} />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card
            title="Tickets"
            value={totalTickets ?? 0}
            description="Total tickets issued"
          />
          <Card
            title="Transactions"
            value={totalTransactions ?? 0}
            description="All transactions"
          />
          <Card
            title="Top-ups"
            value={totalTopups ?? 0}
            description="DICKEN token top-ups"
          />
          <Card
            title="Verifications"
            value={totalVerifications ?? 0}
            description="Ticket verification events"
          />
        </div>
      </div>

      {/* Row 5 — Top Performing Events */}
      {topEvents.length > 0 && (
        <div className="card-dashboard mt-10">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Top Performing Events
          </p>
          <div className="mt-4 space-y-2">
            {topEvents.map((ev, i) => (
              <div
                key={ev.eventId}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-semibold text-slate-900">
                  {i + 1}. {ev.name}
                </span>
                <span className="text-slate-600">{ev.sold} tickets sold</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 6 — Activity Feed */}
      <ActivityFeed items={feedItems} />

      {/* Row 7 — Recent Events Table */}
      <RecentEventsTable events={recentEvents} />
    </main>
  );
}
