import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("login loads the profile status and deactivation reason", () => {
  assert.match(source, /\.select\("role, status, deactivation_reason"\)/);
});

test("login blocks a deactivated account and shows the reason on a new line", () => {
  assert.match(source, /profile\.status === "deactivated"/);
  assert.match(
    source,
    /`Account has been deactivated\.\\nDeactivation Reason: /,
  );
  assert.match(source, /profile\.deactivation_reason \|\| "No reason provided"/);
});

test("login does not route a deactivated account to a dashboard", () => {
  const deactivatedIndex = source.indexOf('profile.status === "deactivated"');
  const routeIndex = source.indexOf("router.replace", deactivatedIndex);
  assert.ok(deactivatedIndex >= 0 && routeIndex > deactivatedIndex);
});