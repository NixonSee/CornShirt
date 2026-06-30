# Customer DICKEN Top-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a customer-only DICKEN top-up preview at `/customer/top-up`, with RM 1.00 conversion and visibly disabled Stripe checkout, and remove the obsolete My Tickets preview from the customer marketplace.

**Architecture:** Keep the protected route as a server component that reads only the authenticated profile wallet address. Put interactive preset/custom amount behavior in a focused client component, and isolate conversion/validation in a pure helper module that can be tested directly. Reuse the existing customer navigation, footer, shared button, design tokens, and DICKEN asset without adding payment or persistence code.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase server client, Node test runner, ESLint, existing global CSS and shared components.

---

## File Structure

- Create `src/app/customer/top-up/topUpData.ts`: DICKEN presets, strict whole-number parsing, and RM 1.00 preview formatting.
- Create `src/app/customer/top-up/TopUpForm.tsx`: interactive Option A amount selector and disabled Stripe preview.
- Create `src/app/customer/top-up/page.tsx`: customer role guard, wallet lookup, and shared page shell.
- Create `src/app/customer/top-up/page.test.ts`: behavior and source-level route/UI regression coverage.
- Modify `src/app/customer/page.tsx`: remove the obsolete My Tickets section and both preview modals.
- Modify `src/app/customer/page.test.ts`: assert the streamlined customer marketplace behavior.
- Modify `src/app/globals.css`: responsive Option A top-up page styles and removal of obsolete landing-page ticket-state styles.

### Task 1: DICKEN Amount Preview Logic

**Files:**
- Create: `src/app/customer/top-up/topUpData.ts`
- Create: `src/app/customer/top-up/page.test.ts`

- [ ] **Step 1: Write the failing conversion tests**

Create `src/app/customer/top-up/page.test.ts` with the pure behavior test first:

```ts
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
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --experimental-strip-types --test src/app/customer/top-up/page.test.ts
```

Expected: FAIL because `topUpData.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Create `src/app/customer/top-up/topUpData.ts`:

```ts
export const DICKEN_PRESETS = [200, 500, 1000, 2000] as const;
export const RINGGIT_PER_DICKEN = 1;

export function parseDickenAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  return amount;
}

export function formatRinggit(dickenAmount: number): string {
  const ringgit = dickenAmount * RINGGIT_PER_DICKEN;
  return `RM ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ringgit)}`;
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the same command. Expected: the conversion test passes while later source tests have not been added yet.

- [ ] **Step 5: Commit the helper and test**

```powershell
git add -- src/app/customer/top-up/topUpData.ts src/app/customer/top-up/page.test.ts
git commit -m "test: define DICKEN top-up preview behavior"
```

### Task 2: Interactive Top-Up Form

**Files:**
- Create: `src/app/customer/top-up/TopUpForm.tsx`
- Modify: `src/app/customer/top-up/page.test.ts`

- [ ] **Step 1: Add a failing component contract test**

Append:

```ts
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
```

- [ ] **Step 2: Run the test and verify RED**

Run the page test. Expected: FAIL because `TopUpForm.tsx` does not exist.

- [ ] **Step 3: Implement the focused client component**

Create `TopUpForm.tsx` with:

```tsx
"use client";

import { CreditCard, WalletCards } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/common";
import {
  DICKEN_PRESETS,
  formatRinggit,
  parseDickenAmount,
} from "./topUpData";

interface TopUpFormProps {
  walletAddress: string | null;
}

function shortWallet(value: string | null): string {
  if (!value) return "Wallet not assigned";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function TopUpForm({ walletAddress }: TopUpFormProps) {
  const [amountInput, setAmountInput] = useState("500");
  const selectedAmount = parseDickenAmount(amountInput);

  return (
    <div className="top-up-layout">
      <aside className="top-up-wallet-card">
        <Image src="/DICKEN token.png" alt="DICKEN token" width={64} height={64} />
        <span>Managed wallet</span>
        <strong>{shortWallet(walletAddress)}</strong>
        <p>Balance unavailable until wallet balance support is connected.</p>
      </aside>

      <section className="top-up-form-card">
        <div className="top-up-form-heading">
          <WalletCards aria-hidden="true" />
          <div><p className="section-kicker">Top up wallet</p><h2>Choose an amount</h2></div>
        </div>
        <p className="muted">1 DICKEN = RM 1.00</p>
        <div className="top-up-presets">
          {DICKEN_PRESETS.map((amount) => (
            <button
              type="button"
              className={amountInput === String(amount) ? "top-up-preset active" : "top-up-preset"}
              onClick={() => setAmountInput(String(amount))}
              key={amount}
            >
              <strong>{amount.toLocaleString("en-MY")}</strong><span>DICKEN</span>
            </button>
          ))}
        </div>
        <label className="field top-up-custom-field">
          <span>Custom DICKEN amount</span>
          <input
            inputMode="numeric"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="Enter a whole number"
          />
        </label>
        <div className="top-up-summary">
          <span>You pay</span>
          <strong>{selectedAmount ? formatRinggit(selectedAmount) : "RM 0.00"}</strong>
        </div>
        <Button fullWidth disabled icon={<CreditCard size={18} />}>
          Stripe checkout coming soon
        </Button>
        <p className="top-up-stripe-note">Stripe Test Mode will be connected in a later implementation.</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run the page test and verify GREEN**

Expected: both helper and component contract tests pass.

- [ ] **Step 5: Commit the client component**

```powershell
git add -- src/app/customer/top-up/TopUpForm.tsx src/app/customer/top-up/page.test.ts
git commit -m "feat: add DICKEN amount preview form"
```

### Task 3: Protected Route and Responsive Styling

**Files:**
- Create: `src/app/customer/top-up/page.tsx`
- Modify: `src/app/customer/top-up/page.test.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add failing route and style tests**

Append tests that assert:

```ts
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
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.top-up-layout\s*\{/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Expected: FAIL because the route and CSS hooks do not exist.

- [ ] **Step 3: Implement the protected page**

Create `src/app/customer/top-up/page.tsx`:

```tsx
import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import TopUpForm from "./TopUpForm";

export const dynamic = "force-dynamic";

export default async function CustomerTopUpPage() {
  const { user } = await requireRole(["customer", "user"]);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", user.id)
    .maybeSingle();
  const walletAddress = profile?.wallet_address ?? null;

  return (
    <div className="app-shell">
      <title>Top Up DICKEN - CornShirt</title>
      <meta
        name="description"
        content="Preview a DICKEN wallet top-up for your CornShirt account."
      />
      <RoleNav role="customer" />
      <main className="shell-main top-up-page">
        <header className="top-up-page-heading">
          <p className="section-kicker">Customer wallet</p>
          <h1>Top Up DICKEN</h1>
          <p>Choose an amount and preview its Ringgit value.</p>
        </header>
        <TopUpForm walletAddress={walletAddress} />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Add focused top-up styles**

Append the following focused styles to `src/app/globals.css`:

```css
/* Customer DICKEN top-up */
.top-up-page {
  width: min(100%, 980px);
  padding-block: 3rem 4.5rem;
}

.top-up-page-heading {
  margin-bottom: 1.5rem;
}

.top-up-page-heading h1 {
  margin: 0.2rem 0 0.45rem;
  font-size: clamp(2rem, 4vw, 3rem);
}

.top-up-page-heading > p:last-child {
  margin: 0;
  color: var(--muted-foreground);
}

.top-up-layout {
  display: grid;
  grid-template-columns: minmax(250px, 0.75fr) minmax(0, 1.25fr);
  gap: 1.25rem;
  align-items: start;
}

.top-up-wallet-card,
.top-up-form-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--card);
  box-shadow: var(--shadow-card);
}

.top-up-wallet-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.5rem;
  background: linear-gradient(145deg, color-mix(in oklch, var(--primary) 18%, var(--card)), var(--card));
}

.top-up-wallet-card img {
  margin-bottom: 1.25rem;
  border-radius: 50%;
}

.top-up-wallet-card > span {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.top-up-wallet-card strong {
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  font-family: var(--font-mono);
}

.top-up-wallet-card p {
  margin: 1.25rem 0 0;
  color: var(--muted-foreground);
  font-size: 0.88rem;
}

.top-up-form-card {
  padding: clamp(1.25rem, 3vw, 2rem);
}

.top-up-form-heading {
  display: flex;
  gap: 0.9rem;
  align-items: center;
}

.top-up-form-heading > svg {
  color: var(--primary);
}

.top-up-form-heading h2 {
  margin: 0.15rem 0 0;
}

.top-up-presets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1.25rem 0;
}

.top-up-preset {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.95rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--foreground);
  background: var(--background);
  cursor: pointer;
}

.top-up-preset span {
  color: var(--muted-foreground);
  font-size: 0.7rem;
}

.top-up-preset:hover,
.top-up-preset.active {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in oklch, var(--primary) 10%, var(--background));
}

.top-up-custom-field {
  margin-bottom: 1.25rem;
}

.top-up-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem 0;
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
}

.top-up-summary span,
.top-up-stripe-note {
  color: var(--muted-foreground);
}

.top-up-summary strong {
  font-size: 1.35rem;
}

.top-up-stripe-note {
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 0.78rem;
}

@media (max-width: 900px) {
  .top-up-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .top-up-page {
    padding-block: 2rem 3rem;
  }

  .top-up-presets {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run the tests and verify GREEN**

Run the page test. Expected: all top-up tests pass.

- [ ] **Step 6: Commit the protected route and styles**

```powershell
git add -- src/app/customer/top-up/page.tsx src/app/customer/top-up/page.test.ts src/app/globals.css
git commit -m "feat: add customer DICKEN top-up page"
```

### Task 4: Remove the Customer Landing My Tickets Preview

**Files:**
- Modify: `src/app/customer/page.tsx`
- Modify: `src/app/customer/page.test.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Change the customer regression test first**

Replace the old common-component and ticket-preview expectations with:

```ts
test("customer route keeps event discovery without duplicate ticket or top-up previews", () => {
  assert.match(source, /import Footer from "@\/components\/Footer"/);
  assert.match(source, /import \{ EventDiscovery \} from "@\/components\/visitor&customer"/);
  assert.match(source, /<EventDiscovery\s*\/>/);
  assert.match(source, /<Footer\s*\/>/);
  assert.doesNotMatch(source, /id="my-tickets"/);
  assert.doesNotMatch(source, />\s*My Tickets\s*</);
  assert.doesNotMatch(source, /<Modal/);
  assert.doesNotMatch(source, /activeModal|CustomerModal/);
});
```

Update the style test to stop requiring `.customer-tools-section` and `.customer-ticket-state` while retaining customer navigation/header responsive assertions.

- [ ] **Step 2: Run the customer test and verify RED**

Run:

```powershell
node --experimental-strip-types --test src/app/customer/page.test.ts
```

Expected: FAIL because the landing page still contains the preview section and modal state.

- [ ] **Step 3: Remove only obsolete customer landing code**

Apply these exact removals to `src/app/customer/page.tsx`:

```diff
-import { Ticket } from "lucide-react";
 import { useRouter } from "next/navigation";
 import { useEffect, useState } from "react";
 
-import { Button, Modal } from "@/components/common";
 import Footer from "@/components/Footer";
 import RoleNav from "@/components/RoleNav";
 import { EventDiscovery } from "@/components/visitor&customer";
 import { supabase } from "@/lib/supabaseClient";
@@
-type CustomerModal = "tickets" | "topup" | null;
-
 export default function CustomerPage() {
@@
-  const [activeModal, setActiveModal] = useState<CustomerModal>(null);
@@
       <main>
         <EventDiscovery />
-
-        <section id="my-tickets" className="customer-tools-section">
-          <div className="customer-tools-heading">
-            <div>
-              <p className="section-kicker">Customer tools</p>
-              <h2>My Tickets</h2>
-            </div>
-            <Ticket aria-hidden="true" size={34} />
-          </div>
-
-          <div className="customer-ticket-state">
-            <Ticket aria-hidden="true" size={42} />
-            <h3>Your ticket collection will appear here</h3>
-            <p>
-              Ticket services are not connected yet. No ticket ownership or NFT
-              information has been created for this preview.
-            </p>
-            <Button
-              variant="secondary"
-              onClick={() => setActiveModal("tickets")}
-            >
-              View service status
-            </Button>
-          </div>
-        </section>
       </main>
 
       <Footer />
-
-      <Modal
-        isOpen={activeModal === "topup"}
-        onClose={() => setActiveModal(null)}
-        title="DICKEN Top Up"
-        actions={<Button onClick={() => setActiveModal(null)}>Got it</Button>}
-      >
-        DICKEN top-up is not connected yet. Stripe Test Mode and transaction
-        recording must be implemented before funds can be added safely.
-      </Modal>
-
-      <Modal
-        isOpen={activeModal === "tickets"}
-        onClose={() => setActiveModal(null)}
-        title="My Tickets"
-        actions={<Button onClick={() => setActiveModal(null)}>Got it</Button>}
-      >
-        Ticket services are not connected yet. Purchased Ticket NFTs, QR codes,
-        transfers, resale, and refunds will appear only after their backend is
-        available.
-      </Modal>
```

- [ ] **Step 4: Remove obsolete landing-page-only CSS**

Use `rg -n "customer-tools|customer-ticket-state" src` to confirm the selectors are unused after Step 3. Then delete the complete `.customer-tools-section`, `.customer-tools-heading`, `.customer-tools-heading h2`, `.customer-ticket-state`, `.customer-ticket-state h3`, and `.customer-ticket-state p` rule blocks. Change the icon selector group from:

```css
.customer-wallet svg,
.customer-tools-heading svg,
.customer-ticket-state > svg {
  color: var(--primary);
}
```

to:

```css
.customer-wallet svg {
  color: var(--primary);
}
```

Keep `.customer-wallet`, `.customer-account-error`, and every `.ticket-*` rule used by `/customer/tickets`.

- [ ] **Step 5: Run both customer tests and verify GREEN**

```powershell
node --experimental-strip-types --test src/app/customer/page.test.ts src/app/customer/top-up/page.test.ts
```

Expected: all customer marketplace and top-up tests pass.

- [ ] **Step 6: Commit the cleanup**

```powershell
git add -- src/app/customer/page.tsx src/app/customer/page.test.ts src/app/globals.css
git commit -m "refactor: remove duplicate customer ticket preview"
```

### Task 5: Final Verification

**Files:**
- Verify only; no planned production edits.

- [ ] **Step 1: Run customer-scoped tests**

```powershell
node --experimental-strip-types --test src/app/customer/page.test.ts src/app/customer/tickets/page.test.ts src/app/customer/top-up/page.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run lint and production build**

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: ESLint exits 0 and the build route table includes `/customer/top-up`.

- [ ] **Step 3: Confirm scope and whitespace**

```powershell
git diff --check
git diff --name-only -- 'src/app/admin/**' 'src/app/organizer/**' 'src/components/admin/**'
```

Expected: no whitespace errors and no admin/organizer file output.

- [ ] **Step 4: Review Stripe non-integration**

```powershell
rg -n "loadStripe|checkout\.sessions|STRIPE_SECRET|payment_intent" src/app/customer/top-up
```

Expected: no matches.
