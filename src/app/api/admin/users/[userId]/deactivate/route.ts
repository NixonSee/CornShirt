import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const FROM_EMAIL =
  process.env.REJECT_FROM_EMAIL || "CornShirt <noreply@gmail.com>";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { userId } = await params;

  if (adminId === userId) {
    return Response.json(
      { error: "You cannot deactivate your own account." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };
  const reason = body.reason ?? "";

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, name, email")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  if (profile.role === "organizer") {
    const { count } = await supabaseAdmin
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", userId)
      .in("status", ["active", "pending"])
      .gte("event_date", new Date().toISOString());

    if (count && count > 0) {
      return Response.json(
        {
          error: `Cannot deactivate this organizer. They have ${count} active or upcoming event${count === 1 ? "" : "s"}. Ask the organizer to cancel them first.`,
        },
        { status: 400 },
      );
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      status: "deactivated",
      deactivation_type: "admin",
      deactivated_at: new Date().toISOString(),
      deactivated_by: adminId,
      deactivation_reason: reason,
    })
    .eq("user_id", userId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  try {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: "876000h" },
    );

    if (banError) {
      console.error("Failed to ban deactivated user:", banError.message);
    }
  } catch (banError) {
    console.error("Failed to ban deactivated user:", banError instanceof Error ? banError.message : banError);
  }

  const { error: logError } = await supabaseAdmin
    .from("admin_activity_logs")
    .insert({
      admin_id: adminId,
      action_type: "deactivate_user",
      target_type: "user",
      target_id: userId,
      description: reason
        ? `Deactivated user: ${reason}`
        : "Deactivated user",
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
        subject: "Your CornShirt Account Has Been Deactivated",
        text: `Dear ${profile.name || "User"},\n\nYour CornShirt account has been deactivated by an administrator.\n\nReason: ${reason || "No reason provided"}\n\nIf you believe this was done in error, please contact our support team.\n\nBest regards,\nThe CornShirt Team`,
      });
    } catch (emailError) {
      console.error("Failed to send deactivation email:", emailError);
    }
  } else {
    console.warn(
      "Deactivation email not sent — missing user email or Gmail credentials.",
    );
  }

  return Response.json({ success: true });
}
