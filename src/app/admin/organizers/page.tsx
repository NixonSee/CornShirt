import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { OrganizersPageClient } from "@/components/admin/OrganizersPageClient";
export default async function OrganizersPage() {
  const [profilesRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "organizer")
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("events").select("event_id, organizer_id, status"),
  ]);

  const organizersRaw = profilesRes.data ?? [];
  const events = eventsRes.data ?? [];

  const eventStats: Record<
    string,
    { total: number; active: number; pending: number }
  > = {};

  for (const ev of events) {
    if (!ev.organizer_id) continue;
    if (!eventStats[ev.organizer_id]) {
      eventStats[ev.organizer_id] = { total: 0, active: 0, pending: 0 };
    }
    eventStats[ev.organizer_id].total++;
    if (ev.status === "active") eventStats[ev.organizer_id].active++;
    if (ev.status === "pending") eventStats[ev.organizer_id].pending++;
  }

  const organizers = organizersRaw.map((org) => ({
    user_id: org.user_id,
    name: org.name,
    email: org.email,
    wallet_address: org.wallet_address,
    stats: eventStats[org.user_id] ?? { total: 0, active: 0, pending: 0 },
  }));

  return (
    <div
      className="main"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
    >
      <div className="top-row">
        <div>
          <h1 style={{ fontSize: 28, color: "var(--primary)" }}>
            Organizers
          </h1>
          <p
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 14,
              color: "var(--foreground)",
            }}
          >
            View registered organizers and their events.
          </p>
        </div>
      </div>

      <OrganizersPageClient organizers={organizers} />
    </div>
  );
}
