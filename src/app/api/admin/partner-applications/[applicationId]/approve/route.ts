import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { applicationId } = await params;

  const { data: app, error: fetchError } = await supabaseAdmin
    .from("partner_applications")
    .select("*")
    .eq("application_id", applicationId)
    .single();

  if (fetchError || !app) {
    return Response.json({ error: "Application not found." }, { status: 404 });
  }

  if (app.status !== "pending") {
    return Response.json(
      { error: `Application already ${app.status}.` },
      { status: 400 },
    );
  }

  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(app.applicant_email, {
      data: { role: "organizer" },
      redirectTo: `${BASE_URL}/auth/set-password`,
    });

  if (inviteError) {
    return Response.json({ error: inviteError.message }, { status: 500 });
  }

  const userId = inviteData.user.id;

  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      name: app.applicant_name,
      email: app.applicant_email,
      role: "organizer",
      wallet_address: null,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    console.error("Profile upsert error:", upsertError.message);
  }

  const { error: docUpdateError } = await supabaseAdmin
    .from("documents")
    .update({ owner_id: userId })
    .eq("application_id", applicationId);

  if (docUpdateError) {
    console.error("Document owner backfill error:", docUpdateError.message);
  }

  const { error: updateError } = await supabaseAdmin
    .from("partner_applications")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("application_id", applicationId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("admin_activity_logs").insert({
    admin_id: adminId,
    action_type: "approve_partner",
    target_type: "partner_application",
    target_id: applicationId,
    description: `Approved partner application from ${app.applicant_name} (${app.applicant_email})`,
  });

  return Response.json({ success: true });
}
