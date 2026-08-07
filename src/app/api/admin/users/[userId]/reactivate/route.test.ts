import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("reactivation loads the recipient profile and 404s when missing", () => {
  assert.match(routeSource, /\.select\("name, email"\)/);
  assert.match(routeSource, /User not found\./);
});

test("reactivation emails the user through the Gmail SMTP transport", () => {
  assert.match(routeSource, /profile\.email && GMAIL_USER && GMAIL_APP_PASSWORD/);
  assert.match(routeSource, /host:\s*"smtp\.gmail\.com"/);
  assert.match(routeSource, /to:\s*profile\.email/);
  assert.match(
    routeSource,
    /subject:\s*"Your CornShirt Account Has Been Reactivated"/,
  );
});

test("reactivation email uses a fixed template without a reason", () => {
  assert.match(routeSource, /has been reactivated and is now active again/);
  assert.doesNotMatch(routeSource, /Reason:/);
});

test("reactivation email is sent only after the profile update succeeds", () => {
  const updateIndex = routeSource.indexOf('status: "active"');
  const emailIndex = routeSource.indexOf(
    "Your CornShirt Account Has Been Reactivated",
  );
  assert.ok(updateIndex >= 0 && emailIndex > updateIndex);
});

test("reactivation email failures never fail the request", () => {
  assert.match(routeSource, /Failed to send reactivation email/);
  const emailIndex = routeSource.indexOf("transporter.sendMail");
  const catchIndex = routeSource.indexOf("catch (emailError)", emailIndex);
  assert.ok(emailIndex >= 0 && catchIndex > emailIndex);
});
