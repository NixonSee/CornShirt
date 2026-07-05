import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Marketplace belongs only to customer navigation", () => {
  const nav = readFileSync(
    new URL("../../../components/navConfig.ts", import.meta.url),
    "utf8",
  );
  const customer = nav.slice(nav.indexOf("customer:"));
  assert.match(customer, /href: "\/customer\/marketplace", label: "Marketplace"/);
  assert.ok(customer.indexOf("/customer/marketplace") < customer.indexOf("/customer/transactions"));
});

test("Marketplace exposes approved browsing controls", () => {
  const source = readFileSync(
    new URL("./MarketplaceClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /All listings/);
  assert.match(source, /My listings/);
  assert.match(source, /Purchase unavailable/);
  assert.match(source, /Cancel listing/);
});
