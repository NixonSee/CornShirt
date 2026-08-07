import { notifyEventApproved } from "@/lib/eventNotifications";
import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const APPROVABLE_STATUSES = new Set(["pending"]);

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { eventId } = await params;

  const { data: existing, error: loadError } = await supabaseAdmin
    .from("events")
    .select("event_id, status")
    .eq("event_id", eventId)
    .single();

  if (loadError || !existing) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  if (!APPROVABLE_STATUSES.has(String(existing.status ?? ""))) {
    return Response.json(
      { error: "Only pending events can be approved." },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({ status: "active" })
    .eq("event_id", eventId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const { error: logError } = await supabaseAdmin
    .from("admin_activity_logs")
    .insert({
      admin_id: adminId,
      action_type: "approve_event",
      target_type: "event",
      target_id: eventId,
      description: "Approved event",
    });

  if (logError) {
    console.error("Failed to log admin activity:", logError.message);
  }

  const emailNotifications = await notifyEventApproved({ eventId });

  return Response.json({ success: true, emailNotifications });
}
