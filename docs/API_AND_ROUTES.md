# API and Routes

## Public Routes
- `/` - Browse active events
- `/login` - Login page
- `/register` - Register page
- `/events/[eventId]` - Event details

## Customer Routes
- `/customer` - Customer dashboard
- `/customer/tickets` - My Tickets
- `/customer/top-up` - DICKEN balance and top-up
- `/customer/marketplace` - Browse, list, and cancel active resale listings
- `/customer/transactions` - Transaction history
- `/customer/events/[eventId]` - Customer event details and purchase controls

## Organizer Routes
- `/organizer` - Organizer dashboard
- `/organizer/create-event` - Create event
- `/organizer/events/[eventId]` - Manage event
- `/organizer/events/[eventId]/edit` - Edit draft event
- `/organizer/verify-ticket` - Verify ticket QR code

## Admin Routes
- `/admin` - Admin dashboard
- `/admin/pending-events` - Review event submissions
- `/admin/organizers` - View organizers
- `/admin/events` - Monitor all events

## Implemented API Routes

- `POST /api/customer/wallet/provision` - Idempotently creates the authenticated customer's CornShirt-managed wallet. Returns only the public address and provisioning status.
- `POST /api/customer/marketplace` - Creates an eligible resale listing for a ticket owned by the authenticated customer's managed wallet.
- `DELETE /api/customer/marketplace/[listingId]` - Cancels the authenticated seller's active listing.

Wallet provisioning is customer-only. Organizer and admin accounts do not receive managed wallets automatically. Encrypted private-key material remains server-only and is never returned by this API.

Resale purchase remains unavailable until DICKEN settlement and Ticket NFT ownership-transfer services are connected.

## Planned Web3 API Routes

These routes are planned and are not implemented yet. Phase 1 has no customer-facing Web3 HTTP endpoints because it establishes the local Hardhat network, contracts, deployment, roles, and server signing services.

### Phase 2: DICKEN Top-Up

- `GET /api/customer/dicken/balance` - Authenticated customer reads the real DICKEN ERC-20 balance of their managed wallet from local Hardhat.
- `POST /api/customer/top-ups/checkout` - Authenticated customer creates a Stripe Test Mode Checkout Session and pending top-up operation.
- `POST /api/webhooks/stripe` - Stripe-signed webhook verifies payment and triggers idempotent DICKEN minting; it does not trust a browser session or redirect.
- `GET /api/customer/top-ups/[topUpId]` - Authenticated owner reads public top-up status and the confirmed mint transaction hash.

### Phase 3: Primary Ticketing

- `POST /api/customer/tickets/purchase` - Authenticated customer starts an idempotent DICKEN payment, Ticket NFT mint, and ticket-record workflow.
- `POST /api/organizer/tickets/verify` - Authenticated organizer verifies a QR ticket for an event they manage and receives its operational result.
- `POST /api/organizer/tickets/[ticketId]/use` - Authenticated organizer atomically marks their event's currently valid ticket as used and records verification.

### Phase 4: Ownership and Recovery

- `POST /api/customer/tickets/[ticketId]/transfer` - Authenticated owner transfers an eligible existing Ticket NFT and synchronizes Supabase ownership after receipt confirmation.
- `POST /api/customer/marketplace/[listingId]/purchase` - Authenticated buyer executes the recoverable DICKEN payment and existing NFT transfer for an active listing.
- `POST /api/organizer/events/[eventId]/cancel` - The event's approved organizer cancels an eligible owned event and creates refund eligibility.
- `POST /api/admin/events/[eventId]/cancel` - An authenticated admin cancels an eligible event through the administrative workflow.
- `POST /api/customer/refunds/claim` - Authenticated ticket owner claims one eligible DICKEN refund and triggers the controlled Ticket NFT burn.
- `POST /api/admin/web3/reconcile` - Authenticated admin checks stored hashes and Supabase ownership against local Hardhat receipts and contract state.

All state-changing routes authenticate and authorize on the server. They return public statuses, token IDs, wallet addresses, and transaction hashes only after applying the receipt and workflow rules in `SMART_CONTRACTS.md`.

## Planned Blockchain Interfaces

Smart-contract methods are local Hardhat blockchain interfaces, not HTTP endpoints.

### `DickenToken` ERC-20

- `balanceOf(address)` - Reads the authoritative DICKEN balance.
- `transfer(address,uint256)` - Transfers DICKEN from the signing wallet.
- `mint(address,uint256)` - Mints DICKEN after a verified Stripe webhook; restricted to `MINTER_ROLE`.

### `CornShirtTicket` ERC-721

- `ownerOf(uint256)` - Reads the authoritative owner of a Ticket NFT.
- `safeTransferFrom(address,address,uint256)` - Transfers an existing eligible Ticket NFT.
- `mintTicket(address,string)` - Mints one Ticket NFT after confirmed primary payment; restricted to `MINTER_ROLE`.
- `burnRefundedTicket(uint256)` - Burns a refunded Ticket NFT; restricted to `BURNER_ROLE`.

Browser code must use authenticated Next.js APIs for state-changing operations. It must not receive private keys or submit privileged contract writes directly.

## Other Future API Routes

- `/api/events`
- `/api/events/[eventId]`
