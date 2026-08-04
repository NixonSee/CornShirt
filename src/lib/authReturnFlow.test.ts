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
const callbackSource = readFileSync(
  new URL("../app/auth/callback/route.ts", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);
const interceptorSource = readFileSync(
  new URL("../components/auth/AuthTokenInterceptor.tsx", import.meta.url),
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
    loginSource.includes(
      'router.replace(getCustomerEventReturnTo(returnTo) ?? "/customer")',
    ),
    true,
  );
  assert.equal(loginSource.includes("getCustomerEventReturnTo"), true);
  assert.equal(loginSource.includes('router.replace("/admin")'), true);
  assert.equal(loginSource.includes('router.replace("/organizer")'), true);
});

test("login requests password recovery through the auth callback route", () => {
  assert.equal(loginSource.includes("resetPasswordForEmail"), true);
  assert.equal(loginSource.includes("/auth/callback"), true);
  assert.equal(loginSource.includes("Forgot password?"), true);
  assert.equal(loginSource.includes("Check your email"), true);
});

test("auth callback exchanges the PKCE code before set-password", () => {
  assert.equal(callbackSource.includes("exchangeCodeForSession"), true);
  assert.equal(callbackSource.includes('searchParams.get("code")'), true);
  assert.equal(callbackSource.includes('searchParams.get("type")'), true);
  assert.equal(callbackSource.includes("/auth/set-password"), true);
});

test("set-password relies on the session established by the callback", () => {
  assert.equal(setPasswordSource.includes("supabase.auth.getSession()"), true);
  assert.equal(setPasswordSource.includes("exchangeCodeForSession"), false);
  assert.equal(setPasswordSource.includes('queryParams.get("code")'), false);
  assert.equal(
    setPasswordSource.includes('hashParams.get("access_token")'),
    false,
  );
  assert.equal(
    setPasswordSource.includes('hashParams.get("refresh_token")'),
    false,
  );
});

test("token interceptor runs globally and redirects invite tokens to set-password", () => {
  assert.equal(layoutSource.includes("<AuthTokenInterceptor />"), true);
  assert.equal(interceptorSource.includes('"use client"'), true);
  assert.equal(interceptorSource.includes('hashParams.get("type")'), true);
  assert.equal(interceptorSource.includes('hashParams.get("access_token")'), true);
  assert.equal(interceptorSource.includes('hashParams.get("refresh_token")'), true);
  assert.equal(interceptorSource.includes('type === "invite"'), true);
  assert.equal(interceptorSource.includes('type === "recovery"'), true);
  assert.equal(interceptorSource.includes("supabase.auth.setSession"), true);
  assert.equal(interceptorSource.includes('"/auth/set-password"'), true);
  assert.equal(interceptorSource.includes("/auth/callback"), true);
});
