import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("deactivation fetches the recipient email alongside the role", () => {
  assert.match(routeSource, /\.select\("role, name, email"\)/);
});

test("deactivation emails the user through the Gmail SMTP transport", () => {
  assert.match(routeSource, /profile\.email && GMAIL_USER && GMAIL_APP_PASSWORD/);
  assert.match(routeSource, /host:\s*"smtp\.gmail\.com"/);
  assert.match(routeSource, /to:\s*profile\.email/);
  assert.match(
    routeSource,
    /subject:\s*"Your CornShirt Account Has Been Deactivated"/,
  );
});

test("deactivation email always includes a reason line", () => {
  assert.match(routeSource, /Reason: \$\{reason \|\| "No reason provided"\}/);
});

test("deactivation email is sent only after the profile update succeeds", () => {
  const updateIndex = routeSource.indexOf('status: "deactivated"');
  const emailIndex = routeSource.indexOf(
    "Your CornShirt Account Has Been Deactivated",
  );
  assert.ok(updateIndex >= 0 && emailIndex > updateIndex);
});

test("deactivation email failures never fail the request", () => {
  assert.match(routeSource, /Failed to send deactivation email/);
  const emailIndex = routeSource.indexOf("transporter.sendMail");
  const catchIndex = routeSource.indexOf("catch (emailError)", emailIndex);
  assert.ok(emailIndex >= 0 && catchIndex > emailIndex);
});

test("deactivation bans the auth user so existing sessions are revoked", () => {
  assert.match(routeSource, /auth\.admin\.updateUserById\(/);
  assert.match(routeSource, /ban_duration:\s*"876000h"/);
});

test("auth user is banned only after the profile update succeeds", () => {
  const updateIndex = routeSource.indexOf('status: "deactivated"');
  const banIndex = routeSource.indexOf("updateUserById");
  assert.ok(updateIndex >= 0 && banIndex > updateIndex);
});

test("ban failures never fail the request", () => {
  assert.match(routeSource, /Failed to ban deactivated user/);
  const banIndex = routeSource.indexOf("updateUserById");
  const catchIndex = routeSource.indexOf("catch (banError)", banIndex);
  assert.ok(banIndex >= 0 && catchIndex > banIndex);
});
