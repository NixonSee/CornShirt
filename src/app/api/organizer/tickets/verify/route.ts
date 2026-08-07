import type { Address } from "viem";

import { isEventLive } from "@/lib/eventLifecycle";
import { synchronizeFinishedEvents } from "@/lib/eventLifecycle.server";
import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTicketOwner } from "@/lib/nft/getOwner";

type VerifyResult =
  | "valid"
  | "invalid"
  | "used"
  | "refunded"
  | "cancelled"
  | "owner_mismatch";

async function logVerification(
  ticketId: string,
  verifiedBy: string,
  result: VerifyResult,
) {
  const { error } = await supabaseAdmin.from("verification_logs").insert({
    ticket_id: ticketId,
    verified_by: verifiedBy,
    verification_status: result,
    verified_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Verification log insert failed", error);
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const organizerId = auth.identity.user.id;
  await synchronizeFinishedEvents();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const qr =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).qr === "string"
      ? ((body as Record<string, unknown>).qr as string)
      : "";

  if (!qr.trim()) {
    return Response.json({ error: "A QR value or ticket id is required." }, { status: 400 });
  }

  const qrValue = qr.trim();
  let ticketLookup = await supabaseAdmin
    .from("tickets")
    .select(
      "ticket_id, event_id, ticket_type_id, status, wallet_address, token_id, record_source",
    )
    .eq("qr_code", qrValue)
    .maybeSingle();
  if (
    !ticketLookup.data &&
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(qrValue)
  ) {
    ticketLookup = await supabaseAdmin
      .from("tickets")
      .select(
        "ticket_id, event_id, ticket_type_id, status, wallet_address, token_id, record_source",
      )
      .eq("ticket_id", qrValue)
      .maybeSingle();
  }
  const { data: ticket, error: ticketError } = ticketLookup;

  if (ticketError) {
    console.error("Ticket lookup failed", ticketError);
    return Response.json({ error: "Ticket could not be looked up." }, { status: 500 });
  }

  if (!ticket) {
    return Response.json({ result: "invalid" as VerifyResult, error: "Ticket not found." });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("event_id, event_name, organizer_id, status, event_date")
    .eq("event_id", ticket.event_id)
    .maybeSingle();

  if (eventError || !event) {
    return Response.json({ error: "Event for this ticket could not be loaded." }, { status: 500 });
  }

  if (event.organizer_id !== organizerId) {
    return Response.json(
      { error: "You are not authorized to verify tickets for this event." },
      { status: 403 },
    );
  }

  const { data: ticketType } = await supabaseAdmin
    .from("ticket_types")
    .select("type_name")
    .eq("ticket_type_id", ticket.ticket_type_id)
    .maybeSingle();

  let result: VerifyResult;
  let onchain: "matched" | "unminted" | "owner_mismatch" | "burned" | null = null;

  if (!isEventLive(event)) {
    result = "invalid";
  } else if (ticket.status === "used") {
    result = "used";
  } else if (ticket.status === "refunded") {
    result = "refunded";
  } else if (ticket.status === "cancelled" || ticket.status === "canceled") {
    result = "cancelled";
  } else if (["active", "valid"].includes(String(ticket.status))) {
    if (
      ticket.record_source !== "stripe_nft" ||
      ticket.token_id === null ||
      ticket.token_id === undefined
    ) {
      result = "invalid";
      onchain = "unminted";
    } else {
      try {
        const owner = await getTicketOwner(BigInt(ticket.token_id));
        const walletMatches =
          typeof ticket.wallet_address === "string" &&
          owner.toLowerCase() === (ticket.wallet_address as Address).toLowerCase();

        if (walletMatches) {
          result = "valid";
          onchain = "matched";
        } else {
          result = "owner_mismatch";
          onchain = "owner_mismatch";
        }
      } catch (error) {
        console.error("On-chain ownerOf check failed", error);
        result = "owner_mismatch";
        onchain = "burned";
      }
    }
  } else {
    result = "invalid";
  }

  await logVerification(ticket.ticket_id, organizerId, result);

  return Response.json({
    result,
    onchain,
    ticket: {
      id: ticket.ticket_id,
      eventName: event.event_name,
      ticketType: ticketType?.type_name ?? "Admission",
      status: ticket.status,
      tokenId: ticket.token_id,
    },
  });
}
