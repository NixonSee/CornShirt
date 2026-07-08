# Remove DICKEN and Adopt Stripe MYR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove DICKEN, ERC-20, and top-up concepts from active CornShirt code and authoritative documentation while converting current price displays to MYR and preserving the local Ticket NFT architecture.

**Architecture:** This migration removes the token economy now but does not falsely implement future Stripe purchase workflows. Existing numeric `price` and `amount` fields are displayed as legacy MYR major-unit values until the approved Stripe phase introduces explicit integer-sen database columns and migrations. Managed customer wallets remain for Ticket NFTs only.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Stripe Test Mode, Viem, Hardhat, OpenZeppelin ERC-721, Node test runner

---

### Task 1: Add migration guard tests and MYR formatting

**Files:**
- Create: `src/lib/currency.ts`
- Create: `src/lib/currency.test.ts`
- Create: `src/lib/noDicken.test.ts`

- [ ] **Step 1: Write the failing currency tests**

Create `src/lib/currency.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { formatMyr, parsePositiveMyrAmount } from "./currency.ts";

test("formats legacy major-unit values as Malaysian Ringgit", () => {
  assert.equal(formatMyr(49.9), "RM49.90");
  assert.equal(formatMyr(0), "RM0.00");
});

test("accepts positive MYR amounts with at most two decimal places", () => {
  assert.equal(parsePositiveMyrAmount("49.90"), 49.9);
  assert.equal(parsePositiveMyrAmount("1"), 1);
  assert.equal(parsePositiveMyrAmount("0"), null);
  assert.equal(parsePositiveMyrAmount("1.999"), null);
  assert.equal(parsePositiveMyrAmount("abc"), null);
});
```

- [ ] **Step 2: Run the currency test and confirm failure**

Run:

```powershell
node --test --experimental-strip-types src/lib/currency.test.ts
```

Expected: failure because `currency.ts` does not exist.

- [ ] **Step 3: Implement the currency helper**

Create `src/lib/currency.ts`:

```ts
const MYR = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMyr(value: number): string {
  return MYR.format(Number.isFinite(value) ? value : 0).replace(/\s/g, "");
}

export function parsePositiveMyrAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
```

- [ ] **Step 4: Verify the currency tests pass**

Run the command from Step 2.

Expected: 2 tests pass.

- [ ] **Step 5: Write the active-surface migration guard**

Create `src/lib/noDicken.test.ts`. It must recursively scan active production files under `src` and these authoritative documents:

```text
docs/SPECS.md
docs/ROLE_FEATURES_AND_FLOW.md
docs/API_AND_ROUTES.md
docs/SMART_CONTRACTS.md
docs/UNFINISHED_FEATURES_TODO.md
docs/AGENTS.md
docs/CLAUDE.md
docs/CODEX.md
docs/DESIGN.md
docs/COMPONENTS.md
```

Scan production files under `src` while excluding `*.test.ts`, then scan the authoritative documents. Assert case-insensitively that none contain `DICKEN` or `ERC-20`, and assert that `src/app/customer/top-up` does not exist. Historical files under `docs/superpowers` and `docs/html-designs` are intentionally excluded. Excluding test files prevents this guard's own forbidden-term assertions from matching itself.

- [ ] **Step 6: Run the migration guard and confirm failure**

Run:

```powershell
node --test --experimental-strip-types src/lib/noDicken.test.ts
```

Expected: failure listing current DICKEN/ERC-20 references and the existing top-up directory.

### Task 2: Remove the active top-up and external-wallet surfaces

**Files:**
- Delete: `src/app/customer/top-up/page.tsx`
- Delete: `src/app/customer/top-up/TopUpForm.tsx`
- Delete: `src/app/customer/top-up/topUpData.ts`
- Delete: `src/app/customer/top-up/page.test.ts`
- Delete: `public/DICKEN token.png`
- Modify: `src/components/navConfig.ts`
- Modify: `src/app/globals.css`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Remove the top-up route files**

Delete the four files in `src/app/customer/top-up` and delete the obsolete DICKEN token image. Do not replace the route with a payment-method page.

- [ ] **Step 2: Remove top-up navigation**

Remove the `/customer/top-up` customer navigation item and remove the `Wallet` icon import if it becomes unused.

- [ ] **Step 3: Remove top-up-only CSS**

Delete the complete block beginning with `/* ===== Customer DICKEN top-up ===== */`, including its responsive rules, while preserving adjacent unrelated CSS.

- [ ] **Step 4: Remove unused external-wallet packages**

After confirming no active imports, run:

```powershell
npm uninstall @reown/appkit @reown/appkit-adapter-wagmi @tanstack/react-query wagmi
```

Expected: `package.json` and `package-lock.json` no longer contain these unused wallet-connection dependencies; Viem, Hardhat, and OpenZeppelin remain.

- [ ] **Step 5: Run the migration guard**

Run `src/lib/noDicken.test.ts` again.

Expected: it still fails on remaining active UI and documentation references but no longer reports the top-up directory.

### Task 3: Convert active application pricing and transaction UI to MYR

**Files:**
- Modify: `src/app/events/[eventId]/PurchaseButton.tsx`
- Modify: `src/app/events/[eventId]/EventTicketing.tsx`
- Modify: `src/app/events/[eventId]/page.tsx`
- Modify: `src/app/visitor/page.tsx`
- Modify: `src/app/visitor/about/page.tsx`
- Modify: `src/app/visitor/about/page.test.ts`
- Modify: `src/components/organizer/EventForm.tsx`
- Modify: `src/components/seatmap/SeatMap.tsx`
- Modify: `src/components/admin/AdminCharts.tsx`
- Modify: `src/app/admin/events/[eventId]/page.tsx`
- Modify: `src/app/organizer/page.tsx`
- Modify: `src/app/organizer/events/page.tsx`
- Modify: `src/app/organizer/events/[eventId]/page.tsx`
- Modify: `src/app/customer/marketplace/MarketplaceClient.tsx`
- Modify: `src/app/customer/marketplace/marketplaceData.ts`
- Modify: `src/app/customer/marketplace/marketplaceData.test.ts`
- Modify: `src/app/api/customer/marketplace/route.ts`
- Modify: `src/app/customer/tickets/TicketList.tsx`
- Modify: `src/app/customer/transactions/transactionData.ts`
- Modify: `src/app/customer/transactions/transactionData.test.ts`
- Modify: `src/app/customer/transactions/TransactionHistory.tsx`
- Modify: `src/app/customer/transactions/page.test.ts`
- Modify: `src/app/customer/page.tsx`
- Modify: `src/app/register/page.tsx`

- [ ] **Step 1: Convert ticket and seat-map prices**

Use `formatMyr` for event ticket prices, seat-zone prices, organizer form labels, event management revenue, minimum prices, and admin revenue. Rename local formatter constants such as `DICKEN` to `NUMBER` when they format counts only. Currency values must render as `RM` and counts must remain plain numbers.

- [ ] **Step 2: Convert marketplace price validation and display**

Replace `parseResalePrice` internals with `parsePositiveMyrAmount` or rename it to `parseResaleMyrPrice` consistently. Permit up to two decimal places. Update errors, labels, listing cards, API validation, tests, and disabled purchase copy to use MYR and future Stripe settlement.

- [ ] **Step 3: Convert transaction history**

Remove `topup` from `TransactionType`, filters, labels, mapping branches, fixtures, and tests. Format amounts with `formatMyr`. Purchases remain negative customer outflows; refunds and resale records follow the sign supplied by their authoritative transaction row.

- [ ] **Step 4: Update remaining active copy and tests**

Replace DICKEN-specific page metadata, About content, registration terms, purchase placeholder, customer wallet warning, and test assertions with Stripe MYR and Ticket NFT language. Do not claim Stripe purchase endpoints already work.

- [ ] **Step 5: Run focused UI/data tests**

Run:

```powershell
$tests = @(
  'src/lib/currency.test.ts',
  'src/app/visitor/about/page.test.ts',
  'src/app/customer/marketplace/marketplaceData.test.ts',
  'src/app/customer/transactions/transactionData.test.ts',
  'src/app/customer/transactions/page.test.ts'
)
node --test --experimental-strip-types $tests
```

Expected: all focused tests pass except any already-documented unrelated missing migration fixture; no DICKEN assertion remains.

### Task 4: Rewrite authoritative product and Web3 documentation

**Files:**
- Modify: `docs/SPECS.md`
- Modify: `docs/ROLE_FEATURES_AND_FLOW.md`
- Modify: `docs/API_AND_ROUTES.md`
- Modify: `docs/SMART_CONTRACTS.md`
- Modify: `docs/UNFINISHED_FEATURES_TODO.md`
- Modify: `docs/DESIGN.md`
- Modify: `docs/COMPONENTS.md`

- [ ] **Step 1: Rewrite system requirements around Stripe MYR**

In `SPECS.md`, replace DICKEN top-up with direct Stripe MYR payment requirements. Ticket types and resale listings use MYR prices. Primary and resale payments require verified Stripe webhooks. Refunds use Stripe Test Mode. Organizer revenue and seller proceeds are simulated Supabase accounting values.

- [ ] **Step 2: Rewrite role features and flows**

Remove top-up and balance actions. Primary and resale flows go directly from ticket selection to Stripe Checkout, verified payment, NFT mint/transfer, and finalization. Direct transfer remains payment-free. Refund flow identifies the latest Stripe payer.

- [ ] **Step 3: Replace Web3 APIs and contract interfaces**

Remove balance/top-up/DickenToken routes and interfaces. Document planned primary/resale Checkout Session endpoints, shared Stripe webhook, operation-status routes, refunds, NFT transfer, verification, reconciliation, and the single `CornShirtTicket` contract.

- [ ] **Step 4: Rewrite `SMART_CONTRACTS.md` as NFT-and-Stripe architecture**

Use the approved migration specification as the source of truth. Keep the sections for managed wallets, local Hardhat, `CornShirtTicket`, Stripe MYR flows, resale recovery, refund burning, workflow states, security, tests, implementation rules, and four revised phases. Remove all DICKEN, ERC-20, token-balance, treasury-token, and top-up material.

- [ ] **Step 5: Update missing-features checklist**

Remove the DICKEN ERC-20 item. Change Hardhat foundation completion to Ticket NFT deployment only. Change refund completion to Stripe test refund plus NFT burn. Preserve the missing-only scope rule.

- [ ] **Step 6: Update current design and component references**

Remove token balance, top-up, DICKEN image, and Top Up Balance Card references from `docs/DESIGN.md` and `docs/COMPONENTS.md`. Preserve unrelated design-system guidance.

- [ ] **Step 7: Run the migration guard**

Expected: production code and all authoritative product/design docs have no DICKEN or ERC-20 references; contributor docs may still fail until Task 5.

### Task 5: Update contributor context and mark historical DICKEN plans superseded

**Files:**
- Modify: `docs/AGENTS.md`
- Modify: `docs/CLAUDE.md`
- Modify: `docs/CODEX.md`
- Modify: `docs/superpowers/specs/2026-07-01-dicken-top-up-design.md`
- Modify: `docs/superpowers/plans/2026-07-01-dicken-top-up.md`

- [ ] **Step 1: Update current contributor guidance**

Replace token/top-up architecture with direct Stripe MYR payments and Ticket NFT-only Web3. Remove obsolete contract-address variables and top-up table guidance. Preserve unrelated repository instructions.

- [ ] **Step 2: Add superseded notices to dated DICKEN documents**

At the top of both dated DICKEN files, add:

```markdown
> **Superseded:** CornShirt no longer uses DICKEN or ERC-20. See `docs/superpowers/specs/2026-07-09-remove-dicken-stripe-myr-migration-design.md` for the approved Stripe MYR and Ticket NFT architecture. This file is retained only as historical project context.
```

Do not rewrite their historical body.

- [ ] **Step 3: Run the migration guard**

Run:

```powershell
node --test --experimental-strip-types src/lib/noDicken.test.ts
```

Expected: pass.

### Task 6: Verify the migration

**Files:**
- Verify all modified and deleted files

- [ ] **Step 1: Confirm active source and authoritative docs have no token references**

Run:

```powershell
rg -n -i 'DICKEN|ERC-20' src docs/SPECS.md docs/ROLE_FEATURES_AND_FLOW.md docs/API_AND_ROUTES.md docs/SMART_CONTRACTS.md docs/UNFINISHED_FEATURES_TODO.md docs/DESIGN.md docs/COMPONENTS.md docs/AGENTS.md docs/CLAUDE.md docs/CODEX.md
```

Expected: no matches.

- [ ] **Step 2: Confirm top-up surfaces and unused wallet dependencies are absent**

Run:

```powershell
Test-Path 'src/app/customer/top-up'
Test-Path 'public/DICKEN token.png'
rg -n '@reown|wagmi|react-query|/customer/top-up|Top Up' src package.json
```

Expected: both path checks return `False` and the search returns no matches.

- [ ] **Step 3: Run focused migration tests**

Run:

```powershell
node --test --experimental-strip-types src/lib/currency.test.ts src/lib/noDicken.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Run lint and build**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0, allowing only unrelated pre-existing warnings.

- [ ] **Step 5: Run the full test suite**

Run:

```powershell
$tests = @(rg --files src | Where-Object { $_ -match '\.test\.ts$' })
node --test --experimental-strip-types $tests
```

Expected: migration-related tests pass. Report any unrelated pre-existing failures exactly rather than claiming a clean suite.

- [ ] **Step 6: Check the final diff**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only intentional migration changes and previously existing untracked files are present.
