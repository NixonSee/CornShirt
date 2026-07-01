import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { userId } = await params;

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

  return Response.json({ success: true });
}
