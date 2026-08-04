import assert from "node:assert/strict";
import test from "node:test";

import {
  getMaximumResalePriceSen,
  getOriginalTicketPriceSen,
  MAX_RESALE_MARKUP_PERCENT,
} from "./resalePricing.ts";

test("caps resale listings at fifteen percent above face value", () => {
  assert.equal(MAX_RESALE_MARKUP_PERCENT, 15);
  assert.equal(getMaximumResalePriceSen(10_000), 11_500);
  assert.equal(getMaximumResalePriceSen(9_999), 11_498);
});

test("reads canonical ticket pricing with a legacy MYR fallback", () => {
  assert.equal(
    getOriginalTicketPriceSen({ priceSen: 12_345, price: 99 }),
    12_345,
  );
  assert.equal(getOriginalTicketPriceSen({ price: 88.5 }), 8_850);
  assert.equal(getOriginalTicketPriceSen({}), null);
});
