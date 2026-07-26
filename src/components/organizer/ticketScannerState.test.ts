import assert from "node:assert/strict";
import test from "node:test";

import {
  canCheckInTicket,
  type VerifyResult,
} from "./ticketScannerState.ts";

test("only a valid, not-yet-checked-in ticket exposes check-in", () => {
  assert.equal(canCheckInTicket("valid", false), true);
  assert.equal(canCheckInTicket("valid", true), false);

  const blockedResults: VerifyResult[] = [
    "invalid",
    "used",
    "refunded",
    "cancelled",
    "owner_mismatch",
  ];

  for (const result of blockedResults) {
    assert.equal(canCheckInTicket(result, false), false);
  }
});
