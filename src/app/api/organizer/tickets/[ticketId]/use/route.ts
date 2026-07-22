import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const organizerId = auth.identity.user.id;
  const { ticketId } = await params;

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select("ticket_id, event_id, status")
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return Response.json({ error: "Ticket not found." }, { status: 404 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("event_id, organizer_id")
    .eq("event_id", ticket.event_id)
    .maybeSingle();

  if (eventError || !event || event.organizer_id !== organizerId) {
    return Response.json(
      { error: "You are not authorized to use tickets for this event." },
      { status: 403 },
    );
  }

  // Atomic transition guards against double-use races: only rows still
  // "active" are updated, and the affected-row count tells us whether this
  // request won the race.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({ status: "used" })
    .eq("ticket_id", ticketId)
    .eq("status", "active")
    .select("ticket_id");

  if (updateError) {
    console.error("Ticket use update failed", updateError);
    return Response.json({ error: "Ticket could not be updated." }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return Response.json(
      { error: "Ticket is no longer valid to mark as used." },
      { status: 409 },
    );
  }

  await supabaseAdmin.from("verification_logs").insert({
    ticket_id: ticketId,
    event_id: ticket.event_id,
    verified_by: organizerId,
    result: "used",
    detail: "Marked as used at entry.",
  });

  return Response.json({ status: "used" });
}
