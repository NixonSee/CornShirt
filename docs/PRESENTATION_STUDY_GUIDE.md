# CornShirt Presentation and Code Revision Guide

## Purpose

This guide prepares every team member to explain the CornShirt system during a presentation or question-and-answer session. Every member should understand the whole application, even when different members lead different presentation sections.

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

## 8. Smart Contracts

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

## 9. Database and Supabase Study

Study `supabase/migrations/202608070001_initial_schema.sql` by category instead of reading it as one uninterrupted file.

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

## 10. UI Revision Order

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

## 11. Function-by-Function Revision Worksheet

Use this worksheet for every important function:

```text
Function name:
File:
Runs in: browser / Next.js server / database / blockchain
Called by:
Calls:
Inputs and types:
Return value:
Database reads:
Database writes:
External side effects:
Authentication required:
Authorization rules:
Validation performed:
Failure modes:
Idempotency or retry behavior:
Related test:
How to demonstrate it:
One-sentence explanation:
```

Do not describe a function only as "this buys a ticket." Explain its inputs, validation, side effects, failure recovery, and why it appears at that stage of the workflow.

## 12. Team Revision Schedule

### Session 1: System foundation

Topics:

- Project goal
- Roles
- Technology stack
- High-level architecture
- `.ts` versus `.tsx`
- Next.js routing and bracket folders

Required output:

- Each member draws the architecture from memory.
- Each member explains one dynamic page and one dynamic API route.

### Session 2: Authentication and data

Topics:

- Supabase session cookies
- Browser and server Supabase clients
- Page and API role guards
- Database tables
- RLS policies
- Managed-wallet provisioning and encryption

Required output:

- Each member explains login-to-dashboard routing.
- Each member explains why secrets stay server-only.

### Session 3: Event and customer interface

Topics:

- Event discovery
- Event data mapping
- Search and filtering
- Dynamic event detail pages
- Seat-map interaction
- Customer ticket display and transaction history

Required output:

- Trace an event from a Supabase row to a rendered event card.
- Explain one stateful client component.

### Session 4: Primary purchase and NFT

Topics:

- Inventory reservation
- MYR-to-sen conversion
- Stripe Checkout
- Webhook verification
- Idempotency
- NFT minting and receipt confirmation
- Database finalization

Required output:

- Draw the complete primary-purchase sequence without notes.
- Explain why the success redirect cannot mint the ticket.

### Session 5: Ownership workflows

Topics:

- Direct transfer
- Marketplace approval and listing
- Resale checkout and settlement
- Event cancellation
- Refund beneficiary
- NFT burning
- Failure recovery

Required output:

- Compare primary purchase, free transfer, and paid resale.
- Explain why resale uses the same token ID.

### Session 6: Organizer, admin, and verification

Topics:

- Event creation and editing
- Admin application/event approval
- Organizer metrics
- Admin metrics
- QR verification
- Ticket check-in
- Event lifecycle

Required output:

- Perform the organizer and admin demo flow.
- Explain all ticket rejection states.

### Session 7: Testing and rehearsal

Topics:

- Unit tests
- Contract tests
- System testing guide
- Negative authorization tests
- Cross-system reconciliation
- Presentation rehearsal

Required output:

- Run or review the relevant test commands.
- Conduct two full rehearsals with unexpected questions.

## 13. Team Rotation Method

Everyone studies every section. Rotate these responsibilities during each revision session:

| Responsibility | Task |
| --- | --- |
| Lead explainer | Explains the workflow without reading directly from the code. |
| Code navigator | Opens the caller, implementation, dependencies, and tests. |
| Challenger | Asks security, failure, and "why" questions. |
| Recorder | Updates the shared function worksheets and unresolved-question list. |

The lead explainer is not the only person responsible for that topic. After the explanation, another member must repeat the flow from memory.

## 14. Recommended Presentation Structure

### Slide 1: Project goal

- Concert ticketing and resale prototype
- MYR Stripe Test Mode payments
- NFT-backed ownership
- Four user roles

### Slide 2: System architecture

- Next.js
- Supabase
- Stripe
- Ethereum contracts
- Email

### Slide 3: Roles and authorization

- Visitor
- Customer
- Organizer
- Admin
- Server-side role guards

### Slide 4: Next.js routing

- App Router folder structure
- `page.tsx`, `layout.tsx`, and `route.ts`
- `[eventId]` and other dynamic parameters
- Server and client components

### Slide 5: Event creation and approval

- Organizer selects venue and ticket zones
- Event starts as pending
- Admin approval changes it to active
- Only live active events are publicly visible

### Slide 6: Primary purchase

- Server validation
- Inventory reservation
- Stripe Checkout
- Signed webhook
- NFT mint
- Database finalization

### Slide 7: Managed wallets and smart contracts

- Automatic customer wallet
- Encrypted private key
- ERC-721 ownership
- Minter, burner, and settler roles

### Slide 8: Transfer and resale

- Free direct transfer
- Marketplace approval
- Stripe resale payment
- Existing token settlement
- Simulated seller proceeds

### Slide 9: Cancellation and refund

- Ticket becomes refund eligible
- Latest payer receives refund
- Current owner surrenders ticket
- NFT is burned

### Slide 10: Organizer verification

- Camera or manual QR input
- Event authorization
- Status check
- On-chain ownership check
- Atomic check-in

### Slide 11: UI and responsive design

- Shared components
- Client-side interaction
- Loading, empty, error, and success states
- Desktop and mobile layouts

### Slide 12: Security, testing, and limitations

- Server-only secrets
- Webhook signature verification
- Idempotency
- Contract roles
- Test coverage
- Prototype limitations and future reconciliation work

## 15. Recommended Live Demonstration

Use one connected story instead of unrelated screens:

1. Open the visitor page and browse active events.
2. Search or filter the event list.
3. Open `/events/[eventId]` and explain the dynamic route.
4. Log in as a customer.
5. Open the customer version of the event and select a ticket zone.
6. Start or explain Stripe Test Checkout.
7. Show the ticket, token ID, transaction hash, and QR code.
8. Demonstrate or explain direct transfer or resale.
9. Log in as the organizer and verify a ticket.
10. Log in as the admin and show event/user monitoring.

Prepare backup screenshots and known IDs in case Stripe, email, camera access, Supabase, or the blockchain network is temporarily unavailable during the presentation.

## 16. Likely Presentation Questions

### Why is a Stripe success redirect not payment proof?

The browser can be closed, manipulated, or redirected without a confirmed payment. CornShirt trusts the signed Stripe webhook and validates the stored operation, payer, amount, currency, and session.

### Why are prices stored in sen?

Integer sen avoids floating-point rounding errors. For example, `RM49.90` becomes `4990`.

### Why use a managed wallet?

Customers can receive and transfer NFTs without installing MetaMask or managing private keys. The server encrypts the private key and signs only authorized operations.

### What is the difference between Supabase ownership and `ownerOf`?

Supabase stores operational ownership for application queries, but the Ticket contract's `ownerOf(tokenId)` is authoritative for blockchain ownership. Sensitive operations compare both.

### Why does resale not mint a new NFT?

The existing ticket asset is transferred to the buyer. Minting a replacement would create duplicate tickets and break the original token's ownership history.

### What is idempotency?

Idempotency allows a request or webhook to be retried without repeating a successful side effect such as creating another Checkout Session, minting another NFT, transferring twice, or refunding twice.

### What does `[eventId]` mean?

It is a dynamic App Router folder. The corresponding URL segment becomes `params.eventId`.

### What is the difference between `.ts` and `.tsx`?

Both contain TypeScript, but `.tsx` permits JSX markup used by React components. `.ts` is used when no JSX is present.

### Why are server and client components separated?

Server components can safely access trusted server data and reduce browser JavaScript. Client components are required for hooks, browser APIs, and interactive event handlers.

### Who receives a refund after a free transfer?

The current owner surrenders the NFT, but Stripe refunds the latest successful payer because a free transfer created no new payment.

### What happens three hours after an event starts?

The event becomes completed, unused tickets and listings expire, and purchases, transfers, resale, verification, and check-in are blocked. Existing NFTs remain as collectibles.

## 17. Documentation Differences to Clarify Before Presenting

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

## 18. Final Team Readiness Checklist

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

