import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card } from "@/components/common/Card";
import { BarChart, PieChart, LineChart } from "@/components/admin/AdminCharts";

export default async function AdminDashboardPage() {
  const [userRes, orgRes, eventsRes, pendingRes, txCountRes, txTimeRes] =
    await Promise.all([
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

  const monthlyMap: Record<
    string,
    { count: number; revenue: number }
  > = {};
  txTimeRes.data?.forEach((tx) => {
    if (!tx.created_at) return;
    const month = tx.created_at.slice(0, 7);
    if (!monthlyMap[month]) {
      monthlyMap[month] = { count: 0, revenue: 0 };
    }
    monthlyMap[month].count++;
    const amt = Number(tx.amount);
    if (amt > 0) monthlyMap[month].revenue += amt;
  });

  const monthlyData = Object.entries(monthlyMap)
    .map(([month, d]) => ({ month, ...d }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <main style={{ minHeight: "100vh" }}>
      <div
        className="main"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
      >
        <div className="top-row">
          <div>
            <h1 style={{ fontSize: 28, color: "var(--primary)" }}>Admin Dashboard</h1>
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
          <Card variant="metric" value={totalUsers} title="Total Users" titleClassName="metric-title-primary" />
          <Card
            variant="metric"
            value={totalOrganizers}
            title="Organizers"
            titleClassName="metric-title-primary"
          />
          <Card variant="metric" value={totalEvents} title="Total Events" titleClassName="metric-title-primary" />
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

        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card variant="panel" title="Events by Status" titleClassName="metric-title-primary">
            <BarChart data={statusCounts} />
          </Card>
          <Card variant="panel" title="Event Distribution" titleClassName="metric-title-primary">
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
      </div>
    </main>
  );
}
