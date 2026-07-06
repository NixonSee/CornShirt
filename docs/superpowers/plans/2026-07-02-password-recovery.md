# Password Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure forgot-password request to Login and let the existing set-password page accept Supabase recovery codes without breaking organizer invitations.

**Architecture:** The login page reuses its email field and calls `resetPasswordForEmail()` with `/auth/set-password` as the redirect. The set-password page accepts either the existing hash tokens or a PKCE query-string code, awaits the browser client's automatically established PKCE session, and then reuses its current password update form.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth, Node test runner, global CSS.

---

### Task 1: Lock the recovery contract with source tests

**Files:**
- Modify: `src/lib/authReturnFlow.test.ts`

- [ ] **Step 1: Add failing recovery-flow assertions**

Read `src/app/auth/set-password/page.tsx` alongside Login and assert the required Supabase calls and UI copy:

```ts
const setPasswordSource = readFileSync(
  new URL("../app/auth/set-password/page.tsx", import.meta.url),
  "utf8",
);

test("login requests password recovery through the set-password route", () => {
  assert.equal(loginSource.includes("resetPasswordForEmail"), true);
  assert.equal(loginSource.includes('/auth/set-password'), true);
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
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test src/lib/authReturnFlow.test.ts
```

Expected: the two new tests fail because Login lacks `resetPasswordForEmail` and set-password does not yet await the automatically established PKCE session.

### Task 2: Add the login recovery request

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add recovery state and handler**

Add `useRef`, an email input ref, recovery request state, and a handler:

```tsx
const emailInputRef = useRef<HTMLInputElement>(null);
const [isResetting, setIsResetting] = useState(false);
const [recoverySent, setRecoverySent] = useState(false);

async function handleForgotPassword() {
  setErrorMessage("");
  setRecoverySent(false);

  if (!email.trim() || !emailInputRef.current?.checkValidity()) {
    setErrorMessage("Enter a valid email address to reset your password.");
    emailInputRef.current?.focus();
    return;
  }

  setIsResetting(true);
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/set-password`,
  });
  setIsResetting(false);

  if (error) {
    setErrorMessage(error.message);
    return;
  }

  setRecoverySent(true);
}
```

- [ ] **Step 2: Add the button and generic success message**

Attach `ref={emailInputRef}` to the existing email input. Wrap the password label and recovery button in `.login-password-heading`:

```tsx
<div className="login-password-heading">
  <label htmlFor="password">Password</label>
  <button
    type="button"
    className="login-forgot-password"
    onClick={handleForgotPassword}
    disabled={isLoading || isResetting}
  >
    {isResetting ? "Sending..." : "Forgot password?"}
  </button>
</div>
```

Render the generic confirmation after the password field:

```tsx
{recoverySent ? (
  <p className="login-recovery-success" role="status">
    Check your email for a secure password-reset link.
  </p>
) : null}
```

- [ ] **Step 3: Add scoped login styles**

Add `.login-password-heading`, `.login-forgot-password`, and `.login-recovery-success` to `globals.css`. The button uses the primary accent without a filled background; the success message uses the existing success color and dark card treatment. Include `:focus-visible` and disabled states.

### Task 3: Accept PKCE recovery codes on set-password

**Files:**
- Modify: `src/app/auth/set-password/page.tsx`

- [ ] **Step 1: Extend session initialization**

Read both the query string and hash in the existing effect:

```tsx
const queryParams = new URLSearchParams(window.location.search);
const recoveryCode = queryParams.get("code");
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const accessToken = hashParams.get("access_token");
const refreshToken = hashParams.get("refresh_token");

async function establishRecoverySession() {
  if (recoveryCode) {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  }

  if (accessToken && refreshToken) {
    return supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  return { error: new Error("Missing recovery credentials") };
}
```

Call this function inside the effect, set `step` to `form` on success, and preserve the current `/login?error=no_token` or `/login?error=auth_failed` redirects on failure.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```powershell
node --test src/lib/authReturnFlow.test.ts
```

Expected: all recovery and existing return-flow tests pass.

### Task 4: Verify the complete change

**Files:**
- Verify: `src/app/login/page.tsx`
- Verify: `src/app/auth/set-password/page.tsx`
- Verify: `src/app/globals.css`
- Verify: `src/lib/authReturnFlow.test.ts`

- [ ] **Step 1: Run targeted lint**

```powershell
npx.cmd eslint src/app/login/page.tsx src/app/auth/set-password/page.tsx src/lib/authReturnFlow.test.ts
```

Expected: exit code 0.

- [ ] **Step 2: Parse CSS and run production build**

```powershell
node -e "const fs=require('fs');require('postcss').parse(fs.readFileSync('src/app/globals.css','utf8'));console.log('CSS parsed')"
npm.cmd run build
```

Expected: CSS parses. The build passes after dependencies are installed; if it stops at the previously identified missing `nodemailer`, report that environment blocker separately.

- [ ] **Step 3: Audit scope**

```powershell
git diff --check
git diff -- src/app/login/page.tsx src/app/auth/set-password/page.tsx src/app/globals.css src/lib/authReturnFlow.test.ts
```

Expected: only password recovery additions appear in these files, existing role routing and organizer invite token handling remain present, and there are no whitespace errors.
