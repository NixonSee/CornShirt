import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canListTicket, parseResalePrice } from "./marketplaceData.ts";

test("validates whole-number DICKEN prices", () => {
  assert.equal(parseResalePrice("95"), 95);
  for (const value of ["", "0", "-1", "1.5", "abc"]) {
    assert.equal(parseResalePrice(value), null);
  }
});

test("allows only transferable active tickets without an active listing", () => {
  assert.equal(canListTicket({ status: "valid", transferAllowed: true, hasActiveListing: false }), true);
  assert.equal(canListTicket({ status: "used", transferAllowed: true, hasActiveListing: false }), false);
  assert.equal(canListTicket({ status: "active", transferAllowed: false, hasActiveListing: false }), false);
  assert.equal(canListTicket({ status: "active", transferAllowed: true, hasActiveListing: true }), false);
});

test("migration enforces one active listing per ticket", () => {
  const sql = readFileSync(
    new URL("../../../../scripts/sql/create-resale-listings.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /create table if not exists public\.resale_listings/i);
  assert.match(sql, /price[^;]+check[^;]+price > 0/i);
  assert.match(sql, /where status = 'active'/i);
});
