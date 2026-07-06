import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("wallet provisioning is customer-authorized and bodyless", () => {
  assert.match(routeSource, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(
    routeSource,
    /provisionCustomerWallet\(auth\.identity\.user\.id\)/,
  );
  assert.doesNotMatch(routeSource, /request\.json\(/);
  assert.doesNotMatch(routeSource, /privateKey|encrypted_private_key/);
});

test("wallet provisioning returns only public status fields", () => {
  assert.match(routeSource, /walletAddress:\s*result\.walletAddress/);
  assert.match(routeSource, /walletStatus:\s*result\.walletStatus/);
  assert.match(routeSource, /result\.created\s*\?\s*201\s*:\s*200/);
});
