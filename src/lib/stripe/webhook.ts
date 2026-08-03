import "server-only";

import type Stripe from "stripe";
import type { Address } from "viem";

import { isEventLive } from "@/lib/eventLifecycle";
import { mintTicket, recoverMintResult } from "@/lib/nft/mint";
import { finalizeResaleCheckout } from "@/lib/stripe/resale";
import { getStripe } from "@/lib/stripe/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type FinalizeResult =
  | { ok: true; skipped?: boolean; operationId?: string }
  | { ok: false; error: string; category: string };

type TicketOperation = {
  operation_id: string;
  operation_kind: "primary_purchase" | "resale_purchase";
  state: string;
  actor_user_id: string;
  event_id: string;
  amount_sen: number;
  currency: string;
  wallet_address: string;
  stripe_checkout_session_id: string | null;
  asset_transaction_hash: `0x${string}` | null;
  token_id: number | null;
  retry_count: number;
};

function metadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const paymentIntent = session.payment_intent;
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function failed(error: string, category: string): FinalizeResult {
  return { ok: false, error, category };
}

async function loadOperation(
  operationId: string,
): Promise<TicketOperation | null> {
  const result = await supabaseAdmin
    .from("ticket_operations")
    .select(
      "operation_id, operation_kind, state, actor_user_id, event_id, amount_sen, currency, wallet_address, stripe_checkout_session_id, asset_transaction_hash, token_id, retry_count",
    )
    .eq("operation_id", operationId)
    .maybeSingle();

  return result.error ? null : (result.data as TicketOperation | null);
}

function validatePaidSession(
  session: Stripe.Checkout.Session,
  operation: TicketOperation,
): FinalizeResult | null {
  if (session.payment_status !== "paid") {
    return failed("Stripe payment is not complete.", "payment_not_paid");
  }
  if (session.id !== operation.stripe_checkout_session_id) {
    return failed("Checkout session does not match.", "session_mismatch");
  }
  if (
    session.client_reference_id !== operation.actor_user_id ||
    metadataValue(session.metadata, "userId") !== operation.actor_user_id
  ) {
    return failed("Checkout customer does not match.", "customer_mismatch");
  }
  if (
    Number(session.amount_total) !== Number(operation.amount_sen) ||
    String(session.currency ?? "").toUpperCase() !==
      operation.currency.toUpperCase()
  ) {
    return failed("Checkout amount does not match.", "amount_mismatch");
  }
  return null;
}

export async function finalizeTicketCheckout(
  session: Stripe.Checkout.Session,
): Promise<FinalizeResult> {
  if (metadataValue(session.metadata, "kind") !== "primary_ticket") {
    return { ok: true, skipped: true };
  }

  const operationId = metadataValue(session.metadata, "operationId");
  if (!operationId) {
    return failed("Stripe operation metadata is incomplete.", "metadata");
  }

  const operation = await loadOperation(operationId);
  if (!operation || operation.operation_kind !== "primary_purchase") {
    return failed("Purchase operation was not found.", "operation_not_found");
  }
  if (operation.state === "completed") {
    return { ok: true, skipped: true, operationId };
  }

  const validation = validatePaidSession(session, operation);
  if (validation) return validation;

  const paymentIntent = paymentIntentId(session);
  const paymentUpdate = await supabaseAdmin
    .from("ticket_operations")
    .update({
      state: operation.asset_transaction_hash
        ? "asset_submitted"
        : "payment_confirmed",
      stripe_payment_intent_id: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .in("state", [
      "checkout_created",
      "payment_confirmed",
      "asset_submitted",
      "delivery_failed",
    ])
    .select("operation_id")
    .maybeSingle();

  if (paymentUpdate.error || !paymentUpdate.data) {
    return failed("Payment state could not be recorded.", "storage");
  }

  const eventResult = await supabaseAdmin
    .from("events")
    .select("status, event_date")
    .eq("event_id", operation.event_id)
    .maybeSingle();
  if (eventResult.error || !eventResult.data) {
    return failed("Purchase event could not be verified.", "storage");
  }
  if (!isEventLive(eventResult.data)) {
    if (!paymentIntent) {
      return failed("Ended-event payment cannot be refunded.", "refund_failed");
    }
    const refund = await getStripe().refunds.create(
      { payment_intent: paymentIntent },
      { idempotencyKey: `primary_event_ended_refund_${operationId}` },
    );
    if (refund.status === "failed") {
      return failed("Ended-event payment refund failed.", "refund_failed");
    }
    const marked = await supabaseAdmin.rpc("mark_primary_refunded", {
      p_operation_id: operationId,
      p_refund_id: refund.id,
      p_error_category: "event_ended",
    });
    return marked.error
      ? failed("Ended-event refund state could not be recorded.", "storage")
      : { ok: true, operationId };
  }

  let mintResult;
  try {
    if (operation.asset_transaction_hash) {
      mintResult = await recoverMintResult(
        operation.wallet_address as Address,
        operation.asset_transaction_hash,
      );
    } else {
      mintResult = await mintTicket(
        operation.wallet_address as Address,
        undefined,
        async (hash) => {
          const submitted = await supabaseAdmin
            .from("ticket_operations")
            .update({
              state: "asset_submitted",
              asset_transaction_hash: hash,
              updated_at: new Date().toISOString(),
            })
            .eq("operation_id", operationId)
            .eq("state", "payment_confirmed");
          if (submitted.error) {
            throw new Error("Mint submission could not be recorded.");
          }
        },
      );
    }
  } catch (error) {
    const retryCount = Number(operation.retry_count ?? 0) + 1;
    console.error("Ticket NFT delivery failed", {
      operationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await supabaseAdmin
      .from("ticket_operations")
      .update({
        state: "delivery_failed",
        safe_error_category: "nft_mint",
        retry_count: retryCount,
        updated_at: new Date().toISOString(),
      })
      .eq("operation_id", operationId);
    if (retryCount >= 3 && paymentIntent) {
      try {
        const refund = await getStripe().refunds.create(
          { payment_intent: paymentIntent },
          { idempotencyKey: `primary_delivery_refund_${operationId}` },
        );
        if (refund.status !== "failed") {
          const marked = await supabaseAdmin.rpc("mark_primary_refunded", {
            p_operation_id: operationId,
            p_refund_id: refund.id,
            p_error_category: "nft_mint",
          });
          if (!marked.error) {
            return { ok: true, operationId };
          }
        }
      } catch (refundError) {
        console.error("Primary delivery refund failed", {
          operationId,
          error:
            refundError instanceof Error ? refundError.message : "unknown",
        });
      }
    }
    return failed("Ticket NFT delivery is pending retry.", "nft_mint");
  }

  const qrValue = `cornshirt:ticket:${crypto.randomUUID()}`;
  const finalized = await supabaseAdmin.rpc("finalize_primary_purchase", {
    p_operation_id: operationId,
    p_token_id: Number(mintResult.tokenId),
    p_asset_transaction_hash: mintResult.transactionHash,
    p_qr_code: qrValue,
  });

  if (finalized.error) {
    console.error("Primary purchase finalization failed", {
      operationId,
      message: finalized.error.message,
    });
    return failed("Ticket finalization is pending retry.", "storage");
  }

  return { ok: true, operationId };
}

async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  const result = await supabaseAdmin.rpc("claim_stripe_webhook", {
    p_event_id: event.id,
    p_event_type: event.type,
  });
  return !result.error && result.data === true;
}

async function finishStripeEvent(
  eventId: string,
  result: FinalizeResult,
): Promise<void> {
  await supabaseAdmin.rpc("finish_stripe_webhook", {
    p_event_id: eventId,
    p_succeeded: result.ok,
    p_error_category: result.ok ? null : result.category,
  });
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<FinalizeResult> {
  if (event.type !== "checkout.session.completed") {
    return { ok: true, skipped: true };
  }

  const claimed = await claimStripeEvent(event);
  if (!claimed) return { ok: true, skipped: true };

  const session = event.data.object as Stripe.Checkout.Session;
  const kind = metadataValue(session.metadata, "kind");
  const result =
    kind === "resale_ticket"
      ? await finalizeResaleCheckout(session)
      : await finalizeTicketCheckout(session);
  await finishStripeEvent(event.id, result);
  return result;
}
