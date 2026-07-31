import { ProfilePage, type ProfileSection } from "@/components/profile";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AdminProfilePage() {
  const { user } = await requireRole(["admin"]);
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("name,email,role,status,created_at")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return (
      <main className="state-page">
        <section className="state-card">
          <h1>Profile unavailable</h1>
          <p className="muted">Your administrator information could not be loaded.</p>
        </section>
      </main>
    );
  }

  const name = profile.name || user.user_metadata?.name || "Administrator";
  const email = profile.email || user.email || "Email unavailable";
  const sections: ProfileSection[] = [
    {
      title: "Administrator account",
      description: "Important identity and access information for this account.",
      details: [
        { label: "Full name", value: name },
        { label: "Email address", value: email },
        { label: "Role", value: "Administrator" },
        { label: "Account status", value: profile.status || "Active" },
        { label: "Member since", value: formatDate(profile.created_at || user.created_at) },
      ],
    },
  ];

  return (
    <>
      <title>Admin Profile - CornShirt</title>
      <ProfilePage
        roleLabel="Admin"
        name={name}
        email={email}
        status={profile.status || "active"}
        sections={sections}
      />
    </>
  );
}
