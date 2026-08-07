import "server-only";

import { burnRefundedTicket } from "@/lib/nft/burn";
import { getPublicClient } from "@/lib/nft/contract";
import { getTicketOwner } from "@/lib/nft/getOwner";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RefundAssetOperation = {
  operation_id: string;
  state: string;
  ticket_id: string;
  wallet_address: string;
  token_id: number;
  asset_transaction_hash: `0x${string}` | null;
};

export type RefundAssetResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string; category: string };

const REFUND_RECONCILIATION_ATTEMPTS = 5;
const REFUND_RECONCILIATION_DELAY_MS = 250;

async function loadRefundOperationById(
  operationId: string,
): Promise<RefundAssetOperation | null> {
  const result = await supabaseAdmin
    .from("ticket_operations")
    .select(
      "operation_id, state, ticket_id, wallet_address, token_id, asset_transaction_hash",
    )
    .eq("operation_id", operationId)
    .eq("operation_kind", "refund")
    .maybeSingle();

  return result.error ? null : (result.data as RefundAssetOperation | null);
}

async function clearRefundAssetError(operationId: string): Promise<void> {
  await supabaseAdmin
    .from("ticket_operations")
    .update({ safe_error_category: null, updated_at: new Date().toISOString() })
    .eq("operation_id", operationId)
    .eq("state", "completed");
}

/**
 * The claim request and Stripe's refund webhook can finish at nearly the same
 * time. If one worker burns the NFT first, the other worker's burn will fail
 * even though the refund is fully complete. Re-read the shared operation and
 * recover the confirmed burn before showing an error to the customer.
 */
async function reconcileRefundCompletion(
  operationId: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < REFUND_RECONCILIATION_ATTEMPTS; attempt += 1) {
    const current = await loadRefundOperationById(operationId);
    if (current?.state === "completed") {
      await clearRefundAssetError(operationId);
      return true;
    }

    if (current?.asset_transaction_hash) {
      try {
        const receipt = await getPublicClient().getTransactionReceipt({
          hash: current.asset_transaction_hash,
        });
        if (receipt.status === "success") {
          const finalized = await supabaseAdmin.rpc("finalize_ticket_refund", {
            p_operation_id: current.operation_id,
            p_asset_transaction_hash: current.asset_transaction_hash,
          });
          if (!finalized.error) {
            await clearRefundAssetError(operationId);
            return true;
          }
        }
      } catch {
        // The competing transaction may still be waiting for its receipt.
      }
    }

    if (attempt < REFUND_RECONCILIATION_ATTEMPTS - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, REFUND_RECONCILIATION_DELAY_MS),
      );
    }
  }

  return false;
}

function refundFailureCategory(message: string): string {
  if (/http request failed|fetch failed|econnrefused|network error/i.test(message)) {
    return "blockchain_unavailable";
  }
  if (/owner does not match/i.test(message)) return "ownership_mismatch";
  if (/reverted/i.test(message)) return "nft_burn_reverted";
  if (/recorded|finalization failed/i.test(message)) {
    return "database_finalization";
  }
  return "nft_burn";
}

export async function finalizeTicketRefundAsset(
  operationId: string,
): Promise<RefundAssetResult> {
  const operation = await loadRefundOperationById(operationId);
  if (!operation) {
    return {
      ok: false,
      error: "Refund operation was not found.",
      category: "operation_not_found",
    };
  }
  if (operation.state === "completed") return { ok: true, skipped: true };

  let burnHash = operation.asset_transaction_hash;
  try {
    let owner = null;
    try {
      owner = await getTicketOwner(BigInt(operation.token_id));
    } catch (ownerError) {
      if (!burnHash) throw ownerError;
    }
    if (owner) {
      if (owner.toLowerCase() !== operation.wallet_address.toLowerCase()) {
        throw new Error("Current NFT owner does not match.");
      }
      const burned = await burnRefundedTicket(
        BigInt(operation.token_id),
        undefined,
        async (hash) => {
          const stored = await supabaseAdmin
            .from("ticket_operations")
            .update({
              state: "asset_submitted",
              asset_transaction_hash: hash,
              updated_at: new Date().toISOString(),
            })
            .eq("operation_id", operation.operation_id);
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
    await clearRefundAssetError(operation.operation_id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (await reconcileRefundCompletion(operation.operation_id)) {
      return { ok: true };
    }

    const category = refundFailureCategory(message);
    console.error("Refunded Ticket NFT burn is pending retry", {
      operationId: operation.operation_id,
      category,
      message,
    });
    await supabaseAdmin
      .from("ticket_operations")
      .update({
        safe_error_category: category,
        updated_at: new Date().toISOString(),
      })
      .eq("operation_id", operation.operation_id);
    return {
      ok: false,
      category,
      error: category === "blockchain_unavailable"
        ? "Payment was refunded, but the blockchain service is currently unreachable. Start or reconnect the configured Hardhat RPC, then retry—no second refund will be created."
        : category === "ownership_mismatch"
          ? "Payment was refunded, but the NFT owner does not match the ticket record. Contact support to reconcile ownership; no second refund will be created."
          : category === "database_finalization"
            ? "Payment and NFT surrender succeeded, but the ticket record is still being finalized. Retry safely—no second refund will be created."
            : "Payment was refunded, but NFT surrender is still being finalized. Retry safely—no second refund will be created.",
    };
  }
}

export async function finalizeRefundAssetByStripeRefundId(
  refundId: string,
): Promise<RefundAssetResult> {
  const operation = await supabaseAdmin
    .from("ticket_operations")
    .select("operation_id")
    .eq("stripe_refund_id", refundId)
    .eq("operation_kind", "refund")
    .maybeSingle();

  if (operation.error) {
    return {
      ok: false,
      error: "Refund operation could not be loaded.",
      category: "storage",
    };
  }
  if (!operation.data?.operation_id) return { ok: true, skipped: true };
  return finalizeTicketRefundAsset(operation.data.operation_id);
}
