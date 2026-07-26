import { burnRefundedTicket } from "@/lib/nft/burn";
import { getPublicClient } from "@/lib/nft/contract";
import { getTicketOwner } from "@/lib/nft/getOwner";
import { authorizeApiRole } from "@/lib/requireRole";
import { getStripe } from "@/lib/stripe/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RefundOperation = {
  operation_id: string;
  state: string;
  actor_user_id: string;
  recipient_user_id: string;
  amount_sen: number;
  currency: string;
  stripe_payment_intent_id: string;
  stripe_refund_id: string | null;
  asset_transaction_hash: `0x${string}` | null;
};

async function resolvePaymentIntent(
  directId: string | null,
  sessionId: string | null,
) {
  if (directId) return directId;
  if (!sessionId) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;
  const userId = auth.identity.user.id;

  const body = (await request.json().catch(() => null)) as {
    ticketId?: unknown;
  } | null;
  const ticketId =
    typeof body?.ticketId === "string" ? body.ticketId.trim() : "";
  if (!ticketId) {
    return Response.json({ error: "A ticketId is required." }, { status: 400 });
  }

  const [profileResult, ticketResult, existingOperationResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("wallet_address")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("tickets")
        .select(
          "ticket_id, event_id, status, refund_eligible, wallet_address, token_id, stripe_payment_intent, record_source",
        )
        .eq("ticket_id", ticketId)
        .maybeSingle(),
      supabaseAdmin
        .from("ticket_operations")
        .select(
          "operation_id, state, actor_user_id, recipient_user_id, amount_sen, currency, stripe_payment_intent_id, stripe_refund_id, asset_transaction_hash",
        )
        .eq("ticket_id", ticketId)
        .eq("operation_kind", "refund")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const walletAddress = String(profileResult.data?.wallet_address ?? "");
  const ticket = ticketResult.data;
  if (!walletAddress) {
    return Response.json(
      { error: "Your managed wallet is unavailable." },
      { status: 409 },
    );
  }
  if (
    ticketResult.error ||
    !ticket ||
    String(ticket.wallet_address ?? "").toLowerCase() !==
      walletAddress.toLowerCase()
  ) {
    return Response.json(
      { error: "You do not currently own this ticket." },
      { status: 403 },
    );
  }
  if (ticket.record_source !== "stripe_nft" || ticket.token_id == null) {
    return Response.json(
      { error: "Only a confirmed Ticket NFT can be refunded." },
      { status: 409 },
    );
  }

  let operation = existingOperationResult.data as RefundOperation | null;
  if (operation?.state === "completed") {
    return Response.json({ success: true, burned: true });
  }
  if (
    !operation &&
    (!ticket.refund_eligible ||
      !["active", "valid"].includes(String(ticket.status).toLowerCase()))
  ) {
    return Response.json(
      { error: "This ticket is not eligible for a refund." },
      { status: 409 },
    );
  }
  if (operation && operation.actor_user_id !== userId) {
    return Response.json(
      { error: "A refund is already being processed for this ticket." },
      { status: 409 },
    );
  }

  if (!operation) {
    const acquisitionResult = await supabaseAdmin
      .from("transactions")
      .select(
        "buyer_id, transaction_hash, amount, amount_sen, currency, operation_id, stripe_checkout_session_id, stripe_payment_intent_id",
      )
      .eq("ticket_id", ticketId)
      .in("transaction_type", ["purchase", "resale"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const acquisition = acquisitionResult.data;
    if (acquisitionResult.error || !acquisition?.buyer_id) {
      return Response.json(
        { error: "The latest paid acquisition could not be found." },
        { status: 500 },
      );
    }

    let paymentIntent: string | null = null;
    try {
      paymentIntent = await resolvePaymentIntent(
        String(
          acquisition.stripe_payment_intent_id ??
            ticket.stripe_payment_intent ??
            "",
        ) || null,
        String(
          acquisition.stripe_checkout_session_id ??
            acquisition.transaction_hash ??
            "",
        ) || null,
      );
    } catch (error) {
      console.error("Stripe acquisition lookup failed", {
        ticketId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    if (!paymentIntent) {
      return Response.json(
        { error: "The Stripe payment could not be located." },
        { status: 500 },
      );
    }

    const amountSen = Number(
      acquisition.amount_sen ??
        Math.round(Math.abs(Number(acquisition.amount ?? 0)) * 100),
    );
    const inserted = await supabaseAdmin
      .from("ticket_operations")
      .insert({
        operation_kind: "refund",
        state: "pending",
        idempotency_key: `refund_${ticketId}`,
        actor_user_id: userId,
        recipient_user_id: acquisition.buyer_id,
        event_id: ticket.event_id,
        ticket_id: ticketId,
        related_operation_id: acquisition.operation_id,
        amount_sen: amountSen,
        currency: acquisition.currency ?? "MYR",
        wallet_address: walletAddress,
        stripe_payment_intent_id: paymentIntent,
        token_id: ticket.token_id,
      })
      .select(
        "operation_id, state, actor_user_id, recipient_user_id, amount_sen, currency, stripe_payment_intent_id, stripe_refund_id, asset_transaction_hash",
      )
      .single();
    if (inserted.error || !inserted.data) {
      return Response.json(
        { error: "Refund operation could not be started." },
        { status: inserted.error?.code === "23505" ? 409 : 500 },
      );
    }
    operation = inserted.data as RefundOperation;
  }

  if (!operation.stripe_refund_id) {
    try {
      const refund = await getStripe().refunds.create(
        { payment_intent: operation.stripe_payment_intent_id },
        { idempotencyKey: `ticket_refund_${ticketId}` },
      );
      if (refund.status === "failed") {
        return Response.json(
          { error: "The Stripe refund was declined." },
          { status: 502 },
        );
      }
      operation.stripe_refund_id = refund.id;
      const marked = await supabaseAdmin
        .from("ticket_operations")
        .update({
          state: "refund_pending",
          stripe_refund_id: refund.id,
          updated_at: new Date().toISOString(),
        })
        .eq("operation_id", operation.operation_id);
      if (marked.error) {
        throw new Error("Refund result could not be stored.");
      }
      await supabaseAdmin
        .from("tickets")
        .update({ status: "refund_pending", refund_eligible: false })
        .eq("ticket_id", ticketId);
    } catch (error) {
      console.error("Stripe ticket refund failed", {
        ticketId,
        message: error instanceof Error ? error.message : "unknown",
      });
      return Response.json(
        { error: "The Stripe refund could not be processed safely." },
        { status: 502 },
      );
    }
  }

  let burnHash = operation.asset_transaction_hash;
  try {
    const owner = await getTicketOwner(BigInt(ticket.token_id)).catch(
      () => null,
    );
    if (owner) {
      if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Current NFT owner does not match.");
      }
      const burned = await burnRefundedTicket(
        BigInt(ticket.token_id),
        undefined,
        async (hash) => {
          const stored = await supabaseAdmin
            .from("ticket_operations")
            .update({
              state: "asset_submitted",
              asset_transaction_hash: hash,
              updated_at: new Date().toISOString(),
            })
            .eq("operation_id", operation!.operation_id);
          if (stored.error) throw new Error("Burn submission was not recorded.");
        },
      );
      burnHash = burned.transactionHash;
    } else if (burnHash) {
      const receipt = await getPublicClient().getTransactionReceipt({
        hash: burnHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Stored burn transaction reverted.");
      }
    } else {
      throw new Error("NFT burn state could not be recovered.");
    }

    const finalized = await supabaseAdmin.rpc("finalize_ticket_refund", {
      p_operation_id: operation.operation_id,
      p_asset_transaction_hash: burnHash,
    });
    if (finalized.error) throw new Error("Refund finalization failed.");
  } catch (error) {
    console.error("Refunded Ticket NFT burn is pending retry", {
      operationId: operation.operation_id,
      message: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      {
        error:
          "Payment was refunded, but NFT surrender is still being finalized. Retry safely.",
      },
      { status: 502 },
    );
  }

  return Response.json({
    success: true,
    refundId: operation.stripe_refund_id,
    burned: true,
  });
}
