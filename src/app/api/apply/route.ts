import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "partner-documents";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const applicant_name = formData.get("applicant_name") as string;
    const applicant_email = formData.get("applicant_email") as string;

    if (!applicant_name || !applicant_email) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from("partner_applications")
      .select("application_id")
      .eq("applicant_email", applicant_email)
      .maybeSingle();

    if (checkError) {
      return Response.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      return Response.json(
        { error: "An application with this email already exists." },
        { status: 409 },
      );
    }

    const { data: appData, error: insertError } = await supabaseAdmin
      .from("partner_applications")
      .insert({
        applicant_name,
        applicant_email,
        phone: (formData.get("phone") as string) || null,
        company_name: (formData.get("company_name") as string) || null,
        business_reg_no: (formData.get("business_reg_no") as string) || null,
        tax_id: (formData.get("tax_id") as string) || null,
        website: (formData.get("website") as string) || null,
        description: (formData.get("description") as string) || null,
        address: (formData.get("address") as string) || null,
        city: (formData.get("city") as string) || null,
        state: (formData.get("state") as string) || null,
        postal_code: (formData.get("postal_code") as string) || null,
        status: "pending",
      })
      .select("application_id")
      .single();

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    const applicationId = appData.application_id;

    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);

    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
    }

    const docTypes = ["business_license", "owner_id_proof", "tax_certificate"];

    for (const docType of docTypes) {
      const file = formData.get(docType) as File | null;
      if (!file) continue;

      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${applicationId}/${docType}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) continue;

      const { error: docError } = await supabaseAdmin
        .from("documents")
        .insert({
          application_id: applicationId,
          file_name: file.name,
          file_path: filePath,
          document_type: docType,
          file_size: file.size,
          mime_type: file.type,
        });

      if (docError) {
        console.error("Failed to insert document record:", docError.message);
      }
    }

    return Response.json({ success: true, applicationId }, { status: 201 });
  } catch (err) {
    console.error("Apply error:", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
