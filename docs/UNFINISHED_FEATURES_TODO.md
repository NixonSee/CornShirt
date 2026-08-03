# Completely Missing Features TODO

The Stripe MYR, Ticket NFT, My Tickets transfer, Marketplace settlement,
cancellation, and refund workflows now have meaningful implementations.
Remaining work is tracked as verification or hardening rather than as a
completely missing feature.

## Remaining advanced work

- [ ] **Admin reconciliation endpoint** - Compare stored workflow state with
  Stripe objects and local Hardhat receipts, then resume safe incomplete
  operations without repeating completed side effects.
- [ ] **Automated live integration suite** - Run Supabase migration fixtures,
  Stripe CLI webhook delivery, and local Hardhat receipts in one isolated test
  environment.

## Deployment prerequisite

Run
`scripts/sql/2026-07-23-stripe-ticket-marketplace-workflows.sql`
in the Supabase SQL Editor before testing the new customer workflows.
