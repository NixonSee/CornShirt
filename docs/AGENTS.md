# CornShirt Agent Guide

This file tells coding agents how to work in this repository. Read it before changing code, then use the more specific docs in `docs/` as the source of truth for product behavior and visual direction.

## Read These First

- `docs/SPECS.md`: system requirements, roles, business rules, and feature scope.
- `docs/ROLE_FEATURES_AND_FLOW.md`: role permissions and main product flows.
- `docs/API_AND_ROUTES.md`: intended route map and future API routes.
- `docs/DESIGN.md`: UI and visual design guide based on `docs/html-designs/`.
- `docs/COMPONENTS.md`: expected reusable component inventory.
- `docs/CLAUDE.md`: parallel agent notes that should stay roughly in sync with this file.
- `docs/SMART_CONTRACTS.md`: currently empty; do not assume contract source exists in this repo.

## Important: This Is Next.js 16

This project pins `next@16.2.7`. Before writing Next.js code, read:

`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

Key rules:

- Use `eslint` directly. `next lint` is gone, and `npm run lint` already calls `eslint`.
- Request APIs are async. Treat `params`, `searchParams`, `cookies`, and `headers` as Promises.
- There is no `middleware`; use `proxy` if route interception is introduced.
- Do not use `next/legacy/image`, AMP, or `next/config`.
- Turbopack is the default for `next dev`; do not add a `--turbopack` flag.
- Dev builds use `.next/dev/`; production builds use `.next/`.
- `revalidateTag` requires a second `cacheLifeProfile` argument.
- Tailwind CSS v4 uses `@import "tailwindcss"` in CSS, not `@tailwind` directives.
- ESLint uses flat config in `eslint.config.mjs`; do not add `.eslintrc`.
- React 19.2 is in use.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

No test runner, typecheck script, or CI config is currently configured. If you add meaningful behavior, prefer adding verification coverage or at least run `npm run lint` and `npm run build` when feasible.

## Product Summary

CornShirt is a Web2 + Web3 concert ticketing platform. Public visitors browse active events, customers top up DICKEN and buy NFT-backed tickets, organizers create and manage events, and admins approve event submissions and monitor the platform.

Core concepts:

- Payment token: DICKEN, an ERC-20 token.
- Ticket ownership: Ticket NFT, an ERC-721 token.
- Auth and application data: Supabase.
- Top-up payments: Stripe Test Mode.
- Web3 transactions use a platform-managed wallet model. Customers do not need to connect external wallets.
- The system stores only the assigned wallet address in `profiles.wallet_address`.
- Private keys and backend signing secrets must remain server-only.

The Web2 surface exists, but the Web3 layer is not wired yet.

## Current Project Structure

- `src/app/`: Next.js App Router pages.
- `src/app/page.tsx`: currently redirects to `/login`; target design says `/` should become public event browsing.
- `src/app/login/page.tsx`: Supabase login and role redirect.
- `src/app/register/page.tsx`: Supabase registration; target profile role is `customer`.
- `src/app/user/`: logged-in customer dashboard, My Tickets, wallet/top-up, and transaction areas.
- `src/app/user/events.ts`: current dummy concert data used by legacy customer browse/detail pages; replace with Supabase `events` and `ticket_types` queries when implementing the public `/events/[eventId]` flow.
- `src/app/organizer/`: organizer dashboard and event management routes.
- `src/app/admin/`: admin dashboard, organizer management, event approvals, and analytics routes.
- `src/components/admin/`: admin dashboard presentation components.
- `src/components/common/`: shared layout and UI components. Some may be stubs or incomplete.
- `src/context/auth.tsx`: auth context used by `src/app/layout.tsx`.
- `src/context/web3.tsx`: currently an empty Web3 stub.
- `src/lib/supabaseClient.ts`: public anon Supabase client.
- `src/lib/supabaseAdmin.ts`: service-role Supabase client. Server-only.
- `src/utils/`: helper modules, including Web3 config/address stubs.
- `public/`: brand and UI assets.
- `docs/html-designs/`: HTML prototypes and `design.css` visual source.

Path alias `@/*` maps to `src/*`.

## Intended Routes

Use `docs/API_AND_ROUTES.md` as the target route map:

- Public: `/`, `/login`, `/register`, `/events/[eventId]`
- Customer: `/user`, `/user/tickets`, `/user/top-up`, `/user/transactions`
- Organizer: `/organizer`, `/organizer/create-event`, `/organizer/events/[eventId]`, `/organizer/events/[eventId]/edit`, `/organizer/verify-ticket`
- Admin: `/admin`, `/admin/pending-events`, `/admin/organizers`, `/admin/events`

Current implementation may differ. When docs and code disagree, preserve working code but move toward the documented target unless the user asks otherwise.

## Roles and Access Rules

- Public visitors can browse active events, search/filter events, view previews, and access login/register.
- New registrations become `customer` role by default.
- Customers can browse active events, top up DICKEN, buy tickets, view platform-managed Ticket NFTs, view QR codes, transfer eligible tickets, resell eligible tickets, view transactions, and claim refunds after cancellation.
- Organizers can create events, upload banners, create ticket types, set DICKEN price/supply/purchase limits/transfer permission, track approval status, verify tickets, mark valid tickets as used, cancel events, and view revenue.
- Admins can view organizers, review pending events, approve events to `active`, reject events back to `draft`, and monitor platform events.
- Only `active` events appear to public visitors and customers.
- Used, refunded, cancelled, or invalid tickets cannot be used for entry.
- Ticket transfer/resale is allowed only when the ticket type allows transfer.

There is no route-level proxy/middleware guard yet. Login performs role-based redirect by reading `profiles.role`.

## Supabase Rules

Use the right client:

- `src/lib/supabaseClient.ts`: anon client for client components and browser-facing actions. It is subject to RLS.
- `src/lib/supabaseAdmin.ts`: service-role client for server-only code. It bypasses RLS and must never be imported into client components.

Tables referenced by current docs/code include:

- `profiles`
- `events`
- `ticket_types`
- `tickets`
- `transactions`
- `topup_records`
- `verification_logs`
- `admin_activity_logs`

Do not store passwords in application tables. Supabase Auth owns password handling.

## Web3 and Payments

The docs describe DICKEN and Ticket NFT behavior, but this repo does not currently include contract source, Hardhat config, ABIs, or wired platform-wallet transaction handlers.

When implementing Web3:

- Use a platform-managed wallet model; do not add visible external wallet connection as the default customer flow.
- Store only the assigned wallet address in `profiles.wallet_address`.
- Put chain/RPC and backend transaction helper config in `src/utils/web3config.ts`.
- Put public contract addresses in `src/utils/smartContractAddress.ts`.
- Add ABI JSON under `src/abi/`.
- Keep private keys, service-role keys, seed phrases, and backend signing secrets server-only.
- Stripe top-up work should use server-only secrets and persist top-up records in Supabase.

Expected environment variables:

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

Never commit `.env.local`.

## UI and Visual Direction

Follow `docs/DESIGN.md` and `docs/html-designs/design.css`.

Target page mapping:

- Public visitor: use `docs/html-designs/index.html` as the model for `/`.
- Customer: use the same event browsing foundation as `index.html`, then reveal authenticated customer features.
- Organizer: use the organizer dashboard design from `docs/html-designs/CornShirt Prototype.html` and `docs/html-designs/organizer.html`.
- Admin: use the admin dashboard design from `docs/html-designs/CornShirt Prototype.html` and `docs/html-designs/admin.html`.
- Login: use `docs/html-designs/login.html`.
- Register: use `docs/html-designs/register.html`.

Visual rules:

- Use the dark concert-commerce theme from `design.css`.
- Use `Archivo` for display headings and `Inter` for body/UI text.
- Use the fire gradient for primary actions.
- Use dark cards, compact dashboards, tables, status badges, and clear forms.
- Use `public/CornShirt-Logo.png`, `public/Background Login Image.png`, and `public/DICKEN token.png` where appropriate.
- Avoid reverting to the older light dashboard palette unless the user explicitly asks.
- Keep responsive behavior aligned with the `900px` and `560px` breakpoints in `design.css`.

## Component Expectations

Prefer shared components when they exist or can be safely completed:

- Layout: Header/Navbar, Footer, Dashboard Sidebar, Page Container.
- UI: Button, Card, Status Badge, Modal/Confirmation Dialog, Input, Select, Textarea, File Upload, Search Bar, Empty State, Loading State, Error/Success Alert.
- Data display: Table, Pagination, Event Card, Ticket Type Card, Ticket Card, Statistic Card.
- Later/advanced: QR Code Display, QR Verification Result Panel, Transaction History Table, Top Up Balance Card, Organizer Revenue Summary Card.

Use `lucide-react` icons for UI controls when icons are needed.

## Implementation Guidelines

- Read relevant docs before editing. Specs describe desired behavior; code shows current reality.
- Keep changes scoped to the requested feature or fix.
- Do not revert unrelated user changes or cleanup files outside the task.
- Prefer server components for server-only data access; use client components for interactive forms and Supabase Auth calls.
- Keep service-role Supabase access server-only.
- Replace dummy event data gradually with typed Supabase queries instead of expanding dummy data.
- Preserve role semantics: public visitor, customer, organizer, admin.
- Use meaningful loading, empty, error, and success states for customer-facing and admin-facing flows.
- When adding API routes, keep server secrets inside route handlers or server-only modules.
- Do not modify `AGENTS.md` without explicit user confirmation.
- Before changing project-wide rules, architecture decisions, user roles, routes, security rules, database rules, or feature scope, explain the proposed change and wait for confirmation.
- Keep `docs/CLAUDE.md` and this file roughly in sync when changing repo-wide conventions.

## Git Workflow

- Feature branches should be cut from `dev`, not `main`.
- Do not push directly to `main`.
- Merge into `dev` first via PR.

## Verification

Before claiming a change is complete, run the strongest feasible checks:

```bash
npm run lint
npm run build
```

If you cannot run a check, say why. If you changed only Markdown, at minimum read the changed file back and scan for placeholders, contradictions, and encoding artifacts.
