import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relative: string) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

test("workflow migration is additive, private, and integer-sen based", () => {
  const sql = source(
    "../../../scripts/sql/2026-07-23-stripe-ticket-marketplace-workflows.sql",
  );

  assert.match(sql, /^begin;/i);
  assert.match(sql, /price_sen bigint/i);
  assert.match(sql, /record_source text not null default 'legacy'/i);
  assert.match(sql, /create table if not exists public\.ticket_operations/i);
  assert.match(sql, /create table if not exists public\.stripe_webhook_events/i);
  assert.match(sql, /create table if not exists public\.seller_proceeds/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.ticket_operations/i);
  assert.match(sql, /reserve_primary_ticket/i);
  assert.match(sql, /reserve_resale_purchase/i);
  assert.match(sql, /finalize_primary_purchase/i);
  assert.match(sql, /finalize_resale_purchase/i);
  assert.match(sql, /finalize_direct_transfer/i);
  assert.match(sql, /finalize_ticket_refund/i);
  assert.match(sql, /\ncommit;/i);
});

test("direct transfer remains server-authorized and receipt-confirmed", () => {
  const route = source(
    "../../app/api/customer/tickets/[ticketId]/transfer/route.ts",
  );

  assert.match(route, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(route, /recipientEmail/);
  assert.match(route, /record_source !== "stripe_nft"/);
  assert.match(route, /getTicketOwner/);
  assert.match(route, /loadManagedWalletSigner/);
  assert.match(route, /fundCustomerGas/);
  assert.match(route, /transferTicket/);
  assert.match(route, /finalize_direct_transfer/);
});

test("resale checkout separates NFT failure from database reconciliation", () => {
  const route = source(
    "../../app/api/customer/marketplace/[listingId]/checkout/route.ts",
  );
  const resale = source("./resale.ts");

  assert.match(route, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(resale, /reserve_resale_purchase/);
  assert.match(resale, /currency:\s*"myr"/);
  assert.match(resale, /customer_email:\s*input\.customerEmail/);
  assert.match(resale, /link:\s*\{\s*display:\s*"never"\s*\}/);
  assert.match(route, /auth\.identity\.user\.email/);
  assert.match(resale, /getTicketOwner/);
  assert.match(resale, /transferTicket/);
  assert.match(resale, /finalize_resale_purchase/);
  assert.match(resale, /database_finalization/);
  assert.match(resale, /NftTransferRevertedError/);
  assert.match(resale, /shouldAutoRefundResale/);
  assert.match(resale, /resale_delivery_refund_/);
  assert.match(resale, /idempotencyKey/);
});

test("resale repair migration supports purchased listings and resale records", () => {
  const sql = source(
    "../../../scripts/sql/2026-07-23-repair-resale-finalization.sql",
  );

  assert.match(sql, /^begin;/i);
  assert.match(sql, /resale_listings_status_check/i);
  assert.match(sql, /'active', 'cancelled', 'purchased'/i);
  assert.match(sql, /transactions_transaction_type_check/i);
  assert.match(sql, /'purchase', 'refund', 'transfer', 'resale', 'topup'/i);
  assert.match(sql, /create or replace function public\.finalize_resale_purchase/i);
  assert.match(sql, /on conflict \(operation_id\) do nothing/i);
  assert.match(sql, /on conflict \(operation_id, transaction_type\)/i);
  assert.match(sql, /\ncommit;/i);
});

test("webhook claims events and validates authoritative payment fields", () => {
  const webhook = source("./webhook.ts");

  assert.match(webhook, /claim_stripe_webhook/);
  assert.match(webhook, /session\.payment_status !== "paid"/);
  assert.match(webhook, /session\.amount_total/);
  assert.match(webhook, /operation\.currency/);
  assert.match(webhook, /recoverMintResult/);
  assert.match(webhook, /primary_delivery_refund_/);
  assert.match(webhook, /finish_stripe_webhook/);
});
