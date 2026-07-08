# Remove DICKEN and Adopt Stripe MYR Payments Design

## Status

This specification supersedes the DICKEN ERC-20 and top-up decisions in earlier CornShirt documents. Historical dated specifications and plans remain as project history, but active code and authoritative documentation must follow this design.

## Goal

Remove DICKEN and ERC-20 from CornShirt. Use Stripe Test Mode in Malaysian Ringgit for primary ticket purchases, resale purchases, and refunds while retaining local Hardhat Ticket NFTs and CornShirt-managed customer wallets.

## Fixed Decisions

- No DICKEN token or ERC-20 contract.
- No customer token balance or top-up workflow.
- No `/customer/top-up` page or top-up navigation.
- Stripe Test Mode processes MYR payments directly at purchase time.
- No real customer money and no real organizer or seller payouts.
- Organizer revenue and resale seller proceeds are simulated MYR accounting records in Supabase.
- Local Hardhat remains responsible only for Ticket ERC-721 ownership and transfers.
- Only customers receive CornShirt-managed wallets.
- Historical dated DICKEN documents are retained with a superseded notice rather than rewritten.

## Revised Architecture

```text
Customer browser
  |
  | authenticated purchase request
  v
Next.js server ---- creates Stripe Test Mode Checkout Session in MYR
  |                                      |
  |                                      v
  |                              verified Stripe webhook
  |                                      |
  | validates and resumes operation <----+
  |
  | Viem JSON-RPC
  v
Local Hardhat Ticket ERC-721
  mint / ownerOf / safeTransferFrom / burnRefundedTicket
  |
  v
Supabase finalizes ticket, payment, ownership, revenue, and workflow records
```

Stripe is authoritative for test payment and refund results. The Ticket NFT contract is authoritative for token ID and ownership. Supabase is authoritative for users, events, inventory, purchase limits, ticket operational states, QR data, simulated revenue/proceeds, and multi-system workflow state.

## Currency Model

All customer-visible prices and transaction values use MYR. Payment amounts are represented as integer sen at Stripe and application boundaries:

- RM 1.00 = 100 sen
- RM 49.90 = 4,990 sen
- Currency code is lowercase `myr` when sent to Stripe and stored canonically as `MYR` or `myr` according to the database convention selected during implementation.

JavaScript floating-point values must not be used for Stripe amounts. Formatting converts integer sen into display text only at the UI boundary.

Existing generic `price` and `amount` fields must not silently change meaning. The database migration should introduce explicit fields such as `price_sen`, `amount_sen`, and `currency`, backfill confirmed prototype data only when its interpretation is known, and keep old columns during a compatibility period if removal would be destructive.

## Ticket NFT and Managed Wallet Model

`CornShirtTicket` remains the only required smart contract. It provides:

- Platform-controlled ticket minting after verified primary payment
- `ownerOf` for authoritative NFT ownership
- `safeTransferFrom` for direct transfer and resale delivery
- `burnRefundedTicket(uint256 tokenId)` restricted to `BURNER_ROLE`
- Public non-sensitive metadata references

Managed customer wallets remain encrypted with AES-256-GCM and server-controlled. They no longer hold DICKEN. They hold Ticket NFTs and need local Hardhat ETH only when a customer wallet must sign an NFT transfer.

Transfer permission remains server-enforced for the managed-wallet MVP. Standard ERC-721 transfer functions do not know the Supabase `transfer_allowed` value. On-chain transfer restrictions remain a future hardening option.

## Removed Functionality

The migration removes or retires:

- `DickenToken` ERC-20 design, deployment, roles, addresses, APIs, tests, and documentation
- DICKEN balance reads and displays
- DICKEN top-up page, form, presets, navigation, APIs, records, and tests
- DICKEN payment, transfer, resale, refund, and revenue language
- `1 DICKEN = RM 1.00` conversion rules
- DICKEN-specific images and UI labels when they have no other use

The existing live `topup_records` table is deprecated rather than automatically dropped. New application code must not write to it. A later approved cleanup migration may archive or remove it after confirming no required data remains.

## Primary Ticket Purchase Flow

1. Authenticated customer selects an active ticket type priced in MYR.
2. Server creates an idempotent purchase operation and reserves inventory.
3. Server creates a Stripe Test Mode Checkout Session using authoritative `price_sen` and `currency` values loaded from Supabase.
4. Customer completes the test payment.
5. Stripe webhook signature is verified from the raw request body.
6. Server claims the Stripe event exactly once and validates amount, currency, customer, purchase operation, and payment status.
7. Platform mints one Ticket NFT to the customer's managed wallet.
8. Server waits for a successful local Hardhat receipt.
9. Supabase creates/finalizes the ticket, reduces inventory, records organizer MYR revenue, stores Stripe and NFT references, and marks the operation completed.

The browser success redirect is not proof of payment and cannot trigger NFT minting.

## Resale Purchase Flow

1. Buyer selects an active eligible resale listing priced in MYR.
2. Server locks the listing and creates an idempotent resale operation.
3. Server creates a Stripe Test Mode Checkout Session using the authoritative listing price in sen.
4. Stripe webhook verifies the buyer's test payment.
5. Seller's managed wallet transfers the existing Ticket NFT to the buyer's managed wallet.
6. Server waits for a successful receipt.
7. Supabase changes ticket ownership, marks the listing purchased, records the Stripe payment, and credits simulated seller proceeds in MYR.

Stripe Connect is not used. The seller receives no real payout. The seller-facing proceeds value is a prototype accounting record only.

If payment succeeds but NFT transfer fails, the operation remains recoverable. The system retries valid NFT delivery from the saved state. If delivery cannot complete, it creates one Stripe test refund and marks the listing available or failed according to the verified ownership state.

## Direct Transfer Flow

Direct transfer has no Stripe payment:

1. Server verifies authenticated ownership, recipient, ticket status, event status, and transfer permission.
2. Current owner's managed wallet transfers the existing NFT.
3. Server waits for the receipt.
4. Supabase updates ownership and transaction history.

No new NFT is minted. A free direct transfer does not change the ticket's refundable Stripe payment or refund beneficiary. The transfer UI must disclose that an event-cancellation refund returns to the latest customer who paid for the ticket through Stripe, which may differ from the current NFT owner.

## Event Cancellation and Refund Flow

1. Supabase authorization allows only the event's approved organizer or an admin to cancel an eligible event.
2. Supabase blocks new purchases and marks affected valid tickets refund-eligible.
3. Current ticket owner surrenders the refund-eligible NFT through one refund claim.
4. Server identifies the ticket's latest successful paid acquisition, whether primary or resale. A free direct transfer does not replace this payment record.
5. Server issues one Stripe Test Mode refund against that acquisition's PaymentIntent or Charge. Stripe returns funds to the latest payer's original payment method, even when a later free transfer made someone else the current NFT owner.
6. Server verifies the Stripe refund result.
7. Protected platform burner calls `burnRefundedTicket(tokenId)`.
8. Server waits for the successful burn receipt.
9. Supabase marks the ticket refunded, records both the surrendering owner and refund beneficiary, and reverses the relevant organizer revenue or simulated seller proceeds.

If the Stripe refund succeeds but NFT burning fails, the ticket immediately becomes unusable and the burn remains retryable. The same acquisition payment and ticket cannot be refunded twice.

## Payment and Workflow States

Multi-system operations use explicit states:

- `pending` - operation created; no verified Stripe payment
- `payment_confirmed` - Stripe payment webhook verified
- `asset_confirmed` - NFT mint, transfer, or burn receipt succeeded
- `completed` - all required Supabase records finalized
- `refund_pending` - recovery requires a Stripe refund
- `refunded` - Stripe refund verified and application accounting adjusted
- `failed` - current attempt failed with a safe retry category

Every payment operation stores an idempotency key, Stripe Checkout Session ID, PaymentIntent ID, amount in sen, currency, public NFT transaction hash when applicable, and safe error category.

## Revenue and Seller Proceeds

Organizer revenue and resale seller proceeds are simulated accounting values in Supabase:

- Primary purchase credits the event organizer's gross MYR revenue after NFT delivery completes.
- Resale purchase credits simulated seller proceeds after NFT delivery completes.
- Refund reverses the accounting entry linked to the refunded acquisition payment.
- Reports must clearly label values as MYR and must not imply that CornShirt paid real funds to organizers or sellers.

Stripe Test Mode payment receipt does not equal a real payout.

## API Direction

Planned payment APIs replace DICKEN balance and top-up APIs:

- Create primary ticket Checkout Session
- Create resale Checkout Session
- Receive verified Stripe webhook
- Read purchase/resale operation status
- Transfer a ticket directly
- Cancel an event
- Claim a Stripe test refund
- Verify and use a ticket
- Reconcile Stripe, NFT, and Supabase state

State-changing NFT operations remain server-coordinated. Browser code does not receive private keys or directly perform privileged contract calls.

## User Interface Changes

Active application UI must:

- Remove Top Up navigation and `/customer/top-up`
- Remove DICKEN balance cards, presets, token images, and explanatory copy
- Display ticket and resale prices in RM
- Launch Stripe Checkout from primary or resale purchase actions
- Display Stripe payment/refund status and NFT transaction references
- Display organizer revenue and seller proceeds in MYR
- Disclose during direct transfer that cancellation refunds return to the latest Stripe payer
- Show the refund beneficiary before the current owner confirms NFT surrender
- Preserve managed-wallet address and Ticket NFT ownership views

Empty, loading, failure, and recovery states must distinguish payment confirmation from NFT delivery.

## Authoritative Documentation Changes

Update current documents so they no longer describe DICKEN or ERC-20 as active architecture:

- `docs/SPECS.md`
- `docs/ROLE_FEATURES_AND_FLOW.md`
- `docs/API_AND_ROUTES.md`
- `docs/SMART_CONTRACTS.md`
- `docs/UNFINISHED_FEATURES_TODO.md`
- Current contributor/context documents such as `docs/AGENTS.md`, `docs/CLAUDE.md`, and `docs/CODEX.md`

The dated DICKEN top-up design and plan receive a prominent superseded notice pointing to this specification. Other historical dated plans may retain DICKEN wording as historical records.

## Dependency Cleanup

The migration checks production imports before removing packages. Reown, Wagmi, React Query, and wallet-connection packages may be removed only if no active code needs them. Viem, Hardhat, and OpenZeppelin remain because the Ticket NFT and local chain still require them.

## Revised Implementation Phases

### Phase 1: NFT Foundation

- Local Hardhat configuration
- `CornShirtTicket` ERC-721
- Deployment, roles, gas funding, and contract configuration
- Managed customer wallet signing for NFTs

### Phase 2: Primary Ticketing

- MYR price schema
- Stripe primary Checkout Session and webhook
- Purchase reservation and idempotency
- Ticket NFT minting
- My Tickets and QR verification

### Phase 3: Ownership and Resale

- Direct NFT transfer
- Stripe resale Checkout Session and webhook
- Existing NFT delivery
- Simulated seller proceeds and recovery refunds

### Phase 4: Cancellation and Recovery

- Event cancellation and refund eligibility
- Stripe test refunds
- Controlled NFT burn
- Reconciliation and MYR analytics

Implement and verify one phase before enabling the next dependent phase.

## Testing Strategy

Tests must cover:

- Active production source and authoritative docs contain no DICKEN or ERC-20 architecture references
- Historical dated files that retain DICKEN are visibly superseded when required
- Prices and amounts use integer sen and MYR formatting
- Top Up navigation and route are absent
- Stripe webhook signature verification and event deduplication
- Primary payment mints exactly one NFT
- Resale payment transfers exactly one existing NFT and credits simulated proceeds once
- Failed NFT delivery resumes or triggers one Stripe test refund
- Cancellation refund uses the ticket's latest successful paid acquisition
- Direct transfer keeps the latest Stripe payer as refund beneficiary
- Refund burns the NFT once and reverses the correct accounting entry
- Direct transfer remains payment-free
- Private keys and Stripe secrets remain server-only

## Implementation Rules

- Implement one migration phase at a time.
- Do not add MetaMask, Reown, or external wallet connection UI.
- Do not expose private keys, Supabase service-role keys, or Stripe secrets.
- Do not mark Supabase transactions as complete until the required Stripe result and expected blockchain receipt succeed.
- Do not create a replacement database token balance.
- Use local Hardhat only; do not deploy to public networks.
- Ask for confirmation before changing database architecture, NFT contract business rules, or this specification.
