import assert from "node:assert/strict";
import test from "node:test";

import {
  getPasswordStrength,
  PASSWORD_MIN_LENGTH,
  passwordLength,
  passwordPolicyError,
} from "./passwordPolicy.ts";

test("password policy requires twelve characters without composition rules", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 12);
  assert.match(passwordPolicyError("too short") ?? "", /12 characters/);
  assert.equal(passwordPolicyError("a long passphrase"), null);
  assert.equal(passwordPolicyError("twelve chars!"), null);
});

test("strength guidance is length-focused and counts Unicode code points", () => {
  assert.equal(getPasswordStrength("short").score, 1);
  assert.equal(getPasswordStrength("ten chars!").score, 3);
  assert.equal(getPasswordStrength("correct horse battery staple").score, 4);
  assert.equal(passwordLength("🔐🔐"), 2);
});
