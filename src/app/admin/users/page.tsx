import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getVerifiedRole } from "@/lib/requireRole";
import { UsersPageClient } from "@/components/admin/UsersPageClient";

export default async function UsersPage() {
  const identity = await getVerifiedRole();
  const currentUserId = identity.status === "authenticated"
    ? identity.identity.user.id
    : null;

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select(
      "user_id, name, email, role, status, wallet_address, created_at, deactivated_at, deactivated_by, deactivation_reason"
    )
    .order("created_at", { ascending: false });

  const users = (profiles ?? []).map((p) => ({
    user_id: p.user_id,
    name: p.name,
    email: p.email,
    role: p.role,
    status: p.status ?? "active",
    wallet_address: p.wallet_address,
    created_at: p.created_at,
    deactivated_at: p.deactivated_at,
    deactivated_by: p.deactivated_by,
    deactivation_reason: p.deactivation_reason,
  }));

  return (
    <div
      className="main"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
    >
      <div className="top-row">
        <div>
          <h1 style={{ fontSize: 28, color: "var(--primary)" }}>
            Users ({users.length})
          </h1>
          <p
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 14,
              color: "var(--foreground)",
            }}
          >
            Manage platform users. View profiles and deactivate accounts.
          </p>
        </div>
      </div>

      <UsersPageClient users={users} currentUserId={currentUserId} />
    </div>
  );
}
