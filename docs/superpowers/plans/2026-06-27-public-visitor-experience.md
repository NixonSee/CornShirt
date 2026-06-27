# Public Visitor Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root login redirect with a responsive, Supabase-backed public event browser and add public active-event details at `/events/[eventId]`.

**Architecture:** Keep Next.js route files thin and place visitor data contracts, mapping, querying, and presentation under `src/app/visitor/`. Server components fetch anonymous Supabase data; pure mappers normalize rows; one client component owns search and category state. The implementation uses a mandatory schema-inspection gate because this repository does not contain migrations or generated database types.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 plus a scoped CSS module, Supabase JS, Lucide React, Vitest, Testing Library.

---

## File Map

### Create

- `vitest.config.ts` — Vitest, jsdom, path-alias, and setup configuration.
- `src/test/setup.ts` — Testing Library matchers and cleanup.
- `src/app/layout.tsx` — required root App Router layout and Archivo/Inter fonts.
- `src/app/visitor/types.ts` — database-row contracts, normalized visitor models, and query-result types.
- `src/app/visitor/event-mappers.ts` — pure Supabase-row normalization and derived inventory values.
- `src/app/visitor/event-mappers.test.ts` — mapper and derived-value coverage.
- `src/app/visitor/event-filter.ts` — pure combined search/category filtering.
- `src/app/visitor/event-filter.test.ts` — filter coverage.
- `src/app/visitor/data.ts` — active-event and active-event-detail Supabase reads.
- `src/app/visitor/data.test.ts` — query-chain, status-filter, ordering, and sanitized-error coverage.
- `src/app/visitor/public-shell.tsx` — shared visitor header/footer.
- `src/app/visitor/hero.tsx` — approved compact photographic hero.
- `src/app/visitor/feedback-state.tsx` — loading, empty, no-results, and database-error presentation.
- `src/app/visitor/event-card.tsx` — event preview card.
- `src/app/visitor/event-browser.tsx` — interactive search/category UI and event grid.
- `src/app/visitor/event-browser.test.tsx` — interaction and empty-result coverage.
- `src/app/visitor/visitor-home.tsx` — homepage composition.
- `src/app/visitor/visitor-home.test.tsx` — homepage empty and error-state coverage.
- `src/app/visitor/ticket-type-card.tsx` — public ticket-type summary and protected purchase link.
- `src/app/visitor/event-detail.tsx` — public detail composition.
- `src/app/visitor/event-detail.test.tsx` — ticket state and login-return-link coverage.
- `src/app/visitor/visitor.module.css` — scoped dark/fire public visual system and responsive rules.
- `src/app/events/[eventId]/page.tsx` — public event-detail route.
- `src/app/events/[eventId]/loading.tsx` — detail-route skeleton.
- `src/app/events/[eventId]/not-found.tsx` — missing/inactive event state.

### Modify

- `package.json` — add test scripts and dev dependencies through `npm install`.
- `package-lock.json` — lock test dependencies through `npm install`.
- `next.config.ts` — allow banner images from the configured Supabase Storage host.
- `src/app/page.tsx` — render visitor home instead of redirecting to login.
- `src/app/globals.css` — expose only root font variables and baseline body behavior required by the new layout; preserve existing dashboard utilities.

## Canonical Supabase Contract and Safety Gate

The code in this plan uses this documented logical contract:

```ts
events: {
  id: string;
  name: string;
  artist: string | null;
  venue: string | null;
  city: string | null;
  event_date: string;
  description: string | null;
  category: string | null;
  banner_url: string | null;
  status: string;
}

ticket_types: {
  id: string;
  event_id: string;
  name: string;
  price: number | string;
  supply: number;
  sold_quantity: number | null;
  purchase_limit: number | null;
  transfer_allowed: boolean | null;
}
```

Execution must inspect the deployed schema before writing Task 2. If any name differs, update the row types and the two explicit select strings consistently, and record the discovered mapping in the implementation commit. Do not add or rename database columns in this feature.

### Task 1: Verify framework and deployed data contract

**Files:**
- Read: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
- Read: `.env.local`
- Read: `docs/superpowers/specs/2026-06-27-public-visitor-experience-design.md`

- [ ] **Step 1: Read the Next.js 16 upgrade guide required by `docs/AGENTS.md`**

Run:

```powershell
Get-Content -Raw node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
```

Expected: the guide confirms async `params`, no `next lint`, and App Router requirements.

- [ ] **Step 2: Query the Supabase OpenAPI document without printing credentials**

Run:

```powershell
Get-Content .env.local | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object { $pair = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($pair[0], $pair[1]) }
node -e "const u=process.env.NEXT_PUBLIC_SUPABASE_URL;const k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;fetch(u+'/rest/v1/',{headers:{apikey:k,Authorization:'Bearer '+k,Accept:'application/openapi+json'}}).then(r=>r.json()).then(s=>{for(const n of ['events','ticket_types'])console.log(n,Object.keys(s.definitions?.[n]?.properties||{}).sort())}).catch(e=>{console.error(e.message);process.exit(1)})"
```

Expected: two lines listing the deployed columns for `events` and `ticket_types`; no key or URL is printed.

- [ ] **Step 3: Compare the output with the canonical contract**

Expected: every select field used in this plan exists. If a field differs, stop before Task 2 and revise `DatabaseEventRow`, `DatabaseTicketTypeRow`, `ACTIVE_EVENTS_SELECT`, tests, and the detail select together. Do not infer or mutate schema.

### Task 2: Add the test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install the focused test dependencies**

Run:

```powershell
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` and `package-lock.json` contain the four dev dependencies.

- [ ] **Step 2: Add deterministic test scripts to `package.json`**

Set the scripts section to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    passWithNoTests: true,
    restoreMocks: true,
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

- [ ] **Step 5: Run the empty suite**

Run: `npm test`

Expected: Vitest exits successfully with no test failures.

- [ ] **Step 6: Commit the test harness**

```powershell
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "test: add visitor feature test harness"
```

### Task 3: Define and test visitor data normalization

**Files:**
- Create: `src/app/visitor/types.ts`
- Create: `src/app/visitor/event-mappers.ts`
- Create: `src/app/visitor/event-mappers.test.ts`

- [ ] **Step 1: Write `src/app/visitor/event-mappers.test.ts` first**

```ts
import { describe, expect, it } from "vitest";
import { mapPublicEvent } from "./event-mappers";
import type { DatabaseEventRow } from "./types";

const row: DatabaseEventRow = {
  id: "event-1",
  name: "Neon Corn Festival",
  artist: "The Cob Lights",
  venue: "Stadium Merdeka",
  city: "Kuala Lumpur",
  event_date: "2026-07-18T20:00:00+08:00",
  description: null,
  category: "Electronic",
  banner_url: null,
  status: "active",
  ticket_types: [
    { id: "ga", event_id: "event-1", name: "GA", price: "42", supply: 500, sold_quantity: 125, purchase_limit: 4, transfer_allowed: true },
    { id: "vip", event_id: "event-1", name: "VIP", price: 88, supply: 100, sold_quantity: null, purchase_limit: 2, transfer_allowed: false },
  ],
};

describe("mapPublicEvent", () => {
  it("derives starting price and non-negative remaining inventory", () => {
    const event = mapPublicEvent(row);
    expect(event.startingPrice).toBe(42);
    expect(event.remaining).toBe(475);
    expect(event.totalSupply).toBe(600);
  });

  it("normalizes nullable metadata and ticket values", () => {
    const event = mapPublicEvent({ ...row, artist: null, city: null, ticket_types: [] });
    expect(event.artist).toBe("");
    expect(event.city).toBe("");
    expect(event.startingPrice).toBeNull();
    expect(event.remaining).toBeNull();
  });
});
```

- [ ] **Step 2: Run the mapper test and verify RED**

Run: `npm test -- src/app/visitor/event-mappers.test.ts`

Expected: FAIL because `types.ts` and `event-mappers.ts` do not exist.

- [ ] **Step 3: Create `src/app/visitor/types.ts`**

```ts
export type DatabaseTicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  price: number | string;
  supply: number;
  sold_quantity: number | null;
  purchase_limit: number | null;
  transfer_allowed: boolean | null;
};

export type DatabaseEventRow = {
  id: string;
  name: string;
  artist: string | null;
  venue: string | null;
  city: string | null;
  event_date: string;
  description: string | null;
  category: string | null;
  banner_url: string | null;
  status: string;
  ticket_types: DatabaseTicketTypeRow[] | null;
};

export type PublicTicketType = {
  id: string;
  name: string;
  price: number;
  supply: number;
  remaining: number;
  purchaseLimit: number | null;
  transferAllowed: boolean;
};

export type PublicEvent = {
  id: string;
  name: string;
  artist: string;
  venue: string;
  city: string;
  eventDate: string;
  description: string;
  category: string;
  bannerUrl: string | null;
  startingPrice: number | null;
  totalSupply: number | null;
  remaining: number | null;
  ticketTypes: PublicTicketType[];
};

export type EventListResult =
  | { ok: true; events: PublicEvent[] }
  | { ok: false; message: string };

export type EventDetailResult =
  | { status: "found"; event: PublicEvent }
  | { status: "not-found" }
  | { status: "error"; message: string };
```

- [ ] **Step 4: Create `src/app/visitor/event-mappers.ts`**

```ts
import type { DatabaseEventRow, DatabaseTicketTypeRow, PublicEvent, PublicTicketType } from "./types";

function numberValue(value: number | string | null): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapTicketType(row: DatabaseTicketTypeRow): PublicTicketType {
  const supply = Math.max(0, numberValue(row.supply));
  const sold = Math.max(0, numberValue(row.sold_quantity));
  return {
    id: row.id,
    name: row.name,
    price: Math.max(0, numberValue(row.price)),
    supply,
    remaining: Math.max(0, supply - sold),
    purchaseLimit: row.purchase_limit,
    transferAllowed: row.transfer_allowed === true,
  };
}

export function mapPublicEvent(row: DatabaseEventRow): PublicEvent {
  const ticketTypes = (row.ticket_types ?? []).map(mapTicketType);
  return {
    id: row.id,
    name: row.name,
    artist: row.artist ?? "",
    venue: row.venue ?? "",
    city: row.city ?? "",
    eventDate: row.event_date,
    description: row.description ?? "",
    category: row.category ?? "",
    bannerUrl: row.banner_url,
    startingPrice: ticketTypes.length ? Math.min(...ticketTypes.map((ticket) => ticket.price)) : null,
    totalSupply: ticketTypes.length ? ticketTypes.reduce((sum, ticket) => sum + ticket.supply, 0) : null,
    remaining: ticketTypes.length ? ticketTypes.reduce((sum, ticket) => sum + ticket.remaining, 0) : null,
    ticketTypes,
  };
}
```

- [ ] **Step 5: Run the mapper test and verify GREEN**

Run: `npm test -- src/app/visitor/event-mappers.test.ts`

Expected: 2 tests pass.

- [ ] **Step 6: Commit the typed mapping boundary**

```powershell
git add src/app/visitor/types.ts src/app/visitor/event-mappers.ts src/app/visitor/event-mappers.test.ts
git commit -m "feat: normalize public event data"
```

### Task 4: Implement and test combined filtering

**Files:**
- Create: `src/app/visitor/event-filter.ts`
- Create: `src/app/visitor/event-filter.test.ts`

- [ ] **Step 1: Write the failing filter tests**

```ts
import { describe, expect, it } from "vitest";
import { filterEvents, getCategories } from "./event-filter";
import type { PublicEvent } from "./types";

const base: Omit<PublicEvent, "id" | "name" | "artist" | "city" | "category"> = {
  venue: "Arena",
  eventDate: "2026-08-01T20:00:00+08:00",
  description: "",
  bannerUrl: null,
  startingPrice: 50,
  totalSupply: 100,
  remaining: 80,
  ticketTypes: [],
};

const events: PublicEvent[] = [
  { ...base, id: "1", name: "Neon Corn", artist: "Cob Lights", city: "Kuala Lumpur", category: "Electronic" },
  { ...base, id: "2", name: "Harvest Beats", artist: "Golden Husk", city: "Penang", category: "Pop" },
];

describe("filterEvents", () => {
  it("combines normalized text search and category", () => {
    expect(filterEvents(events, "kuala", "Electronic").map((event) => event.id)).toEqual(["1"]);
    expect(filterEvents(events, "golden", "Electronic")).toEqual([]);
  });

  it("returns all events when controls are cleared", () => {
    expect(filterEvents(events, "", "All")).toEqual(events);
  });

  it("builds sorted unique categories", () => {
    expect(getCategories(events)).toEqual(["All", "Electronic", "Pop"]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/app/visitor/event-filter.test.ts`

Expected: FAIL because `event-filter.ts` does not exist.

- [ ] **Step 3: Create `src/app/visitor/event-filter.ts`**

```ts
import type { PublicEvent } from "./types";

export function filterEvents(events: PublicEvent[], query: string, category: string): PublicEvent[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return events.filter((event) => {
    const haystack = [event.name, event.artist, event.venue, event.city, event.category]
      .join(" ")
      .toLocaleLowerCase();
    const matchesQuery = normalizedQuery === "" || haystack.includes(normalizedQuery);
    const matchesCategory = category === "All" || event.category === category;
    return matchesQuery && matchesCategory;
  });
}

export function getCategories(events: PublicEvent[]): string[] {
  return ["All", ...new Set(events.map((event) => event.category).filter(Boolean).sort())];
}
```

- [ ] **Step 4: Run the filter test and verify GREEN**

Run: `npm test -- src/app/visitor/event-filter.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the filter behavior**

```powershell
git add src/app/visitor/event-filter.ts src/app/visitor/event-filter.test.ts
git commit -m "feat: add public event filtering"
```

### Task 5: Add tested active-only Supabase reads

**Files:**
- Create: `src/app/visitor/data.ts`
- Create: `src/app/visitor/data.test.ts`

- [ ] **Step 1: Write query-contract tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { from } }));

import { getActiveEvent, getActiveEvents } from "./data";

describe("visitor data", () => {
  beforeEach(() => from.mockReset());

  it("requests only active events in ascending date order", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    await getActiveEvents();

    expect(from).toHaveBeenCalledWith("events");
    expect(eq).toHaveBeenCalledWith("status", "active");
    expect(order).toHaveBeenCalledWith("event_date", { ascending: true });
  });

  it("returns a sanitized list error", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "database detail" } });
    from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }) });
    await expect(getActiveEvents()).resolves.toEqual({ ok: false, message: "Events could not be loaded." });
  });

  it("does not distinguish a missing event from an inactive one", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const secondEq = vi.fn().mockReturnValue({ maybeSingle });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: firstEq }) });
    await expect(getActiveEvent("event-1")).resolves.toEqual({ status: "not-found" });
    expect(secondEq).toHaveBeenCalledWith("status", "active");
  });
});
```

- [ ] **Step 2: Run the query tests and verify RED**

Run: `npm test -- src/app/visitor/data.test.ts`

Expected: FAIL because `data.ts` does not exist.

- [ ] **Step 3: Create `src/app/visitor/data.ts` using the verified schema names**

```ts
import { supabase } from "@/lib/supabaseClient";
import { mapPublicEvent } from "./event-mappers";
import type { DatabaseEventRow, EventDetailResult, EventListResult } from "./types";

export const ACTIVE_EVENTS_SELECT = `
  id,
  name,
  artist,
  venue,
  city,
  event_date,
  description,
  category,
  banner_url,
  status,
  ticket_types (
    id,
    event_id,
    name,
    price,
    supply,
    sold_quantity,
    purchase_limit,
    transfer_allowed
  )
`;

export async function getActiveEvents(): Promise<EventListResult> {
  const { data, error } = await supabase
    .from("events")
    .select(ACTIVE_EVENTS_SELECT)
    .eq("status", "active")
    .order("event_date", { ascending: true });

  if (error) return { ok: false, message: "Events could not be loaded." };
  return { ok: true, events: ((data ?? []) as unknown as DatabaseEventRow[]).map(mapPublicEvent) };
}

export async function getActiveEvent(eventId: string): Promise<EventDetailResult> {
  const { data, error } = await supabase
    .from("events")
    .select(ACTIVE_EVENTS_SELECT)
    .eq("id", eventId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { status: "error", message: "This event could not be loaded." };
  if (!data) return { status: "not-found" };
  return { status: "found", event: mapPublicEvent(data as unknown as DatabaseEventRow) };
}
```

- [ ] **Step 4: Run the query tests and verify GREEN**

Run: `npm test -- src/app/visitor/data.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the active-only read boundary**

```powershell
git add src/app/visitor/data.ts src/app/visitor/data.test.ts
git commit -m "feat: query active public events"
```

### Task 6: Build the shared visitor shell and visual system

**Files:**
- Create: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/app/visitor/public-shell.tsx`
- Create: `src/app/visitor/hero.tsx`
- Create: `src/app/visitor/feedback-state.tsx`
- Create: `src/app/visitor/visitor.module.css`
- Modify: `next.config.ts`

- [ ] **Step 1: Create the required root layout with local Next font variables**

```tsx
import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CornShirt — NFT Concert Tickets",
  description: "Discover active concerts and explore NFT-backed tickets powered by DICKEN.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Preserve dashboard utilities and update the baseline in `globals.css`**

Replace only the existing `body` rule with:

```css
body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}

button,
input {
  font: inherit;
}
```

- [ ] **Step 3: Create `public-shell.tsx`**

```tsx
import Link from "next/link";
import { Ticket } from "lucide-react";
import styles from "./visitor.module.css";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="CornShirt home">
        <Ticket aria-hidden />
        <span>Corn<strong>Shirt</strong></span>
      </Link>
      <nav className={styles.nav} aria-label="Public navigation">
        <Link href="/#events">Events</Link>
        <Link href="/login">Log in</Link>
        <Link className={styles.primaryButton} href="/register">Create account</Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return <footer className={styles.footer}>CornShirt · NFT concert tickets powered by DICKEN.</footer>;
}
```

- [ ] **Step 4: Allow configured Supabase Storage banner images in `next.config.ts`**

```ts
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [{ protocol: "https", hostname: new URL(supabaseUrl).hostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Create `hero.tsx`**

```tsx
import Link from "next/link";
import { BadgeCheck, RefreshCw, TicketCheck } from "lucide-react";
import styles from "./visitor.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="visitor-hero-title">
      <div className={styles.heroContent}>
        <p className={styles.kicker}>Verifiable live experiences · Powered by DICKEN</p>
        <h1 id="visitor-hero-title">Find your next <span>unforgettable night.</span></h1>
        <p>Discover active concerts and explore NFT-backed tickets with clear ownership and protected entry.</p>
        <div className={styles.heroActions}>
          <a className={styles.primaryButton} href="#events">Browse events</a>
          <Link className={styles.secondaryButton} href="/register">Create account</Link>
        </div>
        <div className={styles.features} aria-label="Platform benefits">
          <span><TicketCheck aria-hidden /> NFT-backed tickets</span>
          <span><BadgeCheck aria-hidden /> Verified entry</span>
          <span><RefreshCw aria-hidden /> Transfer-ready</span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create `feedback-state.tsx`**

```tsx
import { AlertTriangle, CalendarX, SearchX } from "lucide-react";
import styles from "./visitor.module.css";

type Props = { kind: "empty" | "no-results" | "error"; onReset?: () => void };

export function FeedbackState({ kind, onReset }: Props) {
  const copy = {
    empty: { icon: CalendarX, title: "No live events yet", body: "Check back after organizers publish their next shows." },
    "no-results": { icon: SearchX, title: "No events found", body: "Try another artist, city, or category." },
    error: { icon: AlertTriangle, title: "Events could not be loaded", body: "Please refresh and try again." },
  }[kind];
  const Icon = copy.icon;
  return (
    <section className={styles.feedback} role={kind === "error" ? "alert" : "status"}>
      <Icon aria-hidden />
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      {onReset ? <button className={styles.secondaryButton} onClick={onReset}>Reset filters</button> : null}
    </section>
  );
}

export function EventGridSkeleton() {
  return <div className={styles.skeletonGrid} aria-label="Loading events">{[0, 1, 2].map((item) => <div className={styles.skeletonCard} key={item} />)}</div>;
}
```

- [ ] **Step 7: Create the complete scoped tokens and layout in `visitor.module.css`**

```css
.page{min-height:100vh;background:radial-gradient(circle at 50% 0,rgba(255,153,35,.16),transparent 36%),#111;color:#f8f8f8;font-family:var(--font-sans)}
.header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem clamp(1rem,4vw,3rem);border-bottom:1px solid #303030;background:rgba(17,17,17,.86);backdrop-filter:blur(16px)}
.brand{display:flex;align-items:center;gap:.55rem;color:#fff;font-family:var(--font-display);font-size:1.25rem;font-weight:800;text-decoration:none}.brand svg{color:#ffad32}.brand strong{color:#ffad32}.nav{display:flex;align-items:center;gap:1rem}.nav>a:not(.primaryButton){color:#b8b8b8;font-weight:700}.nav>a:hover{color:#fff}
.primaryButton,.secondaryButton{display:inline-flex;min-height:42px;align-items:center;justify-content:center;border:1px solid transparent;border-radius:10px;padding:.65rem 1rem;font-weight:850;text-decoration:none;cursor:pointer}
.primaryButton{background:linear-gradient(135deg,#ffba35,#ef7025);color:#16100a;box-shadow:0 8px 34px -12px rgba(255,157,44,.72)}.secondaryButton{border-color:#3a3a3a;background:#262626;color:#f8f8f8}
.hero{min-height:520px;background:linear-gradient(90deg,rgba(12,12,12,.98),rgba(12,12,12,.54)),url('/Background Login Image.png') center/cover}.heroContent{width:min(1180px,calc(100% - 2rem));margin:auto;padding:clamp(4rem,9vw,7rem) 0}.kicker{color:#ffad32;font-size:.75rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1{max-width:760px;margin:1rem 0;font-family:var(--font-display);font-size:clamp(3rem,8vw,6rem);line-height:.92}.hero h1 span{background:linear-gradient(135deg,#ffd05b,#ef7025);background-clip:text;color:transparent}.heroContent>p:not(.kicker){max-width:620px;color:#b8b8b8;font-size:1.05rem}.heroActions,.features{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}.features{gap:1.5rem;color:#b8b8b8;font-weight:700}.features span{display:flex;align-items:center;gap:.45rem}.features svg{width:1.1rem;color:#ffad32}
.section{width:min(1180px,calc(100% - 2rem));margin:auto;padding:4rem 0}.toolbar{display:flex;align-items:end;justify-content:space-between;gap:1rem}.toolbar h2{margin:0;font-family:var(--font-display);font-size:2rem}.toolbar p{margin:.35rem 0 0;color:#aaa}.search{position:relative;width:min(100%,340px)}.search svg{position:absolute;left:.8rem;top:50%;width:1rem;transform:translateY(-50%);color:#888}.search input{width:100%;min-height:44px;border:1px solid #3a3a3a;border-radius:10px;background:#242424;color:#fff;padding:.7rem .8rem .7rem 2.35rem}.search input:focus-visible,.chip:focus-visible,.primaryButton:focus-visible,.secondaryButton:focus-visible,.card:focus-visible{outline:3px solid rgba(255,173,50,.45);outline-offset:2px}
.chips{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.25rem 0 2rem}.chip{border:1px solid #383838;border-radius:999px;background:#202020;color:#aaa;padding:.5rem .9rem;font-weight:800;cursor:pointer}.chipActive{border-color:#ffad32;background:#ffad32;color:#16100a}.grid,.skeletonGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem}.card{overflow:hidden;border:1px solid #303030;border-radius:14px;background:#1c1c1c;color:inherit;text-decoration:none;box-shadow:0 12px 36px -24px #000;transition:transform .16s,border-color .16s}.card:hover{transform:translateY(-3px);border-color:#ffad32}.media{position:relative;aspect-ratio:16/9;background:#282828}.media img{object-fit:cover}.status{position:absolute;top:.75rem;right:.75rem;border-radius:999px;background:#59d995;color:#07170f;padding:.3rem .55rem;font-size:.7rem;font-weight:900}.cardBody{padding:1rem}.cardBody h3{margin:0;font-family:var(--font-display);font-size:1.15rem}.meta{margin:.35rem 0;color:#aaa;font-size:.9rem}.inventory{height:4px;margin-top:1rem;overflow:hidden;border-radius:99px;background:#343434}.inventory span{display:block;height:100%;background:linear-gradient(90deg,#ffb932,#ef7025)}.priceRow{display:flex;justify-content:space-between;gap:.75rem;margin-top:.65rem;color:#aaa;font-size:.85rem}.priceRow strong{color:#ffbd3c}.feedback{display:grid;place-items:center;min-height:280px;border:1px dashed #3a3a3a;border-radius:14px;padding:2rem;text-align:center}.feedback svg{width:2rem;height:2rem;color:#ffad32}.feedback h2{margin:.8rem 0 .25rem}.feedback p{margin:0 0 1rem;color:#aaa}.skeletonCard{height:330px;border-radius:14px;background:linear-gradient(110deg,#202020 20%,#2c2c2c 38%,#202020 56%);background-size:200% 100%;animation:shimmer 1.2s linear infinite}.footer{border-top:1px solid #303030;padding:2rem;color:#909090;text-align:center}
.detailHero{position:relative;min-height:420px;display:flex;align-items:end;background:#181818}.detailHero img{object-fit:cover}.detailOverlay{position:absolute;inset:0;background:linear-gradient(to top,#111 5%,rgba(17,17,17,.28) 75%)}.detailCopy{position:relative;z-index:1;width:min(1180px,calc(100% - 2rem));margin:0 auto;padding:4rem 0}.detailCopy h1{max-width:800px;margin:.6rem 0;font-family:var(--font-display);font-size:clamp(2.6rem,7vw,5.4rem);line-height:.95}.detailGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.45fr);gap:1.5rem}.panel{border:1px solid #303030;border-radius:14px;background:#1c1c1c;padding:1.25rem}.ticketList{display:grid;gap:.8rem}.ticket{border:1px solid #343434;border-radius:12px;background:#222;padding:1rem}.ticketTop{display:flex;justify-content:space-between;gap:1rem}.ticketTop h3{margin:0}.ticketTop strong{color:#ffbd3c}.ticketMeta{display:flex;flex-wrap:wrap;gap:.6rem;margin:.7rem 0;color:#aaa;font-size:.85rem}
@keyframes shimmer{to{background-position-x:-200%}}@media(prefers-reduced-motion:reduce){.card,.skeletonCard{transition:none;animation:none}}
@media(max-width:900px){.grid,.skeletonGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.detailGrid{grid-template-columns:1fr}.hero{min-height:470px}}
@media(max-width:560px){.header{align-items:flex-start;flex-direction:column}.nav{width:100%;flex-wrap:wrap}.hero{min-height:440px}.toolbar{align-items:stretch;flex-direction:column}.search{width:100%}.grid,.skeletonGrid{grid-template-columns:1fr}.features{gap:.8rem}.detailHero{min-height:360px}}
```

- [ ] **Step 8: Run lint before committing the shell**

Run: `npm run lint -- src/app/layout.tsx src/app/visitor`

Expected: exit 0.

- [ ] **Step 9: Commit the shell and visual foundation**

```powershell
git add src/app/layout.tsx src/app/globals.css next.config.ts src/app/visitor/public-shell.tsx src/app/visitor/hero.tsx src/app/visitor/feedback-state.tsx src/app/visitor/visitor.module.css
git commit -m "feat: add public visitor visual shell"
```

### Task 7: Build and test the event browser

**Files:**
- Create: `src/app/visitor/event-card.tsx`
- Create: `src/app/visitor/event-browser.tsx`
- Create: `src/app/visitor/event-browser.test.tsx`
- Create: `src/app/visitor/visitor-home.tsx`
- Create: `src/app/visitor/visitor-home.test.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the interaction test first**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventBrowser } from "./event-browser";
import type { PublicEvent } from "./types";

const event = (id: string, name: string, category: string, city: string): PublicEvent => ({
  id, name, category, city, artist: "Artist", venue: "Arena", eventDate: "2026-08-01T20:00:00+08:00",
  description: "", bannerUrl: null, startingPrice: 42, totalSupply: 100, remaining: 80, ticketTypes: [],
});

describe("EventBrowser", () => {
  it("combines search and category and resets a miss", () => {
    render(<EventBrowser events={[event("1", "Neon Corn", "Electronic", "Kuala Lumpur"), event("2", "Harvest Beats", "Pop", "Penang")]} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search live events" }), { target: { value: "Penang" } });
    fireEvent.click(screen.getByRole("button", { name: "Electronic" }));
    expect(screen.getByText("No events found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText("Neon Corn")).toBeInTheDocument();
    expect(screen.getByText("Harvest Beats")).toBeInTheDocument();
  });
});
```

Also create `src/app/visitor/visitor-home.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisitorHome } from "./visitor-home";

describe("VisitorHome", () => {
  it("renders the platform empty state", () => {
    render(<VisitorHome result={{ ok: true, events: [] }} />);
    expect(screen.getByText("No live events yet")).toBeInTheDocument();
  });

  it("renders a sanitized query error", () => {
    render(<VisitorHome result={{ ok: false, message: "Events could not be loaded." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Events could not be loaded");
  });
});
```

- [ ] **Step 2: Run the browser test and verify RED**

Run: `npm test -- src/app/visitor/event-browser.test.tsx src/app/visitor/visitor-home.test.tsx`

Expected: FAIL because the browser and home components do not exist.

- [ ] **Step 3: Create `event-card.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import type { PublicEvent } from "./types";
import styles from "./visitor.module.css";

export function EventCard({ event }: { event: PublicEvent }) {
  const soldPercent = event.totalSupply && event.remaining !== null
    ? Math.min(100, Math.max(0, ((event.totalSupply - event.remaining) / event.totalSupply) * 100))
    : 0;
  return (
    <Link className={styles.card} href={`/events/${event.id}`} aria-label={`View ${event.name}`}>
      <div className={styles.media}>
        <Image src={event.bannerUrl || "/Background Login Image.png"} alt="" fill sizes="(max-width:560px) 100vw,(max-width:900px) 50vw,33vw" />
        <span className={styles.status}>ACTIVE</span>
      </div>
      <div className={styles.cardBody}>
        <h3>{event.name}</h3>
        <p className={styles.meta}>{[event.artist, event.city || event.venue, event.category].filter(Boolean).join(" · ")}</p>
        <p className={styles.meta}>{new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.eventDate))}</p>
        {event.totalSupply ? <div className={styles.inventory} aria-label={`${event.remaining} tickets remaining`}><span style={{ width: `${soldPercent}%` }} /></div> : null}
        <div className={styles.priceRow}><strong>{event.startingPrice === null ? "Tickets unavailable" : `From ${event.startingPrice} DICKEN`}</strong>{event.remaining !== null ? <span>{event.remaining} left</span> : null}</div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Create `event-browser.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EventCard } from "./event-card";
import { filterEvents, getCategories } from "./event-filter";
import { FeedbackState } from "./feedback-state";
import type { PublicEvent } from "./types";
import styles from "./visitor.module.css";

export function EventBrowser({ events }: { events: PublicEvent[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => getCategories(events), [events]);
  const visible = useMemo(() => filterEvents(events, query, category), [events, query, category]);
  const reset = () => { setQuery(""); setCategory("All"); };
  return (
    <section className={styles.section} id="events" aria-labelledby="events-title">
      <div className={styles.toolbar}>
        <div><h2 id="events-title">Live events</h2><p>Active, admin-approved concerts ready to explore.</p></div>
        <label className={styles.search}><Search aria-hidden /><span className="sr-only">Search live events</span><input type="search" aria-label="Search live events" placeholder="Search artists, cities…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      <div className={styles.chips} aria-label="Event categories">
        {categories.map((item) => <button key={item} className={`${styles.chip} ${item === category ? styles.chipActive : ""}`} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      {visible.length ? <div className={styles.grid}>{visible.map((event) => <EventCard event={event} key={event.id} />)}</div> : <FeedbackState kind="no-results" onReset={reset} />}
    </section>
  );
}
```

- [ ] **Step 5: Create `visitor-home.tsx`**

```tsx
import { EventBrowser } from "./event-browser";
import { FeedbackState } from "./feedback-state";
import { Hero } from "./hero";
import { PublicFooter, PublicHeader } from "./public-shell";
import type { EventListResult } from "./types";
import styles from "./visitor.module.css";

export function VisitorHome({ result }: { result: EventListResult }) {
  return <main className={styles.page}><PublicHeader /><Hero />{result.ok ? (result.events.length ? <EventBrowser events={result.events} /> : <section className={styles.section}><FeedbackState kind="empty" /></section>) : <section className={styles.section}><FeedbackState kind="error" /></section>}<PublicFooter /></main>;
}
```

- [ ] **Step 6: Replace `src/app/page.tsx`**

```tsx
import { Suspense } from "react";
import { getActiveEvents } from "./visitor/data";
import { EventGridSkeleton } from "./visitor/feedback-state";
import { VisitorHome } from "./visitor/visitor-home";
import styles from "./visitor/visitor.module.css";

async function HomeContent() {
  return <VisitorHome result={await getActiveEvents()} />;
}

export default function HomePage() {
  return <Suspense fallback={<main className={styles.page}><section className={styles.section}><EventGridSkeleton /></section></main>}><HomeContent /></Suspense>;
}
```

- [ ] **Step 7: Run the browser test and full suite**

Run: `npm test -- src/app/visitor/event-browser.test.tsx src/app/visitor/visitor-home.test.tsx`

Expected: 3 tests pass.

Run: `npm test`

Expected: all visitor tests pass.

- [ ] **Step 8: Commit the public homepage**

```powershell
git add src/app/page.tsx src/app/visitor/event-card.tsx src/app/visitor/event-browser.tsx src/app/visitor/event-browser.test.tsx src/app/visitor/visitor-home.tsx src/app/visitor/visitor-home.test.tsx
git commit -m "feat: add public event browser"
```

### Task 8: Build and test public event details

**Files:**
- Create: `src/app/visitor/ticket-type-card.tsx`
- Create: `src/app/visitor/event-detail.tsx`
- Create: `src/app/visitor/event-detail.test.tsx`
- Create: `src/app/events/[eventId]/page.tsx`
- Create: `src/app/events/[eventId]/loading.tsx`
- Create: `src/app/events/[eventId]/not-found.tsx`

- [ ] **Step 1: Write the protected-action test first**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventDetail } from "./event-detail";
import type { PublicEvent } from "./types";

const event: PublicEvent = {
  id: "event-1", name: "Neon Corn", artist: "Cob Lights", venue: "Stadium Merdeka", city: "Kuala Lumpur",
  eventDate: "2026-07-18T20:00:00+08:00", description: "A live electronic concert.", category: "Electronic",
  bannerUrl: null, startingPrice: 42, totalSupply: 100, remaining: 80,
  ticketTypes: [{ id: "ga", name: "General Admission", price: 42, supply: 100, remaining: 80, purchaseLimit: 4, transferAllowed: true }],
};

describe("EventDetail", () => {
  it("keeps details public and sends purchase to login with a return path", () => {
    render(<EventDetail event={event} />);
    expect(screen.getByText("A live electronic concert.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in to buy General Admission" })).toHaveAttribute("href", "/login?next=%2Fevents%2Fevent-1");
  });

  it("shows an unavailable state when no ticket types exist", () => {
    render(<EventDetail event={{ ...event, ticketTypes: [] }} />);
    expect(screen.getByText("Tickets are not available yet.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the detail test and verify RED**

Run: `npm test -- src/app/visitor/event-detail.test.tsx`

Expected: FAIL because the detail components do not exist.

- [ ] **Step 3: Create `ticket-type-card.tsx`**

```tsx
import Link from "next/link";
import type { PublicTicketType } from "./types";
import styles from "./visitor.module.css";

export function TicketTypeCard({ eventId, ticket }: { eventId: string; ticket: PublicTicketType }) {
  const returnPath = encodeURIComponent(`/events/${eventId}`);
  return <article className={styles.ticket}><div className={styles.ticketTop}><h3>{ticket.name}</h3><strong>{ticket.price} DICKEN</strong></div><div className={styles.ticketMeta}><span>{ticket.remaining} remaining</span>{ticket.purchaseLimit ? <span>Limit {ticket.purchaseLimit}</span> : null}<span>{ticket.transferAllowed ? "Transfer enabled" : "Non-transferable"}</span></div><Link className={styles.primaryButton} href={`/login?next=${returnPath}`} aria-label={`Log in to buy ${ticket.name}`}>Log in to buy</Link></article>;
}
```

- [ ] **Step 4: Create `event-detail.tsx`**

```tsx
import Image from "next/image";
import { PublicFooter, PublicHeader } from "./public-shell";
import { TicketTypeCard } from "./ticket-type-card";
import type { PublicEvent } from "./types";
import styles from "./visitor.module.css";

export function EventDetail({ event }: { event: PublicEvent }) {
  return <main className={styles.page}><PublicHeader /><section className={styles.detailHero}><Image src={event.bannerUrl || "/Background Login Image.png"} alt="" fill priority sizes="100vw" /><div className={styles.detailOverlay} /><div className={styles.detailCopy}><p className={styles.kicker}>{event.category || "Live event"}</p><h1>{event.name}</h1><p>{[event.artist, event.venue, event.city].filter(Boolean).join(" · ")}</p></div></section><section className={styles.section}><div className={styles.detailGrid}><article className={styles.panel}><h2>About the event</h2><p>{event.description || "More event details will be announced soon."}</p><p className={styles.meta}>{new Intl.DateTimeFormat("en-MY", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.eventDate))}</p></article><aside className={styles.panel} aria-labelledby="ticket-types-title"><h2 id="ticket-types-title">Ticket types</h2>{event.ticketTypes.length ? <div className={styles.ticketList}>{event.ticketTypes.map((ticket) => <TicketTypeCard eventId={event.id} ticket={ticket} key={ticket.id} />)}</div> : <p>Tickets are not available yet.</p>}</aside></div></section><PublicFooter /></main>;
}
```

- [ ] **Step 5: Create the Next.js 16 detail route**

```tsx
import { notFound } from "next/navigation";
import { getActiveEvent } from "@/app/visitor/data";
import { EventDetail } from "@/app/visitor/event-detail";
import { FeedbackState } from "@/app/visitor/feedback-state";
import { PublicFooter, PublicHeader } from "@/app/visitor/public-shell";
import styles from "@/app/visitor/visitor.module.css";

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const result = await getActiveEvent(eventId);
  if (result.status === "not-found") notFound();
  if (result.status === "error") return <main className={styles.page}><PublicHeader /><section className={styles.section}><FeedbackState kind="error" /></section><PublicFooter /></main>;
  return <EventDetail event={result.event} />;
}
```

- [ ] **Step 6: Create route loading and not-found files**

`src/app/events/[eventId]/loading.tsx`:

```tsx
import { EventGridSkeleton } from "@/app/visitor/feedback-state";
import styles from "@/app/visitor/visitor.module.css";

export default function Loading() {
  return <main className={styles.page}><section className={styles.section}><EventGridSkeleton /></section></main>;
}
```

`src/app/events/[eventId]/not-found.tsx`:

```tsx
import Link from "next/link";
import styles from "@/app/visitor/visitor.module.css";

export default function NotFound() {
  return <main className={styles.page}><section className={styles.feedback}><h1>Event not found</h1><p>This event is unavailable or is not currently active.</p><Link className={styles.primaryButton} href="/">Browse live events</Link></section></main>;
}
```

- [ ] **Step 7: Run detail and full tests**

Run: `npm test -- src/app/visitor/event-detail.test.tsx`

Expected: 2 tests pass.

Run: `npm test`

Expected: every visitor test passes.

- [ ] **Step 8: Commit event details**

```powershell
git add src/app/visitor/ticket-type-card.tsx src/app/visitor/event-detail.tsx src/app/visitor/event-detail.test.tsx 'src/app/events/[eventId]/page.tsx' 'src/app/events/[eventId]/loading.tsx' 'src/app/events/[eventId]/not-found.tsx'
git commit -m "feat: add public event details"
```

### Task 9: Verify real data, accessibility, and responsive behavior

**Files:**
- Modify only files identified by failing verification.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run ESLint**

Run: `npm run lint`

Expected: exit 0 with no errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit 0; `/` and `/events/[eventId]` are listed in the route output.

- [ ] **Step 4: Start the app and verify live Supabase behavior**

Run: `npm run dev`

Expected at `http://localhost:3000`:

- `/` is public and does not redirect to login.
- only active database events appear;
- query errors show sanitized copy;
- search and category controls work together;
- clearing controls restores all active events;
- event cards open `/events/<id>`;
- inactive and missing IDs show the same not-found state;
- login links contain `next=%2Fevents%2F<id>`.

- [ ] **Step 5: Verify layout at 1440px, 820px, and 390px widths**

Expected:

- event grid is 3, 2, and 1 columns respectively;
- navigation wraps without overlap;
- hero text and actions remain visible;
- focus rings are visible;
- ticket metadata does not overflow;
- reduced-motion mode disables card lift and skeleton animation.

- [ ] **Step 6: Review the final diff for scope**

Run:

```powershell
git status --short
git diff --check
git diff --stat
```

Expected: no unrelated user files are staged or modified by this feature and no whitespace errors are reported.

- [ ] **Step 7: Commit verification fixes if verification required changes**

```powershell
git add src/app package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "fix: harden public visitor experience"
```

If Step 1 through Step 5 required no changes, do not create an empty commit.
