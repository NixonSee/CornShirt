import { isEventLive } from "@/lib/eventLifecycle";
import { synchronizeFinishedEvents } from "@/lib/eventLifecycle.server";
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
  await synchronizeFinishedEvents();

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select("ticket_id, event_id, status, token_id, record_source")
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return Response.json({ error: "Ticket not found." }, { status: 404 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("event_id, organizer_id, status, event_date")
    .eq("event_id", ticket.event_id)
    .maybeSingle();

  if (eventError || !event || event.organizer_id !== organizerId) {
    return Response.json(
      { error: "You are not authorized to use tickets for this event." },
      { status: 403 },
    );
  }
  if (!isEventLive(event)) {
    return Response.json(
      { error: "This event has ended. Check-in is closed." },
      { status: 409 },
    );
  }
  if (ticket.record_source !== "stripe_nft" || ticket.token_id == null) {
    return Response.json(
      { error: "Only a confirmed Ticket NFT can be used." },
      { status: 409 },
    );
  }

  // Atomic transition guards against double-use races: only rows still
  // "active" are updated, and the affected-row count tells us whether this
  // request won the race.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({ status: "used" })
    .eq("ticket_id", ticketId)
    .in("status", ["active", "valid"])
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
    verified_by: organizerId,
    verification_status: "used",
    verified_at: new Date().toISOString(),
  });

  return Response.json({ status: "used" });
}
