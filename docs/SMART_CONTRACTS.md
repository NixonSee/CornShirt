# CornShirt Web3 and Smart Contract Reference

## 1. Purpose and Prototype Boundary

This document is the source of truth for Web3 behavior across CornShirt. It defines the smart contracts, managed wallets, blockchain transactions, Supabase records, security boundaries, failure recovery, testing, and implementation order used by the system.

CornShirt is currently a university prototype with these fixed boundaries:

- Blockchain execution uses a local Hardhat network only.
- Payments use Stripe Test Mode only; no real customer money is accepted.
- DICKEN has no external financial value.
- Only customer accounts receive CornShirt-managed wallets automatically.
- Customers do not connect MetaMask and do not manage seed phrases.
- Organizers and admins do not receive automatic blockchain wallets.
- Production testnet or mainnet deployment is outside the current scope.

This document describes the intended completed architecture. Existing UI placeholders do not mean the corresponding blockchain workflow is already implemented.

## 2. Architecture Overview

CornShirt uses a hybrid Web3 architecture:

```text
Browser
  |
  | authenticated HTTP request
  v
Next.js server routes and services
  |---------------------> Supabase
  |                         identities, events, workflow state,
  |                         tickets, listings, logs and analytics
  |
  | Viem JSON-RPC calls
  v
Local Hardhat network
  DICKEN ERC-20 balances and transfers
  Ticket ERC-721 token IDs and ownership

Stripe Test Mode webhook
  |
  v
Next.js server -> DICKEN mint -> customer managed wallet
```

The Next.js server is the coordinator. It authenticates users through Supabase, validates authoritative application records, decrypts managed customer keys only when a customer transaction must be signed, submits transactions through Viem, waits for receipts, and then records public results in Supabase.

The browser never receives a customer private key, treasury key, deployer key, contract-admin key, Supabase service-role key, or Stripe secret.

## 3. On-Chain and Supabase Responsibilities

| Responsibility | Source of truth | Reason |
| --- | --- | --- |
| DICKEN balance | DICKEN ERC-20 | The token contract owns balances and transfers. |
| Ticket NFT token ID and current owner | Ticket ERC-721 | The NFT contract owns unique token identity and ownership. |
| Customer public wallet address | Supabase `profiles` | Connects the authenticated account to its managed wallet. |
| Encrypted customer private key | Supabase `custodial_wallets` | Server-only custody record protected with AES-256-GCM. |
| Events and ticket types | Supabase | Includes approval status, price, supply, limits, and transfer permission. |
| Operational ticket state | Supabase `tickets` | Includes valid, used, refund-eligible, refunded, and cancelled states. |
| Ticket QR value | Supabase `tickets` | QR data must not expose private information on-chain. |
| Stripe top-up records | Supabase `topup_records` | Stores Stripe references, mint status, and public transaction hash. |
| Customer transaction history | Supabase `transactions` | Provides readable application history linked to blockchain receipts. |
| Organizer revenue | Supabase ledger and transaction data | Organizers do not receive managed blockchain wallets. |
| Resale listing state | Supabase `resale_listings` | Supports active, purchasing, purchased, and cancelled workflows. |
| Verification history | Supabase `verification_logs` | Scanning and marking used do not require blockchain writes. |
| Multi-system operation progress | Supabase operation record | Enables idempotency, retry, and reconciliation. |

Supabase must never invent a confirmed blockchain result. A transaction hash is stored as confirmed only after its receipt succeeds on the configured chain.

## 4. Terminology

- **Managed wallet:** An Ethereum-compatible customer wallet generated and controlled by the CornShirt server.
- **Customer signer:** A managed customer private key decrypted temporarily to sign a customer-authorized blockchain transaction.
- **Platform deployer:** The local Hardhat account that deploys contracts and initially grants roles.
- **Contract admin:** The account allowed to grant or revoke contract roles.
- **Platform minter:** The account allowed to mint DICKEN or Ticket NFTs for approved workflows.
- **Platform treasury:** The account that receives primary ticket payments and sends refunds.
- **DICKEN:** CornShirt's local prototype ERC-20 token.
- **Ticket NFT:** A CornShirt ERC-721 token representing unique ticket ownership.
- **Transaction receipt:** Blockchain evidence that a submitted transaction succeeded or reverted.
- **Idempotency key:** A unique operation identifier that prevents duplicate payment, mint, transfer, or refund effects.
- **Reconciliation:** Comparing Supabase workflow records with blockchain receipts and current on-chain state.

## 5. Wallets, Signers, and Contract Roles

### Customer managed wallets

Customer wallets are generated with Viem after customer registration. The public address is stored in `profiles.wallet_address`. The private key is encrypted with AES-256-GCM and stored in `custodial_wallets` with its IV, authentication tag, and key version.

When the server needs a customer signature, it must:

1. Authenticate the Supabase session.
2. Verify the customer owns the relevant wallet, ticket, or listing.
3. Load the encrypted private key through a server-only service-role client.
4. Decrypt it only in server memory.
5. Create a Viem wallet client connected to the configured local Hardhat chain.
6. Sign and submit only the validated transaction.
7. Wait for and validate the receipt.
8. Retain only public transaction data after the operation.

Customer wallets need native Hardhat ETH to pay gas when they transfer DICKEN or NFTs. The local deployment workflow must fund newly provisioned customer wallets from a designated local gas-funding account. Production gas sponsorship would require a relayer or account-abstraction design and is outside this prototype.

### Contract roles

| Role | DICKEN contract | Ticket NFT contract |
| --- | --- | --- |
| Default admin | Grants and revokes roles | Grants and revokes roles |
| DICKEN minter | Mints after verified Stripe top-ups | Not applicable |
| Ticket minter | Not applicable | Mints after confirmed primary payment |
| Ticket burner | Not applicable | Calls the custom refund-burn function after a completed refund |
| Customer wallet | Holds and transfers DICKEN | Holds and transfers owned Ticket NFTs |
| Treasury | Receives primary payments and sends refunds | Does not own customer tickets during normal use |

The deployer may hold all platform roles during initial local development. The roles must still remain distinct in contract design and tests so responsibilities are clear.

## 6. DICKEN ERC-20 Specification

The contract should be named `DickenToken` and use OpenZeppelin ERC-20 with `AccessControl`.

Required behavior:

- Token name: `DICKEN`
- Token symbol: `DICKEN`
- Decimals: 18
- Standard `balanceOf`, `transfer`, `transferFrom`, and allowance behavior
- Minting restricted to `MINTER_ROLE`
- No public faucet or customer-controlled mint function
- Standard ERC-20 transfer and approval events
- Role-grant and role-revoke events through `AccessControl`

The application displays `1 DICKEN = RM 1.00`. This conversion is an application and Stripe rule; the smart contract does not know Ringgit prices.

Top-ups mint DICKEN to customers. Primary ticket payments transfer DICKEN from customers to the treasury. Resale payments transfer DICKEN from buyer to seller. Refunds transfer DICKEN from the treasury back to the customer. The application converts human-readable amounts to 18-decimal token units before contract calls.

## 7. CornShirt Ticket ERC-721 Specification

The contract should be named `CornShirtTicket` and use OpenZeppelin ERC-721 with `AccessControl`.

Required behavior:

- Unique token IDs generated by the contract or an internal monotonic counter
- Minting restricted to `MINTER_ROLE`
- Custom `burnRefundedTicket(uint256 tokenId)` restricted to `BURNER_ROLE`
- Standard `ownerOf`, approvals, and safe-transfer behavior
- Mint directly to the customer's managed wallet after primary payment succeeds
- Transfer the existing NFT for direct transfer and resale; never mint a replacement
- Burn the NFT after the associated refund payment succeeds
- Provide a token URI or stable metadata reference

Public NFT metadata may include a ticket reference, event name, ticket type, artwork, and non-sensitive display information. It must not include QR secrets, customer email, encrypted key material, internal authorization data, or anything required to enter an event securely.

The standard OpenZeppelin public burn path requires the NFT owner or an approved operator. CornShirt instead defines `burnRefundedTicket(uint256 tokenId)`, which allows the trusted `BURNER_ROLE` account to call the contract's internal burn path after the backend has verified the completed refund workflow. The contract cannot independently verify an off-chain refund, so this role can technically burn any Ticket NFT and must remain a tightly protected server-only capability.

For the local managed-wallet prototype, transfer permission is enforced by server-side authorization before CornShirt signs customer wallet transactions. Standard ERC-721 transfer functions do not enforce the Supabase `transfer_allowed` value. This limitation is acceptable for the MVP because customers never receive their managed private keys. A future hardening option is storing `tokenId -> transferAllowed` on-chain and rejecting prohibited transfers in the contract.

Operational states such as `valid`, `used`, `refund_eligible`, `refunded`, and `cancelled` remain in Supabase.

## 8. Platform Treasury and Organizer Revenue

Only customers receive managed wallets, so organizers do not receive primary ticket-sale tokens directly. Primary DICKEN payments go to the platform treasury.

After a primary purchase completes, Supabase records:

- Event and ticket type
- Customer wallet
- DICKEN amount paid
- Organizer ID
- Organizer revenue amount
- Payment transaction hash
- NFT mint transaction hash and token ID

Organizer dashboards calculate sales and revenue from their own events and transaction records. Refunds reduce the organizer's reportable net revenue in Supabase. This is an accounting ledger for the prototype, not an organizer on-chain balance.

The treasury must retain enough DICKEN from primary sales to pay eligible refunds. Resale payments bypass the treasury and move from the buyer's managed wallet to the seller's managed wallet.

## 9. Local Hardhat Environment

Hardhat supplies the prototype blockchain, Solidity compilation, deterministic development accounts, deployment, contract tests, JSON-RPC endpoint, blocks, and receipts.

The local workflow must support:

1. Starting a local node.
2. Compiling `DickenToken` and `CornShirtTicket`.
3. Deploying both contracts.
4. Assigning admin, minter, and burner roles.
5. Identifying the treasury and gas-funding accounts.
6. Saving public deployment output for the Next.js server.
7. Funding customer wallets with local ETH for gas.
8. Running contract and integration tests against a clean chain.

The recommended local chain ID is `31337`. The server must still read and validate the configured chain ID rather than assume it.

A fresh non-persistent Hardhat node resets contracts, balances, token IDs, blocks, and receipts. After a reset, contracts must be redeployed and Supabase demo records linked to the old chain must be cleared or reconciled. Old contract addresses and transaction hashes must not be reused.

## 10. Deployment Outputs and Environment Variables

Deployment output must include:

- Chain ID
- DICKEN contract address
- Ticket NFT contract address
- Platform deployer/admin address
- DICKEN minter address
- Ticket minter/burner address
- Treasury address
- Gas-funding address
- Deployment block numbers or transaction hashes

Required environment-variable responsibilities:

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `HARDHAT_RPC_URL` | Server JSON-RPC connection to the local node | Server-only configuration |
| `HARDHAT_CHAIN_ID` | Expected local chain ID | Server configuration |
| `DICKEN_CONTRACT_ADDRESS` | Deployed ERC-20 address | Public value, but configured server-side first |
| `TICKET_NFT_CONTRACT_ADDRESS` | Deployed ERC-721 address | Public value, but configured server-side first |
| `PLATFORM_TREASURY_ADDRESS` | Receives primary payments and sends refunds | Public address |
| `PLATFORM_DEPLOYER_PRIVATE_KEY` | Local platform deployment and privileged signing | Server-only secret |
| `WALLET_ENCRYPTION_KEY` | Decrypts managed customer private keys | Server-only secret |
| `STRIPE_SECRET_KEY` | Creates Stripe Test Mode server operations | Server-only secret |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures | Server-only secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Initializes approved Stripe browser functionality | Intentionally public |

For the local prototype, the account represented by `PLATFORM_DEPLOYER_PRIVATE_KEY` may also hold the DICKEN minter, Ticket NFT minter/burner, treasury, and gas-funding responsibilities. In that configuration, `PLATFORM_TREASURY_ADDRESS` must match the address derived from that key. A later separation of duties requires separate server-only signing keys rather than public address variables alone.

Do not place private keys or server secrets in variables prefixed with `NEXT_PUBLIC_`. Do not commit `.env.local`.

## 11. Web3 Execution Flows

### 11.1 Customer Wallet Provisioning

**Actor:** Newly registered authenticated customer.

1. Registration creates the Supabase Auth account and customer profile with `wallet_status = 'pending'`.
2. The browser calls the bodyless customer wallet-provisioning API.
3. The server verifies that the account role is customer.
4. Viem generates a private key and derives the public address.
5. AES-256-GCM encrypts the private key using `WALLET_ENCRYPTION_KEY`.
6. The Supabase RPC atomically inserts `custodial_wallets` and updates `profiles.wallet_address` and `wallet_status`.
7. The local gas-funding service sends enough Hardhat ETH for prototype transactions.

Only the public wallet address and provisioning status may be returned. Provisioning is idempotent: retries return the existing ready wallet and never generate a replacement for consistent existing records.

### 11.2 Stripe Top-Up and DICKEN Minting

**Actor:** Authenticated customer with a ready managed wallet.

1. Customer chooses a supported whole-number DICKEN amount.
2. Server loads the customer wallet and creates a Stripe Test Mode Checkout Session with an internal idempotency key.
3. Server stores a pending `topup_records` entry before redirecting to Stripe.
4. Stripe sends a webhook after test payment completion.
5. Server verifies the webhook signature and claims the Stripe event exactly once.
6. Server validates the paid amount, currency, customer, and referenced top-up.
7. DICKEN minter mints the matching 18-decimal token amount to the customer wallet.
8. Server waits for a successful receipt.
9. Supabase marks the top-up completed and records the Stripe reference, amount, wallet, and mint transaction hash in `topup_records` and `transactions`.

The browser success redirect is not proof of payment and must never mint tokens. Duplicate Stripe events return the previously completed result.

### 11.3 DICKEN Balance Reading

**Actor:** Authenticated customer.

1. Server loads the customer's public managed-wallet address.
2. A Viem public client validates the configured chain and DICKEN contract.
3. The server calls `balanceOf(walletAddress)`.
4. The 18-decimal value is formatted as human-readable DICKEN.

Balance reading requires no private key and no transaction. Supabase must not maintain a second authoritative DICKEN balance.

### 11.4 Primary Ticket Purchase and NFT Minting

**Actor:** Authenticated customer buying an active event ticket type.

1. Server creates a purchase operation and reserves or locks one inventory unit.
2. Server validates event status, supply, purchase limit, ticket type, price, transfer rule, wallet readiness, and on-chain DICKEN balance.
3. The customer signer transfers the exact DICKEN price to the treasury.
4. Server waits for a successful payment receipt and saves its hash as `payment_confirmed`.
5. Ticket minter mints one Ticket NFT directly to the customer wallet.
6. Server waits for a successful mint receipt and saves the token ID and hash as `asset_confirmed`.
7. Supabase creates the ticket record, reduces remaining supply, records organizer revenue, creates the transaction record, and marks the operation completed.
8. The API returns only public ticket, token, and transaction information.

If payment succeeds but minting or database finalization fails, retry resumes from the stored payment receipt. It must not charge the customer twice or mint two NFTs.

### 11.5 Direct Ticket Transfer

**Actor:** Authenticated customer who owns the ticket.

1. Server resolves the recipient account or validates the recipient address.
2. Server verifies seller ownership in Supabase and with `ownerOf(tokenId)`.
3. Server validates event status, ticket status, transfer permission, recipient support, and absence of an active resale purchase lock.
4. The current owner's customer signer transfers the existing NFT to the recipient.
5. Server waits for the receipt.
6. Supabase updates the owner wallet and records the transfer hash and transaction history.

No new NFT is minted. A failed or reverted chain transfer leaves Supabase ownership unchanged.

### 11.6 Resale Purchase and Ownership Transfer

**Actors:** Authenticated buyer and an active listing owned by another managed customer wallet.

1. Server locks the listing and changes its workflow state from `active` to `purchasing`.
2. Server validates buyer and seller wallets, ticket status, transfer permission, listing price, buyer balance, and seller NFT ownership.
3. Buyer's signer transfers DICKEN to the seller wallet.
4. Server records the successful payment receipt.
5. Seller's signer transfers the existing NFT to the buyer wallet.
6. Server records the NFT receipt.
7. Supabase updates ticket ownership, marks the listing `purchased`, writes buyer and seller transaction history, and completes the operation.

This prototype uses two sequential blockchain transactions, so payment and NFT delivery are not atomic. If payment succeeds and NFT transfer fails, the operation remains recoverable: retry the NFT transfer when valid or compensate the buyer according to the recorded state. A production system should use an audited marketplace or escrow contract to exchange ERC-20 payment and ERC-721 ownership atomically.

### 11.7 Event Cancellation and Refund

**Actors:** Organizer cancels; affected authenticated customer claims.

1. Supabase authorization permits only the event's approved organizer or an admin to cancel an eligible event and supply a reason.
2. Supabase prevents new purchases and marks affected valid tickets `refund_eligible`.
3. Customer starts a refund operation for an eligible ticket.
4. Server validates customer ownership, event cancellation, ticket state, original refundable amount, and absence of a completed claim.
5. Treasury transfers the refundable DICKEN amount to the customer wallet.
6. Server waits for the refund receipt and records `payment_confirmed`.
7. The protected platform burner calls `burnRefundedTicket(tokenId)`.
8. Server waits for the burn receipt and records `asset_confirmed`.
9. Supabase marks the ticket `refunded`, adjusts organizer net revenue, records the refund transaction, and completes the operation.

If the DICKEN refund succeeds but burning fails, the ticket is immediately unusable and the burn remains retryable. A customer can never receive the same refund twice.

### 11.8 QR Ticket Verification

**Actor:** Authenticated organizer for the ticket's event.

1. Each ticket has a randomly generated opaque QR token.
2. The QR token is stored securely in Supabase and maps to one ticket record.
3. The QR value must not expose customer details, wallet addresses, NFT token IDs or predictable ticket IDs.
4. Server verifies organizer ownership of the event.
5. Server loads the ticket and checks event status and operational ticket state.
6. Server may call `ownerOf(tokenId)` to confirm Supabase and blockchain ownership agree.
7. The result is valid, invalid, used, refunded, or cancelled.
8. For a valid ticket, one atomic Supabase operation changes status to `used` and writes `verification_logs`.

Verification does not decrypt a wallet key and does not submit a blockchain transaction. Repeated scanning of a used ticket returns `used` without creating another successful-entry result.

## 12. Supabase Records and Workflow States

Existing and planned records have these Web3 responsibilities:

| Record | Important Web3 fields |
| --- | --- |
| `profiles` | `user_id`, `role`, `wallet_address`, `wallet_status`, `wallet_error` |
| `custodial_wallets` | wallet address, encrypted key, IV, auth tag, key version |
| `topup_records` | idempotency key, Stripe IDs, wallet, amount, status, mint hash |
| `transactions` | type, wallet, amount, description, chain ID, transaction hash, status |
| `tickets` | event, ticket type, owner wallet, token ID, mint hash, QR value, operational status |
| `resale_listings` | ticket, seller wallet, price, buyer wallet, status, payment hash, NFT transfer hash |
| `verification_logs` | ticket, organizer, result, verified time |
| Web3 operation record | operation type, idempotency key, actor, resource, state, hashes, error category, timestamps |

Multi-system operations use these common states:

| State | Meaning |
| --- | --- |
| `pending` | Validated operation exists; no confirmed chain side effect yet. |
| `payment_confirmed` | DICKEN payment, mint, or refund receipt succeeded, depending on the flow's payment stage. |
| `asset_confirmed` | NFT mint, transfer, or burn receipt succeeded. |
| `completed` | Required Supabase records are finalized and visible to users. |
| `failed` | The current attempt failed and records contain a safe retry category. |

Top-ups that contain only one mint transaction can move from `pending` to `payment_confirmed` and then `completed`. Every operation stores its chain ID and public transaction hashes so it can be reconciled after a timeout.

## 13. Idempotency, Failure Recovery, and Reconciliation

Supabase and Hardhat cannot participate in one transaction. Every workflow crossing those systems must use the following pattern:

1. Generate or accept a stable server-controlled idempotency key.
2. Create and lock the operation record before external side effects.
3. Validate authoritative database and blockchain state.
4. Submit only the next unfinished blockchain action.
5. Store its public hash immediately.
6. Wait for the receipt and validate `success` on the expected chain and contract.
7. Advance the operation state.
8. Finalize related Supabase records.
9. Return the existing completed result for duplicate requests.

An HTTP timeout does not prove a blockchain transaction failed. If a known transaction hash exists, the backend checks its receipt before sending a replacement.

Concurrency guards are required for ticket supply, purchase limits, resale listing purchase, refund claims, and verification marking. Two requests must not reserve the last ticket, buy the same listing, claim the same refund, or mark the same ticket valid at the same time.

Reconciliation should detect:

- A stored transaction hash with no successful receipt
- Supabase owner different from `ownerOf(tokenId)`
- Completed top-up without the expected DICKEN mint
- Paid purchase without a Ticket NFT
- Paid resale without completed NFT delivery
- Refunded ticket whose NFT still requires burning
- Contract address or chain ID different from the current deployment

## 14. Security Rules

- Authenticate every protected API request with Supabase Auth.
- Authorize the verified role and resource owner on the server.
- Never trust browser-provided user IDs, wallet ownership, prices, token IDs, ticket status, refund amounts, contract addresses, or transaction results.
- Keep private keys, `WALLET_ENCRYPTION_KEY`, Supabase service-role credentials, and Stripe secrets server-only.
- Never return or log plaintext private keys, decrypted wallet material, passwords, or full secrets.
- Validate the configured chain ID and contract address before every write.
- Restrict DICKEN minting and Ticket NFT minting/burning with contract roles.
- Verify Stripe webhook signatures using the raw request body.
- Deduplicate Stripe events and all blockchain-changing operations.
- Wait for successful receipts before recording confirmed effects.
- Use Supabase RLS as defense in depth even when server services use the service role.
- Store QR identifiers without embedding private keys or sensitive customer information.
- Avoid unlimited token approvals where a precise allowance or direct transfer is sufficient.
- Do not commit `.env.local`, deployment secrets, or encrypted-key decryption material.

## 15. Testing Strategy

### Contract tests

- DICKEN metadata and 18-decimal conversion
- Authorized minting succeeds
- Unauthorized minting reverts
- Balance and transfer behavior
- Ticket minting produces a unique token ID and correct owner
- Unauthorized ticket minting and `burnRefundedTicket` calls revert
- NFT transfer changes `ownerOf`
- Refund burn removes ownership
- Role granting and revocation work as intended

### Server unit tests

- Correct chain and address validation
- Token amount parsing and formatting
- Customer key decryption remains server-only
- Receipt parsing rejects reverted or mismatched transactions
- Authorization prevents cross-customer access
- Idempotency returns existing results
- Retry resumes from the stored confirmed state

### Local integration tests

- Registration provisions and funds a managed customer wallet
- Stripe test webhook mints DICKEN once
- Balance display reads the token contract
- Primary purchase transfers DICKEN and mints one NFT
- Direct transfer changes NFT and Supabase ownership
- Resale transfers payment and the existing NFT
- Cancellation makes tickets refund-eligible
- Refund returns DICKEN once and burns the NFT
- QR verification marks a valid ticket used once
- Reconciliation detects intentionally mismatched records

Tests must use isolated local chain state and deterministic fixtures. They must never depend on real Stripe charges, real networks, or production secrets.

## 16. Implementation Rules

- Implement one roadmap phase at a time.
- Do not add MetaMask, Reown, or external wallet connection UI.
- Do not expose private keys, Supabase service-role keys, or Stripe secrets.
- Do not mark Supabase transactions as complete until the expected blockchain receipt succeeds.
- Do not replace real blockchain balances with a database balance.
- Use local Hardhat only; do not deploy to public networks.
- Ask for confirmation before changing this document, database architecture, or contract business rules.

## 17. Phased Implementation Roadmap

### Phase 1: Blockchain Foundation

- [ ] Configure Hardhat, Solidity compilation, the local chain, and contract test commands.
- [ ] Implement and test `DickenToken` ERC-20.
- [ ] Implement and test `CornShirtTicket` ERC-721, including `burnRefundedTicket`.
- [ ] Add contract deployment, role assignment, treasury selection, gas funding, and public deployment output.
- [ ] Connect managed customer wallets to the local chain with server-only Viem signing.

### Phase 2: DICKEN Top-Up

- [ ] Read and display the customer's real on-chain DICKEN balance.
- [ ] Create Stripe Test Mode Checkout Sessions and verify webhook signatures.
- [ ] Mint DICKEN exactly once after a verified webhook and record the top-up.

### Phase 3: Primary Ticketing

- [ ] Implement primary ticket purchase with inventory reservation and DICKEN payment.
- [ ] Mint one Ticket NFT after confirmed primary payment.
- [ ] Connect minted ownership, token ID, and transaction hashes to My Tickets.
- [ ] Implement QR verification, mark-as-used behavior, and verification logs.

### Phase 4: Ownership and Recovery

- [ ] Implement direct eligible Ticket NFT transfer and ownership synchronization.
- [ ] Implement resale DICKEN payment, existing NFT transfer, recovery states, and transaction history.
- [ ] Implement event cancellation, refund eligibility, treasury refund, `burnRefundedTicket`, and net-revenue adjustment.
- [ ] Implement reconciliation and deeper transaction, resale, refund, and verification analytics.

Complete and verify each phase before enabling features from the next dependent phase. Each phase should receive its own reviewed implementation plan and focused tests.

## 18. Future Production Considerations

Production deployment is outside the current prototype. Moving beyond local Hardhat would require:

- Testnet validation before mainnet deployment
- Stable RPC providers and network monitoring
- Managed KMS or HSM custody instead of environment-held private keys
- Multisignature ownership for contract administration and treasury control
- Independent Solidity security audit
- Versioned, reproducible deployments and verified source code
- Gas sponsorship or account abstraction for managed customer wallets
- Key rotation and incident-recovery procedures
- Confirmation-depth and chain-reorganization handling
- An audited marketplace or escrow contract for atomic resale settlement
- On-chain event indexing and automated reconciliation workers
- Legal, accounting, consumer-protection, and payment-compliance review

These production controls must not be presented as already implemented in the university prototype.
