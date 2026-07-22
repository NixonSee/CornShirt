import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe/stripe";
import { burnRefundedTicket } from "@/lib/nft/burn";

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;

  const userId = auth.identity.user.id;

  let ticketId = "";
  try {
    const body = (await request.json()) as { ticketId?: unknown };
    ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!ticketId) {
    return Response.json({ error: "A ticketId is required." }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", userId)
    .maybeSingle();

  const walletAddress = profile?.wallet_address ?? null;
  if (!walletAddress) {
    return Response.json(
      { error: "Your managed wallet is unavailable." },
      { status: 409 },
    );
  }

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select(
      "ticket_id, event_id, status, refund_eligible, wallet_address, token_id, stripe_payment_intent",
    )
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return Response.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (
    typeof ticket.wallet_address !== "string" ||
    ticket.wallet_address.toLowerCase() !== walletAddress.toLowerCase()
  ) {
    return Response.json(
      { error: "You do not currently own this ticket." },
      { status: 403 },
    );
  }

  if (!ticket.refund_eligible || ticket.status !== "active") {
    return Response.json(
      { error: "This ticket is not eligible for a refund." },
      { status: 409 },
    );
  }

  const { data: existingRefund } = await supabaseAdmin
    .from("transactions")
    .select("transaction_id")
    .eq("ticket_id", ticketId)
    .eq("transaction_type", "refund")
    .maybeSingle();

  if (existingRefund) {
    return Response.json(
      { error: "This ticket has already been refunded." },
      { status: 409 },
    );
  }

  // The refund returns to the latest person who actually paid via Stripe,
  // which may differ from the current owner after a free transfer.
  const { data: latestPurchase, error: purchaseError } = await supabaseAdmin
    .from("transactions")
    .select("buyer_id, transaction_hash, amount")
    .eq("ticket_id", ticketId)
    .eq("transaction_type", "purchase")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (purchaseError || !latestPurchase) {
    return Response.json(
      { error: "The original payment for this ticket could not be found." },
      { status: 500 },
    );
  }

  let paymentIntentId = ticket.stripe_payment_intent as string | null;
  if (!paymentIntentId && latestPurchase.transaction_hash) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        latestPurchase.transaction_hash,
      );
      const sessionPaymentIntent = session.payment_intent;
      paymentIntentId =
        typeof sessionPaymentIntent === "string"
          ? sessionPaymentIntent
          : (sessionPaymentIntent?.id ?? null);
    } catch (error) {
      console.error("Could not retrieve Stripe session for refund", error);
    }
  }

  if (!paymentIntentId) {
    return Response.json(
      { error: "The original payment could not be located for refund." },
      { status: 500 },
    );
  }

  let refund;
  try {
    refund = await getStripe().refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund_${ticketId}` },
    );
  } catch (error) {
    console.error("Stripe refund failed", error);
    return Response.json(
      { error: "The Stripe refund could not be processed." },
      { status: 502 },
    );
  }

  if (refund.status === "failed") {
    return Response.json(
      { error: "The Stripe refund was declined." },
      { status: 502 },
    );
  }

  // Mark the ticket unusable immediately so the same paid acquisition can
  // never be refunded twice, even if the burn below fails and needs a
  // separate retry.
  const { data: refundedRows, error: refundedUpdateError } = await supabaseAdmin
    .from("tickets")
    .update({
      status: "refunded",
      refund_eligible: false,
      refunded_at: new Date().toISOString(),
      refund_beneficiary: latestPurchase.buyer_id,
    })
    .eq("ticket_id", ticketId)
    .eq("status", "active")
    .select("ticket_id");

  if (refundedUpdateError || !refundedRows || refundedRows.length === 0) {
    console.error(
      "Failed to mark ticket refunded after Stripe refund succeeded",
      refundedUpdateError,
    );
    return Response.json(
      {
        error:
          "Refund succeeded but the ticket could not be updated. Contact support.",
      },
      { status: 500 },
    );
  }

  let burnTransactionHash: string | null = null;
  if (ticket.token_id !== null && ticket.token_id !== undefined) {
    try {
      const burnResult = await burnRefundedTicket(BigInt(ticket.token_id));
      burnTransactionHash = burnResult.transactionHash;
      await supabaseAdmin
        .from("tickets")
        .update({ burn_transaction_hash: burnTransactionHash })
        .eq("ticket_id", ticketId);
    } catch (error) {
      console.error(
        "NFT burn failed after refund; ticket is refunded but the token remains unburned",
        error,
      );
    }
  }

  await supabaseAdmin.from("transactions").insert({
    transaction_id: crypto.randomUUID(),
    ticket_id: ticketId,
    buyer_id: latestPurchase.buyer_id,
    seller_id: null,
    transaction_hash: burnTransactionHash ?? refund.id,
    transaction_type: "refund",
    amount: Number(latestPurchase.amount ?? 0),
  });

  return Response.json({
    success: true,
    refundId: refund.id,
    burned: burnTransactionHash !== null,
  });
}
