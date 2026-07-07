# CornShirt Smart Contracts Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `docs/SMART_CONTRACTS.md` with the approved system-wide Web3 architecture reference and ordered implementation roadmap for the local Hardhat prototype.

**Architecture:** Document the hybrid boundary where local Hardhat owns ERC-20 balances and ERC-721 ownership, Supabase owns application workflow state, and authenticated Next.js server routes coordinate signing and synchronization. The document is descriptive and prescriptive; it does not implement contracts or application code.

**Tech Stack:** Markdown, Hardhat 3, Solidity, OpenZeppelin Contracts, Viem, Next.js, Supabase, Stripe Test Mode

---

### Task 1: Write the complete Web3 architecture reference

**Files:**
- Modify: `docs/SMART_CONTRACTS.md`
- Read: `docs/superpowers/specs/2026-07-07-cornshirt-web3-architecture-reference-design.md`
- Cross-check: `docs/SPECS.md`
- Cross-check: `docs/ROLE_FEATURES_AND_FLOW.md`
- Cross-check: `docs/API_AND_ROUTES.md`
- Cross-check: `docs/UNFINISHED_FEATURES_TODO.md`

- [ ] **Step 1: Add scope, terminology, and architecture ownership**

Write sections that explicitly state:

```markdown
# CornShirt Web3 and Smart Contract Reference

## 1. Purpose and Prototype Boundary
## 2. Architecture Overview
## 3. On-Chain and Supabase Responsibilities
## 4. Terminology
```

The boundary must say local Hardhat and Stripe Test Mode only, no real customer money, customer-only managed wallets, blockchain authority for DICKEN balances and NFT ownership, and Supabase authority for business workflow and operational ticket status.

- [ ] **Step 2: Specify wallets, signers, roles, and contracts**

Add these sections:

```markdown
## 5. Wallets, Signers, and Contract Roles
## 6. DICKEN ERC-20 Specification
## 7. CornShirt Ticket ERC-721 Specification
## 8. Platform Treasury and Organizer Revenue
```

Document AES-256-GCM customer custody, server-only decryption, deployer/admin/minter/burner responsibilities, the `1 DICKEN = RM 1.00` application rule, ERC-20 mint/transfer/refund behavior, ERC-721 mint/owner/transfer behavior, and the Supabase organizer revenue ledger.

Specify the custom refund function `burnRefundedTicket(uint256 tokenId)`. Only `BURNER_ROLE` may call it, and it deliberately uses the contract's internal burn path without customer approval after the backend verifies the completed refund. State that this trusted role can technically burn any NFT and therefore must remain a protected server-only capability.

For transfer permission, keep server-side enforcement for the managed-wallet MVP. Explicitly state that standard ERC-721 transfers do not enforce Supabase `transfer_allowed`, and record on-chain `tokenId -> transferAllowed` enforcement as a future hardening option.

- [ ] **Step 3: Specify local Hardhat deployment and configuration**

Add:

```markdown
## 9. Local Hardhat Environment
## 10. Deployment Outputs and Environment Variables
```

List required deployment outputs and these environment-variable responsibilities without inserting secret values:

```text
HARDHAT_RPC_URL
HARDHAT_CHAIN_ID
DICKEN_CONTRACT_ADDRESS
TICKET_NFT_CONTRACT_ADDRESS
PLATFORM_TREASURY_ADDRESS
PLATFORM_DEPLOYER_PRIVATE_KEY
WALLET_ENCRYPTION_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Explain that a reset local chain invalidates deployed addresses, transaction hashes, token IDs, balances, and Supabase demo records linked to the old chain.

- [ ] **Step 4: Document every execution flow**

Add:

```markdown
## 11. Web3 Execution Flows
### 11.1 Customer Wallet Provisioning
### 11.2 Stripe Top-Up and DICKEN Minting
### 11.3 DICKEN Balance Reading
### 11.4 Primary Ticket Purchase and NFT Minting
### 11.5 Direct Ticket Transfer
### 11.6 Resale Purchase and Ownership Transfer
### 11.7 Event Cancellation and Refund
### 11.8 QR Ticket Verification
```

For each flow, identify the authenticated actor, authoritative validation, blockchain writes, receipt checks, Supabase writes, returned public data, and retry boundary. State that resale uses two sequential prototype transactions and would need an escrow contract for production atomicity.

The refund flow must call `burnRefundedTicket(tokenId)` through `BURNER_ROLE`. The cancellation flow must state that Supabase permits only the event's approved organizer or an admin to cancel an eligible event.

- [ ] **Step 5: Document workflow state, security, testing, and roadmap**

Add:

```markdown
## 12. Supabase Records and Workflow States
## 13. Idempotency, Failure Recovery, and Reconciliation
## 14. Security Rules
## 15. Testing Strategy
## 16. Implementation Rules
## 17. Phased Implementation Roadmap
## 18. Future Production Considerations
```

Require operation states `pending`, `payment_confirmed`, `asset_confirmed`, `completed`, and `failed`; public transaction hashes; receipt verification; database concurrency guards; retry-from-last-confirmed-state behavior; explicit server authorization; contract tests; and integration tests.

Insert these strict rules exactly:

```markdown
- Implement one roadmap phase at a time.
- Do not add MetaMask, Reown, or external wallet connection UI.
- Do not expose private keys, Supabase service-role keys, or Stripe secrets.
- Do not mark Supabase transactions as complete until the expected blockchain receipt succeeds.
- Do not replace real blockchain balances with a database balance.
- Use local Hardhat only; do not deploy to public networks.
- Ask for confirmation before changing this document, database architecture, or contract business rules.
```

Replace the flat roadmap with these phases:

```markdown
### Phase 1: Blockchain Foundation
- Hardhat setup
- DICKEN ERC-20
- Ticket ERC-721
- Contract deployment
- Managed customer wallets

### Phase 2: DICKEN Top-Up
- Read DICKEN balance
- Stripe Test Mode top-up
- Mint DICKEN after verified webhook

### Phase 3: Primary Ticketing
- Primary ticket purchase
- NFT mint
- My Tickets
- QR verification

### Phase 4: Ownership and Recovery
- Direct transfer
- Resale marketplace
- Refund and NFT burn
- Reconciliation and deeper analytics
```

### Task 2: Document planned Web3 APIs and blockchain interfaces

**Files:**
- Modify: `docs/API_AND_ROUTES.md`
- Cross-check: `docs/SMART_CONTRACTS.md`

- [ ] **Step 1: Preserve and clarify implemented API routes**

Keep implemented routes under `## Implemented API Routes` and specify their current methods:

```markdown
- `POST /api/customer/wallet/provision`
- `POST /api/customer/marketplace`
- `DELETE /api/customer/marketplace/[listingId]`
```

Do not move planned routes into this section.

- [ ] **Step 2: Add planned Web3 routes grouped by phase**

Add `## Planned Web3 API Routes` with these phase groups:

```markdown
### Phase 2: DICKEN Top-Up
- `GET /api/customer/dicken/balance`
- `POST /api/customer/top-ups/checkout`
- `POST /api/webhooks/stripe`
- `GET /api/customer/top-ups/[topUpId]`

### Phase 3: Primary Ticketing
- `POST /api/customer/tickets/purchase`
- `POST /api/organizer/tickets/verify`
- `POST /api/organizer/tickets/[ticketId]/use`

### Phase 4: Ownership and Recovery
- `POST /api/customer/tickets/[ticketId]/transfer`
- `POST /api/customer/marketplace/[listingId]/purchase`
- `POST /api/organizer/events/[eventId]/cancel`
- `POST /api/customer/refunds/claim`
- `POST /api/admin/web3/reconcile`
```

Describe each route's authorization and public result without claiming it exists.

- [ ] **Step 3: Add planned blockchain interfaces separately**

Add:

```markdown
## Planned Blockchain Interfaces

### `DickenToken` ERC-20
- `balanceOf(address)`
- `transfer(address,uint256)`
- role-controlled `mint(address,uint256)`

### `CornShirtTicket` ERC-721
- `ownerOf(uint256)`
- `safeTransferFrom(address,address,uint256)`
- role-controlled ticket minting
- `burnRefundedTicket(uint256)` restricted to `BURNER_ROLE`
```

State that these are local Hardhat contract methods, not HTTP endpoints, and that browser code uses authenticated Next.js APIs for state-changing operations.

### Task 3: Verify consistency and document quality

**Files:**
- Verify: `docs/SMART_CONTRACTS.md`
- Verify: `docs/API_AND_ROUTES.md`
- Compare: `docs/superpowers/specs/2026-07-07-cornshirt-web3-architecture-reference-design.md`

- [ ] **Step 1: Verify every required section exists once**

Run:

```powershell
rg -n '^#|^##|^###' docs/SMART_CONTRACTS.md
```

Expected: one title, sections 1 through 18, execution-flow subsections 11.1 through 11.8, and four roadmap phases.

- [ ] **Step 2: Verify critical architectural decisions**

Run:

```powershell
rg -n 'local Hardhat|Stripe Test Mode|customer.*managed wallet|Supabase|DICKEN|ERC-20|ERC-721|treasury|idempotency|reconciliation|escrow|AES-256-GCM|Implementation Rules' docs/SMART_CONTRACTS.md
```

Expected: every listed concept appears in its relevant section without contradicting the approved design, and all seven implementation rules are present.

- [ ] **Step 3: Verify API status boundaries and contract interfaces**

Run:

```powershell
rg -n 'Implemented API Routes|Planned Web3 API Routes|Phase 2|Phase 3|Phase 4|Planned Blockchain Interfaces|DickenToken|CornShirtTicket|burnRefundedTicket|not HTTP endpoints' docs/API_AND_ROUTES.md
```

Expected: implemented routes remain separate, planned routes are phase-grouped, and contract methods are not described as HTTP endpoints.

- [ ] **Step 4: Verify no secrets or unfinished placeholders were inserted**

Run:

```powershell
rg -n 'TBD|TODO|implement later|sk_live_|sk_test_[A-Za-z0-9]|whsec_[A-Za-z0-9]|0x[0-9a-fA-F]{64}' docs/SMART_CONTRACTS.md docs/API_AND_ROUTES.md
```

Expected: no matches.

- [ ] **Step 5: Verify Markdown whitespace**

Run:

```powershell
git diff --check -- docs/SMART_CONTRACTS.md docs/API_AND_ROUTES.md
```

Expected: exit code 0 with no output.

- [ ] **Step 6: Review the final diff**

Run:

```powershell
git diff -- docs/SMART_CONTRACTS.md docs/API_AND_ROUTES.md
```

Expected: the strict rules appear in the smart-contract reference and the API document clearly separates implemented routes, planned Web3 routes, and planned contract interfaces.

- [ ] **Step 7: Commit the documentation changes**

```powershell
git add -- docs/SMART_CONTRACTS.md docs/API_AND_ROUTES.md
git commit -m "docs: define CornShirt Web3 interfaces"
```
