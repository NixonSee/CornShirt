# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: this is NOT the Next.js you know

This project pins `next@16.2.7`, newer than your training data, with breaking changes. **Read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before writing any Next.js code.** Key differences already relied on in this codebase:

- **Request APIs are async** — `params`, `searchParams`, `cookies`, `headers` are `Promise`s. Code already does `const { slug } = await params;` (see `src/app/user/concerts/[slug]/page.tsx`).
- **No `next lint`** — the `lint` script calls `eslint` directly. ESLint uses flat config (`eslint.config.mjs`); there is no `.eslintrc`.
- **Turbopack is the default** — no `--turbopack` flag; pass `--webpack` to opt out. Dev builds land in `.next/dev/`, production in `.next/`.
- **No `middleware`** (renamed `proxy`), no `next/legacy/image`, no `next/config`, no AMP.
- **Tailwind CSS v4** — `@import "tailwindcss"` in `globals.css`, not `@tailwind` directives.
- **React 19.2** — `ViewTransition`, `useEffectEvent`, `Activity` are available.

Heed any deprecation notices in the bundled docs.

## Project overview

CornShirt is a Web2 + Web3 concert ticketing and payment platform. Organizers create events, users top up platform tokens and buy blockchain-based tickets, and admins monitor events, users, transactions, and ticket-verification records. Payment uses an ERC-20 token (**DICKEN**) and ticket ownership is an ERC-721 **Ticket NFT**.

Status: Web2 surface (auth, role routing, admin dashboard, user/event browsing UI) is implemented; the Web3 layer is **not wired yet** (see below).

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config)
```

No test runner and no typecheck script are configured. No CI config exists.

## Tech stack

- **Frontend**: Next.js 16 (App Router, `src/app/`), React 19, TypeScript, Tailwind CSS v4, lucide-react (icons), recharts (admin charts), react-qr-code, react-toastify, Wagmi + Viem, Reown AppKit
- **Backend**: Next.js API routes (none yet), Supabase (Postgres, Auth, Storage), Stripe (test mode)
- **Smart contracts**: Solidity, OpenZeppelin, Hardhat (DICKEN ERC-20, Ticket NFT ERC-721) — contract source is **not** in this repo; only deployed ABIs/addresses are consumed here. No `contracts/` dir or Hardhat config exists yet despite Hardhat being in devDependencies.

## Architecture

### Auth & role-based routing
- Auth is Supabase Auth. `register/page.tsx` calls `supabase.auth.signUp`, then inserts a row into the `profiles` table with `role: "user"`.
- `login/page.tsx` signs in, reads `profiles.role` for the user, and redirects: `admin` → `/admin`, `organizer` → `/organizer`, else → `/user`.
- `src/app/page.tsx` immediately `redirect("/login")`.
- There is no middleware/proxy guarding routes yet — role gating happens only at login redirect time.

### Two Supabase clients (do not mix them up)
- `src/lib/supabaseClient.ts` — **anon** client (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Use in client components / anything user-facing; subject to RLS.
- `src/lib/supabaseAdmin.ts` — **service-role** client (`SUPABASE_SERVICE_ROLE_KEY`). Bypasses RLS; **server-only**, never import into a client component or leak to the browser.
- Both are instantiated at module scope.

### Admin dashboard (server component)
`src/app/admin/page.tsx` is an `async` server component with `export const dynamic = "force-dynamic"`. It fans out a single `Promise.all` of `supabaseAdmin` queries, then aggregates entirely in JS (role counts, event pipeline, revenue/event trends, top events, a merged activity feed) and passes data down to presentational components in `src/components/admin/` (`QuickStat`, `AdminCharts`, `TrendCharts`, `EventPipeline`, `TicketAnalytics`, `ActivityFeed`, `RecentEventsTable`). The inline `Sparkline`/`computeTrend` helpers live in the page file.

Supabase tables referenced by the dashboard (the de-facto schema): `profiles(role)`, `events(event_name, artist_name, venue, event_date, status, created_at)`, `tickets`, `ticket_types(type_name, price, total_supply, remaining_supply, event_id)`, `topup_records(amount_rm, payment_status, created_at)`, `verification_logs(verification_status, verified_at)`, `transactions(amount, transaction_type, created_at)` where `transaction_type === "purchase"` counts as ticket revenue, and `admin_activity_logs(action_type, target_type, description, created_at)`.

### User / events surface
- `src/app/user/page.tsx` and `src/app/user/concerts/[slug]/page.tsx` render the concert browse/detail UI.
- **`src/app/user/events.ts` is dummy data** (`drops`, `getDropBySlug`, types `ConcertDrop`/`ConcertPass`). It must be replaced with real `events` / `ticket_types` queries — the file says so itself. The detail page uses `generateStaticParams()` over this dummy list.

### Web3 — not implemented yet
`src/context/web3.tsx`, `src/utils/web3config.ts`, `src/utils/smartContractAddress.ts`, and `src/utils/toast.ts` are **empty stubs**. No Web3 provider wraps `layout.tsx`, and `src/abi/` does not exist. When wiring Web3: `web3config.ts` is the intended home for Wagmi/Reown chain+connector config, `smartContractAddress.ts` for `NEXT_PUBLIC_DICKEN_TOKEN_CONTRACT_ADDRESS` / `NEXT_PUBLIC_TICKET_NFT_CONTRACT_ADDRESS`, and `src/abi/` for ABI JSON.

### Misc
- Path alias `@/*` → `src/*` (`tsconfig.json`).
- `src/components/common/` holds shared UI (`Button`, `Card`, `Footer`, `Navbar`); `Card` is already used by the admin dashboard.

## Environment variables

Required in `.env.local` (never commit it):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-only; used by supabaseAdmin.ts
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_PROJECT_ID             # Reown AppKit project id
NEXT_PUBLIC_DICKEN_TOKEN_CONTRACT_ADDRESS
NEXT_PUBLIC_TICKET_NFT_CONTRACT_ADDRESS
```

## Branch workflow

- Feature branches are cut from `dev`, not `main`: `git checkout dev && git pull origin dev && git checkout -b your-branch-name`.
- Do not push directly to `main`; merge into `dev` first via PR.

## Related docs

`AGENTS.md` covers the same ground for other agents — keep the two roughly in sync when changing project-wide conventions.
</content>
</invoke>
