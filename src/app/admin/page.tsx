import {
  AdminDashboardClient,
} from "@/components/admin/AdminDashboardClient";
import {
  ADMIN_ACTIVITY_WINDOW_DAYS,
  buildAdminActivitySeries,
  type AdminTransactionRow,
} from "@/lib/adminDashboard";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);

  const activityStart = new Date();
  activityStart.setUTCDate(
    activityStart.getUTCDate() - (ADMIN_ACTIVITY_WINDOW_DAYS - 1),
  );
  activityStart.setUTCHours(0, 0, 0, 0);

  const [
    profilesResult,
    eventsResult,
    transactionCountResult,
    activityResult,
    pendingEventsResult,
    ticketTypesResult,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("user_id, name, role"),
    supabaseAdmin.from("events").select("event_id, status"),
    supabaseAdmin
      .from("transactions")
      .select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("transactions")
      .select("amount, created_at, transaction_type")
      .gte("created_at", activityStart.toISOString())
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("events")
      .select(
        "event_id, event_name, organizer_id, created_at, status",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("ticket_types")
      .select("event_id, ticket_type_id, total_supply"),
  ]);

  const profiles = profilesResult.data ?? [];
  const eventRows = eventsResult.data ?? [];
  const totalUsers = profiles.length;
  const totalCustomers = profiles.filter((profile) =>
    ["customer", "user"].includes(profile.role ?? ""),
  ).length;
  const totalOrganizers = profiles.filter(
    (profile) => profile.role === "organizer",
  ).length;
  const totalEvents = eventRows.length;
  const totalTransactions = transactionCountResult.count ?? 0;

  const statusCounts: Record<string, number> = {};
  for (const event of eventRows) {
    const status = (event.status ?? "unknown").toLowerCase();
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const ticketCountByEvent: Record<
    string,
    { count: number; supply: number }
  > = {};
  for (const ticketType of ticketTypesResult.data ?? []) {
    if (!ticketCountByEvent[ticketType.event_id]) {
      ticketCountByEvent[ticketType.event_id] = { count: 0, supply: 0 };
    }
    ticketCountByEvent[ticketType.event_id].count += 1;
    ticketCountByEvent[ticketType.event_id].supply += Number(
      ticketType.total_supply ?? 0,
    );
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile.name]),
  );
  const pendingEvents = (pendingEventsResult.data ?? []).map((event) => ({
    event_id: event.event_id,
    event_name: event.event_name,
    organizer_name: event.organizer_id
      ? (profileMap.get(event.organizer_id) ?? "Unknown")
      : undefined,
    ticket_type_count: ticketCountByEvent[event.event_id]?.count ?? 0,
    total_supply: ticketCountByEvent[event.event_id]?.supply ?? 0,
    created_at: event.created_at,
  }));
  const activitySeries = buildAdminActivitySeries(
    (activityResult.data ?? []) as AdminTransactionRow[],
  );
  const loadError = [
    profilesResult.error?.message,
    eventsResult.error?.message,
    transactionCountResult.error?.message,
    activityResult.error?.message,
    pendingEventsResult.error?.message,
    ticketTypesResult.error?.message,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AdminDashboardClient
      totalUsers={totalUsers}
      totalCustomers={totalCustomers}
      totalOrganizers={totalOrganizers}
      totalEvents={totalEvents}
      totalTransactions={totalTransactions}
      statusCounts={statusCounts}
      activitySeries={activitySeries}
      pendingEvents={pendingEvents}
      loadError={loadError || undefined}
    />
  );
}
