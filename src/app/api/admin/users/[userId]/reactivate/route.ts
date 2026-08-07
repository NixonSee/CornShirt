import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const FROM_EMAIL =
  process.env.REJECT_FROM_EMAIL || "CornShirt <noreply@gmail.com>";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { userId } = await params;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("name, email")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      status: "active",
      deactivation_type: null,
      deactivated_at: null,
      deactivated_by: null,
      deactivation_reason: null,
      deactivation_notice_end: null,
      reactivated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  try {
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: "none" },
    );

    if (unbanError) {
      console.error("Failed to unban reactivated user:", unbanError.message);
    }
  } catch (unbanError) {
    console.error("Failed to unban reactivated user:", unbanError instanceof Error ? unbanError.message : unbanError);
  }

  const { error: logError } = await supabaseAdmin
    .from("admin_activity_logs")
    .insert({
      admin_id: adminId,
      action_type: "reactivate_user",
      target_type: "user",
      target_id: userId,
      description: "Reactivated user",
    });

  if (logError) {
    console.error("Failed to log admin activity:", logError.message);
  }

  if (profile.email && GMAIL_USER && GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      });

      await transporter.sendMail({
        from: FROM_EMAIL,
        to: profile.email,
        subject: "Your CornShirt Account Has Been Reactivated",
        text: `Dear ${profile.name || "User"},\n\nGood news! Your CornShirt account has been reactivated and is now active again.\n\nYou can log in and use the platform as usual.\n\nBest regards,\nThe CornShirt Team`,
      });
    } catch (emailError) {
      console.error("Failed to send reactivation email:", emailError);
    }
  } else {
    console.warn(
      "Reactivation email not sent — missing user email or Gmail credentials.",
    );
  }

  return Response.json({ success: true });
}
