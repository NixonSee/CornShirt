import assert from "node:assert/strict";
import test from "node:test";

import { filterTransactions, mapTransactionRows } from "./transactionData.ts";

test("maps known and unknown wallet transactions", () => {
  const customerUserId = "customer-1";
  const result = mapTransactionRows([
    { transaction_id: "1", buyer_id: customerUserId, transaction_type: "refund", amount: -500, created_at: "2026-06-20T06:32:00Z", transaction_hash: null },
    { transaction_id: "2", buyer_id: customerUserId, transaction_type: "purchase", amount: 120, created_at: "2026-06-22T01:18:00Z", transaction_hash: "0xabcdef", description: "AURORA LIVE" },
    { transaction_id: "3", transaction_type: "mystery", amount: 4, created_at: "bad" },
  ], customerUserId);
  assert.equal(result[0].type, "refund");
  assert.equal(result[0].signedAmount, 500);
  assert.equal(result[0].amountLabel, "+RM500.00");
  assert.equal(result[0].hashLabel, "Transaction pending");
  assert.equal(result[1].signedAmount, -120);
  assert.equal(result[1].amountLabel, "-RM120.00");
  assert.equal(result[2].type, "other");
  assert.equal(result[2].dateLabel, "Date unavailable");
});

test("shows resale as income for the seller and spending for the buyer", () => {
  const customerUserId = "customer-1";
  const result = mapTransactionRows([
    { transaction_id: "1", buyer_id: "customer-2", seller_id: customerUserId, transaction_type: "resale", amount: 3220, created_at: "2026-08-04T13:32:00Z" },
    { transaction_id: "2", buyer_id: customerUserId, seller_id: "customer-2", transaction_type: "resale", amount: 3220, created_at: "2026-08-04T13:32:00Z" },
  ], customerUserId);

  assert.equal(result[0].signedAmount, 3220);
  assert.equal(result[0].amountLabel, "+RM3,220.00");
  assert.equal(result[1].signedAmount, -3220);
  assert.equal(result[1].amountLabel, "-RM3,220.00");
});

test("filters by type, description, and hash", () => {
  const transactions = mapTransactionRows([
    { transaction_id: "1", transaction_type: "refund", amount: 80, description: "Eclipse", transaction_hash: "0x123", created_at: "2026-06-20T00:00:00Z" },
    { transaction_id: "2", transaction_type: "resale", amount: 95, description: "Aurora", transaction_hash: "0x999", created_at: "2026-06-21T00:00:00Z" },
  ], "customer-1");
  assert.equal(filterTransactions(transactions, "refund", "eclipse").length, 1);
  assert.equal(filterTransactions(transactions, "all", "0x999").length, 1);
});
