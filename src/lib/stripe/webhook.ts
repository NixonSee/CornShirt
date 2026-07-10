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

async function recordPurchaseTransaction({
  session,
  ticketId,
  userId,
  amount,
}: {
  session: Stripe.Checkout.Session;
  ticketId: string;
  userId: string;
  amount: number;
}): Promise<FinalizeResult> {
  const existingTransaction = await supabaseAdmin
    .from("transactions")
    .select("transaction_id")
    .eq("transaction_hash", session.id)
    .maybeSingle();

  if (existingTransaction.error) {
    console.error("Stripe transaction lookup failed", existingTransaction.error);
    return { ok: false, error: "Transaction could not be checked." };
  }

  if (existingTransaction.data) {
    return { ok: true, skipped: true };
  }

  const transactionInsert = await supabaseAdmin.from("transactions").insert({
    transaction_id: crypto.randomUUID(),
    ticket_id: ticketId,
    buyer_id: userId,
    seller_id: null,
    transaction_hash: session.id,
    transaction_type: "purchase",
    amount,
  });

  if (transactionInsert.error) {
    console.error("Stripe transaction insert failed", transactionInsert.error);
    return { ok: false, error: "Transaction could not be recorded." };
  }

  return { ok: true };
}

export async function finalizeTicketCheckout(
  session: Stripe.Checkout.Session,
): Promise<FinalizeResult> {
  if (metadataValue(session.metadata, "kind") !== "primary_ticket") {
    return { ok: true, skipped: true };
  }

  const eventId = metadataValue(session.metadata, "eventId");
  const ticketTypeId = metadataValue(session.metadata, "ticketTypeId");
  const userId = metadataValue(session.metadata, "userId");
  const walletAddress = metadataValue(session.metadata, "walletAddress");

  if (!eventId || !ticketTypeId || !userId || !walletAddress || !session.id) {
    return { ok: false, error: "Stripe session metadata is incomplete." };
  }

  const amount = Number(session.amount_total ?? 0) / 100;

  const existingTicket = await supabaseAdmin
    .from("tickets")
    .select("ticket_id")
    .eq("transaction_hash", session.id)
    .maybeSingle();

  if (existingTicket.error) {
    console.error("Stripe ticket lookup failed", existingTicket.error);
    return { ok: false, error: "Ticket could not be checked." };
  }

  if (existingTicket.data) {
    return recordPurchaseTransaction({
      session,
      ticketId: String(existingTicket.data.ticket_id),
      userId,
      amount,
    });
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

  const ticketInsert = await supabaseAdmin.from("tickets").insert({
    ticket_id: ticketId,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    user_id: userId,
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

    console.error("Stripe ticket insert failed", ticketInsert.error);
    return { ok: false, error: "Ticket could not be created." };
  }

  const transactionResult = await recordPurchaseTransaction({
    session,
    ticketId,
    userId,
    amount,
  });

  return transactionResult.ok ? { ok: true } : transactionResult;
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (event.type !== "checkout.session.completed") {
    return { ok: true as const, skipped: true as const };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  return finalizeTicketCheckout(session);
}
