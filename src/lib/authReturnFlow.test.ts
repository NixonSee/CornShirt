import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loginSource = readFileSync(
  new URL("../app/login/page.tsx", import.meta.url),
  "utf8",
);
const registerSource = readFileSync(
  new URL("../app/register/page.tsx", import.meta.url),
  "utf8",
);
const setPasswordSource = readFileSync(
  new URL("../app/auth/set-password/page.tsx", import.meta.url),
  "utf8",
);

test("login and registration read validated event return paths", () => {
  [loginSource, registerSource].forEach((source) => {
    assert.equal(source.includes("useSearchParams"), true);
    assert.equal(source.includes("getSafeEventReturnTo"), true);
    assert.equal(source.includes("withEventReturnTo"), true);
    assert.equal(source.includes("<Suspense"), true);
  });
});

test("registration forwards the selected event to login", () => {
  assert.equal(
    registerSource.includes(
      'router.push(withEventReturnTo("/login", returnTo))',
    ),
    true,
  );
});

test("customer login returns to the event without changing staff routing", () => {
  assert.equal(
    loginSource.includes('router.replace(returnTo ?? "/customer")'),
    true,
  );
  assert.equal(loginSource.includes('router.replace("/admin")'), true);
  assert.equal(loginSource.includes('router.replace("/organizer")'), true);
});

test("login requests password recovery through the set-password route", () => {
  assert.equal(loginSource.includes("resetPasswordForEmail"), true);
  assert.equal(loginSource.includes("/auth/set-password"), true);
  assert.equal(loginSource.includes("Forgot password?"), true);
  assert.equal(loginSource.includes("Check your email"), true);
});

test("set-password accepts PKCE recovery codes and existing invite tokens", () => {
  assert.equal(setPasswordSource.includes("supabase.auth.getSession()"), true);
  assert.equal(setPasswordSource.includes("exchangeCodeForSession"), false);
  assert.equal(setPasswordSource.includes('queryParams.get("code")'), true);
  assert.equal(setPasswordSource.includes('hashParams.get("access_token")'), true);
  assert.equal(setPasswordSource.includes('hashParams.get("refresh_token")'), true);
});
