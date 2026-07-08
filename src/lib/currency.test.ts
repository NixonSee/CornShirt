import assert from "node:assert/strict";
import test from "node:test";

import { formatMyr, parsePositiveMyrAmount } from "./currency.ts";

test("formats legacy major-unit values as Malaysian Ringgit", () => {
  assert.equal(formatMyr(49.9), "RM49.90");
  assert.equal(formatMyr(0), "RM0.00");
});

test("accepts positive MYR amounts with at most two decimal places", () => {
  assert.equal(parsePositiveMyrAmount("49.90"), 49.9);
  assert.equal(parsePositiveMyrAmount("1"), 1);
  assert.equal(parsePositiveMyrAmount("0"), null);
  assert.equal(parsePositiveMyrAmount("1.999"), null);
  assert.equal(parsePositiveMyrAmount("abc"), null);
});
