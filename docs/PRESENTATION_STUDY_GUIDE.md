# CornShirt Technical and Presentation Guide

## Purpose and lesson format

This guide teaches every team member how CornShirt works and prepares the team for presentation questions. It is divided into four technical subjects: **Frontend**, **Backend**, **Smart Contracts**, and **Database**. Every member should understand all four subjects, even when different people lead different presentation sections.

Use each section like a tuition lesson:

1. Learn the technical terms.
2. Open the named CornShirt files.
3. Trace the function's caller, inputs, output, and side effects.
4. Study why the code uses that construct.
5. Discuss what would happen if it were replaced or removed.
6. Explain the lesson without reading the notes.
7. Answer the checkpoint and final Q&A questions.

## Four-part course map

| Part | Main locations | Guiding question |
| --- | --- | --- |
| Frontend | `src/app` pages, `src/components`, `src/app/globals.css` | How does the user navigate and interact with CornShirt? |
| Backend | `src/app/api`, `src/lib`, `src/proxy.ts` | How does the trusted server validate and coordinate actions? |
| Smart Contracts | `blockchain/contracts`, `src/lib/nft` | How is NFT ownership created, transferred, settled, and burned? |
| Database | `supabase/migrations`, `supabase/seed.sql`, `scripts/sql` | How is application state stored and changed atomically? |

CornShirt currently contains:

- Next.js 16 App Router pages and API routes
- React 19 user-interface components
- TypeScript business logic and tests
- Supabase authentication, database, Row Level Security, Storage, and RPC functions
- Stripe Test Mode checkout, webhook, and refund workflows
- Managed Ethereum customer wallets
- Two Solidity smart contracts
- NFT minting, transfer, marketplace settlement, ownership checks, and burning
- Customer, organizer, administrator, and visitor interfaces

## 1. The One-Minute System Explanation

Every team member should be able to explain the project using a short description like this:

> CornShirt is a role-based concert-ticketing prototype. Visitors browse approved events. Customers pay in Malaysian Ringgit through Stripe Test Mode and receive ERC-721 Ticket NFTs in platform-managed wallets. Organizers create events and verify tickets, while administrators approve applications and events. Supabase stores authentication and application data, Stripe confirms test payments and refunds, and the blockchain records NFT ownership. Next.js server routes securely coordinate these systems.

## 2. Recommended Reading Order

Read the project documentation before studying individual functions:

1. [`../README.md`](../README.md) - Project overview, environment, setup, features, and architecture.
2. [`SPECS.md`](SPECS.md) - Functional and non-functional requirements.
3. [`ROLE_FEATURES_AND_FLOW.md`](ROLE_FEATURES_AND_FLOW.md) - Role permissions and main system flows.
4. [`API_AND_ROUTES.md`](API_AND_ROUTES.md) - Page routes, API routes, and route responsibilities.
5. [`SMART_CONTRACTS.md`](SMART_CONTRACTS.md) - Payment, NFT, transfer, resale, and refund architecture.
6. [`SYSTEM_TESTING_GUIDE.md`](SYSTEM_TESTING_GUIDE.md) - End-to-end testing and expected system behavior.
7. [`DESIGN.md`](DESIGN.md) - Visual language and responsive behavior.
8. [`COMPONENTS.md`](COMPONENTS.md) - Shared component inventory.

After reading, each person must be able to describe the four roles:

| Role | Main responsibility |
| --- | --- |
| Visitor | Browse active events and access registration, login, About, and organizer application pages. |
| Customer | Buy, own, view, transfer, resell, and refund eligible NFT-backed tickets. |
| Organizer | Create and manage events, view sales, cancel eligible events, and verify tickets. |
| Admin | Approve applications and events, manage users, cancel events, and monitor the platform. |

# Foundation: System Architecture

## 3. High-Level Architecture

```text
Browser
  |
  | Page navigation, forms, and fetch requests
  v
Next.js pages and API routes
  |
  +--> Supabase Auth: user identity and sessions
  |
  +--> Supabase PostgreSQL: profiles, events, tickets, operations, and logs
  |
  +--> Supabase Storage: event banners and partner documents
  |
  +--> Stripe Test Mode: MYR checkout and refunds
  |
  +--> Ethereum/Sepolia contracts: NFT ownership and marketplace settlement
  |
  +--> Email service: transactional notifications
```

System authority is divided deliberately:

- Stripe is authoritative for test payment and refund results.
- `CornShirtTicket` is authoritative for NFT token ownership.
- Supabase is authoritative for users, roles, events, ticket status, inventory, QR state, operations, and simulated accounting.
- Next.js server routes authorize requests and coordinate the systems.

# Part I: Frontend

The frontend is the visible and interactive part of CornShirt: pages, navigation, forms, event cards, ticket controls, seat maps, QR controls, tables, charts, loading states, error messages, and responsive styling. The frontend can hide unavailable actions, but it is not the security authority; the backend repeats all important checks.

## 4. Next.js Routing

### 4.1 Special App Router filenames

| Filename | Meaning |
| --- | --- |
| `page.tsx` | Renders a page at the folder's URL. |
| `layout.tsx` | Wraps every page below its folder and can apply shared navigation or authorization. |
| `route.ts` | Implements an HTTP API endpoint using functions such as `GET`, `POST`, `PUT`, or `DELETE`. |
| `not-found.tsx` | Renders the not-found state for a route. |
| `globals.css` | Contains project-wide styling and responsive rules. |

### 4.2 Dynamic bracket folders

A folder name in square brackets represents a dynamic URL segment. The value inside the URL becomes a property in `params`.

| Source folder | Example URL | Parameter value |
| --- | --- | --- |
| `events/[eventId]` | `/events/abc123` | `eventId = "abc123"` |
| `customer/tickets/[ticketId]/transfer` | `/api/customer/tickets/ticket-7/transfer` | `ticketId = "ticket-7"` |
| `customer/purchases/[operationId]` | `/api/customer/purchases/op-4` | `operationId = "op-4"` |
| `admin/users/[user_id]` | `/admin/users/user-9` | `user_id = "user-9"` |

The bracketed name is not part of the visible URL. It names the variable used by the page or route handler.

Next.js 16 supplies `params` as a Promise:

```tsx
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
}
```

The parameter name must match the bracket folder. For example, `[user_id]` produces `params.user_id`, while `[userId]` produces `params.userId`.

### 4.3 Page routes to study

#### Public and authentication routes

- `/` redirects to `/visitor` in the current implementation.
- `/visitor` displays public event discovery.
- `/visitor/about` displays project information.
- `/visitor/apply` accepts organizer partner applications.
- `/login` authenticates users and redirects them according to role.
- `/register` creates a customer profile and provisions a wallet.
- `/auth/callback` handles Supabase invitation and recovery links.
- `/auth/set-password` completes invitation or password-recovery flows.
- `/events/[eventId]` displays public event details.

#### Customer routes

- `/customer` displays customer event discovery and wallet status.
- `/customer/events/[eventId]` displays authenticated purchase controls.
- `/customer/tickets` displays owned tickets and available actions.
- `/customer/marketplace` displays active resale listings.
- `/customer/transactions` displays transaction history.
- `/customer/profile` displays profile and wallet information.

#### Organizer routes

- `/organizer` displays organizer metrics and activity.
- `/organizer/create-event` displays the event form.
- `/organizer/events` displays the organizer's events.
- `/organizer/events/[eventId]` displays one owned event.
- `/organizer/events/[eventId]/edit` edits an eligible pending event.
- `/organizer/verify-ticket` opens the QR scanner and check-in interface.
- `/organizer/profile` displays the organizer profile.

#### Admin routes

- `/admin` displays platform metrics.
- `/admin/pending-events` displays pending event reviews.
- `/admin/events` displays all monitored events.
- `/admin/events/[eventId]` displays one event and its metrics.
- `/admin/organizers` displays organizers.
- `/admin/partner-applications` displays partner applications.
- `/admin/users` displays platform users.
- `/admin/users/[user_id]` displays one user's details.
- `/admin/profile` displays the active admin profile.

### 4.4 Important API routes

| Method and route | Responsibility |
| --- | --- |
| `GET /api/public/events` | Loads active events for visitor and customer discovery. |
| `POST /api/customer/wallet/provision` | Creates or recovers a customer's managed wallet. |
| `POST /api/customer/tickets/checkout` | Reserves inventory and creates primary Stripe Checkout. |
| `GET /api/customer/purchases/[operationId]` | Reports primary purchase progress. |
| `POST /api/customer/tickets/[ticketId]/transfer` | Transfers an existing NFT to another customer. |
| `POST /api/customer/marketplace` | Creates a resale listing. |
| `DELETE /api/customer/marketplace/[listingId]` | Cancels a seller's listing. |
| `POST /api/customer/marketplace/[listingId]/checkout` | Starts Stripe resale checkout. |
| `GET /api/customer/resales/[operationId]` | Reports resale progress or recovery state. |
| `POST /api/customer/refunds/claim` | Refunds the latest payer and surrenders the NFT. |
| `POST /api/organizer/events` | Creates an event and its ticket types. |
| `PUT /api/organizer/events/[eventId]` | Updates an eligible owned event. |
| `PUT /api/organizer/events/[eventId]/cancel` | Cancels an eligible owned event. |
| `POST /api/organizer/tickets/verify` | Verifies QR, ticket, event, and ownership state. |
| `POST /api/organizer/tickets/[ticketId]/use` | Atomically checks in a valid ticket. |
| `PUT /api/admin/events/[eventId]/approve` | Approves a pending event. |
| `PUT /api/admin/events/[eventId]/reject` | Rejects an event. |
| `PUT /api/admin/events/[eventId]/cancel` | Cancels an event as an administrator. |
| `POST /api/webhooks/stripe` | Verifies Stripe signatures and completes payment workflows. |

## 5. TypeScript and TSX

### 5.1 `.ts` files

Use `.ts` for TypeScript that does not contain JSX markup. CornShirt uses these files for:

- Business rules
- Data transformation
- Types and interfaces
- Validation
- Stripe helpers
- Blockchain helpers
- Supabase helpers
- API route handlers
- Unit tests

Examples:

- `src/lib/currency.ts`
- `src/lib/eventLifecycle.ts`
- `src/lib/requireRole.ts`
- `src/lib/stripe/webhook.ts`
- `src/lib/nft/mint.ts`
- `src/app/api/webhooks/stripe/route.ts`

### 5.2 `.tsx` files

Use `.tsx` when TypeScript contains JSX elements such as `<main>`, `<Button>`, or `<EventBrowser>`.

CornShirt uses `.tsx` for:

- Pages
- Forms
- Navigation
- Cards and tables
- Modals
- Charts
- Seat maps
- Ticket and QR interfaces
- Interactive customer, organizer, and admin components

### 5.3 Client and server components

The extension does not decide whether code runs in the browser or on the server.

- A component with `"use client"` can use browser hooks and event handlers.
- A component without `"use client"` is a server component by default.
- Server components can safely load data before rendering.
- Client components can use `useState`, `useEffect`, browser APIs, and click handlers.
- Server-only secrets must never be imported into client components.

For every TSX file, identify whether it is a server or client component and explain why.

### 5.4 Frontend technical terms

| Term | Meaning |
| --- | --- |
| Component | Reusable function that returns part of the interface. |
| JSX | HTML-like syntax written inside TypeScript/JavaScript. |
| Props | Read-only inputs supplied by a parent component. |
| State | Information that changes while the user interacts. |
| Render | React calculating what the interface should display. |
| Hook | React function such as `useState` or `useEffect`. |
| Event handler | Function responding to a click, change, submit, or scan. |
| Controlled input | Form input whose value is stored in React state. |
| Derived value | Value calculated from existing props or state. |

Example:

```tsx
const [selectedTicketTypeId, setSelectedTicketTypeId] =
  useState<string | null>(null);

const selectedZoneId =
  event.zones.find(
    (zone) => zone.ticketTypeId === selectedTicketTypeId,
  )?.id ?? null;
```

`selectedTicketTypeId` is state. `selectedZoneId` is derived from that state. Storing both independently could allow them to disagree.

### 5.5 Choosing `if/else`, loops, and array methods

These constructs are not interchangeable.

Use `if/else` to choose one path:

```ts
if (role === "admin") {
  redirect("/admin");
} else {
  redirect("/customer");
}
```

Use a loop to repeat behavior:

```ts
for (const ticket of tickets) {
  verifyTicket(ticket);
}
```

Why not use a loop for the role decision? A loop means “repeat for every item,” while role routing needs exactly one destination. Why not use one `if/else` for all tickets? One condition runs once and does not visit the collection.

Array methods describe common collection operations:

| Method | Use | CornShirt-style example |
| --- | --- | --- |
| `map` | Transform every item | Convert database ticket rows to UI ticket objects. |
| `filter` | Keep all matching items | Keep events matching search/category. |
| `find` | Return first match | Find the zone connected to a ticket type. |
| `reduce` | Combine into one value | Add sold tickets or revenue. |
| `slice` | Take part of an array | Select featured/visible events. |

A `for` loop could perform these operations, but `map`, `filter`, `find`, and `reduce` communicate intent more clearly.

Use `switch` when one value has several exact cases, such as `admin`, `organizer`, and `customer`. An `if/else if` chain can work too; `if/else` is often better for ranges or unrelated Boolean conditions.

### 5.6 Frontend state and hook choices

- `useState` stores form values, selections, errors, loading, and modal state.
- `useEffect` performs a side effect after render, such as fetching events.
- `useMemo` caches a calculation until dependencies change.
- `useRef` retains a value without triggering a render.

`PurchaseButton` keeps its idempotency key in a ref so re-renders do not generate a new request identity. A normal local variable may be recreated.

Removing `useMemo` from event filtering normally preserves correctness but recalculates on every render. It is a performance choice, not a security control.

Using `useEffect` for something that can be calculated during render creates unnecessary synchronization and another render.

### 5.7 Frontend “what if” lesson

| Change | Likely result |
| --- | --- |
| Remove `"use client"` from `EventTicketing` | Hooks and click handlers become invalid in a server component. |
| Make every component client-side | More browser JavaScript and less-clear secret boundaries. |
| Replace `[eventId]` with a literal `eventId` folder | URL becomes `/events/eventId`; it no longer accepts arbitrary event IDs. |
| Rename `[eventId]` but keep `params.eventId` | Parameter access becomes wrong or fails type checking. |
| Trust only disabled buttons | APIs remain callable manually; there is no real authorization. |
| Store selected ticket and zone independently | State can become inconsistent. |
| Remove loading/error states | Users receive no useful feedback during delay/failure. |

### 5.8 Frontend checkpoint

- Explain JSX, component, props, state, render, and hook.
- Explain `.ts` versus `.tsx`.
- Explain server versus client components.
- Explain static and bracketed dynamic routes.
- Compare `if/else`, loop, `map`, `filter`, `find`, and `reduce`.
- Trace a seat-zone click to the selected ticket type.
- Explain why frontend availability is not backend security.

### 5.9 Presentation-critical frontend function reference

The tables below focus on functions most likely to be discussed during the presentation. Small display-only helpers such as date formatting use the same reading method, but the functions below control navigation, state, forms, and business actions.

#### Authentication and navigation functions

| File and function | Inputs/state | What it does | Output or side effect | Why it matters / what if changed |
| --- | --- | --- | --- | --- |
| `login/page.tsx` — `LoginContent` | Email, password, URL `returnTo` | Owns the interactive login form and role redirect flow. | Renders login state and redirects after success. | Must be client-side because it uses hooks and browser navigation. |
| `handleLogin(event)` | Form submit event, email/password state | Prevents normal form reload, signs in with Supabase, loads `profiles.role/status`, and selects destination. | Sets errors/loading or calls `router.replace`. | Trusting a role from the form would let users choose privileges. |
| `handleForgotPassword()` | Email state | Validates email and asks Supabase to send a recovery link through `/auth/callback`. | Success/error message. | A direct set-password link without a verified recovery session would be unsafe. |
| `register/page.tsx` — `handleRegister(event)` | Name, email, password, confirmation | Enforces password policy, creates Auth user, inserts customer profile, then provisions wallet. | Account/profile/wallet workflow and redirect. | If wallet provisioning happened before profile creation, the RPC would lack the required customer record. |
| `provisionWallet()` | Current authenticated registration session | Calls `/api/customer/wallet/provision` and handles retryable failure. | Boolean success plus UI state. | Keeping retry separate avoids creating a second Auth user after a wallet-only failure. |
| `finishRegistration()` | Safe return path | Shows success then navigates to login. | Timed route change. | The return path is sanitized to avoid arbitrary external redirects. |
| `SiteNav.handleSignOut()` | Current browser session | Signs out through Supabase and returns to visitor/login flow. | Session cleared and navigation. | Merely navigating away without signing out would leave the session active. |
| `SiteNav.isActive(href)` | Current pathname and nav href | Determines which navigation item is highlighted. | Boolean used by JSX classes. | This is a display decision, not authorization. |

#### Public event and routing functions

| File and function | Inputs | What it does | Output or side effect | Why it matters / what if changed |
| --- | --- | --- | --- | --- |
| `visitor/data.ts` — `numericValue(value)` | Number/string/null database value | Converts safely to a finite number. | Number, falling back to zero. | Direct arithmetic on nullable/string database values could produce `NaN`. |
| `eventAccent(eventId)` | Event UUID | Creates a stable visual accent from character codes. | Accent name. | Random color on every render would make cards visually unstable. |
| `mapEventRow(row)` | Joined Supabase event row | Maps ticket types, prices, supply, venue stage, zones, and status into the UI `Event` model. | Fully prepared `Event`. | Placing this transformation in every component would duplicate logic and create inconsistent displays. |
| `getEventCategories(events)` | Event array | Builds `All` plus unique categories. | String array. | A loop is possible, but `Set` clearly removes duplicates. |
| `filterEvents(events, query, category)` | Source list and filters | Normalizes search text and filters title, artist, venue, and category. | Matching events. | This is display filtering; the backend still controls which events are public. |
| `EventDiscovery` | Optional detail base path | Owns event loading, expiry refresh, retry, and state cards. | Hero and browser or loading/error UI. | Server security must not depend on this client fetch succeeding. |
| `loadEvents()` | Abort signal and request version | Fetches `/api/public/events` with no-store caching. | Updates events/error/loading state. | The `AbortController` prevents stale updates after unmount/retry. |
| expiry `useEffect` | Current events | Finds the next event end time and schedules a refresh. | Browser timeout. | Without it, an ended event could remain visible until manual refresh, though backend purchase checks still reject it. |
| `EventBrowser` | Events and detail base path | Applies search/category, selects featured cards, and paginates visible cards. | Event catalogue JSX. | `useMemo` improves repeated calculations but does not change authorization. |
| `resetCatalogCount()` | No parameters | Resets load-more state when search/filter changes. | Sets visible count. | Without reset, a previous “show all” state would carry into a new filter. |
| `generateMetadata({params})` | Async dynamic route params | Loads event and builds title/description metadata. | Next.js metadata. | It must await params in Next.js 16. |
| `EventDetailPage({params})` | `eventId` | Loads one live event, calls `notFound()` when absent, and builds visitor return path. | Public event page. | Using a client-supplied event object would allow stale/unapproved data. |

#### Ticket-selection and purchase functions

| File and function | Inputs/state | What it does | Output or side effect | Why it matters / what if changed |
| --- | --- | --- | --- | --- |
| `EventTicketing` | `event`, `isCustomer`, `loginHref` | Coordinates ticket-card and seat-zone selection. | Ticket options and optional seat map. | One shared component keeps public/customer detail behavior consistent. |
| `handleSelectZone(zoneId)` | Selected zone | Finds the zone and stores its connected ticket type. | Updates selection state. | A loop could find it, but `find` states that only one zone is expected. |
| `SeatMap.zoneCenter(shape)` | Zone rectangle/ellipse | Calculates label center coordinates. | `{cx, cy}`. | Pure geometry is isolated so rectangle and ellipse rendering share it. |
| `ShapeEl({shape})` | Zone shape | Chooses `<ellipse>` for circle type, otherwise `<rect>`. | SVG element. | This is a correct `if` decision; a loop would not make sense because only one shape is rendered. |
| `SeatMap.isClickable(zone)` | Zone plus editable/interactive mode | Allows organizer pricing or buyer selection only when priced and not sold out. | Boolean used for events/accessibility. | It improves UI behavior, but the API still validates availability. |
| `PurchaseButton.startCheckout()` | Event ID, ticket type ID, stable idempotency key | POSTs checkout request and navigates to Stripe URL. | Error state or `window.location.assign`. | Generating a new key for every retry could create multiple operations. |
| `PurchaseStatus.check()` | Primary operation ID | Polls operation-status API until a terminal state. | Progress/recovery UI and timer. | Polling reports backend truth; it does not itself confirm payment. |

#### Customer action functions

| File and function | Inputs/state | What it does | Output or side effect | Why it matters / what if changed |
| --- | --- | --- | --- | --- |
| `CustomerPage.loadCustomer()` | Supabase browser session | Loads profile and redirects wrong roles. | Profile/error/loading state. | The customer layout still performs the trusted server role guard. |
| `retryWalletSetup()` | Current user session | Calls wallet provisioning again without recreating the account. | Updates ready wallet state. | Provisioning is idempotent, so retry is safe. |
| `TicketList.ticketCategory(ticket)` | Ticket status/event/listing fields | Classifies ticket for UI grouping. | Category value. | Category affects presentation only; eligibility is rechecked by APIs. |
| `displayStatus(ticket)` | Ticket state | Chooses readable status text. | String. | Centralizing prevents status labels from disagreeing across cards. |
| `canDisplayQr(ticket)` | Ticket state and QR data | Hides QR for unusable/unconfirmed tickets. | Boolean. | Hiding QR is not the verification security boundary. |
| `listForResale()` | Selected ticket and MYR price | Calls listing API and refreshes UI on success. | Listing/error state. | Backend recalculates price cap; frontend input is not authoritative. |
| `claimRefund()` | Selected refund-eligible ticket | Calls refund claim and handles pending asset finalization. | Refund result/error. | HTTP 202 is handled because Stripe may succeed while NFT/database completion continues. |
| `submitTransfer()` | Ticket, recipient email, idempotency key | Calls transfer API and updates modal/result. | Ownership workflow feedback. | Recipient and ownership are verified again on server. |
| `MarketplaceClient.cancelListing()` | Selected listing | DELETEs seller listing. | Refresh/error. | UI cannot cancel another user's listing because backend verifies seller. |
| `purchaseListing(listing)` | Listing ID and stable idempotency key | Creates resale Checkout and opens Stripe URL. | Navigation/error. | The listed UI price is display-only; reservation loads authoritative amount. |
| `ResaleStatus.check()` | Resale operation ID | Polls delivery/recovery state. | Status UI. | Browser polling observes state; webhook/receipt create state. |
| `TransactionHistory.resetFilters()` | Current filter/search/page state | Restores default view. | State updates. | Does not modify transaction records. |

#### Organizer and admin functions

| File and function | Inputs/state | What it does | Output or side effect | Why it matters / what if changed |
| --- | --- | --- | --- | --- |
| `EventForm.loadVenues()` | Component lifecycle | Fetches curated venues/zones. | Venue state/error. | Organizers should not invent authoritative fixed venue zones. |
| `handleVenueChange(id)` | Selected venue | Replaces venue selection and resets incompatible zone pricing. | Form state. | Keeping old prices after venue change could map prices to the wrong zones. |
| `handleBannerChange(event)` | File input | Stores banner file and creates preview. | File/preview state. | Server still validates required file and size. |
| `setZonePrice(id, value)` | Zone ID and input text | Updates one zone's controlled price. | Pricing state. | Immutable object update lets React detect the change. |
| `EventForm.handleSubmit(event)` | Complete form state | Builds `FormData`; POSTs create or PUTs edit. | Event creation/update and navigation. | HTTP method changes with mode because create and edit are different operations. |
| `TicketScanner.verify(qr)` | Camera/manual QR | POSTs verification and displays result. | Verify response state. | It pauses scanning to avoid repeated calls for the same frame. |
| `markUsed()` | Verified valid ticket | POSTs dynamic ticket-use route. | Checked-in state. | Verify and use are separate so the organizer confirms admission. |
| `scanNext()` | No input | Clears previous result and resumes camera. | Scanner state reset. | Without reset, a previous ticket result could be confused with the next scan. |
| `handleScan(codes)` | Scanner detections | Uses first detected raw value and calls `verify`. | Starts verification. | Processing every repeated camera detection could flood the API. |
| dashboard `useMemo` calculations | Events, tickets, transactions | Calculates totals, status breakdowns, filters, chart series, pagination. | Derived dashboard data. | These are presentation summaries; database records remain unchanged. |

# Part II: Backend

The backend is trusted server-side code. It authenticates users, authorizes roles and ownership, validates input, protects secrets, reads authoritative prices, calls Stripe and blockchain services, invokes database functions, and returns safe HTTP responses.

## 6. Authentication and Role Authorization

Study these files in order:

1. `src/proxy.ts`
2. `src/lib/supabase/proxy.ts`
3. `src/lib/supabase/server.ts`
4. `src/lib/supabaseClient.ts`
5. `src/lib/supabaseAdmin.ts`
6. `src/lib/requireRole.ts`
7. `src/app/customer/layout.tsx`
8. `src/app/organizer/layout.tsx`
9. `src/app/admin/layout.tsx`
10. Login, registration, callback, and set-password routes

Important responsibilities:

- `proxy()` refreshes the cookie-backed Supabase session.
- `getVerifiedRole()` loads the authenticated user and trusted profile role.
- `requireRole()` protects pages and redirects the wrong role.
- `authorizeApiRole()` protects APIs and returns HTTP `401` or `403` responses.
- `supabaseClient` uses the browser-safe anonymous key and follows RLS.
- `supabaseAdmin` uses the service-role key, bypasses RLS, and must remain server-only.
- The legacy `user` role is treated as a customer alias in several places.

Questions everyone should answer:

- Why are page guards insufficient for protecting API mutations?
- What is the difference between authentication and authorization?
- Why must the service-role key remain on the server?
- Why does the application read the role from `profiles` rather than trusting browser input?

### 6.1 Backend technical terms

| Term | Meaning |
| --- | --- |
| API | Defined way for software to request data or actions. |
| Route handler | Server function exported as `GET`, `POST`, `PUT`, or `DELETE`. |
| Authentication | Determining who the user is. |
| Authorization | Determining what that user may do. |
| Validation | Checking that input and current state meet rules. |
| Secret | Credential that must never enter browser code. |
| Side effect | External change such as payment, database write, NFT transfer, or email. |
| Idempotency | Retrying does not repeat a completed side effect. |
| Webhook | Server-to-server notification sent by an external provider. |
| Transaction receipt | Blockchain confirmation and result of a submitted transaction. |
| Recovery state | Stored progress that allows safe continuation after partial failure. |

HTTP method intentions:

| Method | Intended use |
| --- | --- |
| `GET` | Read a resource or operation status. |
| `POST` | Create or trigger an action. |
| `PUT` | Update a known resource or state. |
| `DELETE` | Cancel/remove a resource where supported. |

Common status codes:

| Code | Meaning |
| --- | --- |
| 200 | Completed successfully. |
| 202 | Accepted, but finalization is still pending. |
| 400 | Request input is invalid. |
| 401 | User is not authenticated. |
| 403 | User is authenticated but forbidden. |
| 404 | Resource does not exist or is intentionally hidden. |
| 409 | Current state conflicts with the action. |
| 500 | Unexpected server/storage problem. |
| 502 | External dependency failed. |

### 6.2 Validation and early returns

A protected API should normally:

1. Authenticate and authorize.
2. Parse JSON or `FormData`.
3. Normalize whitespace/case.
4. Validate type, format, and length.
5. Load authoritative records.
6. Check ownership and current state.
7. Perform external side effects.
8. Store results and return a safe response.

Browser validation is repeated because requests can be sent without the form.

Early returns keep the success path readable:

```ts
if (!auth.ok) return auth.response;
if (!ticketId) return badRequestResponse;
if (!eligible) return conflictResponse;

// Authorized successful operation
```

A deeply nested `if/else` can be logically equivalent, but becomes harder to scan as validation grows.

### 6.3 Parallel and sequential async work

Use `Promise.all` when operations are independent:

```ts
const [profile, ticket] = await Promise.all([
  loadProfile(),
  loadTicket(),
]);
```

Use sequential `await` when a later step needs the earlier result:

```ts
const operation = await reserveTicket();
const session = await createStripeSession(operation);
```

Running reservation and Checkout creation in parallel would be incorrect because Checkout needs the operation's authoritative amount and ID.

### 6.4 Supabase client choices

| Client | Where | Why |
| --- | --- | --- |
| Browser client | Client components | Public anonymous key and RLS. |
| Server session client | Server request context | Uses the user's cookie-backed session. |
| Admin client | Server-only modules | Service role; bypasses RLS for trusted workflows. |

Importing `supabaseAdmin` into client code risks privileged access and secret exposure.

### 6.5 Backend “what if” lesson

| Change | Likely result |
| --- | --- |
| Trust `role: "admin"` from request JSON | Any user could claim the admin role. |
| Protect the page but not the API | A direct HTTP request could bypass the UI. |
| Accept price from the browser | A customer could tamper with the amount. |
| Use Stripe success URL as payment proof | Browser navigation could trigger unverified fulfillment. |
| Parse webhook JSON before signature verification | Exact signed bytes may change and verification can fail. |
| Remove idempotency keys | Duplicate Checkout, mint, transfer, or refund becomes possible. |
| Wait for blockchain receipt before storing hash | A server crash can lose proof of a submitted transaction and cause duplicate submission. |
| Run dependent calls in `Promise.all` | Later operations may run without required earlier data. |
| Return a wallet private key to the browser | Whoever captures it can control the customer's NFT wallet. |

### 6.6 Why the webhook, not the redirect?

Stripe signs its webhook request. CornShirt reads the raw body, verifies the `stripe-signature`, claims the event ID once, validates customer/amount/currency/operation, and only then mints or settles an NFT.

The browser success URL is useful for displaying progress, but it is not cryptographic evidence of payment.

### 6.7 Why integer sen?

Currency values use integer smallest units:

- RM1.00 = `100`
- RM49.90 = `4990`

Floating-point decimal calculations can produce rounding errors. Stripe expects integer minor units.

### 6.8 Why wallet encryption?

Only the managed public address is shown to customers. The private key is encrypted using AES-256-GCM.

- The encryption key stays server-only.
- A random IV is used.
- An authentication tag detects modification or a wrong key.
- Provisioning is idempotent, so a ready customer does not receive a second wallet.

Reusing a fixed IV would weaken GCM security. Returning the key to the client would defeat the managed-wallet security model.

## 7. Main End-to-End Workflows

### 7.1 Event discovery

```text
Visitor or customer page
  -> EventDiscovery
  -> GET /api/public/events
  -> getActiveEvents()
  -> synchronizeFinishedEvents()
  -> Supabase event query
  -> mapEventRow()
  -> HeroCarousel and EventBrowser
```

Study:

- `src/lib/publicEvents.ts`
- `src/app/visitor/data.ts`
- `src/components/visitor&customer/EventDiscovery.tsx`
- `src/components/visitor&customer/HeroCarousel.tsx`
- `src/components/visitor&customer/EventBrowser.tsx`
- `src/components/events/EventDetailContent.tsx`
- `src/app/events/[eventId]/EventTicketing.tsx`
- `src/components/seatmap/SeatMap.tsx`

Be able to explain:

- Why only active events are loaded.
- Why an event remains live for three hours after its start time.
- How ticket rows and venue zones become UI-friendly `Event` objects.
- How seat-zone selection updates the selected ticket type.
- How visitor and customer event pages reuse shared components.

### 7.2 Registration and managed-wallet provisioning

```text
Customer registration
  -> Supabase Auth sign-up
  -> profiles insert with role customer
  -> POST /api/customer/wallet/provision
  -> generate Ethereum private key
  -> encrypt private key with AES-256-GCM
  -> provision_customer_wallet RPC
  -> store encrypted wallet data atomically
  -> return only public address and ready status
```

Study:

- `src/app/register/page.tsx`
- `src/app/api/customer/wallet/provision/route.ts`
- `src/lib/walletProvisioning.ts`
- `src/lib/walletProvisioningCore.ts`
- `src/lib/walletEncryption.ts`
- `src/lib/walletAccess.ts`

Know that:

- Only customers receive managed wallets automatically.
- AES-256-GCM supplies encryption and integrity checking.
- The IV and authentication tag are stored with the ciphertext.
- The encryption key remains in a server-only environment variable.
- The private key is never returned to the browser or displayed to the customer.
- Provisioning is idempotent: an already-ready wallet is returned instead of creating another wallet.

### 7.3 Primary ticket purchase

```text
PurchaseButton
  -> POST /api/customer/tickets/checkout
  -> authorize customer
  -> validate request body
  -> verify event is live
  -> reserve_primary_ticket RPC
  -> create Stripe Checkout Session in MYR
  -> customer completes test payment
  -> Stripe sends checkout.session.completed
  -> verify raw webhook signature
  -> claim webhook event once
  -> validate session, payer, amount, currency, and operation
  -> mint Ticket NFT
  -> wait for successful blockchain receipt
  -> finalize_primary_purchase RPC
  -> record ticket, QR, transaction, and accounting
  -> send confirmation email
```

Study:

- `src/app/events/[eventId]/PurchaseButton.tsx`
- `src/app/api/customer/tickets/checkout/route.ts`
- `src/lib/stripe/checkout.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/stripe/webhook.ts`
- `src/lib/nft/mint.ts`
- Relevant SQL RPC functions

Important rules:

- The browser success redirect is not payment proof.
- Only a verified Stripe webhook confirms payment.
- Prices are loaded from server-controlled records.
- Stripe amounts use integer sen. `RM49.90` is `4990` sen.
- Idempotency prevents duplicate reservations, Checkout Sessions, webhook processing, and minting.
- Supabase completion waits for a successful NFT transaction receipt.

### 7.4 Direct ticket transfer

```text
Current owner enters recipient email
  -> POST /api/customer/tickets/[ticketId]/transfer
  -> validate sender and recipient
  -> verify wallet readiness
  -> verify event, ticket, transfer permission, and listing state
  -> compare on-chain owner with sender wallet
  -> load and decrypt sender's managed key
  -> fund test gas if necessary
  -> safeTransferFrom existing token
  -> wait for receipt
  -> finalize_direct_transfer RPC
  -> update ownership and notify both customers
```

No Stripe payment is created and no replacement NFT is minted. The same token ID changes owner.

### 7.5 Marketplace listing and resale

```text
Seller selects eligible ticket and price
  -> validate maximum resale price
  -> approve Marketplace contract for token
  -> create on-chain listing
  -> store active Supabase listing
  -> buyer starts Stripe resale Checkout
  -> signed webhook confirms payment
  -> platform settler calls settlePaidListing
  -> existing NFT moves to buyer
  -> finalize_resale_purchase RPC
  -> mark listing purchased
  -> record simulated seller proceeds
  -> notify buyer and seller
```

Study:

- `src/lib/marketplace.ts`
- `src/lib/resalePricing.ts`
- `src/lib/stripe/resale.ts`
- `src/lib/stripe/resaleRecovery.ts`
- `src/lib/nft/marketplaceContract.ts`
- Customer Marketplace pages and API routes
- `blockchain/contracts/CornShirtMarketplace.sol`

Know that:

- A seller may list at no more than face value plus 15%.
- The NFT remains with the seller until settlement.
- Stripe Connect is not used.
- Seller proceeds are simulated Supabase accounting, not real payouts.
- Payment and NFT delivery are not one atomic action, so recovery states are required.

### 7.6 Event cancellation and refund

```text
Organizer or admin cancels eligible event
  -> sales stop
  -> valid tickets become refund eligible
  -> current owner claims refund
  -> locate latest successful paid acquisition
  -> refund original Stripe payer
  -> verify refund result
  -> confirm on-chain owner
  -> burnRefundedTicket
  -> wait for receipt
  -> finalize_ticket_refund RPC
  -> mark ticket refunded and reverse simulated accounting
```

The current owner and refund beneficiary can be different people after a free transfer. The current owner surrenders the NFT, while Stripe refunds the latest person who paid for the ticket.

Study:

- `src/app/api/customer/refunds/claim/route.ts`
- `src/lib/stripe/refund.ts`
- `src/lib/nft/burn.ts`
- Organizer and admin cancellation API routes
- Cancellation and refund SQL functions

### 7.7 QR verification and check-in

```text
Organizer scans QR or enters ticket ID
  -> POST /api/organizer/tickets/verify
  -> authorize organizer
  -> verify organizer owns event
  -> check event live window
  -> check ticket status and QR value
  -> compare blockchain owner with ticket wallet
  -> return valid or safe rejection result
  -> POST /api/organizer/tickets/[ticketId]/use
  -> atomically mark valid ticket used
  -> write verification log
```

Study:

- `src/components/organizer/TicketScanner.tsx`
- `src/components/organizer/ticketScannerState.ts`
- `src/app/api/organizer/tickets/verify/route.ts`
- `src/app/api/organizer/tickets/[ticketId]/use/route.ts`
- `src/lib/nft/getOwner.ts`

Be able to explain why valid, used, refunded, cancelled, burned, and ownership-mismatch tickets produce different results.

### 7.8 Presentation-critical backend function reference

#### Role, routing, event, and validation helpers

| Function | Inputs | Core behavior | Return/side effect | Presentation focus |
| --- | --- | --- | --- | --- |
| `proxy(request)` | `NextRequest` | Delegates cookie/session refresh to `updateSession`. | Next response with refreshed cookies. | Proxy maintains session; it is not the complete role guard. |
| `updateSession(request)` | Request cookies | Creates Supabase SSR client, copies changed cookies, calls `getClaims`. | Updated request/response cookies. | Removing cookie propagation can cause sessions to appear logged out. |
| `isAppRole(role)` | Unknown value | Type-guards known roles. | Boolean plus TypeScript narrowing. | Prevents arbitrary profile strings being treated as valid roles. |
| `roleHome(role)` | Valid app role | Uses `switch` to select dashboard route. | Route string. | `switch` fits one value with several exact cases. |
| `getVerifiedRole()` | Server session | Calls `auth.getUser`, loads profile role/status with admin client. | Authenticated identity or safe failure status. | Trusted role comes from server data, not request JSON. |
| `requireRole(allowedRoles)` | Allowed page roles | Redirects unauthenticated, missing, deactivated, or wrong-role users. | Verified identity or redirect. | Used by layouts/pages. |
| `authorizeApiRole(allowedRoles)` | Allowed API roles | Converts the same identity rules into 401/403 responses. | `{ok, identity}` or Response. | APIs cannot use page redirects as authorization. |
| `getEventEndTime(eventDate)` | Date string/null | Adds three hours to valid start time. | End Date or null. | Central definition prevents different expiry rules. |
| `getLiveEventCutoff(now)` | Current date | Subtracts three-hour window for queries. | Cutoff Date. | Used to query events that have not ended. |
| `isEventLive(event)` | Status/date record | Requires `active` and end time after now. | Boolean. | UI visibility and backend purchase eligibility use the same rule. |
| `synchronizeFinishedEvents()` | None | Calls `complete_finished_events` RPC. | Database lifecycle updates. | Opportunistic lifecycle synchronization happens during server requests. |
| `getActiveEvents()` | None | Synchronizes lifecycle, queries active joined events, maps rows. | `Event[]`. | Service-role read is server-only; only live events are returned. |
| `getActiveEventById(eventId)` | Dynamic ID | Same rules for one event and cached within render scope. | `Event` or null. | Public detail cannot load pending/cancelled/ended events. |
| `formatMyr(value)` | MYR major-unit number | Formats display currency. | String. | Display conversion is separate from Stripe minor-unit arithmetic. |
| `parsePositiveMyrAmount(value)` | User text | Accepts valid positive value with at most two decimals. | Number or null. | Rejects malformed/zero/negative input before pricing rules. |
| `myrToSen(value)` | MYR number | Rounds multiplied value and checks safe positive integer. | Sen integer or null. | Stripe receives integer minor units. |
| `parseLayout(json)` | Organizer layout JSON | Parses and validates expected object structure. | Layout or null. | Never trust raw JSON merely because the UI produced it. |
| `buildTicketTypeRows(venueId, layout)` | Venue and pricing layout | Loads authoritative zones and creates valid ticket-type rows. | Success rows or typed error. | Prevents client-defined capacity/zone mismatch. |
| `getMaximumResalePriceSen(original)` | Original paid/face price | Applies 15% markup ceiling in integer sen. | Maximum sen. | Server enforces cap even if UI is modified. |

#### Wallet and encryption functions

| Function | Inputs | Core behavior | Return/side effect | What if changed? |
| --- | --- | --- | --- | --- |
| `readWalletEncryptionKey(encoded?)` | Base64 environment value | Decodes and verifies exactly 32 bytes. | Encryption-key Buffer. | Accepting wrong length would make AES-256 configuration invalid. |
| `encryptPrivateKey(privateKey, key)` | Ethereum private key and 32-byte key | Generates random IV, AES-GCM encrypts, returns ciphertext/IV/tag/version. | Encrypted record. | Reusing IV or omitting tag weakens confidentiality/integrity. |
| `decryptPrivateKey(encrypted, key)` | Stored encrypted fields | Authenticates, decrypts, and validates Ethereum key pattern. | Hex private key. | Decrypted material must stay server-only and short-lived. |
| `parseProvisioningRpcResult(value)` | Unknown RPC response | Validates address, ready status, and `created` Boolean. | Typed wallet result. | TypeScript types alone cannot validate runtime network data. |
| core `provisionCustomerWallet(userId,deps)` | User and injected dependencies | Returns ready wallet, rejects inconsistent state, otherwise generate/encrypt/persist; marks failure safely. | Persisted wallet or stable error. | Dependency injection makes behavior testable without real secrets/database. |
| `loadWalletState(userId)` | Customer ID | Compares profile wallet and custodial-wallet row. | Pending/failed/ready/inconsistent union. | Treating mismatched rows as ready could sign from the wrong wallet. |
| `persistWallet(input)` | Address and encrypted key fields | Calls atomic `provision_customer_wallet` RPC. | Ready result. | Separate insert/update calls could leave partial wallet state. |
| server `provisionCustomerWallet(userId)` | Customer ID | Supplies real generator, encryption, persistence, and failure dependencies to core logic. | Wallet result Promise. | Wrapper separates testable decision logic from infrastructure. |
| `loadManagedWalletSigner(userId)` | Customer ID | Loads profile and encrypted wallet in parallel, compares addresses, decrypts key. | `{address, privateKey}`. | Address mismatch stops signing rather than guessing which row is correct. |

#### Primary Stripe functions

| Function | Inputs | Core behavior | Return/side effect | What if changed? |
| --- | --- | --- | --- | --- |
| `parseTicketCheckoutBody(body)` | Unknown JSON | Extracts event/ticket IDs and validates idempotency-key pattern. | Parsed input or null. | Casting JSON without checks can pass invalid runtime values. |
| `checkoutError(message)` | Database/RPC error text | Maps known reservation categories to safe HTTP errors. | Typed failure result. | Raw database errors could expose internals. |
| `createTicketCheckoutSession(input)` | User, event, type, origin, key | Syncs lifecycle, verifies live event, reserves via RPC, reuses open Session or creates Stripe Session, attaches ID. | Checkout URL and operation ID. | Creating Stripe before reservation risks overselling and wrong price. |
| `metadataValue(metadata,key)` | Stripe metadata | Safely extracts a string. | String or empty. | Stripe objects are external runtime data and require validation. |
| `paymentIntentId(session)` | Stripe Session | Handles string or expanded PaymentIntent object. | ID or null. | Stripe SDK fields can have more than one runtime shape. |
| `validatePaidSession(session,operation)` | Stripe and database records | Checks paid status, Session ID, customer, metadata, amount, and currency. | Failure or null. | Skipping any comparison can fulfill the wrong/tampered operation. |
| `loadOperation(operationId)` | Operation UUID | Loads workflow fields required for fulfillment/recovery. | Operation or null. | The operation is authoritative, not browser metadata. |
| `finalizeTicketCheckout(session)` | Verified completed Session | Records payment, rejects ended event with refund, mints/recover mint, generates QR, calls finalization RPC, emails buyer. | `FinalizeResult`. | Database completion waits for confirmed chain receipt. |
| `claimStripeEvent(event)` | Stripe Event | Calls deduplication RPC. | Boolean claimed. | Without claiming, retry can fulfill twice. |
| `finishStripeEvent(id,result)` | Event and result | Records success/error category. | Database update. | Required for observability and retry diagnosis. |
| `handleStripeWebhookEvent(event)` | Verified Stripe Event | Ignores irrelevant types; routes refund, resale, or primary processing; finishes event. | Finalize result. | Central dispatch prevents each workflow from independently parsing webhook types. |

#### NFT and marketplace integration functions

| Function | Inputs | Core behavior | Return/side effect | What if changed? |
| --- | --- | --- | --- | --- |
| `getPublicClient()` | Environment RPC | Creates read/receipt Viem client for Sepolia. | Public client. | Reads do not need a signing key. |
| `getPlatformWalletClient()` | Platform private key and RPC | Creates signing Viem client. | Wallet client. | Must never be imported into client components. |
| `getContract()` | Contract address env | Returns ticket address and ABI. | Contract descriptor. | Wrong address means reads/writes target another deployment. |
| `mintTicket(to,deps?,onSubmitted?)` | Recipient and optional test dependencies | Simulates, submits, records hash callback, waits receipt, decodes zero-address Transfer event. | Token ID and transaction hash. | A successful transaction without expected mint event is not accepted. |
| `recoverMintResult(to,hash)` | Recipient and stored hash | Loads old receipt and decodes the original mint. | Recovered token ID/hash. | Prevents retry minting a second NFT. |
| `getTicketOwner(tokenId)` | Token ID | Calls contract `ownerOf`. | Address. | Sensitive actions use this to reconcile Supabase ownership. |
| `transferTicket(key,from,to,tokenId,...)` | Managed signer and transfer fields | Signs `safeTransferFrom`, stores hash callback, waits receipt. | Transaction hash. | No replacement NFT is minted. |
| `fundCustomerGas(address)` | Customer wallet | Checks balance; sends small amount only below threshold; waits receipt. | Funded flag/balance/hash. | Funding every time wastes platform test ETH. |
| `burnRefundedTicket(tokenId,...)` | Token ID | Platform calls restricted burn and waits receipt. | Burn hash. | Ticket record is not finalized refunded before required burn result. |
| `marketplaceReference(value)` | Listing/payment ID | Hashes UTF-8 value with keccak256. | `bytes32` hex. | Solidity expects fixed-size references without exposing raw external IDs. |
| `createContractListing(input)` | Seller key, listing, token, price, expiry | Approves token, confirms approval, creates listing, confirms listing. | Approval/listing hashes/reference. | Listing before approval would revert. |
| `cancelContractListing(key,reference)` | Seller signer and reference | Calls seller-only cancellation and confirms receipt. | Hash. | Platform cannot silently impersonate seller in this design. |
| `settleContractListing(input,onSubmitted)` | Reference, payment ID, buyer | Platform settler submits settlement and confirms receipt. | Settlement hash. | Must run only after verified Stripe payment. |

#### Resale, refund, and notification functions

| Function | Inputs | Core behavior | Return/side effect | Presentation focus |
| --- | --- | --- | --- | --- |
| `createResaleListing(userId,ticketId,price)` | Seller and price | Validates wallet, ownership, live event, transfer policy, chain owner, price cap, conflicts; creates contract/database listing. | Listing result. | Server repeats every eligibility rule. |
| `cancelResaleListing(userId,listingId)` | Seller and listing | Verifies active seller listing, cancels contract when configured, updates database. | Success/error. | Ownership of listing is checked server-side. |
| `getMarketplacePageData(userId)` | Buyer/user ID | Loads listings/tickets/events/types and builds lookup Maps. | Marketplace view model. | Maps avoid repeated nested searches while assembling rows. |
| `createResaleCheckoutSession(input)` | Buyer, listing, origin, key | Reserves listing, loads authoritative sen price, creates/reuses Stripe Session. | URL/operation. | Reservation prevents two buyers paying for one listing. |
| `finalizeResaleCheckout(session)` | Verified resale Session | Validates payment, decides recovery action, settles existing token, finalizes RPC, emails both sides. | Finalize result. | Existing token moves; no mint. |
| `decideResaleAssetAction(input)` | Current owner, seller, buyer, prior hash | Decides settle, recover, finalize, or mismatch. | Action union. | Pure state decision is unit-testable. |
| `shouldAutoRefundResale(input)` | Failure stage/retry count | Decides when delivery failure should become one refund. | Boolean. | Database-finalization failure should not refund after asset already moved. |
| `finalizeTicketRefundAsset(operationId)` | Refund operation | Loads state, confirms/recover burn, calls finalization RPC, reconciles concurrent workers, stores safe error. | Refund asset result. | Stripe refund may succeed before burn; retry must not refund again. |
| `reconcileRefundCompletion(...)` | Operation and possible hash | Re-reads shared state and receipts to handle claim/webhook race. | Boolean completed. | Two workers may observe the same refund; reconciliation treats the winner as success. |
| `sendTransactionalEmail(input)` | Notification key/type/recipient/content | Claims delivery, renders text/HTML, sends SMTP, finishes delivery record. | Sent/skipped/failure. | Email idempotency avoids duplicate messages. |
| notification helpers | Operation/event/user IDs | Load context and call transactional email for purchase, transfer, resale, refund, cancellation. | Delivery Boolean. | Email failure is secondary and does not undo payment/ownership. |

# Part III: Smart Contract

A smart contract is blockchain-deployed code whose state changes through verified transactions. CornShirt uses `CornShirtTicket` for the ERC-721 asset and `CornShirtMarketplace` for approval-based resale settlement.

## 8. Smart Contracts

### 8.0 Solidity technical terms

| Term | Meaning |
| --- | --- |
| ERC-721 | Standard for unique non-fungible tokens. |
| State variable | Value permanently stored by the contract. |
| Constructor | Code that runs once during deployment. |
| Modifier | Reusable rule attached to a function. |
| `require` | Checks a condition and reverts when false. |
| Revert | Cancels the transaction and all its state changes. |
| Mapping | Direct key-to-value on-chain storage. |
| Struct | Custom group of named fields. |
| Event | Transaction log observed by off-chain systems. |
| `msg.sender` | Address calling the current function. |
| `block.timestamp` | Approximate current block time. |
| `external` | Function intended to be called from outside. |
| `view` | Function that reads state without changing it. |
| `immutable` | Assigned during construction and never changed later. |

ERC-721 `Transfer` events represent:

- Mint: zero address to customer.
- Transfer: current owner to recipient.
- Burn: owner to zero address.

### 8.1 `CornShirtTicket`

File: `blockchain/contracts/CornShirtTicket.sol`

The contract inherits from OpenZeppelin `ERC721` and `AccessControl`.

| Function or value | Explanation |
| --- | --- |
| `MINTER_ROLE` | Identifies accounts permitted to mint tickets. |
| `BURNER_ROLE` | Identifies accounts permitted to burn refunded tickets. |
| `_nextTokenId` | Stores the ID that will be assigned to the next minted NFT. |
| `constructor()` | Sets the collection name and symbol and grants admin, minter, and burner roles to the deployer. |
| `mintTicket(address to)` | Mints one new token to `to`, increments `_nextTokenId`, and returns the token ID. |
| `burnRefundedTicket(uint256 tokenId)` | Burns a token during an authorized refund workflow. |
| `supportsInterface(bytes4 interfaceId)` | Resolves interface support inherited from both ERC-721 and AccessControl. |

Important inherited ERC-721 functions:

| Function | Explanation |
| --- | --- |
| `ownerOf(tokenId)` | Returns the authoritative wallet owner of a token. |
| `safeTransferFrom(from, to, tokenId)` | Transfers an existing token while safely handling contract recipients. |
| `approve(operator, tokenId)` | Approves another address to transfer one token. |
| `getApproved(tokenId)` | Returns the address approved for one token. |
| `isApprovedForAll(owner, operator)` | Checks collection-wide operator approval. |

### 8.2 `CornShirtMarketplace`

File: `blockchain/contracts/CornShirtMarketplace.sol`

The contract inherits from `AccessControl` and `ReentrancyGuard`.

| Function or value | Explanation |
| --- | --- |
| `SETTLER_ROLE` | Restricts paid settlement to the platform's authorized account. |
| `Listing` | Stores seller, token ID, price in sen, expiry, and active state. |
| `ticketContract` | Immutable reference to the Ticket NFT contract. |
| `listings` | Maps a hashed listing reference to a listing. |
| `processedPayments` | Prevents a payment reference from settling more than once. |
| `constructor(ticketAddress)` | Validates and stores the NFT contract and grants platform roles. |
| `createListing(...)` | Verifies ownership, price, expiry, and approval before creating a listing. |
| `cancelListing(...)` | Lets the seller deactivate an active listing. |
| `reclaimExpiredListing(...)` | Lets anyone deactivate a listing after its expiry. |
| `settlePaidListing(...)` | Lets the settler transfer the approved existing NFT to a buyer exactly once. |

Contract events provide public transaction evidence:

- `ListingCreated`
- `ListingCancelled`
- `ListingExpired`
- `ListingSettled`

### 8.2A Exact contract function walkthrough

#### `CornShirtTicket.constructor()`

- **Caller:** Deployment account; runs once.
- **Inputs:** None.
- **Checks:** OpenZeppelin deployment rules.
- **State changes:** Initializes ERC-721 name/symbol and grants deployer `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, and `BURNER_ROLE`.
- **Return:** None.
- **Presentation point:** The same initial platform wallet can deploy and operate the prototype, while roles remain separately representable.

#### `mintTicket(address to)`

- **Caller:** Platform wallet holding `MINTER_ROLE`, normally through `src/lib/nft/mint.ts`.
- **Input:** Nonzero/valid recipient address is enforced by `_safeMint`.
- **Checks:** `onlyRole(MINTER_ROLE)` and ERC-721 safe-mint receiver rules.
- **State changes:** Uses current `_nextTokenId`, increments counter, stores ownership.
- **Event:** Inherited `Transfer(address(0), to, tokenId)`.
- **Return:** New `tokenId`.
- **Failure behavior:** Entire transaction, including counter increment, reverts.

#### `burnRefundedTicket(uint256 tokenId)`

- **Caller:** Platform wallet holding `BURNER_ROLE`, through refund finalization.
- **Input:** Existing token ID.
- **Checks:** Burner role; inherited `_burn` requires token existence.
- **State changes:** Deletes token ownership/approval.
- **Event:** `Transfer(owner, address(0), tokenId)`.
- **Return:** None; backend uses receipt hash.

#### `supportsInterface(bytes4 interfaceId)`

- **Caller:** Wallets, marketplaces, indexers, or other contracts.
- **Input:** Four-byte interface identifier.
- **Checks/state changes:** Read-only.
- **Return:** Whether ERC-721, AccessControl, or inherited interface is supported.
- **Why override:** Both parent contracts implement the function, so Solidity requires explicit resolution.

#### `CornShirtMarketplace.constructor(address ticketAddress)`

- **Caller:** Deployment account; runs once.
- **Input:** Ticket contract address.
- **Checks:** Address cannot be zero.
- **State changes:** Stores immutable ERC-721 reference and grants admin/settler roles.
- **What if wrong address:** Marketplace is permanently attached to the wrong collection because the field is immutable.

#### `createListing(bytes32 listingReference, uint256 tokenId, uint256 priceInSen, uint64 expiresAt)`

- **Caller:** Seller's managed wallet through `createContractListing`.
- **Inputs:** Hashed database listing ID, token ID, integer sen price, event-end timestamp.
- **Checks:** Nonzero/unused reference, positive price, future expiry, caller ownership, Marketplace approval.
- **State changes:** Writes one active `Listing`.
- **Event:** `ListingCreated`.
- **Why seller calls it:** `msg.sender` must be the token owner; platform cannot pretend to be seller.

#### `cancelListing(bytes32 listingReference)`

- **Caller:** Original seller wallet.
- **Checks:** Listing active and caller equals stored seller.
- **State changes:** Sets `active = false`.
- **Event:** `ListingCancelled`.
- **Why not delete:** Stored seller proves the reference was already used.

#### `reclaimExpiredListing(bytes32 listingReference)`

- **Caller:** Any address.
- **Checks:** Listing active and `block.timestamp >= expiresAt`.
- **State changes:** Sets inactive.
- **Event:** `ListingExpired`.
- **Why permissionless:** Safe cleanup should not depend on seller availability.

#### `settlePaidListing(bytes32 listingReference, bytes32 paymentReference, address buyer)`

- **Caller:** Platform account with `SETTLER_ROLE`, through verified resale webhook.
- **Inputs:** Listing hash, hashed Stripe payment ID, buyer wallet.
- **Checks:** Active/unexpired listing, unused nonzero payment, valid buyer, buyer not seller.
- **State changes:** Marks payment used and listing inactive, then transfers existing token.
- **Event:** Marketplace `ListingSettled` plus ERC-721 `Transfer`.
- **Protection:** `onlyRole`, `nonReentrant`, processed-payment mapping, checks-effects-interactions.
- **Return:** None; backend records transaction receipt hash.

### 8.3 Contract security concepts

Every member should explain:

- Role-based access control
- Why minting is not publicly callable
- Why refund burning is restricted
- Why marketplace settlement requires `SETTLER_ROLE`
- Why `nonReentrant` protects marketplace state changes
- Why payment references are hashed
- Why processed payment references cannot be reused
- Why settlement is rejected after event expiry
- Why resale transfers the existing token instead of minting another token

Prototype limitation: `transfer_allowed` is enforced by the Next.js server and Supabase rules, not directly by `CornShirtTicket`. Someone who obtained a customer's private key could bypass that application-level restriction. The managed-wallet design reduces this risk because customers never receive the keys.

### 8.4 Smart-contract “why and what if” lesson

#### Why roles instead of public functions?

Removing `MINTER_ROLE` would let anyone create fake tickets. Making burning public would let tickets be destroyed outside the verified refund workflow. Separate minter, burner, and settler roles implement least privilege.

#### Why one mint instead of a loop?

One verified primary operation represents exactly one ticket. A loop would introduce batch behavior, higher gas cost, more complex limits, and greater duplicate-delivery risk. A loop is correct only if the business requirement explicitly becomes batch minting.

#### Why a mapping instead of an array for listings?

Settlement knows the listing reference and needs direct lookup. An array requires a loop whose gas cost grows with every listing. The trade-off is that mappings are not naturally enumerable, so Supabase provides the browsable marketplace list.

#### Why a struct?

`Listing` keeps seller, token ID, sen price, expiry, and active state together. Separate mappings could work, but are easier to update inconsistently.

#### Why separate `require` statements?

Each contract invariant has a readable failure reason. One large Boolean expression would be shorter but harder to diagnose.

#### Why keep a cancelled listing instead of deleting it?

Keeping the seller/reference marks the reference as previously used and preserves history. Deleting it could make the reference appear unused again.

#### Why can anyone reclaim an expired listing?

Cleanup does not transfer the NFT. Restricting cleanup to the seller could leave stale listings active forever.

#### Why update state before transferring the NFT?

`settlePaidListing` marks the payment processed and listing inactive before the external `safeTransferFrom`. This follows checks-effects-interactions and works with `nonReentrant` to reduce reentrancy risk.

#### Why `safeTransferFrom` instead of `transferFrom`?

The safe version checks that a contract recipient supports ERC-721 receiving. Otherwise it reverts instead of locking the NFT.

#### What if `processedPayments` is removed?

The contract loses an on-chain defense against reusing the same Stripe payment reference.

#### What if `ticketContract` is not immutable?

An administrator could redirect settlement to a different NFT collection after deployment, invalidating listing assumptions.

### 8.5 Contract helper lesson

The TypeScript backend talks to Solidity through Viem:

| File | Role |
| --- | --- |
| `src/lib/nft/contract.ts` | Creates public and platform wallet clients. |
| `src/lib/nft/mint.ts` | Mints and decodes the ERC-721 Transfer event. |
| `src/lib/nft/getOwner.ts` | Calls `ownerOf`. |
| `src/lib/nft/transfer.ts` | Signs customer transfer. |
| `src/lib/nft/burn.ts` | Burns refunded NFT. |
| `src/lib/nft/fundGas.ts` | Funds a small Sepolia gas balance. |
| `src/lib/nft/marketplaceContract.ts` | Approves, lists, cancels, and settles. |
| `src/abi/CornShirtTicket.json` | Describes callable functions and events. |

### 8.6 Smart-contract checkpoint

- Define ERC-721, token ID, approval, owner, transfer, and burn.
- Explain every function in both contracts.
- Explain role separation and least privilege.
- Explain mapping versus array.
- Explain struct, event, modifier, `require`, and revert.
- Explain checks-effects-interactions and reentrancy.
- Explain why resale transfers the same token.

# Part IV: Database

The database stores roles, events, inventory, operational ticket state, Stripe references, QR state, workflow recovery, listings, simulated accounting, and logs. Blockchain ownership does not replace this application data.

## 9. Database and Supabase Study

Study `supabase/migrations/202608070001_initial_schema.sql` by category instead of reading it as one uninterrupted file.

### 9.0 Database technical terms

| Term | Meaning |
| --- | --- |
| Table | Collection of related rows. |
| Row | One stored record. |
| Column | One named field in a row. |
| Primary key | Unique identifier for one row. |
| Foreign key | Reference to a row in another table. |
| Constraint | Rule enforced by PostgreSQL. |
| Index | Additional lookup structure that speeds queries or enforces uniqueness. |
| Join | Combines related rows from multiple tables. |
| Transaction | Changes that commit together or all roll back. |
| RPC | PostgreSQL function callable through Supabase. |
| RLS | Row Level Security policy controlling row access. |
| Migration | Version-controlled schema or database-behavior change. |
| Seed | Known starting data for local development/testing. |

### 9.1 Core tables

- `profiles`
- `events`
- `venues`
- `venue_zones`
- `ticket_types`
- `tickets`
- `transactions`
- `verification_logs`

### 9.2 Workflow and integration tables

- `custodial_wallets`
- `ticket_operations`
- `stripe_webhook_events`
- `resale_listings`
- `seller_proceeds`
- `transactional_email_deliveries`

### 9.3 Administration and applications

- `partner_applications`
- `documents`
- `admin_activity_logs`

### 9.4 Important RPC functions

| Function | Responsibility |
| --- | --- |
| `provision_customer_wallet` | Atomically stores the encrypted wallet and updates the profile. |
| `reserve_primary_ticket` | Validates purchase constraints and reserves inventory. |
| `finalize_primary_purchase` | Creates the completed NFT-backed ticket and transaction state. |
| `finalize_direct_transfer` | Updates ownership after a confirmed blockchain transfer. |
| `reserve_resale_purchase` | Locks a listing for one resale buyer. |
| `finalize_resale_purchase` | Completes listing, ownership, transaction, and proceeds records. |
| `finalize_ticket_refund` | Completes ticket surrender and reverses applicable accounting. |
| `claim_stripe_webhook` | Claims a Stripe event once for deduplication. |
| `finish_stripe_webhook` | Records whether webhook processing succeeded. |
| `complete_finished_events` | Completes ended events and expires tickets/listings. |

For each RPC, identify which API or server helper calls it and what must already be verified before the call.

### 9.4A Exact RPC function walkthrough

| RPC and important parameters | Called by | Atomic behavior | Why it belongs in PostgreSQL |
| --- | --- | --- | --- |
| `provision_customer_wallet(p_user_id, p_wallet_address, encrypted key fields, p_key_version)` | Wallet provisioning backend | Verifies eligible customer state, inserts `custodial_wallets`, updates `profiles.wallet_address/status`, and returns `created`. | Wallet row and profile must never be partially updated. |
| `reserve_primary_ticket(p_buyer_id, p_event_id, p_ticket_type_id, p_idempotency_key)` | `createTicketCheckoutSession` | Checks wallet, live event, type, inventory, purchase limit, and existing key; reserves inventory and creates/returns operation with sen price. | Concurrent buyers must not oversell or bypass limits. |
| `finalize_primary_purchase(p_operation_id, p_token_id, p_asset_transaction_hash, p_qr_code)` | `finalizeTicketCheckout` after mint receipt | Finalizes ticket ownership/token/QR, transaction/accounting, inventory reservation, and operation state. | All application records must agree with one confirmed mint. |
| `finalize_direct_transfer(p_operation_id, p_asset_transaction_hash)` | Dynamic transfer API after receipt | Moves ticket user/wallet, inserts transfer history, completes operation. | Ownership/history must change together exactly once. |
| `reserve_resale_purchase(p_buyer_id, p_listing_id, p_idempotency_key)` | `createResaleCheckoutSession` | Locks one active listing, rejects seller/self/conflicts, creates/returns resale operation with stored sen price. | Prevents two buyers reserving one NFT. |
| `finalize_resale_purchase(p_operation_id, p_asset_transaction_hash)` | `finalizeResaleCheckout` after settlement | Moves ticket owner, marks listing purchased, records transaction/proceeds, completes operation. | Listing, ownership, and simulated proceeds must agree. |
| `finalize_ticket_refund(p_operation_id, p_asset_transaction_hash)` | `finalizeTicketRefundAsset` after burn | Marks ticket refunded, completes surrender/history, reverses linked simulated accounting, completes operation. | Refund workflow must not half-finalize financial/ticket records. |
| `claim_stripe_webhook(p_event_id, p_event_type)` | Webhook dispatcher | Inserts/claims Stripe event once and updates attempt metadata. | Deduplication must be concurrency-safe. |
| `finish_stripe_webhook(p_event_id, p_succeeded, p_error_category)` | Webhook dispatcher | Records completion or retry category. | Durable monitoring explains whether Stripe will need retry/recovery. |
| `mark_primary_refunded(p_operation_id, p_refund_id, p_error_category)` | Primary delivery failure/ended-event recovery | Stores one Stripe refund result and changes operation/ticket reservation state safely. | Prevents repeated refunds after failed NFT delivery. |
| `mark_resale_refunded(p_operation_id, p_refund_id, p_error_category)` | Resale recovery | Stores one resale refund and releases/finalizes related workflow state. | Buyer refund and listing recovery must coordinate. |
| `complete_finished_events()` | `synchronizeFinishedEvents` | Completes ended events, expires unused eligible tickets and active listings. | One database transaction applies the same deadline across related rows. |
| `claim_transactional_email(...)` | `sendTransactionalEmail` | Claims a notification key once or records retry attempt. | Prevents duplicate emails under repeated webhook/API calls. |
| `finish_transactional_email(...)` | `sendTransactionalEmail` | Records sent/failure state and safe category. | Email recovery is separated from payment/NFT completion. |

### 9.4B Presentation-critical table fields

| Table | Fields to recognize | Presentation explanation |
| --- | --- | --- |
| `profiles` | `user_id`, `role`, `status`, `wallet_address`, `wallet_status` | Trusted role/account state and public managed-wallet address. |
| `custodial_wallets` | encrypted key, IV, auth tag, version | Server-only encrypted signer material; never returned to browser. |
| `events` | organizer, venue, date, status, cancellation fields | Event approval/lifecycle authority. |
| `ticket_types` | price/sen, total/remaining supply, purchase limit, transfer allowed, zone | Authoritative ticket business rules. |
| `tickets` | owner IDs/wallet, event/type, status, token ID, contract/chain, QR, payment references | Operational ticket record tied to NFT. |
| `ticket_operations` | kind, state, idempotency key, Stripe IDs, token/hash, retry/error | Durable cross-system state machine. |
| `resale_listings` | seller/buyer, ticket, price, status, reservation, contract reference | Off-chain catalogue and checkout locking state. |
| `transactions` | buyer/seller, ticket, type, amount/currency, operation, Stripe/chain references | Customer and reporting history. |
| `stripe_webhook_events` | event ID/type, status, attempts, error, timestamps | Webhook deduplication and observability. |
| `verification_logs` | ticket, organizer, result, timestamp | Audit trail for entry attempts. |

### 9.5 Main relationships

```text
profiles -> events through organizer_id
profiles -> tickets through user_id
events -> ticket_types through event_id
events -> tickets through event_id
venues -> venue_zones through venue_id
tickets -> resale_listings through ticket_id
tickets -> transactions through ticket_id
tickets -> verification_logs through ticket_id
```

Foreign keys prevent a ticket, event, or listing from referencing a nonexistent parent.

### 9.6 Constraints and concurrency

Database uniqueness protects:

- One blockchain identity for a token.
- One active listing for a ticket.
- One relevant transaction type per operation.
- One active workflow where required.

Why not check only with a TypeScript `if`? Two concurrent requests can both read “no record” before either insert commits. A database unique constraint still prevents the duplicate commit.

Indexes speed frequent lookup, joins, ordering, and uniqueness. Indexing every column would waste storage and slow writes because every index must also be maintained.

### 9.7 RLS and defense in depth

RLS policies restrict rows, for example:

- Users read their own profile.
- Customers read their own tickets.
- Organizers read their own events.
- Applicants read their own application.
- Public users read venues and zones.

RLS does not replace API authorization. It protects browser Supabase access, while trusted admin-client workflows bypass it and must authorize explicitly.

### 9.8 Why RPC transactions?

Finalizing a purchase may create/update a ticket, inventory, operation, transaction, and accounting record. Separate TypeScript calls can fail halfway. A PostgreSQL function runs them in one transaction: all commit or all roll back.

### 9.9 Workflow state machine

```text
pending
  -> checkout_created
  -> payment_confirmed
  -> asset_submitted
  -> completed
```

Recovery states include `delivery_failed`, `refund_pending`, and `refunded`.

A single `completed: true/false` cannot distinguish “payment confirmed but mint pending” from “Checkout never created.” Explicit states allow safe reconciliation.

### 9.10 Query-choice lesson

- `.eq("event_id", eventId)` matches one value.
- `.in("state", ["pending", "payment_confirmed"])` matches a set in one query.
- `.single()` expects exactly one row.
- `.maybeSingle()` permits zero or one row.

Using a loop to send one database request for every allowed state creates unnecessary network calls. `.in` lets PostgreSQL evaluate the set in one query.

### 9.11 Database versus blockchain ownership

Sensitive actions compare:

```text
tickets.wallet_address
        with
CornShirtTicket.ownerOf(tokenId)
```

Supabase provides operational application state. The contract provides authoritative NFT ownership. If they disagree, CornShirt blocks the operation for reconciliation.

Using only blockchain would omit roles, descriptions, inventory, QR status, and Stripe workflow state. Using only Supabase would make NFT ownership database-only.

### 9.12 Database “what if” lesson

| Change | Likely result |
| --- | --- |
| Remove foreign keys | Orphan tickets/listings can reference missing records. |
| Remove unique active-listing constraint | One ticket can be listed multiple times concurrently. |
| Replace RPC finalization with separate writes | Partial database completion becomes possible. |
| Remove RLS | Browser clients may read/change rows outside their ownership. |
| Store only a `completed` Boolean | Recovery cannot identify the failed stage. |
| Query each allowed state in a loop | More network round trips and more complicated logic. |
| Trust Supabase owner without `ownerOf` | On-chain disagreement may go undetected. |

### 9.13 Database checkpoint

- Define table, row, column, keys, constraint, index, transaction, RPC, RLS, migration, and seed.
- Explain the main table groups and relationships.
- Explain why database constraints matter under concurrency.
- Explain why multi-row finalization uses RPC transactions.
- Explain workflow states.
- Compare database and blockchain ownership.

# Cross-Layer Practice and Presentation Preparation

## 10. Frontend UI Revision Order

Study UI code from shared foundations to feature-specific components:

1. `src/app/globals.css`
2. `src/app/layout.tsx`
3. `src/components/navConfig.ts`
4. `VisitorNav`, `RoleNav`, `SiteNav`, and `Footer`
5. Shared `Button`, `Card`, `Modal`, `SearchBar`, `Dropdown`, and `Pagination`
6. Visitor and customer event discovery
7. Event details, ticket selection, and seat map
8. Customer ticket list, QR, transfer, resale, refund, and transaction history
9. Organizer dashboard, event form, event management, and scanner
10. Admin dashboard, charts, tables, approval actions, and user management

For every interactive component, record:

- Props received
- State stored with `useState`
- Derived data calculated with `useMemo`
- Side effects performed with `useEffect`
- Event handlers
- API endpoint called
- Loading state
- Empty state
- Error state
- Success state
- Accessibility behavior
- Relevant responsive CSS


## 11. Project Code Q&A: Easy to Hard

Practice by hiding each answer, answering aloud, and then opening the named file to prove the answer from code.

### Level 1: Code orientation

#### 1. Why are `src/lib/currency.ts` and `src/app/events/[eventId]/EventTicketing.tsx` different extensions?

`currency.ts` contains TypeScript logic without JSX. `EventTicketing.tsx` renders React JSX and manages interactive UI.

#### 2. What URL does `src/app/events/[eventId]/page.tsx` match?

It matches one dynamic segment such as `/events/<event UUID>`. The value is available as `params.eventId`.

#### 3. Why is `params` typed as a Promise in CornShirt route pages?

The project uses Next.js 16, where dynamic request APIs such as `params` are asynchronous and must be awaited.

#### 4. What is the difference between `page.tsx`, `layout.tsx`, and `route.ts` in CornShirt?

`page.tsx` renders a URL, `layout.tsx` wraps/protects a route subtree, and `route.ts` exports backend HTTP handlers.

#### 5. Why does `src/app/page.tsx` call `redirect("/visitor")`?

The current root route forwards users to the implemented public event-discovery page.

#### 6. What does `EventDiscovery` do?

It fetches `/api/public/events`, manages loading/error/retry state, schedules an expiry refresh, and renders `HeroCarousel` plus `EventBrowser`.

#### 7. What does `mapEventRow` do?

It converts joined Supabase event/ticket/venue rows into the frontend `Event` model, including prices, selling-fast status, stage, and selectable zones.

#### 8. Why does `filterEvents` use `filter` rather than one `if/else`?

It must test every event and retain all matches. One `if/else` handles one decision, while `filter` processes the collection.

#### 9. Why does `EventTicketing.handleSelectZone` use `find`?

Only one zone should match the selected ID, so `find` expresses that expectation and stops at the first match.

#### 10. Why does `ShapeEl` use `if` rather than a loop?

It renders one shape and chooses between ellipse and rectangle. This is a decision, not repeated collection work.

#### 11. What is the difference between props and state in `EventTicketing`?

`event`, `isCustomer`, and `loginHref` are props. `selectedTicketTypeId` is component state changed by user interaction.

#### 12. Why is `selectedZoneId` derived instead of stored as separate state?

It is calculated from the selected ticket type, preventing two pieces of state from disagreeing.

#### 13. Why does `PurchaseButton.tsx` contain `"use client"`?

It uses state, refs, a click handler, `crypto.randomUUID`, fetch, and browser navigation.

#### 14. Why is hiding the Buy button not enough to secure purchases?

A user can call the API directly. `/api/customer/tickets/checkout` performs trusted role and business validation.

#### 15. What does `SiteNav.isActive` do, and is it authorization?

It highlights the current navigation link. It is display logic, not a permission check.

### Level 2: Frontend and routing functions

#### 16. What happens inside `handleLogin` after Supabase authentication succeeds?

It loads the trusted profile role/status, rejects deactivated/missing profiles, and redirects admin, organizer, or customer to the correct route.

#### 17. Why does `handleLogin` not accept a role selected by the user?

The browser could claim `admin`. The role is loaded from `profiles`.

#### 18. Why is the login `returnTo` value sanitized?

It prevents an arbitrary or unsafe redirect while preserving the requested CornShirt event path.

#### 19. Why is wallet retry separated into `provisionWallet()` on registration?

If Auth/profile creation succeeds but wallet creation fails, the user can retry only the idempotent wallet step instead of creating another account.

#### 20. What does `EventDiscovery`'s `AbortController` prevent?

It prevents a completed old fetch from updating state after the component unmounts or starts another request.

#### 21. Why does event discovery schedule a timeout at the next ending event?

It refreshes the catalogue when the three-hour event window expires instead of showing stale live UI indefinitely.

#### 22. What does `resetCatalogCount()` prevent?

It prevents a previous Load More state from carrying into a new search or category filter.

#### 23. Why does `PurchaseButton` keep the idempotency key in `useRef`?

The key survives re-renders without triggering them, so retries identify the same checkout request.

#### 24. What would happen if a new idempotency key were generated for every retry?

The backend could treat retries as new purchase operations and create additional Checkout Sessions.

#### 25. What does `PurchaseStatus.check()` actually prove?

It reports the backend operation state. It does not itself prove payment; the Stripe webhook updates that state.

#### 26. Why does `TicketList.canDisplayQr` not count as ticket security?

It only hides QR in the UI. Organizer verification checks server/database/blockchain state independently.

#### 27. Why does `EventForm.handleVenueChange` reset incompatible pricing?

Prices are linked to venue zones. Keeping old zone prices after changing venue could assign them to the wrong layout.

#### 28. Why does `EventForm.handleSubmit` use POST for create and PUT for edit?

Creation makes a new resource; edit updates a known event ID and has different backend rules.

#### 29. Why are `TicketScanner.verify` and `markUsed` separate?

Verification reports validity first. The organizer then explicitly confirms admission, and the use endpoint atomically marks the ticket used.

#### 30. Why does `TicketScanner` pause after detecting a QR?

Camera frames repeat the same QR. Pausing avoids flooding the verification API.

### Level 3: Backend, Stripe, and wallet functions

#### 31. What is the difference between `requireRole` and `authorizeApiRole`?

`requireRole` redirects protected pages. `authorizeApiRole` returns API-friendly 401/403 responses.

#### 32. What does `getVerifiedRole` check?

It verifies the Supabase Auth user, loads `profiles.role/status`, validates known roles, and rejects deactivated or missing profiles.

#### 33. Why are both role layouts and API checks present?

Layouts protect page navigation. API checks protect the actual data/action from direct requests.

#### 34. Why does `getActiveEvents` call `synchronizeFinishedEvents` first?

It updates events that passed the three-hour deadline before returning the public catalogue.

#### 35. What does `isEventLive` require?

The event status must be `active`, its date must be valid, and the three-hour end time must still be in the future.

#### 36. Why does `buildTicketTypeRows` load authoritative venue zones?

The organizer's browser must not invent zone capacity or map prices to nonexistent zones.

#### 37. Why does `parseTicketCheckoutBody` return null instead of trusting a TypeScript cast?

Network JSON is runtime data. Type annotations do not validate its real shape or idempotency-key format.

#### 38. Why does `createTicketCheckoutSession` reserve before calling Stripe?

The RPC atomically enforces wallet readiness, live event, supply, purchase limit, and price before external payment begins.

#### 39. Why does checkout reuse an existing open Stripe Session?

The same idempotent operation should resume rather than create duplicate payment pages.

#### 40. Why is MYR converted to integer sen?

Stripe expects minor units, and integers avoid floating-point currency errors.

#### 41. Why does `validatePaidSession` compare Session ID, user, metadata, amount, currency, and paid status?

A valid Stripe object is not enough; it must be the exact expected payment for the stored CornShirt operation.

#### 42. Why does the webhook read the raw request body?

Stripe signs the exact bytes. Parsing/recreating JSON first can invalidate signature verification.

#### 43. What does `claimStripeEvent` prevent?

It atomically prevents duplicate webhook deliveries from repeating mint, transfer, or refund effects.

#### 44. What does `handleStripeWebhookEvent` dispatch?

It ignores unsupported types and routes successful refund events, resale Checkout, or primary Checkout to the correct finalizer.

#### 45. Why does `finalizeTicketCheckout` store the NFT hash through `onSubmitted` before waiting?

A later retry can recover the submitted transaction if the server stops before receipt/finalization.

#### 46. What does `recoverMintResult` prevent?

It decodes the original confirmed mint instead of creating a second NFT during retry.

#### 47. Why does `mintTicket` decode the ERC-721 `Transfer` event?

The zero-address Transfer event proves a mint and supplies the actual token ID from the confirmed receipt.

#### 48. What does `readWalletEncryptionKey` validate?

That the environment value is valid base64 representing exactly 32 bytes for AES-256.

#### 49. Why does `encryptPrivateKey` store IV and authentication tag?

The IV makes each encryption unique; the tag detects tampering or a wrong key during decryption.

#### 50. What does `loadManagedWalletSigner` compare before decrypting?

It checks profile wallet status and confirms the profile address matches the custodial-wallet address.

### Level 4: Ownership, resale, refund, contracts, and database

#### 51. Why does direct transfer call `getTicketOwner` before signing?

It confirms the database owner/wallet agrees with authoritative on-chain ownership.

#### 52. Why does `fundCustomerGas` check a threshold first?

It funds only wallets lacking sufficient Sepolia ETH instead of wasting platform test ETH every transfer.

#### 53. Why does direct transfer call `safeTransferFrom` instead of minting?

The ticket already exists. Transfer preserves its token ID and ownership history.

#### 54. How does `createResaleListing` enforce the 15% rule?

It derives original price in sen, calculates the maximum allowed sen value, converts the submitted price, and rejects values above the cap.

#### 55. Why does `createContractListing` submit approval before listing creation?

The Marketplace contract requires permission to transfer the seller's token during later settlement.

#### 56. Why does `createResaleCheckoutSession` reserve the listing?

It prevents two buyers from paying for the same active NFT listing.

#### 57. What does `decideResaleAssetAction` decide?

Based on current owner and stored hash, it chooses whether to settle, recover a receipt, finalize database state, or report ownership mismatch.

#### 58. Why should database-finalization failure after NFT movement not automatically refund?

The buyer may already own the NFT. Refunding would give both the asset and money unless ownership is reconciled first.

#### 59. Why can refund owner and beneficiary differ?

A free transfer changes NFT ownership without creating a new Stripe payment. The latest payer remains the beneficiary.

#### 60. What race does `reconcileRefundCompletion` handle?

The refund claim request and Stripe refund webhook can both try to finish the burn; it recognizes another worker's successful result.

#### 61. Why is `MINTER_ROLE` required on `CornShirtTicket.mintTicket`?

It prevents arbitrary wallets from minting fake tickets.

#### 62. Why is `BURNER_ROLE` separate from `MINTER_ROLE`?

Least privilege separates creation from refund destruction.

#### 63. Why does `CornShirtMarketplace` use `mapping(bytes32 => Listing)` instead of an array?

Settlement knows the hashed reference and needs direct lookup; an array would require an increasingly expensive loop.

#### 64. Why does `cancelListing` keep the struct instead of deleting it?

The stored seller marks the reference as already used and preserves history.

#### 65. Why can anyone call `reclaimExpiredListing`?

It only performs safe expiry cleanup; requiring the seller could leave stale listings active.

#### 66. Why does `settlePaidListing` update mappings before `safeTransferFrom`?

It follows checks-effects-interactions and, together with `nonReentrant`, reduces reentrancy risk.

#### 67. What does `processedPayments` prevent?

Reusing one hashed Stripe payment reference for another on-chain settlement.

#### 68. Why does `finalize_primary_purchase` belong in a database RPC?

Ticket, operation, transaction, inventory, QR, and accounting changes must commit together.

#### 69. Why is a unique active-listing database constraint stronger than a TypeScript `if`?

Concurrent requests may both pass an application read, but PostgreSQL still prevents both inserts from committing.

#### 70. Why does `ticket_operations` use multiple states instead of one completed Boolean?

It records checkout, payment, asset submission, delivery failure, refund, and completion for safe recovery.

#### 71. Why are Supabase ownership and `ownerOf` both needed?

Supabase supplies operational queries/status; `ownerOf` supplies authoritative NFT ownership. Sensitive workflows compare them.

#### 72. What happens three hours after an event starts?

`complete_finished_events` completes the event, expires eligible unused tickets/listings, and blocks purchase, transfer, resale, verification, and check-in while NFTs remain collectible.

#### 73. Why are email deliveries claimed with their own idempotency record?

Email retries should not send duplicates and email failure must not undo payment or NFT state.

#### 74. If Stripe succeeds but blockchain delivery repeatedly fails, what does CornShirt do?

It keeps durable recovery state, retries safely, and can issue exactly one Stripe test refund according to the workflow.

#### 75. What is the main design principle connecting CornShirt's code?

The browser is never proof of a protected operation. The server verifies identity and authoritative Stripe/blockchain results, persists progress, and finalizes database state only after required confirmations.

## 12. Documentation Differences to Clarify Before Presenting

The team should describe the current code accurately and distinguish it from older documentation:

- Some older documentation describes local Hardhat as the application network, while the current `src/utils/web3config.ts` and README configure Ethereum Sepolia.
- Older agent documentation says the Web3 layer is not wired, but the repository now contains contracts, ABI data, deployment scripts, and NFT helpers.
- Some documentation describes `/` as the public event browser, while the current `src/app/page.tsx` redirects to `/visitor`.
- Some specifications describe the customer remaining logged in after registration, while the current registration page redirects to login after wallet provisioning.

During the presentation, label statements as one of:

- Current implementation
- Intended specification
- Known limitation
- Future improvement

Do not claim that Stripe Test Mode payments, organizer revenue, or seller proceeds are real-money production transactions.

## 13. Final Team Readiness Checklist

Every team member should be able to:

- [ ] Explain the complete architecture in one minute.
- [ ] Name the responsibility of every user role.
- [ ] Explain `page.tsx`, `layout.tsx`, `route.ts`, and `[eventId]`.
- [ ] Explain `.ts`, `.tsx`, server components, and client components.
- [ ] Trace login and role authorization.
- [ ] Trace event discovery from Supabase to the UI.
- [ ] Explain managed-wallet creation and encryption.
- [ ] Trace a primary purchase from button click to NFT and database finalization.
- [ ] Explain why Stripe webhooks and idempotency are required.
- [ ] Explain every `CornShirtTicket` function.
- [ ] Explain every `CornShirtMarketplace` function.
- [ ] Compare primary purchase, direct transfer, and resale.
- [ ] Explain cancellation, refund beneficiary, and NFT burning.
- [ ] Explain QR verification and atomic ticket check-in.
- [ ] Identify the main database tables and RPC functions.
- [ ] Explain important security boundaries and prototype limitations.
- [ ] Navigate to the relevant code when asked an unexpected question.
- [ ] Complete at least two full presentation rehearsals.

## 14. Reusable Prompt for Teammates

Copy and paste the prompt below when another teammate wants the same type of project-specific study guide.

```text
I need you to inspect and read this entire software project before writing the result. Treat the repository code and current implementation as the main source of truth, while also reading the README and relevant documentation. Do not modify, format, refactor, or delete any source code. Only create or update one Markdown study-guide file inside the project's docs folder. Do not create duplicate guides.

Create a detailed technical lesson and presentation-preparation guide divided clearly into:

1. Frontend
2. Backend
3. Smart Contract
4. Database

The guide must be based on the actual project files, function names, routes, API handlers, smart contracts, database tables, and database functions. Do not write only generic textbook explanations.

Frontend requirements:

- Explain the framework's routing system in detail.
- Explain special files such as page, layout, route, and not-found files.
- Focus on folders with dynamic bracket names such as [eventId], [ticketId], [listingId], [operationId], or the equivalents found in this project.
- Explain how dynamic params are received, including async params if the installed framework version requires them.
- Explain the difference between .ts and .tsx using actual files from the project.
- Explain server components, client components, "use client", JSX, props, state, derived state, event handlers, and hooks.
- Explain major UI components and their actual functions/handlers.
- Cover loading, empty, success, error, accessibility, and responsive UI behavior.

Backend requirements:

- Explain authentication versus authorization using the project's actual functions.
- Explain page guards versus API guards.
- Explain every important API route: method, dynamic parameters, input, validation, called helpers, side effects, response, and failure states.
- Explain the different database clients and why privileged clients must stay server-only.
- Explain the project's payment, webhook, managed-wallet, encryption, email, lifecycle, transfer, resale, refund, and recovery functions.
- Explain idempotency and why external transaction hashes/IDs are stored.

Smart-contract requirements:

- Explain every state variable, role, struct, mapping, event, modifier, constructor, public/external function, inherited function used by the project, and the TypeScript helper that calls it.
- For every contract function, state its caller, inputs, checks, state changes, events, return value, failure behavior, and why the design was chosen.
- Explain minting, ownerOf, approvals, safeTransferFrom, marketplace creation/cancellation/expiry/settlement, burning, reentrancy, and checks-effects-interactions as applicable to the project.

Database requirements:

- Explain the important tables and presentation-relevant fields.
- Explain primary keys, foreign keys, constraints, indexes, relationships, RLS policies, migrations, seed data, transactions, and workflow states using project examples.
- Explain every important RPC/stored function with its parameters, caller, validations, atomic changes, return value, and reason it belongs in the database.
- Explain how database ownership is compared with blockchain ownership if applicable.

For every presentation-critical frontend, backend, contract, and database function, include:

- Exact filename and function name
- Who or what calls it
- Inputs and types
- Important conditions and validation
- Functions/services it calls
- Return value
- Database, payment, blockchain, email, navigation, or UI side effects
- Failure and retry behavior
- Why that function or construct is used
- What would happen if an important check or step were removed or replaced

Include lessons comparing programming choices using actual project examples:

- if/else versus switch
- if/else versus loops
- for loops versus map, filter, find, reduce, and slice
- Promise.all versus sequential await
- props versus state versus derived state
- UI checks versus backend security
- separate database writes versus an atomic transaction/RPC
- arrays versus mappings for smart-contract storage when relevant

Explain that these alternatives are not automatically interchangeable. State when each is appropriate and what behavior or risk changes if the wrong construct is used.

At the end, include a project-code Q&A section progressing from easy to very advanced. Questions must mostly mention actual project filenames, routes, functions, tables, RPCs, contract methods, state transitions, or workflows. Include some foundation questions about .ts versus .tsx, dynamic routing, React state, if/else, loops, and array methods, but avoid generic opening questions such as "What is the project?", "What is frontend?", "What is backend?", or "What is a database?" Provide the answer immediately below each question.

Also include a final readiness checklist.

Do not include:

- A Function-by-Function Revision Worksheet template
- A Team Revision Schedule
- A Recommended Presentation Structure or slide list
- A Recommended Live Demonstration section

Before finishing, verify that only the Markdown guide inside docs was changed and no project code was touched.
```
