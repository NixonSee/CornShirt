import {
  ProfilePage,
  type ProfileDocument,
  type ProfileSection,
} from "@/components/profile";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { APP_TIME_ZONE } from "@/lib/eventDate";

const DOCUMENT_BUCKET = "partner-documents";

const DOCUMENT_LABELS: Record<string, string> = {
  business_license: "Business licence",
  owner_id_proof: "Owner ID / passport",
  tax_certificate: "Tax certificate",
};

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

export default async function OrganizerProfilePage() {
  const { user } = await requireRole(["organizer"]);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("name,email,role,status,created_at")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <main className="state-page">
        <section className="state-card">
          <h1>Profile unavailable</h1>
          <p className="muted">Your organizer information could not be loaded.</p>
        </section>
      </main>
    );
  }

  const email = user.email || profile.email || "";
  const { data: application } = email
    ? await supabaseAdmin
        .from("partner_applications")
        .select(
          "application_id,applicant_name,applicant_email,phone,company_name,business_reg_no,tax_id,website,address,city,state,postal_code,status,created_at,reviewed_at",
        )
        .ilike("applicant_email", email)
        .maybeSingle()
    : { data: null };

  const documentFields =
    "document_id,file_name,file_path,document_type,file_size,mime_type";
  let { data: documentRows } = await supabaseAdmin
    .from("documents")
    .select(documentFields)
    .eq("owner_id", user.id);

  if ((!documentRows || documentRows.length === 0) && application?.application_id) {
    const fallback = await supabaseAdmin
      .from("documents")
      .select(documentFields)
      .eq("application_id", application.application_id);
    documentRows = fallback.data;
  }

  const documents: ProfileDocument[] = await Promise.all(
    (documentRows ?? []).map(async (document) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(document.file_path, 3600);

      return {
        id: document.document_id,
        label: DOCUMENT_LABELS[document.document_type] || document.document_type,
        fileName: document.file_name,
        fileSize: document.file_size,
        downloadUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  const name =
    profile.name || application?.applicant_name || user.user_metadata?.name || "Organizer";
  const location = [
    application?.address,
    application?.city,
    application?.state,
    application?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
  const sections: ProfileSection[] = [
    {
      title: "Account information",
      description: "Your CornShirt organizer identity and account status.",
      details: [
        { label: "Full name", value: name },
        { label: "Email address", value: email },
        { label: "Phone number", value: application?.phone },
        { label: "Role", value: "Organizer" },
        { label: "Member since", value: formatDate(profile.created_at || user.created_at) },
      ],
    },
    {
      title: "Organization information",
      description: "Business information approved with your partner application.",
      details: [
        { label: "Company", value: application?.company_name },
        { label: "Business registration no.", value: application?.business_reg_no },
        { label: "Tax ID", value: application?.tax_id },
        { label: "Website", value: application?.website },
        { label: "Business address", value: location },
        { label: "Application status", value: application?.status || "Not linked" },
        { label: "Application submitted", value: formatDate(application?.created_at) },
        { label: "Application reviewed", value: formatDate(application?.reviewed_at) },
      ],
    },
  ];

  return (
    <>
      <title>Organizer Profile - CornShirt</title>
      <ProfilePage
        roleLabel="Organizer"
        name={name}
        email={email || "Email unavailable"}
        status={profile.status || application?.status || "active"}
        sections={sections}
        documents={documents}
      />
    </>
  );
}
