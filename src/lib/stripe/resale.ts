import "server-only";

import type Stripe from "stripe";
import type { Address } from "viem";

import { isEventLive } from "@/lib/eventLifecycle";
import { synchronizeFinishedEvents } from "@/lib/eventLifecycle.server";
import { fundCustomerGas } from "@/lib/nft/fundGas";
import { getTicketOwner } from "@/lib/nft/getOwner";
import {
  MarketplaceTransactionRevertedError,
  settleContractListing,
} from "@/lib/nft/marketplaceContract";
import {
  NftTransferRevertedError,
  transferTicket,
} from "@/lib/nft/transfer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyResaleConfirmed } from "@/lib/ticketNotifications";
import { loadManagedWalletSigner } from "@/lib/walletAccess";

import {
  decideResaleAssetAction,
  shouldAutoRefundResale,
} from "./resaleRecovery";
import { getStripe } from "./stripe";
import { checkoutCustomerEmail } from "./customerEmail";
import type { FinalizeResult } from "./webhook";

type ReservedResale = {
  operation_id: string;
  amount_sen: number;
  currency: string;
  event_name: string;
  ticket_type_name: string;
  buyer_wallet_address: string;
};

type ResaleOperation = {
  operation_id: string;
  state: string;
  actor_user_id: string;
  seller_user_id: string;
  event_id: string;
  ticket_type_id: string | null;
  amount_sen: number;
  currency: string;
  wallet_address: Address;
  recipient_wallet_address: Address;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  token_id: number;
  listing_id: string;
  asset_transaction_hash: `0x${string}` | null;
  retry_count: number;
};

function metadata(session: Stripe.Checkout.Session, key: string) {
  const value = session.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const value = session.payment_intent;
  return typeof value === "string" ? value : value?.id ?? null;
}

function failed(error: string, category: string): FinalizeResult {
  return { ok: false, error, category };
}

async function sendResaleEmails(
  operation: ResaleOperation,
  session: Stripe.Checkout.Session,
  transactionHash: string | null,
): Promise<FinalizeResult> {
  if (!transactionHash) {
    return failed("Resale transaction reference is unavailable.", "storage");
  }

  const delivered = await notifyResaleConfirmed({
    operationId: operation.operation_id,
    buyerEmail: checkoutCustomerEmail(session),
    buyerUserId: operation.actor_user_id,
    sellerUserId: operation.seller_user_id,
    eventId: operation.event_id,
    ticketTypeId: operation.ticket_type_id,
    amountSen: Number(operation.amount_sen),
    currency: operation.currency,
    transactionHash,
  });

  return delivered
    ? { ok: true, operationId: operation.operation_id }
    : failed("Resale completed but its emails are pending retry.", "email");
}

export async function createResaleCheckoutSession(input: {
  listingId: string;
  buyerId: string;
  customerEmail: string;
  idempotencyKey: string;
  origin: string;
}) {
  await synchronizeFinishedEvents();

  const listingEvent = await supabaseAdmin
    .from("resale_listings")
    .select("tickets!inner(events!inner(status, event_date))")
    .eq("listing_id", input.listingId)
    .eq("status", "active")
    .maybeSingle();
  const joinedTicket = Array.isArray(listingEvent.data?.tickets)
    ? listingEvent.data.tickets[0]
    : listingEvent.data?.tickets;
  const joinedEvent = Array.isArray(joinedTicket?.events)
    ? joinedTicket.events[0]
    : joinedTicket?.events;

  if (listingEvent.error || !joinedEvent || !isEventLive(joinedEvent)) {
    return {
      ok: false as const,
      status: 409,
      error: "This listing is no longer available.",
    };
  }

  const reserved = await supabaseAdmin
    .rpc("reserve_resale_purchase", {
      p_buyer_id: input.buyerId,
      p_listing_id: input.listingId,
      p_idempotency_key: input.idempotencyKey,
    })
    .single();

  if (reserved.error || !reserved.data) {
    const message = reserved.error?.message ?? "";
    const known: Record<string, string> = {
      wallet_unavailable: "Your managed wallet is unavailable.",
      listing_unavailable: "This listing is no longer available.",
      listing_reserved: "Another customer is checking out this listing.",
      own_listing: "You cannot purchase your own listing.",
      ticket_unavailable: "The Ticket NFT is no longer available.",
      ticket_ineligible: "This ticket is not eligible for resale.",
    };
    const match = Object.entries(known).find(([key]) => message.includes(key));
    return {
      ok: false as const,
      status: message.includes("own_listing") ? 409 : match ? 409 : 500,
      error: match?.[1] ?? "Resale checkout could not be reserved.",
    };
  }

  const operation = reserved.data as ReservedResale;
  const existing = await supabaseAdmin
    .from("ticket_operations")
    .select("stripe_checkout_session_id")
    .eq("operation_id", operation.operation_id)
    .single();
  const existingId = existing.data?.stripe_checkout_session_id as
    | string
    | null
    | undefined;
  if (existingId) {
    const session = await getStripe().checkout.sessions.retrieve(existingId);
    if (session.status === "open" && session.url) {
      return {
        ok: true as const,
        url: session.url,
        operationId: operation.operation_id,
      };
    }
  }

  if (
    operation.currency.toUpperCase() !== "MYR" ||
    !Number.isSafeInteger(operation.amount_sen) ||
    operation.amount_sen <= 0
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "Listing price is not configured for MYR checkout.",
    };
  }

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: input.customerEmail,
      wallet_options: {
        link: { display: "never" },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "myr",
            unit_amount: operation.amount_sen,
            product_data: {
              name: `${operation.event_name} - ${operation.ticket_type_name} resale`,
            },
          },
        },
      ],
      success_url: `${input.origin}/customer/marketplace?resale=${operation.operation_id}`,
      cancel_url: `${input.origin}/customer/marketplace?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
      client_reference_id: input.buyerId,
      metadata: {
        kind: "resale_ticket",
        operationId: operation.operation_id,
        userId: input.buyerId,
      },
    },
    { idempotencyKey: `resale_checkout_${operation.operation_id}` },
  );

  if (!session.url) {
    return {
      ok: false as const,
      status: 502,
      error: "Stripe did not return a checkout URL.",
    };
  }

  const attached = await supabaseAdmin
    .from("ticket_operations")
    .update({
      stripe_checkout_session_id: session.id,
      state: "checkout_created",
      updated_at: new Date().toISOString(),
    })
    .eq("operation_id", operation.operation_id)
    .in("state", ["pending", "checkout_created"]);
  if (attached.error) {
    return {
      ok: false as const,
      status: 500,
      error: "Checkout was created but could not be recorded.",
    };
  }

  return {
    ok: true as const,
    url: session.url,
    operationId: operation.operation_id,
  };
}

async function refundFailedDelivery(
  operation: ResaleOperation,
  paymentIntent: string,
  category = "nft_transfer",
): Promise<FinalizeResult> {
  const refundKey =
    category === "nft_transfer"
      ? `resale_delivery_refund_${operation.operation_id}`
      : `resale_${category}_refund_${operation.operation_id}`;
  const refund = await getStripe().refunds.create(
    { payment_intent: paymentIntent },
    { idempotencyKey: refundKey },
  );
  if (refund.status === "failed") {
    return failed("Resale delivery refund failed.", "refund_failed");
  }

  const marked = await supabaseAdmin.rpc("mark_resale_refunded", {
    p_operation_id: operation.operation_id,
    p_refund_id: refund.id,
    p_error_category: category,
  });
  return marked.error
    ? failed("Refund state could not be recorded.", "storage")
    : { ok: true, operationId: operation.operation_id };
}

async function markResaleFailure(
  operationId: string,
  retryCount: number,
  category: string,
) {
  const marked = await supabaseAdmin
    .from("ticket_operations")
    .update({
      state: "delivery_failed",
      retry_count: retryCount,
      safe_error_category: category,
      updated_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId);

  if (marked.error) {
    console.error("Resale failure state could not be recorded", {
      operationId,
      category,
      message: marked.error.message,
    });
  }
}

export async function finalizeResaleCheckout(
  session: Stripe.Checkout.Session,
): Promise<FinalizeResult> {
  const operationId = metadata(session, "operationId");
  const result = await supabaseAdmin
    .from("ticket_operations")
    .select(
      "operation_id, state, actor_user_id, seller_user_id, event_id, ticket_type_id, amount_sen, currency, wallet_address, recipient_wallet_address, stripe_checkout_session_id, stripe_payment_intent_id, token_id, listing_id, asset_transaction_hash, retry_count",
    )
    .eq("operation_id", operationId)
    .eq("operation_kind", "resale_purchase")
    .maybeSingle();
  const operation = result.data as ResaleOperation | null;
  if (result.error || !operation) {
    return failed("Resale operation was not found.", "operation_not_found");
  }
  if (operation.state === "completed") {
    return sendResaleEmails(
      operation,
      session,
      operation.asset_transaction_hash,
    );
  }
  if (operation.state === "refunded") {
    return { ok: true, skipped: true, operationId };
  }

  const paymentIntent = paymentIntentId(session);
  if (
    session.payment_status !== "paid" ||
    session.id !== operation.stripe_checkout_session_id ||
    session.client_reference_id !== operation.actor_user_id ||
    metadata(session, "userId") !== operation.actor_user_id ||
    Number(session.amount_total) !== Number(operation.amount_sen) ||
    String(session.currency).toUpperCase() !== operation.currency.toUpperCase() ||
    !paymentIntent
  ) {
    return failed("Resale payment does not match.", "payment_mismatch");
  }

  const paymentStored = await supabaseAdmin
    .from("ticket_operations")
    .update({
      state: "payment_confirmed",
      stripe_payment_intent_id: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .in("state", [
      "checkout_created",
      "payment_confirmed",
      "asset_submitted",
      "asset_confirmed",
      "delivery_failed",
    ])
    .select("operation_id")
    .maybeSingle();
  if (paymentStored.error || !paymentStored.data) {
    return failed("Resale payment state could not be recorded.", "storage");
  }

  const eventResult = await supabaseAdmin
    .from("events")
    .select("status, event_date")
    .eq("event_id", operation.event_id)
    .maybeSingle();
  if (eventResult.error || !eventResult.data) {
    return failed("Resale event could not be verified.", "storage");
  }
  if (!isEventLive(eventResult.data)) {
    return refundFailedDelivery(operation, paymentIntent, "event_ended");
  }

  let transactionHash = operation.asset_transaction_hash;

  try {
    const owner = await getTicketOwner(BigInt(operation.token_id));
    const listingResult = await supabaseAdmin
      .from("resale_listings")
      .select("contract_listing_reference")
      .eq("listing_id", operation.listing_id)
      .maybeSingle();
    const contractReference = listingResult.data?.contract_listing_reference as
      | `0x${string}`
      | null
      | undefined;

    const storeSubmission = async (hash: `0x${string}`) => {
      const stored = await supabaseAdmin
        .from("ticket_operations")
        .update({
          state: "asset_submitted",
          asset_transaction_hash: hash,
          updated_at: new Date().toISOString(),
        })
        .eq("operation_id", operationId);
      if (stored.error) {
        throw new Error("Resale transfer submission was not recorded.");
      }
    };

    if (contractReference) {
      const normalizedOwner = owner.toLowerCase();
      if (
        normalizedOwner === operation.recipient_wallet_address.toLowerCase()
      ) {
        if (!transactionHash) {
          throw new Error("Transferred ownership has no recorded transaction.");
        }
      } else if (normalizedOwner === operation.wallet_address.toLowerCase()) {
        if (!paymentIntent) {
          throw new Error("Stripe payment reference is unavailable.");
        }
        transactionHash = await settleContractListing(
          {
            listingReference: contractReference,
            paymentId: paymentIntent,
            buyer: operation.recipient_wallet_address,
          },
          storeSubmission,
        );
      } else {
        throw new Error("The seller no longer owns this Ticket NFT.");
      }
    } else {
      const assetAction = decideResaleAssetAction({
        currentOwner: owner,
        sellerWallet: operation.wallet_address,
        buyerWallet: operation.recipient_wallet_address,
        hasTransactionHash: Boolean(transactionHash),
      });

      if (assetAction === "missing_transaction") {
        throw new Error("Transferred ownership has no recorded transaction.");
      }
      if (assetAction === "transfer") {
        const signer = await loadManagedWalletSigner(operation.seller_user_id);
        await fundCustomerGas(signer.address);
        const transferred = await transferTicket(
          signer.privateKey,
          signer.address,
          operation.recipient_wallet_address,
          BigInt(operation.token_id),
          undefined,
          storeSubmission,
        );
        transactionHash = transferred.transactionHash;
      } else if (assetAction === "ownership_mismatch") {
        throw new Error("The seller no longer owns this Ticket NFT.");
      }
    }
  } catch (error) {
    const retryCount = Number(operation.retry_count ?? 0) + 1;
    const transferConfirmedReverted =
      error instanceof NftTransferRevertedError ||
      error instanceof MarketplaceTransactionRevertedError;
    console.error("Resale NFT delivery failed", {
      operationId,
      retryCount,
      message: error instanceof Error ? error.message : "unknown",
    });
    await markResaleFailure(operationId, retryCount, "nft_transfer");

    if (
      shouldAutoRefundResale({
        stage: "asset_delivery",
        transferConfirmedReverted,
        retryCount,
      })
    ) {
      return refundFailedDelivery(operation, paymentIntent);
    }
    return failed("Resale NFT delivery is pending retry.", "nft_transfer");
  }

  const finalized = await supabaseAdmin.rpc("finalize_resale_purchase", {
    p_operation_id: operationId,
    p_asset_transaction_hash: transactionHash,
  });
  if (finalized.error) {
    const retryCount = Number(operation.retry_count ?? 0) + 1;
    console.error("Resale database finalization failed", {
      operationId,
      retryCount,
      code: finalized.error.code,
      message: finalized.error.message,
    });
    await markResaleFailure(
      operationId,
      retryCount,
      "database_finalization",
    );
    return failed(
      "Resale database reconciliation is pending retry.",
      "database_finalization",
    );
  }

  return sendResaleEmails(operation, session, transactionHash);
}
