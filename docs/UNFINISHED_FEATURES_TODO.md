# Completely Missing Features TODO

This checklist contains only requirements with no meaningful implementation in the current repository. Completed and partially implemented features are intentionally excluded.

Sources: `SPECS.md`, `ROLE_FEATURES_AND_FLOW.md`, `API_AND_ROUTES.md`, and `SMART_CONTRACTS.md`.

## 1. Blockchain and Token Infrastructure

- [ ] **Local Hardhat blockchain runtime and deployment workflow** - Requirements: `FR-05`, `FR-06`; Roles: Customer, Organizer
  - Missing behavior: The repository has Hardhat and OpenZeppelin dependencies, but no Hardhat configuration, contract source directory, deployment script, or saved local deployment addresses.
  - Complete when: A documented command starts the local Hardhat node, deploys CornShirt contracts, and writes addresses that the Next.js server can load.
  - Prerequisite: None.

- [ ] **DICKEN ERC-20 smart contract** - Requirement: `FR-05`; Roles: Customer
  - Missing behavior: No ERC-20 contract defines DICKEN supply, balances, transfers, or controlled minting for successful top-ups.
  - Complete when: DICKEN deploys on local Hardhat and automated contract tests prove authorized minting, balance lookup, and token transfer behavior.
  - Prerequisite: Local Hardhat blockchain runtime and deployment workflow.

- [ ] **Ticket ERC-721 smart contract** - Requirement: `FR-06`; Roles: Customer, Organizer
  - Missing behavior: No ERC-721 contract defines unique CornShirt tickets, platform-controlled minting, ownership lookup, or ownership transfer.
  - Complete when: The ticket contract deploys locally and automated contract tests prove minting to a managed customer wallet, ownership lookup, and transfer behavior.
  - Prerequisite: Local Hardhat blockchain runtime and deployment workflow.

## 2. Refunds and Cancellation Settlement

- [ ] **Organizer event cancellation workflow** - Requirement: `FR-07`; Roles: Organizer
  - Missing behavior: Organizers can view cancelled statuses, but no organizer control or authorized API changes an eligible event to `cancelled` and saves a cancellation reason.
  - Complete when: An organizer can cancel their eligible event, provide a reason, and the event becomes unavailable for new ticket purchases.
  - Prerequisite: None.

- [ ] **Refund eligibility and customer claim workflow** - Requirement: `FR-07`; Roles: Customer, Organizer
  - Missing behavior: The application can display refund-labelled transaction data, but it has no service, API, or customer action that marks affected tickets eligible and processes a refund after event cancellation.
  - Complete when: Cancelling an event makes its valid tickets refund-eligible, an affected customer can claim once, DICKEN is returned, ticket status becomes `refunded`, and the refund transaction is recorded.
  - Prerequisite: Organizer event cancellation workflow and DICKEN ERC-20 smart contract.

## Maintenance

Remove an item from this document as soon as meaningful implementation begins. Track its remaining work in the relevant implementation plan rather than keeping partial features in this missing-only list.
