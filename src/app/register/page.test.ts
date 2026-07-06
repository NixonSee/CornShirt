import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("customer registration marks the wallet pending before provisioning", () => {
  assert.match(source, /role:\s*"customer"/);
  assert.match(source, /wallet_status:\s*"pending"/);

  const profileIndex = source.indexOf('.from("profiles").insert');
  const provisionIndex = source.indexOf(
    "const walletReady = await provisionWallet()",
    profileIndex,
  );
  assert.ok(profileIndex >= 0 && provisionIndex > profileIndex);
});

test("registration provisions through a bodyless request and supports retry", () => {
  assert.match(source, /method:\s*"POST"/);
  assert.doesNotMatch(source, /privateKey|encrypted_private_key/);
  assert.match(source, /Creating your CornShirt wallet/);
  assert.match(source, /Retry wallet setup/);
  assert.match(source, /provisionWallet/);
});
