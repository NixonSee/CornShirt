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


## 11. Q&A: Easy to Hard

Practice by hiding the answer, responding aloud, and then checking the explanation.

### Level 1: Easy

#### 1. What is a smart contract?

Blockchain-deployed code that enforces on-chain state changes.

#### 2. What is the difference between `.ts` and `.tsx`?

Both contain TypeScript; `.tsx` permits React JSX.

#### 3. What does `[eventId]` mean?

It is a dynamic URL segment whose value becomes `params.eventId`.

#### 4. What does `page.tsx` do?

It renders the page for its App Router folder.

#### 5. What does `route.ts` do?

It implements HTTP handlers such as `GET`, `POST`, `PUT`, or `DELETE`.

#### 6. Why use `if/else`?

To choose one execution path according to a condition.

#### 7. Why use a loop?

To repeat an operation for multiple values.

### Level 2: Intermediate

#### 8. What do `map`, `filter`, `find`, and `reduce` do?

`map` transforms all items, `filter` keeps matches, `find` returns the first match, and `reduce` combines items into one result.

#### 9. Why not use a loop for role routing?

Routing needs one decision, while a loop repeats behavior across a collection.

#### 10. What is a React component?

A reusable function that returns UI.

#### 11. What is the difference between props and state?

Props are parent-supplied read-only inputs; state is changing data managed by the component.

#### 12. Why does a component use `"use client"`?

It needs hooks, event handlers, camera access, `window`, or other browser features.

#### 13. Why not make every component client-side?

That sends more JavaScript to the browser and makes server-only boundaries less clear.

#### 14. Why use dynamic routes for events?

One page can display any database event without creating and deploying one file per event.

#### 15. What is authentication?

Determining who the user is.

#### 16. What is authorization?

Determining what the authenticated user is allowed to do.

#### 17. Why protect the API when the button is hidden?

Users can manually call APIs; hidden UI is not security.

#### 18. Why is `supabaseAdmin` server-only?

It uses the service-role key and bypasses RLS.

#### 19. Why validate on the backend when the form validates?

Browser validation can be bypassed.

### Level 3: Advanced

#### 20. Why use early returns in route handlers?

They reject invalid cases immediately and keep the successful path readable.

#### 21. When should `Promise.all` be used?

When asynchronous operations are independent. Dependent work must remain sequential.

#### 22. Why are prices stored in sen?

Integer minor units avoid floating-point currency rounding problems.

#### 23. Why is a Stripe success redirect not payment proof?

Browser navigation is not signed. CornShirt trusts the verified Stripe webhook.

#### 24. What is idempotency?

The ability to retry without repeating a completed side effect.

#### 25. Why use a managed wallet?

Customers receive NFT capability without handling MetaMask or private keys.

#### 26. Why use AES-256-GCM?

It encrypts the private key and supplies an authentication tag that detects modification or an incorrect key.

#### 27. Why store the blockchain hash before waiting for the receipt?

A retry can recover an already-submitted transaction instead of submitting a duplicate.

#### 28. Why does a primary purchase mint?

It creates a new ticket asset that did not exist.

#### 29. Why does a transfer or resale not mint?

The existing ticket changes owner; minting would duplicate the ticket.

#### 30. What does `ownerOf` provide?

The authoritative on-chain owner of an ERC-721 token.

#### 31. Why compare `ownerOf` with Supabase?

To detect disagreement between operational application ownership and blockchain ownership.

### Level 4: Very advanced

#### 32. Why use an RPC for reservation/finalization?

Related database checks and writes must happen atomically under concurrency.

#### 33. Why is a unique constraint stronger than a TypeScript `if`?

Two concurrent requests can both pass an application check, but the database still prevents duplicate commits.

#### 34. Why use an operation state machine instead of one Boolean?

It distinguishes payment, blockchain submission, recovery, refund, and completion stages.

#### 35. What happens if payment succeeds but minting fails?

The stored operation remains recoverable; CornShirt retries the existing work or issues one test refund after repeated delivery failure.

#### 36. Who receives a refund after a free transfer?

The current owner surrenders the NFT, but the latest Stripe payer receives the refund.

#### 37. Why separate minter, burner, and settler roles?

Least privilege limits damage if one account is compromised.

#### 38. Why use a mapping instead of an array for marketplace listings?

Known-reference lookup is direct. An array requires a growing gas-cost search loop.

#### 39. What does `nonReentrant` protect?

It prevents a protected function from being entered again before the first call finishes.

#### 40. What is checks-effects-interactions?

Validate first, update internal state second, and call external contracts last.

#### 41. Why use `safeTransferFrom`?

It prevents NFTs from being locked in contracts that cannot receive ERC-721 tokens.

#### 42. Why can Stripe payment and NFT delivery not be one atomic transaction?

Stripe and Ethereum are independent systems without one shared transaction manager.

#### 43. What is CornShirt's most important system-wide principle?

Do not trust the browser as proof. Verify identity and authoritative external results, store durable progress, and finalize only after required confirmations.

## 13. Documentation Differences to Clarify Before Presenting

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

## 14. Final Team Readiness Checklist

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
