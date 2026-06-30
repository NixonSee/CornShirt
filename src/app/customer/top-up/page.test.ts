import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pageUrl = new URL("./page.tsx", import.meta.url);
const formUrl = new URL("./TopUpForm.tsx", import.meta.url);
const stylesUrl = new URL("../../globals.css", import.meta.url);

test("validates DICKEN amounts and previews RM at a one-to-one rate", async () => {
  const data = await import("./topUpData.ts");

  assert.deepEqual(data.DICKEN_PRESETS, [200, 500, 1000, 2000]);
  assert.equal(data.parseDickenAmount("500"), 500);
  assert.equal(data.parseDickenAmount("001"), 1);
  assert.equal(data.parseDickenAmount(""), null);
  assert.equal(data.parseDickenAmount("1.5"), null);
  assert.equal(data.parseDickenAmount("0"), null);
  assert.equal(data.parseDickenAmount("-10"), null);
  assert.equal(data.formatRinggit(1000), "RM 1,000.00");
});

test("top-up form offers Option A presets with a disabled Stripe preview", () => {
  const source = existsSync(formUrl) ? readFileSync(formUrl, "utf8") : "";

  assert.match(source, /DICKEN_PRESETS\.map/);
  assert.match(source, /Custom DICKEN amount/);
  assert.match(source, /1 DICKEN = RM 1\.00/);
  assert.match(source, /formatRinggit\(selectedAmount\)/);
  assert.match(source, /Stripe checkout coming soon/);
  assert.match(source, /disabled/);
  assert.match(source, /DICKEN token\.png/);
  assert.doesNotMatch(source, /stripe\.checkout|loadStripe|checkout\.sessions/);
});

test("top-up page protects the customer wallet and reuses the customer shell", () => {
  const source = existsSync(pageUrl) ? readFileSync(pageUrl, "utf8") : "";

  assert.match(source, /requireRole\(\["customer", "user"\]\)/);
  assert.match(source, /\.from\("profiles"\)/);
  assert.match(source, /\.select\("wallet_address"\)/);
  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.match(source, /<RoleNav role="customer"\s*\/>/);
  assert.match(source, /<TopUpForm walletAddress=\{walletAddress\}/);
  assert.match(source, /<Footer\s*\/>/);
});

test("top-up styles provide the focused responsive layout", () => {
  const styles = readFileSync(stylesUrl, "utf8");

  assert.match(styles, /\.top-up-layout\s*\{/);
  assert.match(styles, /\.top-up-form-card\s*\{/);
  assert.match(styles, /\.top-up-presets\s*\{/);
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.top-up-layout\s*\{/,
  );
});
