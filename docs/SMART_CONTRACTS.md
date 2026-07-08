# CornShirt Stripe and Smart Contract Architecture

## 1. Scope

CornShirt is a university prototype. It uses Stripe Test Mode for MYR payments and a local Hardhat chain for Ticket NFTs. It does not accept real customer money, make real organizer or seller payouts, connect external wallets, or deploy to a public blockchain.

Only customer accounts receive a CornShirt-managed wallet automatically. Organizer and admin authorization remains in Supabase.

## 2. System Responsibilities

```text
Customer browser
  |
  | authenticated request
  v
Next.js server ---- Stripe Test Mode Checkout in MYR
  |                              |
  |                              v
  |                    verified Stripe webhook
  |                              |
  +------ resumes workflow <-----+
  |
  | Viem JSON-RPC
  v
Local Hardhat / CornShirtTicket ERC-721
  mint / ownerOf / safeTransferFrom / burnRefundedTicket
  |
  v
Supabase finalizes tickets, ownership, accounting, and workflow state
```

- Stripe is authoritative for test payments and refunds.
- `CornShirtTicket` is authoritative for NFT token IDs and ownership.
- Supabase is authoritative for accounts, roles, events, inventory, purchase limits, ticket operational status, QR data, transfer permission, simulated MYR accounting, and workflow state.

The browser success redirect is not proof of payment.

## 3. Currency Model

All customer-visible prices and accounting values use Malaysian Ringgit.

- Stripe and new application boundaries use integer sen.
- `RM 1.00` equals `100` sen.
- `RM 49.90` equals `4990` sen.
- Stripe receives currency code `myr`.
- UI formatting happens only at the display boundary.

Do not calculate Stripe amounts with JavaScript floating-point arithmetic. The database migration should introduce explicit `price_sen`, `amount_sen`, and `currency` fields. Existing generic `price` and `amount` columns must not silently change meaning; backfill only confirmed prototype data and retain old columns during a compatibility period when removal would be destructive.

## 4. Managed Customer Wallets

The existing managed-wallet model remains because customers need an address that can own and transfer Ticket NFTs.

- Generate one wallet only for a customer account.
- Encrypt the private key using AES-256-GCM before persistence.
- Store the IV and authentication tag with the ciphertext.
- Keep `WALLET_ENCRYPTION_KEY` and all decrypted key material server-only.
- Never return a private key through an API, page, log, or error.
- Use the approved PostgreSQL RPC to insert `custodial_wallets`, update `customers.wallet_address`, set `customers.wallet_status` to `ready`, and commit those changes atomically.

Customer wallets require local Hardhat ETH only when they sign an NFT transfer. A protected local gas-funding account may fund them for the prototype.

## 5. Ticket NFT Contract

`CornShirtTicket` is the only required contract. It should use OpenZeppelin ERC-721 and `AccessControl`.

Required roles:

- `DEFAULT_ADMIN_ROLE` manages contract roles.
- `MINTER_ROLE` calls `mintTicket` only after verified primary payment.
- `BURNER_ROLE` calls `burnRefundedTicket` only during a verified refund workflow.

Required interfaces:

- `mintTicket(address recipient, string metadataUri)` returns a unique token ID.
- `ownerOf(uint256 tokenId)` returns authoritative ownership.
- `safeTransferFrom(address from, address to, uint256 tokenId)` transfers an existing NFT.
- `burnRefundedTicket(uint256 tokenId)` allows only `BURNER_ROLE` to burn a refund-eligible ticket after backend verification.

Public metadata must contain no secrets or reusable QR verification credentials.

### Transfer-Permission Limitation

For the local managed-wallet prototype, transfer permission is enforced by server-side authorization before signing customer-wallet transactions. The standard NFT contract does not know the Supabase `transfer_allowed` value, so control of a private key could bypass that application rule.

A future hardened contract may store `tokenId -> transferAllowed` and reject disallowed transfers on-chain. This is not required for the current managed-wallet MVP.

## 6. Deployment and Configuration

The local deployment workflow must:

1. Start a Hardhat node with a fixed local chain ID.
2. Compile and deploy `CornShirtTicket`.
3. Grant the minimum required minter and burner roles.
4. Save the chain ID, contract address, deployment block, and deploy transaction hash.
5. Configure the Next.js server with the local RPC URL and server-only platform signing key.
6. Verify that the configured chain and deployed bytecode match before processing writes.

Do not deploy to a public network. Do not add MetaMask, Reown, or another external-wallet connection flow.

## 7. Primary Ticket Purchase

1. An authenticated customer selects an active ticket type priced in MYR.
2. The server validates status, supply, purchase limit, and managed-wallet readiness.
3. The server creates an idempotent operation and reserves inventory.
4. The server creates a Stripe Test Checkout Session using authoritative amount-in-sen and currency values.
5. Stripe sends a signed webhook after test payment.
6. The server verifies the raw webhook signature, claims the event once, and validates the amount, currency, customer, operation, and payment state.
7. The protected minter mints one Ticket NFT to the customer's managed wallet.
8. The server waits for a successful local Hardhat receipt.
9. Supabase finalizes the ticket, reduces inventory, records simulated organizer MYR revenue, stores Stripe/NFT references, and marks the operation completed.

If payment is confirmed but minting fails, keep the operation recoverable. Retry the same mint workflow safely or issue one Stripe test refund; never create a duplicate ticket.

## 8. Direct Transfer

Direct transfer has no payment:

1. Verify the authenticated owner, recipient, ticket status, event status, and transfer permission.
2. The current owner's managed wallet transfers the existing NFT.
3. Wait for the successful receipt.
4. Update Supabase ownership and history.

No replacement NFT is minted. A free transfer does not replace the last paid acquisition. The UI must explain that an event-cancellation refund returns to the latest Stripe payer, who may differ from the current owner.

## 9. Resale Purchase

1. The buyer selects an active eligible listing priced in MYR.
2. The server locks the listing and creates an idempotent resale operation.
3. The server creates a Stripe Test Checkout Session from the authoritative listing amount in sen.
4. A verified webhook confirms the buyer's test payment.
5. The seller's managed wallet transfers the existing NFT to the buyer's managed wallet.
6. The server waits for a successful receipt.
7. Supabase updates ownership, marks the listing purchased, records payment references, and credits simulated seller proceeds in MYR.

Stripe Connect is not used and the seller receives no real payout.

Payment and NFT transfer are separate system actions:

```text
Payment succeeds
  |
  v
NFT transfer fails
  |
  +--> retry valid delivery
  |
  +--> if delivery cannot complete, issue one Stripe test refund
```

This is not atomic. A future production version should use an audited marketplace or escrow design if it needs atomic payment and NFT delivery.

## 10. Event Cancellation and Refund

Event cancellation is controlled by Supabase authorization. Only the event's approved organizer or an admin can cancel the event.

1. Cancellation blocks new purchases and makes affected valid tickets refund-eligible.
2. The current NFT owner starts one surrender claim.
3. The server finds the latest successful paid acquisition; a later free transfer does not replace it.
4. Stripe Test Mode refunds that acquisition's PaymentIntent or Charge to the original payer.
5. The server verifies the refund result.
6. The protected platform burner calls `burnRefundedTicket(tokenId)`.
7. The server waits for the successful burn receipt.
8. Supabase marks the ticket refunded, records the surrendering owner and refund beneficiary, and reverses the related simulated accounting entry.

If the Stripe refund succeeds but NFT burning fails, the ticket becomes unusable immediately and the burn remains retryable. The same paid acquisition and ticket must never be refunded twice.

## 11. Workflow State and Idempotency

Multi-system operations use explicit states:

- `pending` - operation created; payment not verified.
- `payment_confirmed` - expected Stripe payment or refund verified.
- `asset_confirmed` - required NFT receipt succeeded.
- `completed` - all required Supabase records finalized.
- `refund_pending` - recovery requires a Stripe refund.
- `refunded` - refund verified and accounting adjusted.
- `failed` - the current attempt failed with a safe retry category.

Store the idempotency key, Stripe event/Checkout Session/PaymentIntent IDs, amount in sen, currency, NFT token ID, local transaction hash, retry count, and safe error category where applicable. Claim webhook events and workflow transitions atomically.

## 12. Reconciliation

An admin reconciliation service should detect:

- verified payment without expected NFT delivery;
- successful NFT receipt without completed Supabase state;
- Supabase owner differing from `ownerOf`;
- duplicate webhook or operation identifiers;
- completed refund without NFT burn;
- completed resale without simulated seller proceeds;
- expired inventory reservation without payment.

Recovery must resume from stored state and must not repeat successful payment, refund, mint, transfer, or burn actions.

## 13. Security Rules

- Authenticate and authorize every state-changing API on the server.
- Verify Stripe signatures from raw webhook bodies.
- Use Stripe idempotency keys and store event IDs for deduplication.
- Load authoritative prices and ownership from server-controlled sources.
- Restrict minting and refund burning with contract roles.
- Never expose private keys, encryption keys, platform signing keys, Stripe secrets, or Supabase service-role keys.
- Log public addresses, operation IDs, Stripe object IDs safe for server logs, token IDs, transaction hashes, receipt status, and safe error categories only.
- Do not log decrypted keys, ciphertext payloads, webhook secrets, full QR secrets, or sensitive customer data.

## 14. Testing Requirements

Automated tests must cover:

- contract deployment, roles, minting, ownership, transfer, and controlled refund burning;
- MYR-to-sen conversion and display formatting;
- Stripe webhook signature verification and event deduplication;
- exactly one NFT mint after one verified primary payment;
- resale delivery of one existing NFT and one simulated proceeds credit;
- recovery or one refund after failed NFT delivery;
- direct transfer without payment;
- refund to the latest Stripe payer after a free transfer;
- exactly one refund and one controlled NFT burn;
- server-side transfer authorization;
- reconciliation of Stripe, local Hardhat, and Supabase state;
- secret and private-key non-disclosure.

## 15. Implementation Phases

### Phase 1: NFT Foundation

- Hardhat setup and local deployment.
- `CornShirtTicket` contract and tests.
- Role assignment and deployment configuration.
- Managed customer-wallet NFT signing and local gas funding.

### Phase 2: Primary Ticketing

- Integer-sen MYR schema.
- Stripe primary Checkout Session and verified webhook.
- Reservation and idempotency.
- Ticket NFT minting, My Tickets, and QR verification.

### Phase 3: Ownership and Resale

- Direct transfer.
- Stripe resale Checkout Session and webhook.
- Existing NFT delivery.
- Simulated seller proceeds and failed-delivery recovery.

### Phase 4: Cancellation and Recovery

- Authorized event cancellation.
- Refund eligibility and Stripe test refunds.
- Controlled NFT burn.
- Reconciliation and deeper MYR analytics.

Implement and verify one phase before enabling its dependent phase.

## Implementation Rules

- Implement one roadmap phase at a time.
- Do not add MetaMask, Reown, or external wallet connection UI.
- Do not expose private keys, Supabase service-role keys, or Stripe secrets.
- Do not mark Supabase transactions as complete until the expected blockchain receipt succeeds.
- Do not replace authoritative NFT ownership with a database-only ownership value.
- Use local Hardhat only; do not deploy to public networks.
- Ask for confirmation before changing this document, database architecture, or contract business rules.
