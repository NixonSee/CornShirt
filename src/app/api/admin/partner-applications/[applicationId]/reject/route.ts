import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const REJECT_FROM_EMAIL = process.env.REJECT_FROM_EMAIL || "CornShirt <noreply@gmail.com>";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { applicationId } = await params;

  const { reason } = await request.json().catch(() => ({ reason: "" }));

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

  const { error: updateError } = await supabaseAdmin
    .from("partner_applications")
    .update({
      status: "rejected",
      reviewed_by: adminId,
      review_notes: reason || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("application_id", applicationId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  if (GMAIL_USER && GMAIL_APP_PASSWORD && reason) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      });

      await transporter.sendMail({
        from: REJECT_FROM_EMAIL,
        to: app.applicant_email,
        subject: "Your CornShirt Partner Application",
        text: `Dear ${app.applicant_name},\n\nThank you for applying to become a CornShirt partner.\n\nUnfortunately, your application has been reviewed and was not approved at this time.\n\nReason: ${reason}\n\nBest regards,\nThe CornShirt Team`,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }
  } else if (reason) {
    console.warn("Gmail credentials not configured — rejection email not sent.");
  }

  await supabaseAdmin.from("admin_activity_logs").insert({
    admin_id: adminId,
    action_type: "reject_partner",
    target_type: "partner_application",
    target_id: applicationId,
    description: reason
      ? `Rejected partner application from ${app.applicant_name} — ${reason}`
      : `Rejected partner application from ${app.applicant_name}`,
  });

  return Response.json({ success: true });
}
