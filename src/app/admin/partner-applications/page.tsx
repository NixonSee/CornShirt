import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PartnerApplicationsPageClient } from "@/components/admin/PartnerApplicationsPageClient";

const BUCKET = "partner-documents";

function formatField(val: string | null | undefined): string {
  return val ?? "—";
}

export default async function PartnerApplicationsPage() {
  const { data: applications } = await supabaseAdmin
    .from("partner_applications")
    .select("*")
    .order("created_at", { ascending: false });

  const apps = applications ?? [];

  const docTypes = ["business_license", "owner_id_proof", "tax_certificate"];

  const appsWithDocs = await Promise.all(
    apps.map(async (app) => {
      const { data: docs } = await supabaseAdmin
        .from("documents")
        .select("document_id, file_name, file_path, document_type, file_size, mime_type")
        .eq("application_id", app.application_id);

      const documents = await Promise.all(
        (docs ?? []).map(async (doc) => {
          let download_url = null;
          const { data: signed } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(doc.file_path, 86400);
          if (signed) download_url = signed.signedUrl;

          return {
            document_id: doc.document_id,
            file_name: doc.file_name,
            file_path: doc.file_path,
            document_type: doc.document_type,
            file_size: doc.file_size,
            mime_type: doc.mime_type,
            download_url,
          };
        }),
      );

      return {
        application_id: app.application_id,
        applicant_name: app.applicant_name,
        applicant_email: app.applicant_email,
        phone: formatField(app.phone),
        company_name: formatField(app.company_name),
        business_reg_no: formatField(app.business_reg_no),
        tax_id: formatField(app.tax_id),
        website: formatField(app.website),
        description: formatField(app.description),
        address: formatField(app.address),
        city: formatField(app.city),
        state: formatField(app.state),
        postal_code: formatField(app.postal_code),
        status: app.status,
        review_notes: app.review_notes,
        created_at: app.created_at,
        documents,
      };
    }),
  );

  return (
    <div
      className="main"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
    >
      <div className="top-row">
        <div>
          <h1 style={{ fontSize: 28, color: "var(--primary)" }}>
            Partner Applications ({apps.length})
          </h1>
          <p
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 14,
              color: "var(--foreground)",
            }}
          >
            Review organizer applications, approve or reject them, and manage
            onboarding.
          </p>
        </div>
      </div>

      <PartnerApplicationsPageClient applications={appsWithDocs} />
    </div>
  );
}
