import { notifyEventRejected } from "@/lib/eventNotifications";
import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const REJECTABLE_STATUSES = new Set(["pending"]);

export async function PUT(
  request: Request,
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

  if (!REJECTABLE_STATUSES.has(String(existing.status ?? ""))) {
    return Response.json(
      { error: "Only pending events can be rejected." },
      { status: 409 },
    );
  }

  let reason = "";
  try {
    const body = (await request.json()) as { reason?: unknown };
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    // No body sent — rejection without a reason is still allowed.
  }

  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({
      status: "rejected",
      rejection_reason: reason || null,
      rejected_at: new Date().toISOString(),
      rejected_by: adminId,
    })
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
      description: reason || "Rejected event",
    });

  if (logError) {
    console.error("Failed to log admin activity:", logError.message);
  }

  const emailNotifications = await notifyEventRejected({
    eventId,
    reason: reason || null,
  });

  return Response.json({ success: true, emailNotifications });
}
