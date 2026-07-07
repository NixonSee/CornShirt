# CornShirt Web3 Architecture Reference Design

## Purpose

Populate `docs/SMART_CONTRACTS.md` as the authoritative architecture reference and implementation roadmap for every Web3 capability used by the CornShirt university prototype. The document will explain what runs on local Hardhat, what remains in Supabase, how the Next.js backend coordinates both systems, and which work must be completed before each customer flow is available.

## Scope

The committed architecture targets a local Hardhat network only. It uses Stripe Test Mode and no real customer money. A short, clearly separated future-production section may describe testnet/mainnet RPC providers, managed secrets, audits, monitoring, and key rotation, but those items are not prototype requirements.

The document covers:

- Local Hardhat network and deployment workflow
- Customer custodial wallets
- DICKEN ERC-20
- CornShirt Ticket ERC-721
- Platform treasury and organizer revenue ledger
- Stripe top-up and token minting
- Primary ticket purchase and NFT minting
- Direct ticket transfer
- Ticket resale settlement
- Event cancellation and refunds
- QR ticket verification
- Supabase and blockchain synchronization
- Idempotency, failure recovery, security, testing, and implementation order

## Architecture Decision

CornShirt uses a hybrid Web3 architecture:

- Local Hardhat is authoritative for DICKEN balances, token transfers, Ticket NFT identifiers, and current NFT ownership.
- Supabase is authoritative for identities, events, ticket types, ticket operational status, QR values, purchase limits, resale listings, organizer revenue, transaction records, verification logs, and workflow state.
- Next.js server routes coordinate Supabase, Stripe Test Mode, and Hardhat. Browser code never receives private keys or signing secrets.
- Only customers receive CornShirt-managed wallets. Organizers and admins do not receive automatic blockchain wallets.
- Primary ticket payments go to a platform treasury wallet. Supabase records the organizer's earned DICKEN amount for reporting because organizers have no managed wallets.

This architecture is preferred over a fully on-chain system because event approval, scanning, operational ticket states, and university-prototype recovery are easier to manage in Supabase. It is preferred over a database-only simulation because DICKEN balances and Ticket NFT ownership remain genuine ERC-20 and ERC-721 state on the local chain.

## Blockchain Components

### Local Hardhat Network

Hardhat provides the prototype chain, deterministic development accounts, contract compilation, deployment, automated tests, and transaction receipts. Deployment must produce the local chain ID, DICKEN address, Ticket NFT address, treasury address, and platform signer address for the Next.js server.

Restarting a non-persistent Hardhat node resets blockchain state. The reference must warn that contracts need redeployment and Supabase chain-linked demo data must be reset or reconciled after a chain reset.

### DICKEN ERC-20

`DickenToken` uses OpenZeppelin ERC-20 and role-based access control. Its required behavior is:

- Token name `DICKEN` and symbol `DICKEN`
- Eighteen decimals unless implementation evidence requires a deliberate alternative
- Controlled minting by a platform minter role after confirmed Stripe Test Mode top-ups
- Standard balance lookup and transfers
- No customer-controlled minting
- Treasury-funded refunds
- Events for minting and transfers, inherited from ERC-20 plus role-management events

The prototype uses `1 DICKEN = RM 1.00` at the application layer. The Solidity contract does not know the Ringgit exchange rate.

### CornShirt Ticket ERC-721

`CornShirtTicket` uses OpenZeppelin ERC-721 and role-based access control. Its required behavior is:

- Unique token IDs
- Platform-controlled minting to a customer wallet after successful primary payment
- Standard ownership lookup and transfer
- Platform-controlled refund burning through `burnRefundedTicket(uint256 tokenId)`, restricted to `BURNER_ROLE`
- A token URI or stable metadata reference without placing private ticket or QR information on-chain
- No public customer minting

Event details, ticket status, QR data, transfer permission, and purchase limits remain in Supabase. The NFT proves unique ownership; it does not replace the operational ticket record.

The standard OpenZeppelin public burn path normally requires the token owner or an approved operator. CornShirt deliberately adds `burnRefundedTicket(uint256 tokenId)` so the trusted platform burner can call the internal burn path only after the backend verifies a completed refund workflow. The contract cannot independently verify the off-chain refund, so `BURNER_ROLE` is security-sensitive and can technically burn any token.

For the local managed-wallet prototype, transfer permission is enforced by server-side authorization before CornShirt signs a customer wallet transaction. Standard ERC-721 transfers do not enforce the Supabase `transfer_allowed` value. A production-hardening option is storing `tokenId -> transferAllowed` on-chain and rejecting prohibited transfers in the contract.

## Wallet and Signing Model

Customer wallet generation and encrypted private-key storage already use server-side AES-256-GCM. When a blockchain write requires a customer's signature, the backend:

1. Authenticates the Supabase user.
2. Loads the user's managed wallet and verifies resource ownership.
3. Decrypts the private key only in server memory.
4. Creates a local-chain wallet client.
5. Signs and submits the single required transaction.
6. Waits for a successful receipt.
7. Releases references to plaintext key material and records only public transaction data.

The encryption key, treasury key, deployer key, and contract-admin key remain server-only. Private keys must never appear in logs, client responses, React props, public environment variables, or Supabase public tables.

## End-to-End Flows

### Stripe Top-Up

1. Customer chooses a DICKEN amount.
2. Server creates a Stripe Test Mode Checkout Session with a stable idempotency reference.
3. Stripe webhook signature is verified.
4. A successful event is claimed exactly once in Supabase.
5. The platform minter mints the matching DICKEN amount to the customer wallet.
6. The confirmed transaction hash is saved in `topup_records` and `transactions`.
7. The UI reads the customer's on-chain balance.

A browser redirect is not proof of payment. Only a verified Stripe webhook may trigger minting.

### Primary Ticket Purchase

1. Server authenticates the customer and locks or reserves the selected inventory.
2. Server validates event status, ticket supply, purchase limit, wallet readiness, and DICKEN balance.
3. The customer's managed wallet transfers DICKEN to the treasury.
4. After the payment receipt succeeds, the platform mints one Ticket NFT to that customer wallet.
5. Supabase creates or completes the ticket record, stores token ID and transaction hashes, reduces remaining supply, records organizer revenue, and records the customer transaction.
6. The ticket appears in My Tickets.

The workflow must be resumable if payment succeeds but minting or database finalization fails. A retry must reuse the operation record and must not charge or mint twice.

### Direct Ticket Transfer

1. Server validates ownership, recipient wallet, ticket status, event status, and transfer permission.
2. The current owner's managed wallet transfers the existing NFT to the recipient.
3. Supabase updates wallet ownership and records the transfer transaction after the receipt succeeds.

No new NFT is minted during transfer.

### Ticket Resale

The existing Supabase resale listing remains the listing source of truth. For prototype settlement:

1. Server validates that the listing is still active and locks it for purchase.
2. Server validates buyer and seller wallets, buyer balance, seller NFT ownership, ticket status, and transfer permission.
3. Buyer's wallet transfers DICKEN to the seller's managed wallet.
4. Seller's wallet transfers the existing Ticket NFT to the buyer.
5. Supabase changes ticket ownership, marks the listing purchased, and records both transaction hashes.

Because payment and NFT transfer are separate transactions, the workflow needs explicit recovery states. The reference must document this prototype limitation and identify an atomic marketplace/escrow contract as the future production solution.

### Event Cancellation and Refund

1. Supabase authorization permits only the event's approved organizer or an admin to cancel an eligible event and provide a reason.
2. Supabase marks affected valid tickets refund-eligible.
3. Customer claims a refund once.
4. Treasury transfers the original refundable DICKEN amount to the customer.
5. Platform calls `burnRefundedTicket(tokenId)` using the protected `BURNER_ROLE` account.
6. Supabase marks the ticket `refunded` and records the refund transaction hashes.

A failed burn after successful payment must remain retryable. A refunded ticket is unusable even while cleanup is pending.

### Ticket Verification

1. QR code resolves to a non-secret stable ticket identifier.
2. Server loads the ticket and checks event status, ticket status, and authenticated organizer access.
3. Server may call `ownerOf(tokenId)` to confirm that Supabase ownership matches the chain.
4. A valid scan can atomically change the Supabase status to `used` and create a verification log.

QR verification does not expose private keys and does not require a blockchain transaction. Operational statuses such as `used`, `refunded`, and `cancelled` stay in Supabase.

## Synchronization and Recovery

Blockchain and Supabase cannot participate in one database transaction. Each multi-system operation therefore needs:

- A unique idempotency key
- An operation record created before external side effects
- Explicit states such as `pending`, `payment_confirmed`, `asset_confirmed`, `completed`, and `failed`
- Stored public transaction hashes and receipt status
- Row locking or an equivalent database guard against concurrent purchase or claim attempts
- Retry behavior that resumes from the last confirmed state
- Reconciliation that compares Supabase ownership and hashes with chain receipts

An API timeout does not prove a chain transaction failed. The backend must check the known transaction hash before submitting a replacement.

## Security Rules

- Authorize every write using the verified Supabase session and server-side role checks.
- Keep `WALLET_ENCRYPTION_KEY`, service-role credentials, Stripe webhook secret, treasury key, deployer key, and contract-admin key server-only.
- Never accept a wallet address, user ID, price, owner, token ID, or refund amount from the browser without loading and validating authoritative records.
- Give contract roles only to the platform accounts that need them.
- Validate chain ID and deployed contract address before writes.
- Verify every Stripe webhook signature and deduplicate webhook events.
- Never log plaintext private keys, decrypted wallet payloads, complete secrets, or customer passwords.
- Treat Supabase RLS as defense in depth; privileged blockchain services still perform explicit authorization.

## Testing Requirements

The reference document will require:

- Solidity unit tests for role restrictions, minting, transfer, ownership, burning, and rejected unauthorized calls
- Deployment tests that confirm contract roles and configured addresses
- Wallet signing tests using encrypted customer keys without exposing them
- API authorization and validation tests
- Idempotency tests proving retries do not duplicate minting, charging, transfer, or refund actions
- Failure-recovery tests for each boundary between Stripe, Hardhat, and Supabase
- Local integration tests for top-up, primary purchase, direct transfer, resale, cancellation, refund, and verification
- Reconciliation tests that detect mismatched NFT ownership or missing receipts

## Implementation Rules

The final reference will include these strict rules exactly:

- Implement one roadmap phase at a time.
- Do not add MetaMask, Reown, or external wallet connection UI.
- Do not expose private keys, Supabase service-role keys, or Stripe secrets.
- Do not mark Supabase transactions as complete until the expected blockchain receipt succeeds.
- Do not replace real blockchain balances with a database balance.
- Use local Hardhat only; do not deploy to public networks.
- Ask for confirmation before changing this document, database architecture, or contract business rules.

The rules appear before the phased roadmap so they govern every implementation task.

## API and Contract Interface Documentation

`docs/API_AND_ROUTES.md` will distinguish existing HTTP endpoints from planned Web3 endpoints. Planned endpoints will be grouped by roadmap phase and must not be described as implemented.

Planned server routes cover:

- Phase 2: DICKEN balance, Stripe Checkout creation, Stripe webhook processing, and top-up status
- Phase 3: primary purchase, ticket verification, and mark-as-used behavior
- Phase 4: direct transfer, resale purchase, event cancellation, refund claim, and reconciliation

The API document will list blockchain interfaces separately because smart-contract methods are not HTTP routes:

- `DickenToken`: `balanceOf`, `transfer`, and role-controlled `mint`
- `CornShirtTicket`: `ownerOf`, `safeTransferFrom`, role-controlled minting, and `burnRefundedTicket`

Browser code calls authenticated Next.js APIs. It does not receive signing keys or call state-changing contract methods directly.

## `SMART_CONTRACTS.md` Structure

The final reference will use these sections:

1. Purpose and prototype boundaries
2. Architecture overview
3. On-chain versus Supabase responsibilities
4. Terminology
5. Wallets, signers, and contract roles
6. DICKEN ERC-20 specification
7. Ticket ERC-721 specification
8. Platform treasury and organizer revenue
9. Local Hardhat environment
10. Deployment outputs and environment variables
11. Complete Web3 execution flows
12. Database records and transaction states
13. Error handling, idempotency, and reconciliation
14. Security rules
15. Testing strategy
16. Implementation rules
17. Phased implementation roadmap
18. Future production considerations

## Implementation Order

The roadmap will be split into dependency phases:

### Phase 1: Blockchain Foundation

- Hardhat setup
- DICKEN ERC-20
- Ticket ERC-721, including controlled refund burning
- Contract deployment
- Managed customer wallets and local gas funding

### Phase 2: DICKEN Top-Up

- Read DICKEN balance
- Stripe Test Mode top-up
- Mint DICKEN after a verified webhook

### Phase 3: Primary Ticketing

- Primary ticket purchase
- Ticket NFT minting
- My Tickets integration
- QR verification

### Phase 4: Ownership and Recovery

- Direct transfer
- Resale marketplace settlement
- Refund and controlled NFT burn
- Reconciliation and deeper analytics

## Future Production Boundary

Production deployment is explicitly outside the prototype scope. The final reference may note that production requires testnet validation, a stable RPC provider, managed KMS or HSM custody, audited contracts, multisignature administration, monitoring, incident recovery, key rotation, gas management, deployment versioning, and an atomic resale contract.
