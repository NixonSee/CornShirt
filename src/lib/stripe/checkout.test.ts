import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("ticket checkout route creates a customer-only Stripe Checkout session", () => {
  const routeUrl = new URL(
    "../../app/api/customer/tickets/checkout/route.ts",
    import.meta.url,
  );
  const checkoutUrl = new URL("./checkout.ts", import.meta.url);

  assert.equal(existsSync(routeUrl), true);
  assert.equal(existsSync(checkoutUrl), true);

  const routeSource = readFileSync(routeUrl, "utf8");
  const checkoutSource = readFileSync(checkoutUrl, "utf8");

  assert.match(routeSource, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(routeSource, /createTicketCheckoutSession/);
  assert.match(checkoutSource, /getStripe\(\)\.checkout\.sessions\.create/);
  assert.match(checkoutSource, /currency:\s*"myr"/);
  assert.match(checkoutSource, /mode:\s*"payment"/);
  assert.match(checkoutSource, /metadata:\s*\{/);
  assert.match(checkoutSource, /eventId/);
  assert.match(checkoutSource, /ticketTypeId/);
  assert.match(checkoutSource, /userId/);
  assert.match(checkoutSource, /walletAddress/);
  assert.match(checkoutSource, /remaining_supply/);
});

test("stripe webhook route verifies raw signatures and finalizes checkout", () => {
  const routeUrl = new URL(
    "../../app/api/webhooks/stripe/route.ts",
    import.meta.url,
  );
  const webhookUrl = new URL("./webhook.ts", import.meta.url);

  assert.equal(existsSync(routeUrl), true);
  assert.equal(existsSync(webhookUrl), true);

  const routeSource = readFileSync(routeUrl, "utf8");
  const webhookSource = readFileSync(webhookUrl, "utf8");

  assert.match(routeSource, /request\.text\(\)/);
  assert.match(routeSource, /constructEvent/);
  assert.match(routeSource, /STRIPE_WEBHOOK_SECRET/);
  assert.match(webhookSource, /checkout\.session\.completed/);
  assert.match(webhookSource, /finalizeTicketCheckout/);
  assert.match(webhookSource, /\.from\("tickets"\)/);
  assert.match(webhookSource, /\.from\("transactions"\)/);
  assert.match(webhookSource, /transaction_hash:\s*session\.id/);
});

test("buy ticket button posts selected ticket type to checkout API", () => {
  const buttonUrl = new URL(
    "../../app/events/[eventId]/PurchaseButton.tsx",
    import.meta.url,
  );
  const ticketingUrl = new URL(
    "../../app/events/[eventId]/EventTicketing.tsx",
    import.meta.url,
  );

  const buttonSource = readFileSync(buttonUrl, "utf8");
  const ticketingSource = readFileSync(ticketingUrl, "utf8");

  assert.match(buttonSource, /\/api\/customer\/tickets\/checkout/);
  assert.match(buttonSource, /ticketTypeId/);
  assert.match(buttonSource, /window\.location\.assign\(data\.url\)/);
  assert.match(ticketingSource, /eventId=\{event\.id\}/);
  assert.match(ticketingSource, /ticketTypeId=\{ticketType\.id\}/);
});
