# API and Routes

This document separates routes that exist now from planned Stripe and Ticket NFT work. Planned routes must not be presented as implemented.

## Public Routes

- `/` - Browse active events.
- `/login` - Log in.
- `/register` - Create an account.
- `/events/[eventId]` - View public event details and ticket types priced in MYR.

## Customer Routes

- `/customer` - Customer dashboard and managed-wallet status.
- `/customer/tickets` - View Ticket NFTs, QR codes, transfer eligibility, and resale controls.
- `/customer/marketplace` - Browse, list, and cancel active resale listings priced in MYR.
- `/customer/transactions` - View purchases, refunds, resale activity, and public NFT transaction references.
- `/customer/events/[eventId]` - Customer event details and purchase controls.

There is no customer funding or balance route. Stripe Test Mode is used directly when a primary or resale purchase is made.

## Organizer Routes

- `/organizer` - Organizer dashboard with simulated MYR revenue.
- `/organizer/create-event` - Create an event and set ticket prices in MYR.
- `/organizer/events/[eventId]` - Manage an owned event.
- `/organizer/events/[eventId]/edit` - Edit an eligible event.
- `/organizer/verify-ticket` - Verify and use a ticket QR code.

## Admin Routes

- `/admin` - Admin dashboard.
- `/admin/pending-events` - Review event submissions.
- `/admin/organizers` - View organizers.
- `/admin/events` - Monitor events and MYR analytics.

## Implemented API Routes

- `POST /api/customer/wallet/provision` - Idempotently creates the authenticated customer's CornShirt-managed wallet and returns only its public address and status.
- `POST /api/customer/marketplace` - Creates an eligible MYR resale listing for a ticket owned by the authenticated customer.
- `DELETE /api/customer/marketplace/[listingId]` - Cancels the authenticated seller's active listing.

Wallet provisioning is customer-only. Organizer and admin accounts do not receive managed wallets. Encrypted private keys remain server-only.

Primary and resale checkout actions remain unavailable until the planned Stripe workflows below are implemented.

## Planned Payment and Ticket APIs

### Phase 1: Ticket NFT Foundation

Phase 1 adds the local Hardhat network, `CornShirtTicket`, deployment records, contract roles, and server-side signing. It does not require a customer-facing blockchain endpoint.

### Phase 2: Primary Ticketing

- `POST /api/customer/tickets/checkout` - Validates inventory and purchase limits, reserves one ticket, and creates an idempotent Stripe Test Checkout Session in MYR.
- `POST /api/webhooks/stripe` - Verifies the raw Stripe signature, deduplicates events, and resumes the referenced payment workflow. A browser redirect is never accepted as proof of payment.
- `GET /api/customer/purchases/[operationId]` - Returns the authenticated customer's safe payment, NFT delivery, and completion status.
- `POST /api/organizer/tickets/verify` - Allows an authorized organizer to verify a QR ticket for an event they manage.
- `POST /api/organizer/tickets/[ticketId]/use` - Atomically marks a currently valid verified ticket as used.

### Phase 3: Transfer and Resale

- `POST /api/customer/tickets/[ticketId]/transfer` - Transfers one eligible existing Ticket NFT to another customer wallet after authorization and receipt confirmation. No payment is created.
- `POST /api/customer/marketplace/[listingId]/checkout` - Locks an active listing and creates an idempotent Stripe Test Checkout Session in MYR.
- `GET /api/customer/resales/[operationId]` - Returns safe resale payment, NFT delivery, recovery, and completion status.

Stripe Connect is not used. Seller proceeds are simulated MYR accounting records in Supabase and are not real payouts.

### Phase 4: Cancellation, Refund, and Reconciliation

- `POST /api/organizer/events/[eventId]/cancel` - Allows only the event's approved organizer to cancel an eligible event.
- `POST /api/admin/events/[eventId]/cancel` - Allows an admin to cancel an eligible event.
- `POST /api/customer/refunds/claim` - Lets the current owner surrender one eligible NFT, refunds the latest Stripe payer in Test Mode, and triggers the controlled NFT burn.
- `GET /api/customer/refunds/[operationId]` - Returns safe refund and burn status.
- `POST /api/admin/web3/reconcile` - Compares Supabase workflow records with Stripe results and local Hardhat receipts.

After a free direct transfer, the current owner may differ from the refund beneficiary. The refund returns to the latest customer who paid through Stripe, and the claim UI must disclose that before NFT surrender.

## Stripe Webhook Rules

- Read and verify the raw request body with the Stripe webhook secret.
- Store and claim each Stripe event ID exactly once.
- Load amount, currency, customer, and operation details from authoritative server records.
- Use integer sen for Stripe amounts; `RM 49.90` is `4990` sen.
- Mint or transfer an NFT only after the expected payment is verified.
- Never complete the Supabase operation before the required local Hardhat receipt succeeds.
- If payment succeeds but NFT delivery fails, retain a recoverable state and retry or issue one Stripe test refund.

## `CornShirtTicket` Contract Interface

Smart-contract methods run on local Hardhat and are not HTTP routes.

- `ownerOf(uint256)` - Reads authoritative Ticket NFT ownership.
- `safeTransferFrom(address,address,uint256)` - Transfers an existing Ticket NFT.
- `mintTicket(address,string)` - Mints one NFT after a verified primary payment; restricted to `MINTER_ROLE`.
- `burnRefundedTicket(uint256)` - Burns one refund-eligible NFT; restricted to `BURNER_ROLE`.

Browser code must use authenticated Next.js APIs for state-changing operations. It must never receive managed-wallet private keys, platform signing keys, the Supabase service-role key, or Stripe secrets.

## Other Future API Routes

- `/api/events`
- `/api/events/[eventId]`
