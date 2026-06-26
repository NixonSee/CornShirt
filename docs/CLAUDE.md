# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. Keep it roughly in sync with `docs/AGENTS.md`.

## Important: This Is Next.js 16

This project pins `next@16.2.7`. Before writing Next.js code, read:

`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

Key rules:

- Request APIs are async. Treat `params`, `searchParams`, `cookies`, and `headers` as Promises.
- `next lint` is gone. The `lint` script calls `eslint` directly.
- Turbopack is the default. Do not add a `--turbopack` flag.
- There is no `middleware`; use `proxy` if route interception is introduced.
- Do not use `next/legacy/image`, AMP, or `next/config`.
- Tailwind CSS v4 uses `@import "tailwindcss"` in `globals.css`.
- ESLint uses flat config in `eslint.config.mjs`; do not add `.eslintrc`.
- React 19.2 is in use.

## Project Overview

CornShirt is a Web2 + Web3 concert ticketing and payment platform. Organizers create events, customers top up platform tokens and buy blockchain-based tickets, and admins monitor events, accounts, transactions, and ticket-verification records.

Payment uses an ERC-20 token, DICKEN. Ticket ownership is represented by an ERC-721 Ticket NFT through a platform-managed wallet model.

Status: Web2 surfaces such as auth, role routing, admin dashboard, and some customer/event UI exist. The Web3 platform-wallet layer is not wired yet.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

No test runner, typecheck script, or CI config is currently configured.

## Tech Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react, recharts, react-qr-code, react-toastify.
- Backend: Next.js API routes, Supabase Auth/Postgres/Storage, Stripe Test Mode.
- Smart contracts: DICKEN ERC-20 and Ticket NFT ERC-721 are consumed by ABI/address. Contract source is not currently in this repo.

## Architecture

### Auth and Role Routing

- Auth is Supabase Auth.
- `register/page.tsx` calls `supabase.auth.signUp`, then inserts a row into `profiles`. The target customer role value is `customer`.
- `login/page.tsx` signs in, reads `profiles.role`, and redirects: `admin` to `/admin`, `organizer` to `/organizer`, otherwise to `/user`.
- `src/app/page.tsx` currently redirects to `/login`; the target design is `/` as public active-event browsing.
- There is no proxy-based route guard yet. Role gating happens only at login redirect time.

### Public and Customer Surfaces

- Target routing: `/` is public active-event browsing.
- Target routing: `/events/[eventId]` is public event detail.
- Target routing: `/user` is the logged-in customer dashboard / My Tickets area.
- Current code still has legacy customer browse/detail files under `src/app/user/`. When adding docs or routes, keep `/user` as authenticated customer account pages.
- `src/app/user/events.ts` is dummy concert data and should be replaced with real `events` / `ticket_types` queries when implementing the public event flow.

### Supabase Clients

- `src/lib/supabaseClient.ts`: anon client for client components and browser-facing actions. It is subject to RLS.
- `src/lib/supabaseAdmin.ts`: service-role client for server-only code. It bypasses RLS and must never be imported into client components.

Tables referenced by docs/code include `profiles`, `events`, `ticket_types`, `tickets`, `transactions`, `topup_records`, `verification_logs`, and `admin_activity_logs`.

### Web3 and Wallets

The intended wallet approach is platform-managed:

- Customers do not connect external wallets.
- Store only the assigned wallet address in `profiles.wallet_address`.
- Private keys, service-role keys, seed phrases, and backend signing secrets stay server-only.
- `src/utils/web3config.ts` should hold chain/RPC and backend transaction helper config.
- `src/utils/smartContractAddress.ts` should hold public DICKEN and Ticket NFT contract addresses.
- Add ABI JSON under `src/abi/` when wiring contract interactions.

`src/context/web3.tsx`, `src/utils/web3config.ts`, `src/utils/smartContractAddress.ts`, and `src/utils/toast.ts` are currently empty stubs.

## Environment Variables

Required in `.env.local`; never commit this file:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_DICKEN_TOKEN_CONTRACT_ADDRESS
NEXT_PUBLIC_TICKET_NFT_CONTRACT_ADDRESS
```

## Branch Workflow

- Feature branches are cut from `dev`, not `main`.
- Do not push directly to `main`.
- Merge into `dev` first via PR.

## Related Docs

`AGENTS.md` covers the same ground for other agents. Keep the two roughly in sync when changing project-wide conventions.
