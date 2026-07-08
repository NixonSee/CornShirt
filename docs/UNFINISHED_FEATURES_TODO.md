# Completely Missing Features TODO

This checklist contains only requirements with no meaningful implementation in the current repository. Completed and partially implemented features are intentionally excluded.

Sources: `SPECS.md`, `ROLE_FEATURES_AND_FLOW.md`, `API_AND_ROUTES.md`, and `SMART_CONTRACTS.md`.

## 1. Ticket NFT Infrastructure

- [ ] **Local Hardhat Ticket NFT runtime and deployment workflow** - Requirement: `FR-06`; Roles: Customer, Admin
  - Missing behavior: The repository has Hardhat and OpenZeppelin dependencies, but no Hardhat configuration, `CornShirtTicket` contract, deployment script, role setup, or saved local deployment address.
  - Complete when: A documented command starts the local node, deploys the Ticket NFT contract, assigns protected mint/burn roles, saves deployment data, and automated contract tests pass.
  - Prerequisite: None.

- [ ] **Ticket NFT mint, transfer, ownership, and refund-burn services** - Requirements: `FR-06`, `FR-08`, `FR-09`, `FR-10`; Roles: Customer, Admin
  - Missing behavior: No server service currently mints after verified payment, transfers an existing NFT from a managed customer wallet, reconciles `ownerOf`, or performs a protected refund burn.
  - Complete when: Server-only Viem services wait for successful local receipts, preserve idempotency, and never expose signing keys.
  - Prerequisite: Local Hardhat Ticket NFT runtime and deployment workflow.

## 2. Stripe Purchase and Resale Settlement

- [ ] **Primary MYR Checkout and verified webhook workflow** - Requirements: `FR-05`, `FR-06`; Role: Customer
  - Missing behavior: The event purchase button does not create a Stripe Test Checkout Session, reserve inventory, verify a webhook, or resume an idempotent ticket operation.
  - Complete when: One verified MYR payment mints exactly one Ticket NFT and finalizes one ticket only after its blockchain receipt succeeds.
  - Prerequisite: Integer-sen MYR schema and Ticket NFT services.

- [ ] **Resale MYR Checkout, NFT delivery, and simulated seller proceeds** - Requirement: `FR-09`; Role: Customer
  - Missing behavior: Customers can create/cancel listings, but cannot pay for a listing or receive its existing NFT.
  - Complete when: A verified resale payment transfers the existing NFT, changes ownership, closes the listing, records simulated MYR proceeds, and recovers or refunds once after failed delivery.
  - Prerequisite: Primary Stripe workflow and Ticket NFT transfer service.

## 3. Refunds and Cancellation

- [ ] **Organizer/admin event cancellation workflow** - Requirement: `FR-10`; Roles: Organizer, Admin
  - Missing behavior: Cancelled statuses can be displayed, but no authorized action stores a reason, blocks new purchases, and marks affected valid tickets refund-eligible.
  - Complete when: Only the event's approved organizer or an admin can cancel an eligible event and create refund eligibility.
  - Prerequisite: None.

- [ ] **Stripe test refund and controlled NFT burn** - Requirement: `FR-10`; Roles: Customer, Admin
  - Missing behavior: Refund-labelled history can be displayed, but no claim identifies the latest Stripe payer, refunds that paid acquisition, burns the surrendered NFT, or reverses simulated accounting.
  - Complete when: An eligible ticket can be claimed once, the latest payer receives one Stripe test refund, the current owner surrenders the NFT, the protected burner burns it, and the ticket becomes `refunded` after confirmed results.
  - Prerequisite: Event cancellation, Stripe payment records, and Ticket NFT burn service.

## Maintenance

Remove an item as soon as meaningful implementation begins. Track remaining partial work in its implementation plan rather than keeping it in this missing-only list.
