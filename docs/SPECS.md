# CornShirt System Specification

## 1. Overview

CornShirt is a web-based concert ticketing prototype. Customers browse events and pay in Malaysian Ringgit through Stripe Test Mode. Successful primary purchases mint a Ticket NFT to a CornShirt-managed customer wallet on local Hardhat. The system also supports organizer event management, admin approval, direct ticket transfer, resale, QR verification, cancellation, and test refunds.

No real money or real payouts are used. Organizer revenue and resale seller proceeds are simulated MYR accounting records in Supabase.

## 2. Roles

| Role | Purpose | Main capabilities |
| --- | --- | --- |
| Visitor | Unauthenticated event browser | Browse active events, view details, register, and log in. |
| Customer | Registered ticket holder | Buy tickets in MYR, own Ticket NFTs in a managed wallet, view QR tickets, transfer eligible tickets, list/buy resale tickets, and claim eligible refunds. |
| Organizer | Approved event operator | Create and manage events, set MYR prices, view simulated MYR revenue, cancel eligible owned events, and verify QR tickets. |
| Admin | Platform operator | Approve organizers and events, monitor events and simulated MYR activity, cancel eligible events, and reconcile workflow state. |

Only customer accounts receive CornShirt-managed blockchain wallets.

## 3. Functional Requirements

### FR-01: Authentication and Role Access

- The system shall support registration, login, logout, and role-aware redirects.
- Protected pages and APIs shall authorize the active user on the server.
- Registration shall keep the current immediate-login experience.
- Customer profile and wallet provisioning failures shall be recoverable without exposing secrets.

### FR-02: Event Discovery

- Visitors and customers shall browse active approved events.
- Event details shall show artist, venue, date, ticket types, availability, transfer permission, and MYR price.
- Unavailable or unapproved events shall not accept purchases.

### FR-03: Organizer Event Management

- An approved organizer shall create and edit eligible events.
- Venue zones shall become ticket types with MYR prices, fixed supply, purchase limits, and transfer permission.
- Events shall require admin approval before public sale.
- Only the event's approved organizer or an admin shall cancel an eligible event.

### FR-04: Managed Customer Wallets

- The system shall automatically provision one managed wallet for each customer account only.
- Wallet creation shall atomically insert the custodial wallet and update the customer wallet address/status through the approved PostgreSQL RPC.
- Private keys shall be encrypted with AES-256-GCM and remain server-only.
- Managed wallets shall hold and transfer Ticket NFTs on local Hardhat.

### FR-05: Stripe MYR Payments

- Primary and resale purchases shall use Stripe Test Mode directly in MYR.
- Stripe amounts shall use integer sen loaded from authoritative server records.
- A verified webhook, not the browser redirect, shall confirm payment.
- Webhook processing and purchase operations shall be idempotent.
- The system shall not accept real money or make real payouts.

### FR-06: Primary Ticket Purchase and NFT Minting

- The system shall validate event status, inventory, purchase limits, price, and wallet readiness before checkout.
- Inventory shall be reserved while the Stripe Checkout Session is active.
- After verified payment, the platform shall mint exactly one Ticket NFT to the customer's managed wallet.
- Supabase shall finalize the ticket only after the expected local Hardhat receipt succeeds.
- The system shall record Stripe references, NFT token ID, transaction hash, QR data, and simulated organizer MYR revenue.

### FR-07: My Tickets and Verification

- Customers shall view owned tickets, status, event details, managed-wallet address, NFT reference, and QR code.
- Only an authorized organizer for the ticket's event shall verify and use a currently valid ticket.
- Repeated, invalid, refunded, cancelled, or wrong-event scans shall be rejected safely.

### FR-08: Direct Transfer

- A customer shall transfer an eligible existing Ticket NFT to another registered customer.
- The server shall verify ownership, recipient, ticket/event status, and transfer permission before signing.
- Direct transfer shall create no Stripe payment and mint no replacement NFT.
- The UI shall disclose that a cancellation refund returns to the latest Stripe payer, who may differ from the current owner after a free transfer.

### FR-09: Resale Marketplace

- Customers shall list eligible owned tickets at a positive MYR price with at most two decimal places.
- Only one active listing shall exist per ticket.
- A resale buyer shall pay through Stripe Test Mode.
- After verified payment, the seller's managed wallet shall transfer the existing NFT to the buyer.
- Seller proceeds shall be recorded as simulated MYR accounting only; Stripe Connect is not used.
- Failed NFT delivery after payment shall remain recoverable or trigger exactly one Stripe test refund.

### FR-10: Cancellation and Refunds

- Cancelling an event shall stop new purchases and make affected valid tickets refund-eligible.
- The current NFT owner shall surrender the ticket through one refund claim.
- Stripe shall refund the ticket's latest successful paid acquisition to its original payer.
- After the refund is verified, the protected platform burner shall burn the NFT.
- Supabase shall mark the ticket refunded only after required external results are confirmed and shall reverse the linked simulated accounting entry.

### FR-11: Transactions and Analytics

- Customers shall view purchases, refunds, resale activity, and public NFT transaction references.
- Organizers and admins shall view values clearly labelled in MYR.
- Reports shall not imply that simulated revenue or proceeds are real payouts.
- Admin reconciliation shall detect disagreements among Stripe, local Hardhat, and Supabase.

## 4. Non-Functional Requirements

- Use Next.js App Router, Supabase, Stripe Test Mode, Viem, Hardhat, and OpenZeppelin.
- Use local Hardhat only; do not deploy contracts to a public network.
- Do not add external-wallet connection UI.
- Never expose managed-wallet private keys, encryption keys, platform signer keys, Stripe secrets, or the Supabase service-role key.
- Use explicit recoverable workflow states for operations spanning Stripe, blockchain receipts, and Supabase.
- Preserve responsive, accessible interfaces and clear loading, empty, error, and recovery states.
- Implement and verify one roadmap phase at a time.
