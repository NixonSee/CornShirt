import { notFound } from "next/navigation";
import {
  ProfilePage,
  type ProfileDocument,
  type ProfileSection,
} from "@/components/profile";
import { BackButton } from "@/components/common/BackButton";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const DOCUMENT_BUCKET = "partner-documents";

const DOCUMENT_LABELS: Record<string, string> = {
  business_license: "Business licence",
  owner_id_proof: "Owner ID / passport",
  tax_certificate: "Tax certificate",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Admin";
    case "organizer":
      return "Organizer";
    case "customer":
    case "user":
      return "Customer";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

export default async function AdminViewUserPage({
  params,
}: {
  params: Promise<{ user_id: string }>;
}) {
  await requireRole(["admin"]);

  const { user_id } = await params;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "user_id,name,email,role,status,wallet_address,wallet_status,created_at,deactivated_at,deactivated_by,deactivation_reason"
    )
    .eq("user_id", user_id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const name = profile.name || "User";
  const email = profile.email || "Email unavailable";
  const role = roleLabel(profile.role);
  const sections: ProfileSection[] = [];

  if (profile.status === "deactivated") {
    let deactivatedByName = "Unknown";
    if (profile.deactivated_by) {
      const { data: deactivator } = await supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("user_id", profile.deactivated_by)
        .maybeSingle();
      deactivatedByName = deactivator?.name || "Unknown";
    }

    sections.push({
      title: "Deactivation",
      description: "This account has been deactivated by an administrator.",
      details: [
        { label: "Status", value: "Deactivated" },
        { label: "Reason", value: profile.deactivation_reason || "No reason provided" },
        { label: "Deactivated on", value: formatDate(profile.deactivated_at) },
        { label: "Deactivated by", value: deactivatedByName },
      ],
    });
  }

  sections.push({
    title: "Account information",
    description: `The essential details for this ${role.toLowerCase()} account.`,
    details: [
      { label: "Full name", value: name },
      { label: "Email address", value: email },
      { label: "Role", value: role },
      { label: "Account status", value: profile.status || "Active" },
      { label: "Member since", value: formatDate(profile.created_at) },
    ],
  });

  if (
    (profile.role === "customer" || profile.role === "user") &&
    profile.wallet_address
  ) {
    sections.push({
      title: "Ticket wallet",
      description: "Platform-managed wallet for receiving and transferring Ticket NFTs.",
      details: [
        { label: "Wallet status", value: profile.wallet_status || "Pending" },
        {
          label: "Wallet address",
          value: profile.wallet_address,
          mono: true,
        },
      ],
    });
  }

  let documents: ProfileDocument[] | undefined;

  if (profile.role === "organizer") {
    const { data: application } = await supabaseAdmin
      .from("partner_applications")
      .select(
        "application_id,applicant_name,phone,company_name,business_reg_no,tax_id,website,address,city,state,postal_code,status,created_at,reviewed_at"
      )
      .ilike("applicant_email", email)
      .maybeSingle();

    const documentFields =
      "document_id,file_name,file_path,document_type,file_size,mime_type";
    let { data: documentRows } = await supabaseAdmin
      .from("documents")
      .select(documentFields)
      .eq("owner_id", profile.user_id);

    if (
      (!documentRows || documentRows.length === 0) &&
      application?.application_id
    ) {
      const { data: fallback } = await supabaseAdmin
        .from("documents")
        .select(documentFields)
        .eq("application_id", application.application_id);
      documentRows = fallback;
    }

    documents = await Promise.all(
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
      })
    );

    const location = [
      application?.address,
      application?.city,
      application?.state,
      application?.postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    sections.push({
      title: "Organization information",
      description: "Business information linked to this organizer account.",
      details: [
        { label: "Company", value: application?.company_name },
        { label: "Business registration no.", value: application?.business_reg_no },
        { label: "Tax ID", value: application?.tax_id },
        { label: "Website", value: application?.website },
        { label: "Phone number", value: application?.phone },
        { label: "Business address", value: location },
        { label: "Application status", value: application?.status || "Not linked" },
        { label: "Application submitted", value: formatDate(application?.created_at) },
        { label: "Application reviewed", value: formatDate(application?.reviewed_at) },
      ],
    });
  }

  return (
    <>
      <title>{name} - Profile - CornShirt Admin</title>
      <div
        className="main"
        style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
      >
        <ProfilePage
          theme="admin"
          roleLabel={role}
          name={name}
          email={email}
          status={profile.status || "active"}
          sections={sections}
          documents={documents}
          showSecurity={false}
          subtitle={`${role} account details for ${name}.`}
          headerAction={<BackButton />}
        />
      </div>
    </>
  );
}
