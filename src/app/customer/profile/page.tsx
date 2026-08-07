import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { ProfilePage, type ProfileSection } from "@/components/profile";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { APP_TIME_ZONE } from "@/lib/eventDate";

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
}

export default async function CustomerProfilePage() {
  const { user } = await requireRole(["customer", "user"]);
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("name,email,role,status,wallet_address,wallet_status,created_at")
    .eq("user_id", user.id)
    .single();

  const name = profile?.name || user.user_metadata?.name || "Customer";
  const email = user.email || profile?.email || "Email unavailable";
  const sections: ProfileSection[] = [
    {
      title: "Account information",
      description: "The essential details connected to your CornShirt account.",
      details: [
        { label: "Full name", value: name },
        { label: "Email address", value: email },
        { label: "Role", value: "Customer" },
        { label: "Member since", value: formatDate(profile?.created_at || user.created_at) },
      ],
    },
    {
      title: "Ticket wallet",
      description: "Your platform-managed wallet receives and transfers Ticket NFTs.",
      details: [
        { label: "Wallet status", value: profile?.wallet_status || "Pending" },
        {
          label: "Wallet address",
          value: profile?.wallet_address || "Wallet setup is not complete",
          mono: true,
        },
      ],
    },
  ];

  return (
    <div className="app-shell">
      <title>Customer Profile - CornShirt</title>
      <RoleNav role="customer" />
      {error || !profile ? (
        <main className="state-page">
          <section className="state-card">
            <h1>Profile unavailable</h1>
            <p className="muted">Your customer information could not be loaded.</p>
          </section>
        </main>
      ) : (
        <ProfilePage
          roleLabel="Customer"
          name={name}
          email={email}
          status={profile.status || "active"}
          sections={sections}
        />
      )}
      <Footer />
    </div>
  );
}
