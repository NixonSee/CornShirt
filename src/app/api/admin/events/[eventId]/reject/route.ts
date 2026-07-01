import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { eventId } = await params;
  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({ status: "rejected" })
    .eq("event_id", eventId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const { error: logError } = await supabaseAdmin
    .from("admin_activity_logs")
    .insert({
      admin_id: adminId,
      action_type: "reject_event",
      target_type: "event",
      target_id: eventId,
      description: "Rejected event",
    });

  if (logError) {
    console.error("Failed to log admin activity:", logError.message);
  }

  return Response.json({ success: true });
}
