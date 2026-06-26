# CornShirt System Specifications

## 1. System Overview

CornShirt is a web-based concert ticketing platform that uses DICKEN tokens and NFT-based tickets. The system supports public event browsing, customer ticket purchasing, organizer event creation, and admin event approval.

---

## 2. Roles

| Role            | Description                                                                  | Permissions                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Visitor  | A person who has not logged in.                                              | Browse active events, search/filter events, view previews, register, and log in.                                                                                           |
| Customer        | A registered customer who purchases and manages tickets.                     | View active events, top up DICKEN, buy tickets, view platform-managed Ticket NFTs, view My Tickets, transfer eligible tickets, resell tickets at Marketplace, and claim refunds.                                        |
| Organizer       | A registered account that creates and manages concert events.                | Create events, upload banners, create ticket types, set ticket rules, view created events, check approval status, verify tickets, mark tickets as used, revenue analytics, and cancel events. |
| Admin           | A platform management account that reviews organizers and event submissions. | View organizers, review pending events, approve or reject events, monitor event statuses, and later view transactions and verification logs.                               |

### Role Access Rules

* Public Visitors can browse active events and access Login or Register pages.
* New public registrations are assigned the `customer` role by default.
* Only Organizers can create and manage events.
* Only Admins can approve or reject pending events.
* Only `active` events are shown to Public Visitors and Customers.
* Customers can top up DICKEN, buy tickets, view My Tickets, transfer eligible tickets, and claim refunds after logging in.
* Organizers and Admins can preview active event details, but management features remain inside their own dashboard routes.

---

## 3. Functional Requirements

### FR-01: Account Authentication

* The system shall allow accounts to register using name, email, and password.
* The system shall allow accounts to log in using email and password.
* The system shall redirect accounts based on their assigned role.
* The system shall store additional profile information in the `profiles` table.
* The system shall store only the assigned platform-managed wallet address in `profiles.wallet_address`.
* The system shall not store account passwords in the `profiles` table.

### FR-02: Event Browsing

* The system shall display only events with an `active` status to public visitors and customers.
* The system shall allow visitors to browse and filter active events.
* The system shall redirect unauthenticated visitors to Login or Register before protected actions.
* The system shall allow public visitors to view active event details and available ticket types.

### FR-03: Organizer Event Creation

* The system shall allow organizers to create event records.
* The system shall allow organizers to upload event banner images.
* The system shall allow organizers to create one or more ticket types for each event.
* Each ticket type shall include ticket name, DICKEN price, supply, purchase limit, and transfer permission.
* New events shall be saved with a `pending` status.

### FR-04: Admin Event Review

* The system shall allow admins to view pending event submissions.
* The system shall allow admins to approve an event by changing its status to `active`.
* The system shall allow admins to reject an event by changing its status to `draft`.
* Only active events shall appear in public event browsing.

### FR-05: DICKEN Top-Up

* The system shall allow customers to view their DICKEN balance.
* The system shall allow customers to top up DICKEN through Stripe Test Mode.
* The system shall record top-up information in `topup_records` and `transactions`.

### FR-06: Ticket Purchase and NFT Minting

* The system shall allow customers with sufficient DICKEN balance to purchase an available ticket.
* The system shall mint a platform-managed Ticket NFT after successful purchase.
* The system shall store ticket ownership, ticket status, NFT token ID, and transaction hash.
* The system shall prevent ticket purchases when an event is cancelled or ticket supply is unavailable.

### FR-07: Ticket Management

* The system shall allow customers to view purchased tickets in My Tickets.
* The system shall display ticket details, ticket status, QR code, and transaction hash.
* The system shall allow customers to transfer an eligible ticket to another supported customer account or wallet address when transfer permission is enabled.
* The system shall update the ticket ownership record after a successful transfer.
* The system shall allow customers to claim refunds after an event is cancelled.

### FR-08: Ticket Verification

* The system shall allow organizers to verify a ticket through its QR code.
* The system shall show whether a ticket is valid, invalid, already used, refunded, or cancelled.
* The system shall allow organizers to mark a valid ticket as used.
* The system shall save verification results in `verification_logs`.

### FR-09: Ticket Resale Marketplace

- The system shall allow customers to list eligible tickets for resale.
- The system shall allow customers to set a resale price in DICKEN.
- The system shall allow customers to purchase listed resale tickets using DICKEN.
- The system shall transfer platform-managed Ticket NFT ownership to the resale buyer after successful payment.
- The system shall prevent resale when ticket transfer permission is disabled.
- The system shall allow ticket owners to cancel an active resale listing before it is purchased.
- The system shall record resale payments and ownership transfers in the `transactions` table.

### FR-10: Organizer Revenue Analytics

- The system shall allow organizers to view ticket sales for their own events.
- The system shall display total tickets sold and remaining ticket supply.
- The system shall display revenue by ticket type.
- The system shall display total DICKEN revenue generated from the organizer’s own events.
- The system shall display refund amounts for cancelled events.

---

## 4. Non-Functional Requirements

### Security

* Password authentication shall be handled through Supabase Auth.
* Account passwords shall not be stored in custom application tables.
* Customers shall not need to connect external wallets or provide private keys or seed phrases.
* Supabase service-role keys, platform-wallet private keys, and backend signing secrets shall remain server-only and stored in environment variables.
* Role-based access shall restrict access to Customer, Organizer, and Admin dashboard functions.

### Usability

* The system shall provide responsive layouts for desktop and mobile screens.
* Accounts shall receive clear success, error, loading, and empty-state messages.
* The system shall use understandable labels for DICKEN balance, ticket purchase, and ticket verification.

### Performance

* Active event listings should load efficiently from Supabase.
* Event banner images should be stored using Supabase Storage.
* Database queries should request only the fields required by the page.

---

## 5. Main Business Rules

| Rule ID | Rule                                                                    |
| ------- | ----------------------------------------------------------------------- |
| BR-01   | New public registrations are assigned the `customer` role by default.   |
| BR-02   | Only organizers can create events.                                      |
| BR-03   | New organizer events are saved as `pending`.                            |
| BR-04   | Only admins can change an event from `pending` to `active`.             |
| BR-05   | Public visitors and customers can only browse `active` events.          |
| BR-06   | Ticket types must belong to one event.                                  |
| BR-07   | Ticket purchases cannot exceed the ticket supply or purchase limit.     |
| BR-08   | Used, refunded, cancelled, or invalid tickets cannot be used for entry. |
| BR-09   | A ticket can only be transferred when its ticket type allows transfer.  |
| BR-10   | Refunds are only available after an event has been cancelled.           |
| BR-11   | A ticket can only be listed for resale when its ticket type allows transfer. |
| BR-12   | A resale listing becomes unavailable after it is cancelled or purchased. |
---

## 6. Out of Scope / Future Features

* Platform fee calculation
* Advanced admin account suspension controls
* Advanced transaction analytics
* Multi-chain deployment
