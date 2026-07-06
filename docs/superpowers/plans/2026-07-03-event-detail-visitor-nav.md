# Event Detail Visitor Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `Become an Organizer` and return-aware `Log In` actions to unauthenticated event-detail visitors without changing customer, admin, or organizer behavior.

**Architecture:** Keep the existing server-side role lookup and customer `RoleNav` branch. Inside the existing non-customer public header, render the new visitor actions only when no authenticated role exists; authenticated admin and organizer roles retain the current `Events`, `Log in`, and `Create account` actions exactly.

**Tech Stack:** Next.js 16 server components, TypeScript, Node test runner, existing CornShirt navigation CSS.

---

### Task 1: Add the visitor-navigation contract

**Files:**
- Modify: `src/app/visitor/data.test.ts`

- [ ] **Step 1: Add a failing source-level test**

```ts
test("event details show visitor partner and return-aware login actions", () => {
  const routeSource = readFileSync(
    new URL("../events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /const isStaff = role === "admin" \|\| role === "organizer"/);
  assert.match(routeSource, /href="\/visitor\/apply"/);
  assert.match(
    routeSource,
    /href=\{withEventReturnTo\("\/login", returnPath\)\}/,
  );
  assert.match(routeSource, /Become an Organizer/);
  assert.match(routeSource, /<RoleNav role="customer"\s*\/>/);
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node --test src/app/visitor/data.test.ts
```

Expected: the new test fails because `isStaff` and the `/visitor/apply` action are absent.

### Task 2: Update only the event-detail visitor actions

**Files:**
- Modify: `src/app/events/[eventId]/page.tsx`

- [ ] **Step 1: Identify staff without changing customer detection**

Immediately after `isCustomer`, add:

```ts
const isStaff = role === "admin" || role === "organizer";
```

Keep `isCustomer`, `eventsHref`, `returnPath`, `EventTicketing`, and the customer `RoleNav` unchanged.

- [ ] **Step 2: Split only the public-header actions**

Keep the existing header and logo. Replace its nav children with:

```tsx
{isStaff ? (
  <>
    <Link href={eventsHref}>Events</Link>
    <Link href="/login">Log in</Link>
    <Link className="button" href="/register">
      Create account
    </Link>
  </>
) : (
  <>
    <Link className="button-outline" href="/visitor/apply">
      Become an Organizer
    </Link>
    <Link
      className="button"
      href={withEventReturnTo("/login", returnPath)}
    >
      Log In
    </Link>
  </>
)}
```

This intentionally leaves the staff actions byte-for-byte equivalent to the current implementation.

- [ ] **Step 3: Run the focused test and verify GREEN**

```powershell
node --test src/app/visitor/data.test.ts
```

Expected: the new visitor-navigation test passes. Any unrelated pre-existing test failure must be reported separately.

### Task 3: Verify scope and compilation

**Files:**
- Verify: `src/app/events/[eventId]/page.tsx`
- Verify: `src/app/visitor/data.test.ts`

- [ ] **Step 1: Run targeted lint**

```powershell
npx.cmd eslint "src/app/events/[eventId]/page.tsx" src/app/visitor/data.test.ts
```

Expected: exit code 0.

- [ ] **Step 2: Confirm protected behavior remains**

```powershell
rg -n "RoleNav role=\"customer\"|isCustomer=\{isCustomer\}|loginHref=\{withEventReturnTo|isStaff|visitor/apply" "src/app/events/[eventId]/page.tsx"
```

Expected: customer navigation and ticket gating remain, with the new visitor action present.

- [ ] **Step 3: Run the production build**

```powershell
npm.cmd run build
```

Expected: build passes when dependencies are installed; otherwise report the known missing `nodemailer` environment blocker separately.

- [ ] **Step 4: Audit the diff**

```powershell
git diff --check
git diff -- "src/app/events/[eventId]/page.tsx" src/app/visitor/data.test.ts
```

Expected: only the visitor action branch and its focused test are changed.
