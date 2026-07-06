import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("transaction page protects and scopes wallet history", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(source, /requireRole\(\["customer", "user"\]\)/);
  assert.match(source, /\.select\("wallet_address"\)/);
  assert.match(source, /\.from\("transactions"\)/);
  assert.match(source, /walletAddress/);
  assert.match(source, /<TransactionHistory/);
  assert.match(source, /<RoleNav role="customer"\s*\/>/);
});

test("transaction UI includes approved controls", () => {
  const source = readFileSync(
    new URL("./TransactionHistory.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /Transaction History/);
  assert.match(source, /Top ups/);
  assert.match(source, /Purchases/);
  assert.match(source, /Refunds/);
  assert.match(source, /Resale/);
  assert.match(source, /<Pagination/);
});
