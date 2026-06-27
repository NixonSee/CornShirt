# Public Visitor Experience Design

## Summary

CornShirt's root route will become a public event-discovery experience backed by live Supabase data. The first visitor phase includes the event browser at `/` and public event details at `/events/[eventId]`. It follows the dark concert-commerce system in `docs/DESIGN.md` and uses the approved hybrid direction: the photographic atmosphere of `docs/html-designs/index.html` with the compact search and ticket-inventory cues from `docs/html-designs/CornShirt Prototype.html`.

Visitor-facing implementation modules will live under `src/app/visitor/`. Route entry points may remain in the locations required by the Next.js App Router and import their UI and data helpers from that visitor module.

## Goals

- Replace the current `/` to `/login` redirect with public event discovery.
- Show only admin-approved events whose status is `active`.
- Load real event and ticket-type data from Supabase.
- Let visitors search, filter, and open event details without authentication.
- Redirect protected purchase actions to login while preserving the selected event as the intended return destination.
- Provide responsive, accessible loading, empty, error, and not-found states.
- Establish focused visitor components that can later support the authenticated customer marketplace.

## Non-Goals

- Ticket checkout or NFT minting.
- Customer wallet, DICKEN top-up, ticket management, transfer, resale, or refunds.
- Authentication redesign or role-routing changes.
- Organizer or admin UI changes.
- Database schema, RLS policy, smart-contract, or Web3 changes.
- A standalone `/visitor` route.

## Routes and Module Boundaries

### `/`

The public homepage renders the visitor experience rather than redirecting to login. Its route entry point remains `src/app/page.tsx`, while visitor-specific presentation, query mapping, and interactive filtering live under `src/app/visitor/`.

### `/events/[eventId]`

The public event-detail route displays one active event and its available ticket types. The App Router entry point lives under `src/app/events/[eventId]/`, but it composes visitor modules from `src/app/visitor/`.

### Visitor module responsibilities

The visitor module will contain small, focused units for:

- public header and footer;
- hero presentation;
- active-event query and response mapping;
- search and category filtering;
- event grid and event cards;
- event-detail presentation;
- ticket-type cards;
- loading, empty, error, and missing-image feedback.

Route files should remain thin. Supabase response shapes will be normalized into typed visitor view models before reaching presentation components.

## Homepage Experience

### Header

The sticky header contains CornShirt branding, an Events link, Login, and Create Account. It uses the fire-accent visual system and collapses cleanly on narrow screens.

### Hero

The homepage uses a short photographic concert hero based on `public/Background Login Image.png`. It communicates NFT-backed ticket ownership and DICKEN purchasing without pushing the live inventory too far below the fold.

### Search and category filters

Visitors can search across event name, artist, venue or city, and category. Category chips apply an additional client-side filter. Search and category filtering combine, and the UI provides a specific no-results state without treating it as a database error.

### Event cards

Each card shows:

- event banner or a concert-image fallback;
- active status;
- event name and artist;
- venue or city;
- event date;
- category when available;
- lowest available ticket price in DICKEN;
- remaining inventory and an availability indicator when ticket supply data is available;
- a link to `/events/[eventId]`.

Cards are keyboard accessible and do not hide essential actions behind hover-only behavior.

## Event Detail Experience

The event page displays the event banner, name, artist, venue, date and time, description, status, and available ticket types. Each ticket type shows its name, DICKEN price, remaining supply, purchase limit, and transfer permission when those fields are present in the live schema.

The event itself remains publicly viewable. Selecting Buy Ticket is protected and redirects to `/login` with the event detail URL encoded as the intended return destination. This phase does not perform a purchase or expose wallet controls.

Missing, inactive, or RLS-inaccessible events produce a not-found experience rather than leaking unpublished event data. An active event with no currently available ticket types remains viewable and clearly states that tickets are unavailable.

## Supabase Data Flow

The visitor pages use the anonymous Supabase client and are subject to RLS.

1. The homepage requests only fields required to render active event cards and their related ticket types.
2. The query explicitly filters `events.status` to `active` and uses a stable upcoming-event ordering when the schema supports it.
3. A mapping layer converts nullable database values into a stable `PublicEvent` view model.
4. The interactive filter receives the normalized event list and performs instant client-side search and category filtering.
5. The detail route queries a single event by ID and status, then maps its ticket types into `PublicTicketType` view models.

The implementation will first inspect the live table column names and relationships. If the deployed schema differs from the names implied by the documentation, the query and mapping layer will adapt to the existing schema; this phase will not silently alter the database.

Derived values follow these rules:

- Starting price is the lowest numeric DICKEN price among available ticket types.
- Remaining inventory is the sum of non-negative `supply - sold` values when sold quantities exist.
- A missing banner uses the existing concert background fallback.
- Missing optional metadata is omitted without leaving broken separators or empty labels.

## Visual System

- Background and surfaces use the charcoal tokens from `docs/html-designs/design.css`.
- Primary actions and selective emphasis use the fire-orange gradient.
- Display headings use Archivo; body and interface text use Inter.
- Lucide icons replace corrupted or platform-dependent glyphs.
- The approved hybrid direction keeps a photographic hero while bringing search and live inventory into view sooner than the full-height `index.html` hero.
- The orange `public/CornShirt Hub.png` branding asset is preferred where its proportions remain readable; the existing CornShirt logo may be used where a compact mark is required.
- Event grids use three columns on wide screens, two below approximately 900px, and one below approximately 560px.

## Feedback and Failure States

- Loading: structured skeletons preserve the eventual page layout.
- No active events: a friendly platform-level empty state.
- No search results: a filter-specific empty state with a clear reset action.
- Supabase error: an error panel that avoids exposing database internals and offers retry navigation where appropriate.
- Missing image: a concert-themed fallback rather than a broken image element.
- Missing or inactive event: not found.
- No available ticket types: event details remain readable with an unavailable-tickets message.

## Security and Privacy

- Visitor code imports only the anonymous Supabase client.
- Service-role credentials, wallet secrets, signing keys, and Stripe secrets remain server-only and are not part of this phase.
- Queries explicitly request active events even when RLS also enforces public visibility.
- Event errors do not distinguish between nonexistent, inactive, and inaccessible records.
- No protected purchase mutation is exposed to unauthenticated visitors.

## Accessibility and Responsive Behavior

- Semantic header, navigation, main, section, article, and footer landmarks are used.
- Search has a visible or programmatic label.
- Filter controls communicate their selected state.
- Focus indicators remain visible against dark surfaces.
- Text and controls meet practical contrast requirements.
- Cards, badges, prices, and metadata do not overlap at documented breakpoints.
- Motion remains subtle and respects reduced-motion preferences.

## Verification Strategy

- Add targeted automated coverage for event-data mapping and combined search/category filtering.
- Verify homepage states for populated data, no active events, filter misses, and query failures.
- Verify event details for active, inactive or missing, and no-ticket scenarios.
- Verify protected purchase links preserve the event return destination.
- Run `npm run lint`.
- Run `npm run build`.
- Inspect the homepage and event detail at desktop, tablet, and mobile widths.

## Acceptance Criteria

- `/` is publicly accessible and no longer redirects directly to login.
- Only active Supabase events render on the homepage.
- Search and category filters work together and can be reset.
- Every rendered event opens its public detail route.
- Event details show live ticket-type information without requiring authentication.
- Buy Ticket redirects to login with the selected event return path preserved.
- Loading, empty, error, no-result, image-fallback, and not-found states are present.
- The UI follows the approved hybrid dark/fire direction and documented breakpoints.
- No database, auth-role, payment, or Web3 behavior changes are introduced.
- Lint, build, and targeted automated checks pass before completion is claimed.
