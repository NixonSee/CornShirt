<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Next.js 16 (v16.2.7) has breaking changes. Read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before writing any code — notably:

- **No `next lint`** — use `eslint` directly (already in package.json scripts)
- **No `next/legacy/image`**, no AMP, no `next/config`
- **No `middleware`** — renamed to `proxy` (file + export name)
- **All Request APIs async** — `params`, `searchParams`, `cookies`, `headers` are `Promise`s. Code already uses `await params` in `[slug]/page.tsx`.
- **Turbopack default** — no `--turbopack` flag needed; `--webpack` to opt out
- **`.next/dev/`** for dev builds, `.next/` for production
- **`revalidateTag(tag, cacheLifeProfile)`** — second arg required
- **TailwindCSS v4** — uses `@import "tailwindcss"` (no `@tailwind` directives)
- **ESLint flat config** (`eslint.config.mjs`) is default; no `.eslintrc`
- **React 19.2** — `ViewTransition`, `useEffectEvent`, `Activity` available

Read the relevant guide before writing code and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CornShirt — Agent Quick Start

## Dev commands

| Action | Command |
|---|---|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| No tests or typecheck scripts are configured yet. No CI config found. ||

## Project structure

- `src/app/` — Next.js App Router pages (routes: `/login`, `/register`, `/user`, `/user/concerts/[slug]`, `/admin`, `/organizer`, `/test-supabase`)
- `src/app/page.tsx` redirects to `/login`
- `src/components/common/` — shared components (most are empty stubs)
- `src/context/web3.tsx` — Web3 provider (empty stub)
- `src/lib/supabaseClient.ts` — Supabase client (uses `NEXT_PUBLIC_` env vars)
- `src/utils/` — helpers (most are empty stubs)
- `src/app/user/events.ts` — dummy concert data (types: `ConcertDrop`, `ConcertPass`)
- `docs/superpowers/` — plans/specs
- No `contracts/` or hardhat config exists yet (hardhat installed in deps)

## Key architecture notes

- **Role-based routing**: login reads `profiles.role` from Supabase and redirects to `/admin`, `/organizer`, or `/user`
- **Web3 not wired yet**: `context/web3.tsx`, `utils/web3config.ts` are empty stubs — no provider in `layout.tsx`
- **Smart contract ABIs**: `src/abi/` directory does not exist yet
- **`@/` path alias** maps to `./src/*` (see `tsconfig.json`)
- **Supabase client instantiated at module level** in `supabaseClient.ts` — works for server components because `NEXT_PUBLIC_` vars are available on both client and server

## Not yet implemented (stubs/empty files)

`src/context/web3.tsx`, `src/utils/web3config.ts`, `src/utils/smartContractAddress.ts`, `src/utils/toast.ts`, `src/components/common/Button.tsx`, `src/components/common/Card.tsx`, `src/components/common/Footer.tsx`, `src/components/common/Navbar.tsx`

## Environment

`.env.local` requires: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PROJECT_ID`, `NEXT_PUBLIC_DICKEN_TOKEN_CONTRACT_ADDRESS`, `NEXT_PUBLIC_TICKET_NFT_CONTRACT_ADDRESS`. Supabase URL/anon key are already populated. Stripe keys and contract addresses are not.

## Existing instructions

`CLAUDE.md` just defers to `AGENTS.md`. Keep that file in sync if renaming.
