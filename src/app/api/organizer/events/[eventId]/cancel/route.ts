import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CANCELLABLE_STATUSES = new Set(["pending", "active"]);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const organizerId = auth.identity.user.id;
  const { eventId } = await params;

  const { data: existing, error: loadError } = await supabaseAdmin
    .from("events")
    .select("event_id, organizer_id, status")
    .eq("event_id", eventId)
    .single();

  if (loadError || !existing || existing.organizer_id !== organizerId) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  if (!CANCELLABLE_STATUSES.has(String(existing.status ?? ""))) {
    return Response.json(
      { error: "This event can no longer be cancelled." },
      { status: 409 },
    );
  }

  let reason = "";
  try {
    const body = (await request.json()) as { reason?: unknown };
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    // No body sent — cancellation without a reason is still allowed.
  }

  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({
      status: "cancelled",
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: organizerId,
    })
    .eq("event_id", eventId);

  if (updateError) {
    return Response.json(
      { error: "Failed to cancel event: " + updateError.message },
      { status: 500 },
    );
  }

  const { error: refundEligibleError } = await supabaseAdmin
    .from("tickets")
    .update({ refund_eligible: true })
    .eq("event_id", eventId)
    .eq("status", "active");

  if (refundEligibleError) {
    console.error(
      "Failed to mark tickets refund-eligible after cancellation",
      refundEligibleError,
    );
  }

  return Response.json({ success: true });
}
