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
- Global styling is maintained directly in `src/app/globals.css`; Tailwind is
  not installed.
- ESLint uses flat config in `eslint.config.mjs`; do not add `.eslintrc`.
- React 19.2 is in use.

## Project Overview

CornShirt is a Web2 + Web3 concert ticketing prototype. Organizers create events, customers pay in MYR through Stripe Test Mode and receive blockchain-based tickets, and admins monitor events, accounts, transactions, and verification records.

Payments and refunds use Stripe Test Mode in MYR. Ticket ownership is represented by a Ticket NFT through a platform-managed wallet model on local Hardhat.

Status: Auth, server-side role guards, public event discovery, Stripe ticket
checkout, My Tickets, resale marketplace, QR verification, custodial wallet
provisioning, and local Hardhat Ticket NFT operations are implemented.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

The source test suite uses Node's test runner through `tsx`. Contract integration
tests are separate because they require a running Hardhat node.

## Tech Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, plain CSS,
  lucide-react, recharts, and react-qr-code.
- Backend: Next.js API routes, Supabase Auth/Postgres/Storage, Stripe Test Mode.
- Smart contracts: one ERC-721 Ticket NFT contract under `blockchain/`, with a
  local deployment script and application ABI under `src/abi/`.

## Architecture

### Auth and Role Routing

- Auth is Supabase Auth.
- `register/page.tsx` calls `supabase.auth.signUp`, then inserts a row into `profiles`. The target customer role value is `customer`.
- `login/page.tsx` signs in, reads `profiles.role`, and redirects to the
  matching `/admin`, `/organizer`, or `/customer` surface.
- `src/app/page.tsx` redirects public traffic to `/visitor`.
- Dashboard layouts and sensitive pages use server-side role authorization.

### Public and Customer Surfaces

- `/visitor` provides public active-event browsing.
- `/events/[eventId]` is the public event detail route.
- `/customer` and its nested routes provide the authenticated customer
  dashboard, tickets, transactions, and marketplace.
- Public and customer event data comes from Supabase; there is no production
  dummy event catalogue.

### Supabase Clients

- `src/lib/supabaseClient.ts`: anon client for client components and browser-facing actions. It is subject to RLS.
- `src/lib/supabaseAdmin.ts`: service-role client for server-only code. It bypasses RLS and must never be imported into client components.

Tables referenced by docs/code include `profiles`, `customers`, `custodial_wallets`, `events`, `ticket_types`, `tickets`, `transactions`, `resale_listings`, `verification_logs`, and `admin_activity_logs`. Future Stripe work adds idempotent payment-operation records.

### Web3 and Wallets

The intended wallet approach is platform-managed:

- Customers do not connect external wallets.
- Store only the assigned wallet address in `profiles.wallet_address`.
- Private keys, service-role keys, seed phrases, and backend signing secrets stay server-only.
- `src/utils/web3config.ts` should hold chain/RPC and backend transaction helper config.
- Server configuration should hold the public local Ticket NFT contract address.
- Add ABI JSON under `src/abi/` when wiring contract interactions.

`src/utils/web3config.ts` currently targets a local Hardhat chain. Converting
the runtime and deployment scripts to Sepolia is a separate deployment task.

## Environment Variables

Required in `.env.local`; never commit this file:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_TICKET_NFT_CONTRACT_ADDRESS
```

## Branch Workflow

- Feature branches are cut from `dev`, not `main`.
- Do not push directly to `main`.
- Merge into `dev` first via PR.

## Related Docs

`AGENTS.md` covers the same ground for other agents. Keep the two roughly in sync when changing project-wide conventions.
