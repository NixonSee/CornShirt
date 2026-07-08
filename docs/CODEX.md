# Visitor Landing Page Design

## Goal

Rebuild `/visitor` as a faithful Next.js version of `docs/html-designs/index.html`, then enhance its hero section into an accessible featured-event carousel. The page remains a public landing page where visitors can discover and filter active events before logging in or registering.

## Source of Truth

The structure, wording, five-event catalogue, categories, search behavior, empty state, header, and footer come from `docs/html-designs/index.html`. Links are adapted to valid Next.js application routes, and corrupted display characters are replaced with readable icons or punctuation.

## Component Structure

- `src/app/visitor/page.tsx` owns the complete landing page, including carousel and event-filter state and markup.
- `src/app/visitor/data.ts` contains the shared event catalogue used by the carousel and event browser.
- `src/app/globals.css` contains the visitor landing-page and carousel styles, following the existing project theme.

## Hero Carousel

The carousel promotes selected events from the same event catalogue shown below it. Each slide displays only the event name and a Details action linking to `/events/[eventId]`. Because the project has one suitable concert background image, each slide uses that existing asset with a distinct overlay treatment rather than introducing unsupported external assets.

The carousel automatically advances every five seconds. Visitors can use previous and next buttons, navigation dots, or the left and right arrow keys. Automatic rotation pauses while the carousel is hovered or keyboard focus is inside it. Controls have accessible names, dots expose the selected state, and reduced-motion preferences disable animated transitions.

## Event Discovery

The event section reproduces all five events and categories from the static HTML. Search matches event title, artist, city, and category without case sensitivity. Category selection and search apply together. When no event matches, the existing empty state is displayed. Each rendered event exposes its public `/events/[eventId]` detail route.

## Public Event Details

`/events/[eventId]` remains publicly accessible and displays the active event banner, name, artist, city, date, description, status, and available ticket types. Ticket types show their name, MYR price, remaining supply, purchase limit, and transfer permission. Unknown event IDs use the Next.js not-found response. The current static catalogue is extended with typed ticket data while keeping the data boundary ready for later Supabase replacement.

Buy Ticket is protected. On the detail page it links to `/register?returnTo=/events/[eventId]`, preserving the selected event without attempting checkout, wallet, payment, or NFT behavior in this phase.

## Authentication Return Flow

Registration reads and validates `returnTo`, creates the customer profile through the existing Supabase flow, and forwards the same destination to `/login`. Login preserves role routing: admin and organizer accounts continue to their dashboards; customer accounts return to the validated event detail URL when present and otherwise continue to `/customer`.

Only local event-detail paths matching `/events/[eventId]` are accepted. External, protocol-relative, malformed, or unrelated destinations are rejected to prevent open redirects. Links between registration and login preserve a valid return destination.

## Event Section Redesign

The event section uses a full-width pure black background, a two-column desktop grid, and a one-column mobile grid. Each card keeps its concert image and status badge at the top, while the information area uses a dark-gray reference treatment with left-aligned white text. The information hierarchy is event name, venue or city, and date. The Details action is removed, and Buy ticket remains the only action and spans the full card width.

The category pills are replaced by a native Filter select positioned directly beside the search input. The two controls use a compact two-column grid so the filter never drops beneath the search field. The group may move below the Live events heading at narrower widths, but the two controls remain adjacent. The select continues to use the existing category list and combines with text search through the existing filtering function.

## Responsive Behavior

The desktop layout retains the wide hero and uses a two-column event grid. The grid becomes one column on phones. Carousel content and controls remain usable on narrow screens, while the existing navigation wraps instead of overflowing.

## Verification

- Run ESLint and the Next.js production build.
- Confirm all five events and categories match the static HTML.
- Confirm search, filtering, combined filtering, and the empty state.
- Confirm carousel autoplay, arrows, dots, keyboard navigation, pause behavior, and route links.
- Check desktop and narrow responsive layouts and confirm no horizontal overflow.

---

# Visitor Landing Page Implementation Plan

> Historical implementation record. The approved design sections above and newer plans below supersede any conflicting hero or authentication steps in this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the static `index.html` experience at `/visitor`, add a featured-event hero carousel, and keep `/` redirecting to `/visitor`.

**Architecture:** `page.tsx` contains the complete interactive landing page. Shared event content and pure filtering live in `data.ts`. Existing global CSS is extended rather than adding a second styling system.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Lucide React, CSS, Node's built-in test runner.

### Task 1: Shared event catalogue and filtering

**Files:**
- Create: `src/app/visitor/data.ts`
- Create: `src/app/visitor/data.test.ts`

- [ ] Write tests that import `events`, `categories`, and `filterEvents` and verify the five static-HTML events, case-insensitive search, category filtering, combined filtering, and no-match results.
- [ ] Run `node --experimental-strip-types --test src/app/visitor/data.test.ts` and confirm it fails because `data.ts` does not exist.
- [ ] Add the `Event` type, the exact five events and six categories from `index.html`, carousel descriptions, route-safe IDs, and this pure interface:

```ts
export function filterEvents(
  source: readonly Event[],
  query: string,
  category: string,
): Event[];
```

- [ ] Run the Node test command again and confirm all filtering tests pass.

### Task 2: Featured-event carousel

**Files:**
- Modify: `src/app/visitor/page.tsx`

- [ ] Build a client component accepting `events: readonly Event[]` and rendering one active event with its title, metadata, description, price, `/login` purchase link, and `/events/[id]` details link.
- [ ] Add five-second autoplay with a functional state update so the interval never captures a stale slide index.
- [ ] Add previous/next buttons, slide dots, left/right keyboard navigation, hover/focus pause, accessible names, `aria-current`, and an `aria-live="polite"` slide region.
- [ ] Use Lucide icons for stable rendering instead of the corrupted characters in the static HTML.

### Task 3: Searchable event browser

**Files:**
- Modify: `src/app/visitor/page.tsx`

- [ ] Build a client component that stores the query and active category, derives visible cards through `filterEvents`, and reproduces all controls and card content from `index.html`.
- [ ] Render the empty state only when the filtered list is empty.
- [ ] Route Buy ticket to `/login` and Details to `/events/[id]`, preserving the static page's button order and status labels.

### Task 4: Visitor landing-page composition and routing

**Files:**
- Modify: `src/app/visitor/page.tsx`
- Verify: `src/app/page.tsx`

- [ ] Keep the static HTML header, hero, event browser, and footer together in the client route component using the shared catalogue.
- [ ] Keep logo, Events anchor, login, and registration navigation faithful to `index.html`, adapted to `/visitor#events`, `/login`, and `/register`.
- [ ] Confirm `src/app/page.tsx` continues to use `redirect("/visitor")`, so both direct `/visitor` navigation and application startup at `/` reach the landing page.

### Task 5: Faithful responsive styling

**Files:**
- Modify: `src/app/globals.css`

- [ ] Preserve the existing landing-page visual tokens and event-grid rules derived from `design.css`.
- [ ] Add carousel slide overlay variants, transition states, controls, dots, focus-visible styles, and mobile positioning.
- [ ] Add a `prefers-reduced-motion: reduce` rule that removes carousel animation while preserving manual controls.
- [ ] Check that desktop, tablet, and phone layouts have no horizontal overflow and that wrapped navigation remains usable.

### Task 6: Verification

**Files:**
- Verify all files above.

- [ ] Run `node --experimental-strip-types --test src/app/visitor/data.test.ts` and confirm all tests pass.
- [ ] Run `npm.cmd run lint` and resolve visitor-page errors.
- [ ] Run `npm.cmd run build` and confirm `/` and `/visitor` compile successfully.
- [ ] Review the final diff to ensure unrelated files, `.superpowers`, and generated build output were not changed.

---

# Event Section Redesign Implementation Plan

> Historical implementation record for the completed event-grid redesign. The approved public-details and authentication-return design above governs the next phase.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the visitor event section with a black section background, dark information panels, an adjacent search/filter pair, two cards per desktop row, and one full-width purchase action.

**Architecture:** Keep event state and markup in `src/app/visitor/page.tsx`. Continue using `filterEvents` and `categories` from `data.ts`; modify only the control markup and card content. Keep all presentation changes in `src/app/globals.css`.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Node test runner.

### Task 1: Lock the requested event-section structure

**Files:**
- Modify: `src/app/visitor/data.test.ts`
- Test: `src/app/visitor/data.test.ts`

- [ ] Add a source-structure test that reads `page.tsx` and asserts it contains a labeled category `<select>`, no category-button markup, no Details link, a full-width Buy ticket class, and place/date metadata hooks.
- [ ] Add a style-structure test that reads `globals.css` and asserts a pure black event section, a two-column `event-controls` grid, a dark event body, white event text, and no mobile rule that stacks the controls.
- [ ] Run `node --experimental-default-type=module --experimental-strip-types --test src/app/visitor/data.test.ts` and confirm the style assertions fail against the current white-card CSS.

### Task 2: Update event controls and cards

**Files:**
- Modify: `src/app/visitor/page.tsx`

- [ ] Group Search and a native category Filter select inside `event-controls`, with the select controlled by `activeCategory`.
- [ ] Remove the category-pill row and preserve combined search/category filtering through `filterEvents`.
- [ ] Render event name, city, and date as left-aligned metadata rows using `MapPin` and `CalendarDays` icons.
- [ ] Remove the Details link and add `full event-buy-button` to the Buy ticket link.
- [ ] Run the Node tests and confirm all assertions pass.

### Task 3: Apply the approved visual layout

**Files:**
- Modify: `src/app/globals.css`

- [ ] Give `.events-section` a full-width pure black background and retain a centered 1180px content area through responsive horizontal padding.
- [ ] Use a two-column `.event-controls` grid so Filter remains beside Search at every breakpoint.
- [ ] Change `.event-grid` to `repeat(2, minmax(0, 1fr))` and retain one column at the phone breakpoint.
- [ ] Make `.event-body` dark gray with white, left-aligned text and style the place/date rows for readable hierarchy.
- [ ] Make `.event-buy-button` span the complete card width.
- [ ] Keep the control pair adjacent when the toolbar group moves below the heading on narrow screens.

### Task 4: Verify the redesign

**Files:**
- Verify: `src/app/visitor/page.tsx`
- Verify: `src/app/globals.css`
- Test: `src/app/visitor/data.test.ts`

- [ ] Run the Node tests and confirm zero failures.
- [ ] Run `npm.cmd run lint` and confirm zero errors.
- [ ] Run `npm.cmd run build` and confirm `/` and `/visitor` compile successfully.
- [ ] Run `git diff --check` and confirm no whitespace errors.

## Shared Visitor Search Component Design (2026-06-28)

The visitor page will reuse the existing `src/components/common/SearchBar.tsx` component without changing the carousel, event cards, filter, or routing. `SearchBar` will gain optional `inputId`, `ariaLabel`, and `fluid` props so the visitor toolbar can remain accessible and responsive while existing admin consumers keep their current fixed-width presentation.

# Shared Visitor Search Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visitor page's duplicated search markup with the shared common `SearchBar` component.

**Architecture:** Extend the shared component through optional, backward-compatible props. The visitor page owns search state and filtering as before and passes its value and change handler into `SearchBar`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Lucide React, CSS, Node test runner.

### Task 1: Cover the shared component integration

**Files:**
- Modify: `src/app/visitor/data.test.ts`
- Modify: `src/components/common/SearchBar.tsx`
- Modify: `src/app/visitor/page.tsx`

- [x] Add a failing source-structure test requiring the visitor page to import and render `SearchBar` with `fluid`, `inputId`, and `ariaLabel` props.
- [x] Run the visitor test and confirm it fails because the page still contains inline search markup.
- [x] Add optional `fluid`, `inputId`, and `ariaLabel` props to `SearchBar`, preserving the existing 360px width when `fluid` is not supplied.
- [x] Replace only the visitor search label/input markup with `SearchBar`; keep filtering state and all other visitor markup unchanged.
- [x] Run the visitor tests, lint, and production build.

## Authenticated Customer Marketplace Design (2026-06-28)

### Scope

`src/app/customer/page.tsx` will use the same marketplace design as `src/app/visitor/page.tsx`: sticky black header, bottom-aligned hero carousel, arrows and dots, Live events heading, shared search control, adjacent category filter, two-column dark event grid, and responsive mobile layout. The visitor page remains structurally unchanged.

This phase builds the authenticated customer marketplace shell. Full Stripe MYR purchasing, NFT minting, ticket transfer, resale settlement, QR display, and refund processing are not implemented because the repository does not yet contain all required transaction/ticket workflows and backend services.

### Authentication and profile behavior

- `customer/page.tsx` validates the Supabase session on load.
- An unauthenticated user is redirected to `/login`.
- The page reads `name`, `wallet_address`, and `role` from `profiles` for the authenticated user.
- Admin and organizer accounts are redirected to their respective dashboards.
- A valid customer sees the marketplace after the authentication check finishes.
- Logout uses Supabase Auth, clears the session, and returns the user to `/visitor`.
- Loading and profile-error states use the existing dark state-card styling and never expose private authentication details.

### Customer controls

The customer header does not include a Login button. It includes:

- Customer name or a safe `Customer` fallback.
- A shortened platform-managed wallet address or `Wallet pending` fallback.
- `My Tickets`, which opens the customer ticket section on the same page.
- Transaction history, which shows purchases, refunds, resale records, and public NFT references when available.
- `Logout`, implemented with the shared `Button` component.

The My Tickets section uses the visitor page's dark visual language and displays a clear unavailable/empty state rather than fabricated tickets. Its unavailable action uses the shared `Modal` so the user understands which backend capability is pending.

### Event discovery

The customer page imports the same static event catalogue and filtering function used by the visitor page. It reuses the shared `SearchBar` and preserves the existing event-detail links. No fake balance, ticket ownership, checkout result, NFT identifier, QR code, transaction hash, or refund status is shown.

### Reusable components and boundaries

- Reuse `SearchBar`, `Button`, and `Modal` from `src/components/common` where their HTML semantics match the customer controls.
- Keep navigation as Next.js `Link`; do not place links inside the shared button component.
- Keep the customer-specific authentication, carousel, filters, and marketplace state in `customer/page.tsx` for this phase so the previously approved visitor structure is not refactored.
- Add customer-specific CSS classes only where authenticated controls and My Tickets need layout rules; reuse existing visitor classes for the marketplace itself.

### Testing and acceptance

- Source-structure tests require the customer page to reuse the event catalogue, `SearchBar`, `Button`, and `Modal`.
- Tests require Supabase session/profile lookup, staff-role redirects, unauthenticated redirect, and logout.
- Tests require the customer page to contain the same hero, event controls, and event-grid hooks as the visitor page and to omit a Login control.
- Tests require unavailable customer services to be described without fake financial or ticket data.
- The focused Node tests, ESLint, production build, and whitespace checks must pass.

# Authenticated Customer Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder customer route with an authenticated marketplace that matches the visitor page and exposes safe customer account controls.

**Architecture:** Keep the visitor page unchanged and implement the authenticated client flow in `src/app/customer/page.tsx`. Reuse the visitor catalogue/filter functions and common `SearchBar`, `Button`, and `Modal`; reuse visitor CSS hooks for event discovery and add only customer-specific header and ticket-section rules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth, Lucide React, CSS, Node test runner.

---

### Task 1: Customer route contract

**Files:**
- Create: `src/app/customer/page.test.ts`
- Modify: `src/app/customer/page.tsx`

- [x] **Step 1: Write the failing route test**

Add source assertions requiring these contracts:

```ts
assert.match(source, /supabase\.auth\.getUser\(\)/);
assert.match(source, /\.select\("name,wallet_address,role"\)/);
assert.match(source, /router\.replace\("\/admin"\)/);
assert.match(source, /router\.replace\("\/organizer"\)/);
assert.match(source, /supabase\.auth\.signOut\(\)/);
assert.match(source, /<SearchBar/);
assert.match(source, /<Button/);
assert.match(source, /<Modal/);
assert.doesNotMatch(source, />\s*Log In\s*</);
```

- [x] **Step 2: Verify the test fails**

Run `node --experimental-default-type=module --experimental-strip-types --test src/app/customer/page.test.ts`.

Expected: failure because the existing route is only placeholder text.

- [x] **Step 3: Implement authentication and profile loading**

Use this profile boundary:

```ts
interface CustomerProfile {
  name: string | null;
  wallet_address: string | null;
  role: string | null;
}
```

On mount, call `supabase.auth.getUser()`, redirect missing sessions to `/login`, fetch `name,wallet_address,role` by `user_id`, redirect staff roles, and render explicit loading/error states. Implement logout with `supabase.auth.signOut()` followed by `router.replace("/visitor")`.

- [x] **Step 4: Verify the authentication assertions pass**

Run the customer route test and confirm zero failures.

### Task 2: Visitor-equivalent discovery and customer tools

**Files:**
- Modify: `src/app/customer/page.tsx`
- Modify: `src/app/customer/page.test.ts`

- [x] **Step 1: Add failing marketplace assertions**

Require `home-hero hero-carousel`, `events-section`, `event-controls`, `event-grid`, `my-tickets`, direct `/events/${event.id}` links, and the shared event catalogue imports.

- [x] **Step 2: Verify the marketplace assertions fail**

Run the customer route test and confirm failure against the placeholder route.

- [x] **Step 3: Implement the marketplace and customer controls**

Copy the visitor page's carousel/search/filter/event presentation into the authenticated route. Replace the public Login action with customer name, shortened wallet address, My Tickets, Transactions, and Logout. Use `Modal` for unavailable service-status explanations; do not render invented balances or tickets.

- [x] **Step 4: Verify the complete customer test passes**

Run the customer route test and confirm zero failures.

### Task 3: Customer-responsive styling

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/customer/page.test.ts`

- [x] **Step 1: Add failing CSS assertions**

Require `.customer-site-nav`, `.customer-identity`, `.customer-wallet`, `.customer-tools-section`, and mobile header rules.

- [x] **Step 2: Verify CSS assertions fail**

Run the customer route test and confirm the new styling contracts are absent.

- [x] **Step 3: Add minimal customer CSS**

Style account controls using the current black/fire palette, preserve the visitor breakpoints at 900px and 560px, and keep touch targets usable on mobile.

- [x] **Step 4: Run full verification**

Run:

```powershell
node --experimental-default-type=module --experimental-strip-types --test src/app/customer/page.test.ts src/app/visitor/data.test.ts src/lib/eventReturnTo.test.ts src/lib/authReturnFlow.test.ts
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: all tests pass, lint reports no errors, and the production build includes `/customer`.

## Server-Enforced Role Access Design (2026-06-28)

### Security problem

Protected dashboards are not currently authorized before rendering. The customer page performs a browser-side check, the organizer page has no check, and admin Server Components execute service-role database queries without first validating the requester. A browser redirect cannot protect data that the server has already fetched. The admin event mutation routes also accept an `admin_id` in the request body without proving that the submitted ID belongs to the authenticated caller.

### Session architecture

- Add `@supabase/ssr` and migrate the shared browser client to `createBrowserClient` so Supabase sessions are stored in cookies available to both browser and server code.
- Add `src/lib/supabase/server.ts` for request-scoped Server Component and Route Handler clients using Next.js cookies.
- Add `src/lib/supabase/proxy.ts` and `src/proxy.ts` to refresh cookie-based sessions. Proxy performs session maintenance and optional optimistic routing only; it is not the secure authorization boundary.
- Server authorization validates the current Supabase user using `auth.getUser()` before trusting a user ID. It never uses `auth.getSession()` as proof of identity.

### Authorization boundary

- Add `src/lib/requireRole.ts` as the centralized server-side data-access guard.
- `requireRole(allowedRoles)` validates the current user, reads `profiles.role` for that verified user ID, and either returns the verified user/profile or redirects before protected data is queried.
- Unauthenticated requests redirect to `/login`.
- Authenticated users with the wrong role redirect to their actual role home: admin to `/admin`, organizer to `/organizer`, and customer/user to `/customer`.
- Missing or unknown profiles redirect to `/visitor` rather than granting a default role.
- Customer access accepts both `customer` and the legacy `user` profile role used by the current project.

### Protected pages

- Add role layouts for `src/app/admin/layout.tsx`, `src/app/organizer/layout.tsx`, and `src/app/customer/layout.tsx`.
- Each layout invokes `requireRole` before rendering its route tree.
- Every admin Server Component that performs service-role reads also invokes `requireRole(["admin"])` directly before calling `supabaseAdmin`. This keeps authorization next to sensitive data even if a page is moved outside its layout later.
- The existing customer browser check remains as a secondary UX defense but is not the primary security boundary.

### Protected mutations

- Admin approve/reject Route Handlers invoke a non-redirecting API authorization helper that validates the cookie session and requires the `admin` profile role.
- The verified caller ID becomes the audit-log admin ID.
- The client no longer submits or controls `admin_id`.
- Unauthorized API calls return `401`; authenticated wrong-role calls return `403`.

### Scope and limitations

- `/admin`, `/admin/organizers`, `/admin/pending-events`, `/organizer`, and `/customer` are protected.
- `/user` is not a valid application route and remains a 404.
- Public visitor, login, registration, and public event-detail routes remain public.
- Database Row Level Security remains recommended as defense in depth, but this change does not invent or apply database policies without schema migrations and policy review.

### Testing and acceptance

- Tests require cookie-based browser/server Supabase clients and Next.js Proxy session refresh.
- Tests require all protected layouts and sensitive admin pages to call the centralized role guard.
- Tests require admin mutation routes to authorize the verified caller and reject body-controlled `admin_id`.
- Existing login, registration, visitor, customer, and admin behavior must still compile.
- Focused access-control tests, all existing Node tests, ESLint, the production build, and whitespace checks must pass.

# Server-Enforced Role Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unauthenticated and wrong-role users from accessing protected dashboards or admin mutations by enforcing authorization on the server.

**Architecture:** Use `@supabase/ssr` for cookie-based browser/server sessions and Next.js Proxy token refresh. Centralize verified identity and profile-role checks in `src/lib/requireRole.ts`; invoke that guard from protected layouts, sensitive admin pages, and admin Route Handlers before service-role access.

**Tech Stack:** Next.js 16 App Router and Proxy, React 19, TypeScript, Supabase Auth/SSR, Node test runner.

---

### Task 1: Access-control regression contract

**Files:**
- Create: `src/lib/roleAccess.test.ts`

- [x] Add source assertions requiring `@supabase/ssr`, cookie-backed browser/server clients, `src/proxy.ts`, a centralized `requireRole`, protected role layouts, direct admin-page guards, and authenticated admin Route Handlers.
- [x] Require both mutation routes to use the verified caller ID and reject any `admin_id` parsed from request JSON.
- [x] Run `node --experimental-default-type=module --experimental-strip-types --test src/lib/roleAccess.test.ts` and confirm failure because the SSR and guard files do not exist.

### Task 2: Cookie-based Supabase session clients

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/lib/supabaseClient.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `src/proxy.ts`

- [x] Install `@supabase/ssr` through npm.
- [x] Replace the local-storage browser client with `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` while preserving the existing `supabase` export used by client pages.
- [x] Implement a request-scoped `createSupabaseServerClient()` using `cookies().getAll()` and `cookies().set()`.
- [x] Implement `updateSession(request)` using request/response cookie synchronization and `supabase.auth.getClaims()`.
- [x] Add `src/proxy.ts` with the official static/image matcher and delegate to `updateSession`.
- [x] Run the access-control test and confirm the SSR-client assertions pass.

### Task 3: Central server role authorization

**Files:**
- Create: `src/lib/requireRole.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/organizer/layout.tsx`
- Create: `src/app/customer/layout.tsx`

- [x] Implement `getVerifiedRole()` using the server Supabase client `auth.getUser()` followed by a service-role lookup of `profiles.role` for only the verified user ID.
- [x] Implement `requireRole(allowedRoles)` to redirect unauthenticated users to `/login`, unknown profiles to `/visitor`, and wrong-role users to their actual role home.
- [x] Implement `authorizeApiRole(allowedRoles)` returning a verified identity or a `401`/`403` JSON response without redirects.
- [x] Add layouts requiring `admin`, `organizer`, or `customer`/legacy `user` roles before rendering children.
- [x] Run the access-control test and confirm layout and guard assertions pass.

### Task 4: Guard sensitive admin reads and writes

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/organizers/page.tsx`
- Modify: `src/app/admin/pending-events/page.tsx`
- Modify: `src/app/api/admin/events/[eventId]/approve/route.ts`
- Modify: `src/app/api/admin/events/[eventId]/reject/route.ts`
- Modify: `src/components/admin/PendingEventsTable.tsx`

- [x] Call `await requireRole(["admin"])` at the beginning of every admin Server Component before any `supabaseAdmin` query.
- [x] Call `authorizeApiRole(["admin"])` in both mutation routes before updates or logs.
- [x] Derive `admin_id` from the verified caller and remove request-body identity parsing.
- [x] Stop the client table from reading a session or submitting `admin_id`; send only the authenticated cookie request.
- [x] Run the access-control test and confirm every protected read/write assertion passes.

### Task 5: Full verification

**Files:**
- Verify all files above plus existing authentication and role pages.

- [x] Run all focused Node tests, including customer, visitor, auth-return, and access-control tests.
- [x] Run `npm.cmd run lint` and confirm zero errors.
- [x] Run `npm.cmd run build` and confirm Proxy and all protected routes compile.
- [x] Run `git diff --check` and confirm no whitespace errors.

---

# Public Event Details and Auth Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the featured-event hero, add public event details with ticket types, and return newly registered customers to the selected event after login.

**Architecture:** Keep the visitor carousel and catalogue in `src/app/visitor/`. Add a server-rendered Next.js 16 route at `src/app/events/[eventId]/page.tsx` using async params and the typed static catalogue. Centralize strict event-detail return-path validation in `src/lib/eventReturnTo.ts`; login and registration consume it through `useSearchParams` inside Suspense boundaries.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth, Lucide React, CSS, Node test runner.

### Task 1: Safe authentication return paths

**Files:**
- Create: `src/lib/eventReturnTo.ts`
- Create: `src/lib/eventReturnTo.test.ts`

- [ ] Write tests for `getSafeEventReturnTo` and `withEventReturnTo` that accept `/events/neon-corn-festival` and UUID-like event IDs while rejecting external URLs, `//` URLs, traversal, query strings, empty IDs, and dashboard paths.
- [ ] Run `node --experimental-default-type=module --experimental-strip-types --test src/lib/eventReturnTo.test.ts` and confirm failure because the helper does not exist.
- [ ] Implement these interfaces:

```ts
export function getSafeEventReturnTo(value: string | null): string | null;
export function withEventReturnTo(
  authPath: "/login" | "/register",
  returnTo: string | null,
): string;
```

- [ ] Rerun the helper tests and confirm all cases pass.

### Task 2: Ticket-aware event catalogue

**Files:**
- Modify: `src/app/visitor/data.ts`
- Modify: `src/app/visitor/data.test.ts`

- [ ] Add failing tests that require every event to expose at least one typed ticket option and verify `getEventById` returns a known event and `undefined` for an unknown ID.
- [ ] Add `TicketType`, extend `Event` with `ticketTypes`, populate ticket name, price, remaining supply, purchase limit, and transfer permission, and export `getEventById(eventId)`.
- [ ] Run `node --experimental-default-type=module --experimental-strip-types --test src/app/visitor/data.test.ts` and confirm all catalogue tests pass.

### Task 3: Minimal hero and public details route

**Files:**
- Modify: `src/app/visitor/page.tsx`
- Create: `src/app/events/[eventId]/page.tsx`
- Create: `src/app/events/[eventId]/not-found.tsx`
- Modify: `src/app/visitor/data.test.ts`

- [ ] Add source-structure assertions that the hero copy contains only the active event heading and Details link, the event route awaits `params`, unknown IDs call `notFound()`, ticket types render, and protected purchase links use `/register` with the event return path.
- [ ] Run the visitor tests and confirm the new structure assertions fail.
- [ ] Remove hero artist, description, metadata, price, and Buy Ticket while retaining the event name, Details button, carousel arrows, dots, autoplay, pause, and keyboard behavior.
- [ ] Make each event card image and title link to `/events/[eventId]` while preserving its existing Buy Ticket action.
- [ ] Build the public details route with banner, status, name, artist, city, date, description, ticket cards, and a Buy Ticket action for each available ticket type.
- [ ] Add a focused not-found page with navigation back to `/visitor`.
- [ ] Rerun the visitor tests and confirm all assertions pass.

### Task 4: Preserve the event through registration and login

**Files:**
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/login/page.tsx`
- Create: `src/lib/authReturnFlow.test.ts`

- [ ] Add source-structure tests requiring both pages to use `useSearchParams`, `getSafeEventReturnTo`, and `withEventReturnTo`; require registration to forward the event to login; require only customer login to prefer the validated return path.
- [ ] Run the auth-return tests and confirm they fail against the current role-only redirects.
- [ ] Wrap each client auth form in a local Suspense boundary so `useSearchParams` remains compatible with production prerendering.
- [ ] Preserve valid return paths in Login/Sign Up footer links.
- [ ] After registration, navigate to `/login?returnTo=...`; after customer login, navigate to the safe event path or `/customer`; keep admin and organizer dashboard redirects unchanged.
- [ ] Run both helper and source-structure tests and confirm they pass.

### Task 5: Event-details styling

**Files:**
- Modify: `src/app/globals.css`

- [ ] Add the dark/fire event-detail hero, responsive detail grid, about panel, ticket list, ticket cards, metadata rows, and not-found state.
- [ ] Keep focus indicators, dark contrast, full-width mobile actions, and the existing 900px/560px breakpoint language.

### Task 6: Verification

**Files:**
- Verify all files above.

- [ ] Run `node --experimental-default-type=module --experimental-strip-types --test src/app/visitor/data.test.ts src/lib/eventReturnTo.test.ts src/lib/authReturnFlow.test.ts` and confirm zero failures.
- [ ] Run `npm.cmd run lint` and confirm zero errors or warnings.
- [ ] Run `npm.cmd run build` and confirm `/events/[eventId]`, `/login`, `/register`, `/visitor`, and `/` compile.
- [ ] Run `git diff --check` and confirm no whitespace errors.
