# Role Features and System Flows

## Visitor

- Browse active approved events.
- Search and view event, venue, ticket availability, transfer permission, and MYR pricing.
- Open About, registration, and login pages.
- Be redirected to login when attempting a protected purchase or dashboard action.

## Customer

- Receive one CornShirt-managed wallet automatically after account creation.
- View the public wallet address and wallet-provisioning status.
- Pay for primary and resale tickets in MYR through Stripe Test Mode.
- Receive a Ticket NFT after verified primary payment.
- View owned tickets, QR codes, NFT references, and ticket status.
- Transfer an eligible existing NFT directly to another registered customer without payment.
- List eligible tickets for resale at an MYR price.
- Buy an active resale listing and receive its existing NFT.
- View purchases, refunds, resale records, and public blockchain references.
- Surrender a refund-eligible NFT after event cancellation.

Customers never receive managed-wallet private keys and never connect an external wallet.

## Organizer

- Create an event using an approved venue layout.
- Set ticket-zone prices in MYR, supply, purchase limits, and transfer permission.
- Submit events for admin approval and edit eligible events.
- View owned events, ticket sales, and simulated MYR revenue.
- Cancel an eligible owned event with a reason.
- Verify and use valid ticket QR codes for owned events.

Organizers do not receive blockchain wallets automatically. Their role and event ownership are authorized through Supabase.

## Admin

- Approve or reject organizer and event applications.
- Monitor users, events, inventory, tickets, Stripe Test Mode activity, and simulated MYR analytics.
- Cancel an eligible event through the administrative workflow.
- Reconcile Stripe results, Supabase workflow records, and local Hardhat receipts.
- Manage protected platform contract roles and deployment configuration.

## Customer Registration and Wallet Provisioning

```text
Customer submits registration
  -> Supabase Auth creates account
  -> customer profile is created
  -> server generates a managed wallet
  -> private key is encrypted with AES-256-GCM
  -> PostgreSQL RPC atomically inserts custodial wallet
     and updates customer wallet address/status
  -> customer remains logged in
```

If profile or wallet provisioning fails, show a recoverable error. Never return or log private-key material.

## Primary Ticket Purchase

```text
Customer selects ticket type
  -> server validates event, inventory, limit, price, and wallet
  -> server reserves inventory and creates an idempotent operation
  -> Stripe Test Checkout Session is created in MYR
  -> customer completes test payment
  -> signed Stripe webhook is verified and deduplicated
  -> platform mints one Ticket NFT to customer wallet
  -> local Hardhat receipt succeeds
  -> Supabase finalizes ticket, inventory, QR data,
     payment references, and simulated organizer revenue
```

The success redirect only displays progress. It cannot confirm payment or mint the NFT.

## My Tickets and QR Verification

```text
Customer opens My Tickets
  -> Supabase loads tickets scoped to managed wallet
  -> system may reconcile NFT ownership with ownerOf
  -> customer opens QR ticket
  -> authorized organizer scans QR
  -> server validates organizer ownership and ticket status
  -> valid ticket is atomically marked used
```

Invalid, duplicate, refunded, cancelled, and wrong-event scans are rejected.

## Direct Transfer

```text
Owner selects eligible ticket and recipient
  -> server verifies owner, recipient, transfer permission, and status
  -> owner's managed wallet transfers existing NFT
  -> local receipt succeeds
  -> Supabase updates ownership and history
```

No payment is created and no new NFT is minted. Before confirmation, disclose that a future cancellation refund returns to the latest Stripe payer rather than necessarily the current owner.

## Resale Listing and Purchase

```text
Seller lists eligible ticket at MYR price
  -> server verifies ownership and one-active-listing rule
  -> buyer selects active listing
  -> server locks listing and creates resale operation
  -> Stripe Test Checkout Session is created in MYR
  -> verified webhook confirms payment
  -> seller's managed wallet transfers existing NFT to buyer
  -> local receipt succeeds
  -> Supabase updates ownership and listing
  -> simulated seller proceeds are credited in MYR
```

Stripe Connect is not used. No real payout is made. If payment succeeds but NFT transfer fails, the operation stays recoverable; retry valid delivery or issue one Stripe test refund.

## Event Cancellation and Refund

```text
Approved organizer or admin cancels eligible event
  -> Supabase blocks sales and marks tickets refund-eligible
  -> current NFT owner starts surrender claim
  -> system finds latest successful paid acquisition
  -> Stripe Test Mode refunds its original payer
  -> refund result is verified
  -> protected platform burner burns the NFT
  -> local receipt succeeds
  -> Supabase marks ticket refunded and reverses
     linked simulated accounting
```

After a free transfer, the surrendering owner and refund beneficiary may be different people. The UI must show the beneficiary before surrender confirmation.

## Failure and Recovery Rules

- Browser redirects never prove payment.
- Every Stripe webhook event and purchase operation is claimed idempotently.
- Supabase completion waits for the required blockchain receipt.
- Payment-confirmed operations with failed NFT delivery remain retryable.
- A failed permanent delivery creates at most one Stripe test refund.
- A verified refund with failed burn makes the ticket unusable while the burn retries.
- Reconciliation resumes from stored state without repeating successful actions.
