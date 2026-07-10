import type Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type FinalizeResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

function metadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export async function finalizeTicketCheckout(
  session: Stripe.Checkout.Session,
): Promise<FinalizeResult> {
  if (metadataValue(session.metadata, "kind") !== "primary_ticket") {
    return { ok: true, skipped: true };
  }

  const eventId = metadataValue(session.metadata, "eventId");
  const ticketTypeId = metadataValue(session.metadata, "ticketTypeId");
  const walletAddress = metadataValue(session.metadata, "walletAddress");

  if (!eventId || !ticketTypeId || !walletAddress || !session.id) {
    return { ok: false, error: "Stripe session metadata is incomplete." };
  }

  const existingTicket = await supabaseAdmin
    .from("tickets")
    .select("ticket_id")
    .eq("transaction_hash", session.id)
    .maybeSingle();

  if (existingTicket.data) {
    return { ok: true, skipped: true };
  }

  const { data: ticketType, error: ticketTypeError } = await supabaseAdmin
    .from("ticket_types")
    .select("remaining_supply, type_name, price")
    .eq("ticket_type_id", ticketTypeId)
    .maybeSingle();

  if (ticketTypeError || !ticketType) {
    return { ok: false, error: "Ticket type could not be loaded." };
  }

  const remainingSupply = Number(ticketType.remaining_supply ?? 0);
  if (remainingSupply <= 0) {
    return { ok: false, error: "Ticket type is sold out." };
  }

  const updateResult = await supabaseAdmin
    .from("ticket_types")
    .update({ remaining_supply: remainingSupply - 1 })
    .eq("ticket_type_id", ticketTypeId)
    .eq("remaining_supply", remainingSupply);

  if (updateResult.error) {
    return { ok: false, error: "Ticket inventory could not be updated." };
  }

  const ticketId = crypto.randomUUID();
  const qrValue = `cornshirt:ticket:${ticketId}`;
  const amount = Number(session.amount_total ?? 0) / 100;

  const ticketInsert = await supabaseAdmin.from("tickets").insert({
    ticket_id: ticketId,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    wallet_address: walletAddress,
    status: "active",
    qr_code: qrValue,
    transaction_hash: session.id,
  });

  if (ticketInsert.error) {
    await supabaseAdmin
      .from("ticket_types")
      .update({ remaining_supply: remainingSupply })
      .eq("ticket_type_id", ticketTypeId);

    return { ok: false, error: "Ticket could not be created." };
  }

  await supabaseAdmin.from("transactions").insert({
    transaction_id: crypto.randomUUID(),
    wallet_address: walletAddress,
    ticket_id: ticketId,
    transaction_hash: session.id,
    transaction_type: "purchase",
    description: `Stripe ticket purchase: ${String(ticketType.type_name ?? "Admission")}`,
    amount,
  });

  return { ok: true };
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (event.type !== "checkout.session.completed") {
    return { ok: true as const, skipped: true as const };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  return finalizeTicketCheckout(session);
}
