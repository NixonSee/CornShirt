import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card } from "@/components/common/Card";
import { BarChart, PieChart, LineChart } from "@/components/admin/AdminCharts";
import { PendingEventsTable } from "@/components/admin/PendingEventsTable";
export default async function AdminDashboardPage() {
  const [
    userRes,
    orgRes,
    eventsRes,
    pendingRes,
    txCountRes,
    txTimeRes,
    pendingEventsRes,
    ticketTypesRes,
    profilesRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "user"),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "organizer"),
    supabaseAdmin.from("events").select("event_id, status"),
    supabaseAdmin
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("transactions")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("transactions")
      .select("amount, created_at, transaction_type")
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("events")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("ticket_types")
      .select("event_id, ticket_type_id, total_supply"),
    supabaseAdmin.from("profiles").select("user_id, name"),
  ]);

  const totalUsers = userRes.count ?? 0;
  const totalOrganizers = orgRes.count ?? 0;
  const totalEvents = eventsRes.data?.length ?? 0;
  const totalPending = pendingRes.count ?? 0;
  const totalTransactions = txCountRes.count ?? 0;

  const statusCounts: Record<string, number> = {};
  eventsRes.data?.forEach((e) => {
    const s = e.status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const monthlyMap: Record<string, { count: number; revenue: number }> = {};
  txTimeRes.data?.forEach((tx) => {
    if (!tx.created_at) return;
    const month = tx.created_at.slice(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { count: 0, revenue: 0 };
    monthlyMap[month].count++;
    const amt = Number(tx.amount);
    if (amt > 0) monthlyMap[month].revenue += amt;
  });

  const monthlyData = Object.entries(monthlyMap)
    .map(([month, d]) => ({ month, ...d }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const ticketCountByEvent: Record<string, { count: number; supply: number }> =
    {};
  for (const tt of ticketTypesRes.data ?? []) {
    if (!ticketCountByEvent[tt.event_id]) {
      ticketCountByEvent[tt.event_id] = { count: 0, supply: 0 };
    }
    ticketCountByEvent[tt.event_id].count++;
    ticketCountByEvent[tt.event_id].supply += tt.total_supply;
  }

  const profileMap: Record<string, string> = {};
  for (const p of profilesRes.data ?? []) {
    profileMap[p.user_id] = p.name;
  }

  const pendingEvents = (pendingEventsRes.data ?? []).map((ev) => ({
    event_id: ev.event_id,
    event_name: ev.event_name,
    organizer_name: ev.organizer_id
      ? profileMap[ev.organizer_id] ?? "Unknown"
      : undefined,
    ticket_type_count: ticketCountByEvent[ev.event_id]?.count ?? 0,
    total_supply: ticketCountByEvent[ev.event_id]?.supply ?? 0,
    created_at: ev.created_at,
  }));

  return (
    <div
      className="main"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
    >
      <div className="top-row">
        <div>
          <h1 style={{ fontSize: 28, color: "var(--primary)" }}>
            Admin Dashboard
          </h1>
          <p
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 14,
              color: "var(--foreground)",
            }}
          >
            Review organizers, approve event submissions, and monitor platform
            activity.
          </p>
        </div>
      </div>

      <div className="grid-3">
        <Card
          variant="metric"
          value={totalUsers}
          title="Total Users"
          titleClassName="metric-title-primary"
        />
        <Card
          variant="metric"
          value={totalOrganizers}
          title="Organizers"
          titleClassName="metric-title-primary"
        />
        <Card
          variant="metric"
          value={totalEvents}
          title="Total Events"
          titleClassName="metric-title-primary"
        />
        <Card
          variant="metric"
          value={totalPending}
          title="Pending Events"
          titleClassName="metric-title-primary"
        />
        <Card
          variant="metric"
          value={totalTransactions}
          title="Transactions"
          titleClassName="metric-title-primary"
        />
      </div>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <Card
          variant="panel"
          title="Events by Status"
          titleClassName="metric-title-primary"
        >
          <BarChart data={statusCounts} />
        </Card>
        <Card
          variant="panel"
          title="Event Distribution"
          titleClassName="metric-title-primary"
        >
          <PieChart data={statusCounts} />
        </Card>
      </div>

      <Card
        variant="panel"
        title="Transaction Trends"
        titleClassName="metric-title-primary"
        style={{ marginTop: 18 }}
      >
        <LineChart data={monthlyData} />
      </Card>

      <Card
        variant="panel"
        title="Pending Review"
        titleClassName="metric-title-primary"
        titleBadge={
          <span
            className="status warn"
            style={{ padding: "4px 10px", fontSize: 13 }}
          >
            {totalPending} pending
          </span>
        }
        headerAction={
          totalPending > 5 && (
            <a
              href="/admin/pending-events"
              style={{
                color: "var(--primary)",
                fontWeight: 800,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              View all pending events →
            </a>
          )
        }
        style={{ marginTop: 24 }}
      >
        <PendingEventsTable events={pendingEvents} limit={5} />
      </Card>
    </div>
  );
}
