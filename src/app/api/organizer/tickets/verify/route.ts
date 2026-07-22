import type { Address } from "viem";

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

function ticketIdFromQr(qr: string): string {
  const trimmed = qr.trim();
  const prefix = "cornshirt:ticket:";
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

async function logVerification(
  ticketId: string,
  eventId: string | null,
  verifiedBy: string,
  result: VerifyResult,
  detail?: string,
) {
  const { error } = await supabaseAdmin.from("verification_logs").insert({
    ticket_id: ticketId,
    event_id: eventId,
    verified_by: verifiedBy,
    result,
    detail: detail ?? null,
  });
  if (error) {
    console.error("Verification log insert failed", error);
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const organizerId = auth.identity.user.id;

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

  const ticketId = ticketIdFromQr(qr);

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select(
      "ticket_id, event_id, ticket_type_id, status, wallet_address, token_id",
    )
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (ticketError) {
    console.error("Ticket lookup failed", ticketError);
    return Response.json({ error: "Ticket could not be looked up." }, { status: 500 });
  }

  if (!ticket) {
    return Response.json({ result: "invalid" as VerifyResult, error: "Ticket not found." });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("event_id, event_name, organizer_id, status")
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

  if (String(event.status ?? "").toLowerCase() !== "active") {
    result = "invalid";
  } else if (ticket.status === "used") {
    result = "used";
  } else if (ticket.status === "refunded") {
    result = "refunded";
  } else if (ticket.status === "cancelled" || ticket.status === "canceled") {
    result = "cancelled";
  } else if (ticket.status === "active") {
    if (ticket.token_id === null || ticket.token_id === undefined) {
      result = "valid";
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

  await logVerification(ticket.ticket_id, ticket.event_id, organizerId, result);

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
