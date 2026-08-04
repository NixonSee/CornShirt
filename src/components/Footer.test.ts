import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const footerSource = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf8");

test("footer removes Contact Us from every audience", () => {
  assert.doesNotMatch(footerSource, /Contact Us/);
  assert.doesNotMatch(footerSource, /visitor\/contact/);
});

test("footer keeps public links for visitors and customers", () => {
  assert.match(footerSource, /audience === "visitor" \|\| audience === "customer"/);
  assert.match(footerSource, /VISITOR_NAV\.items/);
  assert.match(footerSource, /customer#events/);
  assert.match(footerSource, /visitor#events/);
});

test("footer uses dashboard functions for admin and organizer routes", () => {
  assert.match(footerSource, /role === "admin" \|\| role === "organizer"/);
  assert.match(footerSource, /NAV_BY_ROLE\[audience\]\.items/);
});
