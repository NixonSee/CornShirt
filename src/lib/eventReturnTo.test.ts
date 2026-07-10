import assert from "node:assert/strict";
import test from "node:test";

import {
  getCustomerEventReturnTo,
  getSafeEventReturnTo,
  withEventReturnTo,
} from "./eventReturnTo.ts";

test("accepts local event detail paths", () => {
  assert.equal(
    getSafeEventReturnTo("/events/neon-corn-festival"),
    "/events/neon-corn-festival",
  );
  assert.equal(
    getSafeEventReturnTo("/events/123e4567-e89b-12d3-a456-426614174000"),
    "/events/123e4567-e89b-12d3-a456-426614174000",
  );
});

test("rejects external, malformed, and unrelated return paths", () => {
  const rejected = [
    null,
    "",
    "https://example.com/events/test",
    "//example.com/events/test",
    "/events/",
    "/events/../admin",
    "/events/test?checkout=true",
    "/events/test#tickets",
    "/admin",
    "/customer",
  ];

  rejected.forEach((value) => {
    assert.equal(getSafeEventReturnTo(value), null);
  });
});

test("adds only validated event return paths to auth links", () => {
  assert.equal(
    withEventReturnTo("/register", "/events/neon-corn-festival"),
    "/register?returnTo=%2Fevents%2Fneon-corn-festival",
  );
  assert.equal(withEventReturnTo("/login", "https://example.com"), "/login");
});

test("maps public event return paths to customer event detail paths", () => {
  assert.equal(
    getCustomerEventReturnTo("/events/neon-corn-festival"),
    "/customer/events/neon-corn-festival",
  );
  assert.equal(
    getCustomerEventReturnTo("/events/123e4567-e89b-12d3-a456-426614174000"),
    "/customer/events/123e4567-e89b-12d3-a456-426614174000",
  );
  assert.equal(getCustomerEventReturnTo("/admin"), null);
});
