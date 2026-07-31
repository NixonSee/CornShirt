export type ResaleFailureStage = "asset_delivery" | "database_finalization";
export type ResaleAssetAction =
  | "finalize_existing"
  | "transfer"
  | "missing_transaction"
  | "ownership_mismatch";

export function decideResaleAssetAction(input: {
  currentOwner: string;
  sellerWallet: string;
  buyerWallet: string;
  hasTransactionHash: boolean;
}): ResaleAssetAction {
  const owner = input.currentOwner.toLowerCase();

  if (owner === input.buyerWallet.toLowerCase()) {
    return input.hasTransactionHash
      ? "finalize_existing"
      : "missing_transaction";
  }
  if (owner === input.sellerWallet.toLowerCase()) return "transfer";
  return "ownership_mismatch";
}

export function shouldAutoRefundResale(input: {
  stage: ResaleFailureStage;
  transferConfirmedReverted: boolean;
  retryCount: number;
}): boolean {
  return (
    input.stage === "asset_delivery" &&
    input.transferConfirmedReverted &&
    input.retryCount >= 3
  );
}
