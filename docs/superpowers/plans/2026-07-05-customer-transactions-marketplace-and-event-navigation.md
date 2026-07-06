# Customer Transactions, Marketplace, and Event Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer transaction history and a server-backed resale-listing Marketplace while separating visitor and customer event-detail navigation by route.

**Architecture:** Keep reads in protected server pages and writes in customer-authorized route handlers backed by `supabaseAdmin`. Put normalization and eligibility rules in pure modules so Node tests can exercise behavior without mocking Supabase. Render visitor and customer event details through a shared body component but separate route-owned navigation shells.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, PostgreSQL, Node test runner, lucide-react, existing CornShirt CSS/components.

---

## File Structure

- Create `src/components/events/EventDetailContent.tsx`: shared event-detail body with no navigation decisions.
- Create `src/app/customer/events/[eventId]/page.tsx`: protected customer event-detail wrapper.
- Modify `src/app/events/[eventId]/page.tsx`: visitor-only wrapper.
- Modify shared discovery components to accept a detail-route prefix.
- Create `src/app/customer/transactions/transactionData.ts`: pure transaction mapping/filtering.
- Create `src/app/customer/transactions/TransactionHistory.tsx`: client filters and pagination.
- Create `src/app/customer/transactions/page.tsx`: protected wallet query and page shell.
- Create `scripts/sql/create-resale-listings.sql`: resale schema and indexes.
- Create `src/app/customer/marketplace/marketplaceData.ts`: pure mapping, price validation, and eligibility rules.
- Create `src/lib/marketplace.ts`: server-only Marketplace reads and guarded mutations.
- Create `src/app/api/customer/marketplace/route.ts`: create-listing endpoint.
- Create `src/app/api/customer/marketplace/[listingId]/route.ts`: cancellation endpoint.
- Create `src/app/customer/marketplace/MarketplaceClient.tsx`: search, listing tabs, cancellation, and unavailable purchase action.
- Create `src/app/customer/marketplace/page.tsx`: protected Marketplace page.
- Modify My Tickets data/page/list to expose active listing state and listing modal.
- Modify `src/components/navConfig.ts` and `src/app/globals.css`.
- Add focused `*.test.ts` files beside each feature.

### Task 1: Separate Visitor and Customer Event Context

**Files:**
- Create: `src/components/events/EventDetailContent.tsx`
- Create: `src/app/customer/events/[eventId]/page.tsx`
- Modify: `src/app/events/[eventId]/page.tsx`
- Modify: `src/components/visitor&customer/EventDiscovery.tsx`
- Modify: `src/components/visitor&customer/EventBrowser.tsx`
- Modify: `src/components/visitor&customer/HeroCarousel.tsx`
- Modify: `src/app/customer/page.tsx`
- Test: `src/app/visitor/data.test.ts`

- [ ] **Step 1: Replace the old mixed-navigation assertions with failing route-boundary assertions**

```ts
test("visitor and customer event routes own separate navigation", () => {
  const publicSource = readFileSync(
    new URL("../events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );
  const customerSource = readFileSync(
    new URL("../customer/events/[eventId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(publicSource, /getVerifiedRole|RoleNav/);
  assert.match(publicSource, /href="\/visitor\/apply"/);
  assert.match(customerSource, /requireRole\(\["customer", "user"\]\)/);
  assert.match(customerSource, /<RoleNav role="customer"\s*\/>/);
});

test("shared discovery receives a customer-specific event prefix", () => {
  const customerPage = readFileSync(
    new URL("../customer/page.tsx", import.meta.url),
    "utf8",
  );
  const discovery = readFileSync(
    new URL("../../components/visitor&customer/EventDiscovery.tsx", import.meta.url),
    "utf8",
  );

  assert.match(customerPage, /<EventDiscovery detailBasePath="\/customer\/events"/);
  assert.match(discovery, /detailBasePath = "\/events"/);
});
```

- [ ] **Step 2: Run the route tests and confirm RED**

Run: `node --test src/app/visitor/data.test.ts`

Expected: FAIL because `/customer/events/[eventId]` does not exist and the public route still imports role detection.

- [ ] **Step 3: Extract the navigation-free detail body and add two wrappers**

Move the existing hero, `EventTicketing`, about panel, and back link into:

```tsx
interface EventDetailContentProps {
  event: PublicEvent;
  isCustomer: boolean;
  loginHref: string;
  eventsHref: string;
}

export default function EventDetailContent({
  event,
  isCustomer,
  loginHref,
  eventsHref,
}: EventDetailContentProps) {
  return (
    <main className="event-detail-page">
      <section
        className={`event-detail-hero event-detail-hero-${event.accent}`}
        style={{ backgroundImage: `url("${event.image}")` }}
      >
        <div className="event-detail-hero-inner">
          <span className={`status ${event.status === "SELLING FAST" ? "warn" : "good"}`}>{event.status}</span>
          <p className="event-detail-kicker">{event.artist} / {event.category}</p>
          <h1>{event.title}</h1>
          <div className="event-detail-meta">
            <span><CalendarDays aria-hidden="true" size={19} />{event.date}</span>
            <span><MapPin aria-hidden="true" size={19} />{event.venue}</span>
          </div>
        </div>
      </section>
      <section className="event-detail-content">
        <EventTicketing event={event} isCustomer={isCustomer} loginHref={loginHref} />
        <article className="event-detail-panel event-about-panel">
          <p className="section-kicker">About the event</p>
          <h2>Experience {event.title}</h2>
          <p>{event.description}</p>
          <Link className="detail-back-link" href={eventsHref}>Back to all events</Link>
        </article>
      </section>
    </main>
  );
}
```

The public wrapper must query `getActiveEventById`, render the existing visitor header, pass `isCustomer={false}`, `/visitor#events`, and a return-aware login URL. The customer wrapper must await `params`, call `requireRole(["customer", "user"])`, query the same event, render `RoleNav`, pass `isCustomer`, and use `/customer#events`.

- [ ] **Step 4: Parameterize discovery links**

Add `detailBasePath?: string` to `EventDiscovery`, `EventBrowser`, and `HeroCarousel`, default it to `"/events"`, and build links with `` `${detailBasePath}/${event.id}` ``. In `src/app/customer/page.tsx`, render `<EventDiscovery detailBasePath="/customer/events" />`; leave the visitor page on the default.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/app/visitor/data.test.ts`

Expected: PASS.

```powershell
git add src/components/events src/app/events src/app/customer/events src/components/visitor`&customer src/app/customer/page.tsx src/app/visitor/data.test.ts
git commit -m "fix: separate visitor and customer event navigation"
```

### Task 2: Transaction Mapping and Filtering

**Files:**
- Create: `src/app/customer/transactions/transactionData.ts`
- Create: `src/app/customer/transactions/transactionData.test.ts`

- [ ] **Step 1: Write failing behavior tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { filterTransactions, mapTransactionRows } from "./transactionData.ts";

test("maps known and unknown wallet transactions", () => {
  const rows = [
    { transaction_id: "1", transaction_type: "topup", amount: 500, created_at: "2026-06-20T06:32:00Z", transaction_hash: null },
    { transaction_id: "2", transaction_type: "purchase", amount: 120, created_at: "2026-06-22T01:18:00Z", transaction_hash: "0xabcdef", description: "AURORA LIVE" },
    { transaction_id: "3", transaction_type: "mystery", amount: 4, created_at: "bad" },
  ];
  const result = mapTransactionRows(rows);
  assert.equal(result[0].type, "topup");
  assert.equal(result[0].signedAmount, 500);
  assert.equal(result[0].hashLabel, "Transaction pending");
  assert.equal(result[1].signedAmount, -120);
  assert.equal(result[2].type, "other");
  assert.equal(result[2].dateLabel, "Date unavailable");
});

test("filters by type, description, and hash", () => {
  const txs = mapTransactionRows([
    { transaction_id: "1", transaction_type: "refund", amount: 80, description: "Eclipse", transaction_hash: "0x123", created_at: "2026-06-20T00:00:00Z" },
    { transaction_id: "2", transaction_type: "resale", amount: 95, description: "Aurora", transaction_hash: "0x999", created_at: "2026-06-21T00:00:00Z" },
  ]);
  assert.equal(filterTransactions(txs, "refund", "eclipse").length, 1);
  assert.equal(filterTransactions(txs, "all", "0x999").length, 1);
});
```

- [ ] **Step 2: Run the helper test and confirm RED**

Run: `node --test src/app/customer/transactions/transactionData.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the pure helper**

```ts
export type TransactionFilter = "all" | "topup" | "purchase" | "refund" | "resale";
type DisplayType = Exclude<TransactionFilter, "all"> | "other";
type Row = Record<string, unknown>;

export interface CustomerTransaction {
  id: string; type: DisplayType; typeLabel: string; description: string;
  signedAmount: number; amountLabel: string; dateLabel: string;
  hash: string | null; hashLabel: string;
}

const labels: Record<DisplayType, string> = {
  topup: "Top up", purchase: "Purchase", refund: "Refund", resale: "Resale", other: "Other",
};

function normalizeType(value: unknown): DisplayType {
  const type = String(value ?? "").toLowerCase().replace(/[- ]/g, "_");
  if (type.includes("topup") || type.includes("top_up")) return "topup";
  if (type.includes("purchase")) return "purchase";
  if (type.includes("refund")) return "refund";
  if (type.includes("resale")) return "resale";
  return "other";
}

export function mapTransactionRows(rows: readonly Row[]): CustomerTransaction[] {
  return rows.map((row, index) => {
    const type = normalizeType(row.transaction_type);
    const raw = Number(row.amount ?? 0);
    const signedAmount = type === "purchase" ? -Math.abs(raw) : raw;
    const hash = typeof row.transaction_hash === "string" && row.transaction_hash ? row.transaction_hash : null;
    const date = new Date(String(row.created_at ?? ""));
    return {
      id: String(row.transaction_id ?? `transaction-${index}`), type, typeLabel: labels[type],
      description: String(row.description ?? labels[type]), signedAmount,
      amountLabel: `${signedAmount > 0 ? "+" : ""}${signedAmount.toLocaleString("en-MY")} DICKEN`,
      dateLabel: Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(date),
      hash, hashLabel: hash ? (hash.length > 18 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash) : "Transaction pending",
    };
  });
}

export function filterTransactions(items: readonly CustomerTransaction[], type: TransactionFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => (type === "all" || item.type === type) && (!needle || `${item.description} ${item.hash ?? ""}`.toLowerCase().includes(needle)));
}
```

- [ ] **Step 4: Run test and commit**

Run: `node --test src/app/customer/transactions/transactionData.test.ts`

Expected: PASS.

```powershell
git add src/app/customer/transactions/transactionData.ts src/app/customer/transactions/transactionData.test.ts
git commit -m "feat: add customer transaction mapping"
```

### Task 3: Transaction History Page

**Files:**
- Create: `src/app/customer/transactions/TransactionHistory.tsx`
- Create: `src/app/customer/transactions/page.tsx`
- Create: `src/app/customer/transactions/page.test.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing page/source assertions**

```ts
test("transaction page protects and scopes wallet history", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(source, /requireRole\(\["customer", "user"\]\)/);
  assert.match(source, /\.select\("wallet_address"\)/);
  assert.match(source, /\.from\("transactions"\)/);
  assert.match(source, /walletAddress/);
  assert.match(source, /<TransactionHistory/);
  assert.match(source, /<RoleNav role="customer"\s*\/>/);
});

test("transaction UI includes approved controls", () => {
  const source = readFileSync(new URL("./TransactionHistory.tsx", import.meta.url), "utf8");
  assert.match(source, /Transaction History/);
  assert.match(source, /Top ups/);
  assert.match(source, /Purchases/);
  assert.match(source, /Refunds/);
  assert.match(source, /Resale/);
  assert.match(source, /<Pagination/);
});
```

- [ ] **Step 2: Confirm RED**

Run: `node --test src/app/customer/transactions/page.test.ts`

Expected: FAIL because both page components are absent.

- [ ] **Step 3: Implement the protected server page**

Use `requireRole`, load `profiles.wallet_address`, then run this exact scoped query:

```ts
const { data, error } = await supabaseAdmin
  .from("transactions")
  .select("transaction_id, transaction_hash, transaction_type, description, amount, created_at")
  .eq("wallet_address", walletAddress)
  .order("created_at", { ascending: false });
```

Pass `mapTransactionRows(data ?? [])` to `<TransactionHistory>`. If the profile query fails, show `Your managed wallet could not be loaded.`; if the wallet is missing, show `Your managed wallet has not been assigned yet.`; if the transaction query fails, show `Your transactions could not be loaded right now.`. Do not expose Supabase error details.

- [ ] **Step 4: Implement the approved client layout**

`TransactionHistory` owns `query`, `filter`, and `page`; uses `filterTransactions`; resets to page 1 when controls change; slices 10 rows; renders the five filter buttons, responsive `.transaction-table` rows, `Pagination`, no-history state, and no-match clear button. Do not add editable or payment actions.

- [ ] **Step 5: Add responsive CSS and verify GREEN**

Add `.transactions-page`, `.transaction-toolbar`, `.transaction-table`, `.transaction-row`, `.transaction-amount.positive`, `.transaction-amount.negative`, and a `@media (max-width: 760px)` rule that hides the header and converts rows to a two-column card grid.

Run: `node --test src/app/customer/transactions/transactionData.test.ts src/app/customer/transactions/page.test.ts`

Expected: PASS.

```powershell
git add src/app/customer/transactions src/app/globals.css
git commit -m "feat: add customer transaction history"
```

### Task 4: Resale Database and Pure Marketplace Rules

**Files:**
- Create: `scripts/sql/create-resale-listings.sql`
- Create: `src/app/customer/marketplace/marketplaceData.ts`
- Create: `src/app/customer/marketplace/marketplaceData.test.ts`

- [ ] **Step 1: Write failing SQL and rule tests**

```ts
test("validates whole-number DICKEN prices", async () => {
  const data = await import("./marketplaceData.ts");
  assert.equal(data.parseResalePrice("95"), 95);
  for (const value of ["", "0", "-1", "1.5", "abc"]) assert.equal(data.parseResalePrice(value), null);
});

test("allows only transferable active tickets without an active listing", async () => {
  const { canListTicket } = await import("./marketplaceData.ts");
  assert.equal(canListTicket({ status: "valid", transferAllowed: true, hasActiveListing: false }), true);
  assert.equal(canListTicket({ status: "used", transferAllowed: true, hasActiveListing: false }), false);
  assert.equal(canListTicket({ status: "active", transferAllowed: false, hasActiveListing: false }), false);
  assert.equal(canListTicket({ status: "active", transferAllowed: true, hasActiveListing: true }), false);
});

test("migration enforces one active listing per ticket", () => {
  const sql = readFileSync(new URL("../../../../scripts/sql/create-resale-listings.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.resale_listings/i);
  assert.match(sql, /price[^;]+check[^;]+price > 0/is);
  assert.match(sql, /where status = 'active'/i);
});
```

- [ ] **Step 2: Confirm RED**

Run: `node --test src/app/customer/marketplace/marketplaceData.test.ts`

Expected: FAIL because helper and migration are absent.

- [ ] **Step 3: Implement rules and migration**

```ts
export function parseResalePrice(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function canListTicket(input: { status: string; transferAllowed: boolean; hasActiveListing: boolean }) {
  return ["active", "valid"].includes(input.status.toLowerCase()) && input.transferAllowed && !input.hasActiveListing;
}
```

The SQL must run in a transaction, enable `pgcrypto` if required, create the columns and checks from the design, add a foreign key to `tickets(ticket_id)`, create a partial unique index on `ticket_id WHERE status = 'active'`, add active/seller indexes, and end with verification queries followed by `commit`.

- [ ] **Step 4: Run test and commit**

Run: `node --test src/app/customer/marketplace/marketplaceData.test.ts`

Expected: PASS.

```powershell
git add scripts/sql/create-resale-listings.sql src/app/customer/marketplace/marketplaceData.ts src/app/customer/marketplace/marketplaceData.test.ts
git commit -m "feat: define resale listing schema and rules"
```

### Task 5: Guarded Marketplace Service and APIs

**Files:**
- Create: `src/lib/marketplace.ts`
- Create: `src/app/api/customer/marketplace/route.ts`
- Create: `src/app/api/customer/marketplace/[listingId]/route.ts`
- Create: `src/app/api/customer/marketplace/route.test.ts`

- [ ] **Step 1: Write failing API boundary assertions**

```ts
test("marketplace writes require customer authorization", () => {
  const create = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
  const cancel = readFileSync(new URL("./[listingId]/route.ts", import.meta.url), "utf8");
  assert.match(create, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(create, /createResaleListing/);
  assert.match(cancel, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(cancel, /cancelResaleListing/);
  assert.match(cancel, /params: Promise<\{ listingId: string \}>/);
});
```

- [ ] **Step 2: Confirm RED**

Run: `node --test src/app/api/customer/marketplace/route.test.ts`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement the server-only service**

`createResaleListing(userId, ticketId, price)` must load the user's wallet, load the ticket, related ticket type and event, load any active listing, call `canListTicket`, verify wallet equality, insert only server-derived seller data, and translate PostgreSQL unique violation `23505` to a `409` result. `cancelResaleListing` must update only rows matching listing ID, active status, and seller wallet. `getMarketplacePageData(userId)` must return active listing display rows and the current wallet.

- [ ] **Step 4: Implement thin route handlers**

```ts
export async function POST(request: Request) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { ticketId?: unknown; price?: unknown } | null;
  const price = parseResalePrice(String(body?.price ?? ""));
  if (typeof body?.ticketId !== "string" || price === null) return Response.json({ error: "Enter a valid ticket and whole-number DICKEN price." }, { status: 400 });
  const result = await createResaleListing(auth.identity.user.id, body.ticketId, price);
  return Response.json(result.body, { status: result.status });
}
```

The `DELETE` handler awaits `params`, authorizes the customer role, calls cancellation, and returns the service result.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/app/api/customer/marketplace/route.test.ts src/app/customer/marketplace/marketplaceData.test.ts`

Expected: PASS.

```powershell
git add src/lib/marketplace.ts src/app/api/customer/marketplace
git commit -m "feat: add protected resale listing APIs"
```

### Task 6: Marketplace Page and Role Navigation

**Files:**
- Create: `src/app/customer/marketplace/page.tsx`
- Create: `src/app/customer/marketplace/MarketplaceClient.tsx`
- Create: `src/app/customer/marketplace/page.test.ts`
- Modify: `src/components/navConfig.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing navigation and UI assertions**

```ts
test("Marketplace belongs only to customer navigation", () => {
  const nav = readFileSync(new URL("../../../components/navConfig.ts", import.meta.url), "utf8");
  const customer = nav.slice(nav.indexOf("customer:"));
  assert.match(customer, /href: "\/customer\/marketplace", label: "Marketplace"/);
  assert.ok(customer.indexOf("/customer/marketplace") < customer.indexOf("/customer/transactions"));
});

test("Marketplace exposes approved browsing controls", () => {
  const source = readFileSync(new URL("./MarketplaceClient.tsx", import.meta.url), "utf8");
  assert.match(source, /All listings/);
  assert.match(source, /My listings/);
  assert.match(source, /Purchase unavailable/);
  assert.match(source, /Cancel listing/);
});
```

- [ ] **Step 2: Confirm RED**

Run: `node --test src/app/customer/marketplace/page.test.ts`

Expected: FAIL because Marketplace page/client and nav item are absent.

- [ ] **Step 3: Add the nav entry and protected page**

Import `Store` from lucide-react and add:

```ts
{ href: "/customer/marketplace", label: "Marketplace", icon: Store },
```

between Top Up DICKEN and Transactions. The page calls `requireRole`, then `getMarketplacePageData`, and renders the customer shell, heading, listing count, `MarketplaceClient`, and `Footer`.

- [ ] **Step 4: Implement MarketplaceClient**

Use local search and `"all" | "mine"` tab state. Render event image/name, artist, ticket type, date, venue, shortened seller wallet, price, and verified label. Render disabled `Purchase unavailable` for every card. For owned active listings, call `DELETE /api/customer/marketplace/${listing.id}` behind a confirmation modal, show request errors, and call `router.refresh()` on success.

- [ ] **Step 5: Add responsive styles, run test, and commit**

Add `.marketplace-page`, `.marketplace-toolbar`, `.marketplace-tabs`, `.marketplace-grid`, `.marketplace-listing`, `.marketplace-art`, `.marketplace-price`, and mobile rules reducing three columns to two at 900px and one at 560px.

Run: `node --test src/app/customer/marketplace/page.test.ts`

Expected: PASS.

```powershell
git add src/app/customer/marketplace src/components/navConfig.ts src/app/globals.css
git commit -m "feat: add customer resale marketplace"
```

### Task 7: List Owned Tickets for Resale

**Files:**
- Modify: `src/app/customer/tickets/ticketData.ts`
- Modify: `src/app/customer/tickets/page.tsx`
- Modify: `src/app/customer/tickets/TicketList.tsx`
- Modify: `src/app/customer/tickets/page.test.ts`

- [ ] **Step 1: Add failing eligibility and UI assertions**

Extend the ticket fixture assertion with `hasActiveListing: false`, then add:

```ts
test("eligible tickets expose a resale listing modal", () => {
  const source = readFileSync(listUrl, "utf8");
  assert.match(source, /List for resale/);
  assert.match(source, /parseResalePrice/);
  assert.match(source, /\/api\/customer\/marketplace/);
  assert.match(source, /This ticket type does not allow resale/);
});
```

- [ ] **Step 2: Confirm RED**

Run: `node --test src/app/customer/tickets/page.test.ts`

Expected: FAIL because active-listing state and resale actions are absent.

- [ ] **Step 3: Load active listing state**

Add `hasActiveListing` to `CustomerTicket` and `mapCustomerTickets`. In the server page, query `resale_listings` for the loaded ticket IDs with `status = active`, build a ticket-ID set, and pass it to the mapper. No listing query should run when there are no tickets.

- [ ] **Step 4: Add the listing modal**

In `TicketList`, use `canListTicket` to show `List for resale`; show a disabled explanation for transfer-disabled or invalid-state tickets. The modal holds a price string, validates with `parseResalePrice`, POSTs `{ ticketId, price }`, displays server errors, closes on success, and calls `router.refresh()`. Existing QR and transfer controls remain intact.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/app/customer/tickets/page.test.ts src/app/customer/marketplace/marketplaceData.test.ts`

Expected: PASS.

```powershell
git add src/app/customer/tickets
git commit -m "feat: let customers list eligible tickets"
```

### Task 8: Full Verification and Documentation Alignment

**Files:**
- Modify: `docs/API_AND_ROUTES.md`
- Verify all changed files

- [ ] **Step 1: Update the route map**

Add `/customer/marketplace` and `/customer/events/[eventId]` under Customer Routes. Add `/api/customer/marketplace` and `/api/customer/marketplace/[listingId]` under API routes, explicitly noting that resale purchase remains unavailable.

- [ ] **Step 2: Run every focused Node test**

Run:

```powershell
node --test src/app/visitor/data.test.ts src/app/customer/transactions/transactionData.test.ts src/app/customer/transactions/page.test.ts src/app/customer/marketplace/marketplaceData.test.ts src/app/customer/marketplace/page.test.ts src/app/api/customer/marketplace/route.test.ts src/app/customer/tickets/page.test.ts
```

Expected: all tests pass with zero failures.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no new warnings or errors.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: exit code 0; Next.js compiles public event details, protected customer event details, Transaction History, Marketplace, and both Marketplace APIs.

- [ ] **Step 5: Inspect the final diff and commit**

Run: `git diff --check`

Expected: no whitespace errors.

```powershell
git add docs/API_AND_ROUTES.md
git commit -m "docs: add customer marketplace routes"
```

The SQL migration must be applied to the target Supabase database before using Marketplace listing creation in that environment.
