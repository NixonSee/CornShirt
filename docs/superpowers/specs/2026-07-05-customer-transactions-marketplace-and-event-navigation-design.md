# Customer Transactions, Marketplace, and Event Navigation Design

## Purpose

Implement three related customer-facing improvements without blurring the public visitor and authenticated customer experiences:

1. Add a working customer Transaction History page.
2. Add the first server-backed Marketplace phase: browse, list, and cancel resale listings while leaving purchase disabled until DICKEN settlement and NFT transfer services exist.
3. Give visitor and customer event details separate routes and navigation wrappers.

The design follows `docs/ROLE_FEATURES_AND_FLOW.md`, including customer transaction history, ticket resale eligibility, DICKEN resale pricing, active listings, listing cancellation, transfer restrictions, and resale transaction history.

## Scope

### Included

- Customer transaction history sourced from Supabase.
- Transaction search, type filtering, pagination, loading, empty, and error states.
- A `resale_listings` database migration with integrity constraints.
- Customer Marketplace navigation and page.
- Active-listing browsing and a customer-owned-listings view.
- Listing an eligible owned ticket for resale at a positive whole-number DICKEN price.
- Cancelling an active listing owned by the current customer.
- Server-side authorization and business-rule validation for listing mutations.
- Separate visitor and customer event-detail routes built on shared presentation code.
- Automated verification for mapping, validation, route separation, and navigation.

### Excluded

- Charging a resale buyer in DICKEN.
- Paying a resale seller.
- Transferring Ticket NFT ownership.
- Marking a resale listing as purchased.
- Platform fees.

The Marketplace must label resale purchase actions as unavailable. It must not simulate a successful payment or ownership transfer.

## Routes and Navigation

### Customer routes

- `/customer/transactions` displays Transaction History.
- `/customer/marketplace` displays active resale listings and the current customer's listings.
- `/customer/events/[eventId]` displays an active event with the authenticated customer navigation and customer-aware purchase controls.

The customer `RoleNav` order is:

1. Dashboard
2. My Tickets
3. Top Up DICKEN
4. Marketplace
5. Transactions

### Visitor route

- `/events/[eventId]` always displays the visitor header with Become an Organizer and return-aware Log In actions.

The public route does not inspect the signed-in profile to choose a navbar. Visitor event cards link to `/events/[eventId]`; customer event cards link to `/customer/events/[eventId]`. This route-level boundary prevents customer and visitor navigation from being mixed.

## Shared Event-Detail Architecture

Extract the event-detail body into a shared component that accepts:

- the active event;
- whether customer purchase controls are enabled;
- the login return path;
- the back-to-events URL.

The visitor route owns the visitor header and footer. The protected customer route owns `RoleNav role="customer"` and the customer shell. Both routes query the same active-event data and render the shared detail component, so presentation remains consistent without sharing navigation decisions.

## Transaction History

### Data ownership

The page requires the authenticated role to be `customer` or legacy `user`, loads `profiles.wallet_address`, and returns only transactions belonging to that managed wallet. The server performs the wallet lookup; a wallet address supplied by the browser is never trusted.

Transaction mapping supports top-up, purchase, refund, and resale records. Each displayed transaction contains:

- stable transaction ID;
- normalized type;
- human-readable description;
- signed DICKEN amount;
- creation date and time;
- transaction hash when present.

Unknown transaction types remain visible under an `Other` label rather than being discarded. Missing hashes display `Transaction pending`.

### Page behavior

The approved layout is a full-width dark table with:

- page heading and transaction count;
- search by description or transaction hash;
- All, Top ups, Purchases, Refunds, and Resale filters;
- Type, Details, Amount, Date, and Transaction columns;
- positive amounts in green and negative amounts in red;
- paginated results.

At tablet/mobile widths, every row becomes a stacked card. Type and amount appear first, followed by description, date, and hash. Filter controls scroll horizontally rather than compressing the content.

### States

- No assigned wallet: explain that the managed wallet has not been assigned.
- Query failure: show a non-destructive retry-oriented error message.
- No transactions: explain that top-ups, purchases, refunds, and resale activity will appear after they occur.
- No filter/search matches: preserve the controls and offer a clear-filter action.

## Marketplace Data Model

Add `resale_listings` with:

- `listing_id` UUID primary key;
- `ticket_id` referencing `tickets`;
- `seller_wallet_address` containing the verified current owner wallet;
- `price` constrained to a positive whole-number DICKEN amount;
- `status` constrained to `active`, `cancelled`, or `purchased`;
- `created_at` and `updated_at` timestamps;
- nullable `cancelled_at` and `purchased_at` timestamps.

A partial unique index on `ticket_id` where status is `active` prevents multiple active listings for one ticket. Indexes support active-listing ordering and seller-owned-listing queries.

The initial implementation uses server-only service-role access for Marketplace queries and mutations, guarded by application-level role and ownership checks. The migration does not expose unrestricted browser writes.

## Marketplace Reads

The protected Marketplace page loads:

- active resale listings;
- related ticket, ticket type, and active event display data;
- whether each listing belongs to the authenticated customer's managed wallet.

Only active listings whose related ticket and event still qualify for display are shown. Seller identity is limited to a shortened wallet suffix; names and email addresses are not exposed.

The page provides:

- search by event, artist, venue, or ticket type;
- All listings and My listings views;
- responsive listing cards;
- event name, artist, ticket type, date, venue, shortened seller wallet, price, and verified-ticket label;
- a disabled `Purchase unavailable` action with a concise explanation.

The My listings view exposes `Cancel listing` only for the current customer's active listings.

## Listing a Ticket

My Tickets adds `List for resale` when all of the following are true:

- the ticket belongs to the authenticated customer's managed wallet;
- ticket status is `active` or `valid`;
- its ticket type has `transfer_allowed = true`;
- the event remains eligible for ticket use;
- the ticket does not already have an active resale listing.

The listing modal displays the event and ticket type, accepts a positive whole-number DICKEN price, and explains that the listing can be cancelled before purchase support is connected.

The protected create endpoint accepts only `ticketId` and `price`. The server derives the authenticated wallet and rechecks ownership, status, event eligibility, transfer permission, and active-listing uniqueness immediately before insertion. Browser-supplied seller identity, eligibility, or ownership claims are ignored.

## Cancelling a Listing

The protected cancellation endpoint accepts the listing ID. The server verifies that:

- the caller has a customer role;
- the listing exists and is active;
- `seller_wallet_address` matches the caller's managed wallet.

Cancellation changes status to `cancelled` and records `cancelled_at` and `updated_at`. It does not delete the record, preserving history and preventing ambiguity in future resale reporting.

## Error Handling and Concurrency

- Invalid prices return a field-level validation message.
- Ineligible or transfer-disabled tickets return a business-rule message without creating a listing.
- Ownership mismatches return a generic authorization response that does not disclose another customer's ticket data.
- Duplicate-listing races are stopped by the partial unique database index and surfaced as `This ticket is already listed`.
- Cancelling an already cancelled or otherwise unavailable listing returns a stable conflict response and refreshes the view.
- Successful create or cancel actions refresh My Tickets and Marketplace data.

## Testing and Verification

Tests are written before implementation and cover:

- transaction type normalization, signed amounts, descriptions, missing hashes, filtering, and searching;
- price parsing and rejection of zero, negative, decimal, blank, and non-numeric values;
- eligible and ineligible ticket decisions;
- create-listing authorization, transfer permission, status, ownership, and duplicate handling;
- cancellation ownership and active-status checks;
- Marketplace presence in customer navigation only;
- visitor cards linking to `/events/[eventId]`;
- customer cards linking to `/customer/events/[eventId]`;
- the public detail route containing no `RoleNav` or role-based navbar selection;
- the customer detail route requiring the customer role and rendering `RoleNav role="customer"`;
- responsive Transaction History and Marketplace structure.

After focused tests pass, run the complete relevant test set, `npm run lint`, and `npm run build`.

## Success Criteria

- Customers can open Transaction History and review only their managed-wallet activity.
- The approved responsive transaction layout is used.
- Marketplace appears in the customer burger drawer and never in visitor navigation.
- Customers can browse active resale listings, list eligible owned tickets, and cancel their own active listings.
- Transfer-disabled, invalid-status, unowned, or already-listed tickets cannot be listed.
- Purchase cannot be mistaken for functional while settlement and NFT transfer are unavailable.
- Public event details always use visitor navigation.
- Customer event details always use customer navigation.
