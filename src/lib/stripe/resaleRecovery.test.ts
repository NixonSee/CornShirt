import assert from "node:assert/strict";
import test from "node:test";

import {
  decideResaleAssetAction,
  shouldAutoRefundResale,
} from "./resaleRecovery.ts";

const SELLER = "0x1111111111111111111111111111111111111111";
const BUYER = "0x2222222222222222222222222222222222222222";

test("already-transferred resale finalizes the existing transaction without transferring again", () => {
  assert.equal(
    decideResaleAssetAction({
      currentOwner: BUYER.toUpperCase(),
      sellerWallet: SELLER,
      buyerWallet: BUYER,
      hasTransactionHash: true,
    }),
    "finalize_existing",
  );
});

test("seller-owned resale transfers and inconsistent ownership stops", () => {
  assert.equal(
    decideResaleAssetAction({
      currentOwner: SELLER,
      sellerWallet: SELLER,
      buyerWallet: BUYER,
      hasTransactionHash: false,
    }),
    "transfer",
  );
  assert.equal(
    decideResaleAssetAction({
      currentOwner: "0x3333333333333333333333333333333333333333",
      sellerWallet: SELLER,
      buyerWallet: BUYER,
      hasTransactionHash: true,
    }),
    "ownership_mismatch",
  );
  assert.equal(
    decideResaleAssetAction({
      currentOwner: BUYER,
      sellerWallet: SELLER,
      buyerWallet: BUYER,
      hasTransactionHash: false,
    }),
    "missing_transaction",
  );
});

test("never refunds after NFT ownership succeeded but database finalization failed", () => {
  assert.equal(
    shouldAutoRefundResale({
      stage: "database_finalization",
      transferConfirmedReverted: false,
      retryCount: 3,
    }),
    false,
  );
  assert.equal(
    shouldAutoRefundResale({
      stage: "database_finalization",
      transferConfirmedReverted: false,
      retryCount: 20,
    }),
    false,
  );
});

test("refunds only after repeated, receipt-confirmed transfer reverts", () => {
  assert.equal(
    shouldAutoRefundResale({
      stage: "asset_delivery",
      transferConfirmedReverted: true,
      retryCount: 2,
    }),
    false,
  );
  assert.equal(
    shouldAutoRefundResale({
      stage: "asset_delivery",
      transferConfirmedReverted: true,
      retryCount: 3,
    }),
    true,
  );
  assert.equal(
    shouldAutoRefundResale({
      stage: "asset_delivery",
      transferConfirmedReverted: false,
      retryCount: 3,
    }),
    false,
  );
});
