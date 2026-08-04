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
  | { ok: false; error: string };

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

export async function finalizeTicketRefundAsset(
  operationId: string,
): Promise<RefundAssetResult> {
  const operation = await loadRefundOperationById(operationId);
  if (!operation) return { ok: false, error: "Refund operation was not found." };
  if (operation.state === "completed") return { ok: true, skipped: true };

  let burnHash = operation.asset_transaction_hash;
  try {
    const owner = await getTicketOwner(BigInt(operation.token_id)).catch(
      () => null,
    );
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
    return { ok: true };
  } catch (error) {
    console.error("Refunded Ticket NFT burn is pending retry", {
      operationId: operation.operation_id,
      message: error instanceof Error ? error.message : "unknown",
    });
    await supabaseAdmin
      .from("ticket_operations")
      .update({
        safe_error_category: "nft_burn",
        updated_at: new Date().toISOString(),
      })
      .eq("operation_id", operation.operation_id);
    return {
      ok: false,
      error: "Payment was refunded, but NFT surrender is still being finalized.",
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
    return { ok: false, error: "Refund operation could not be loaded." };
  }
  if (!operation.data?.operation_id) return { ok: true, skipped: true };
  return finalizeTicketRefundAsset(operation.data.operation_id);
}
