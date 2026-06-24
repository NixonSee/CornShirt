# CornShirt System Specifications

## 1. System Overview

CornShirt is a web-based concert ticketing platform that uses DICKEN tokens and NFT-based tickets. The system supports public event browsing, user ticket purchasing, organizer event creation, and admin event approval.

---

## 2. User Roles

| Role            | Description                                                                  | Permissions                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Visitor  | A person who has not logged in.                                              | Browse active events, search/filter events, view previews, register, and log in.                                                                                           |
| Customer / User | A registered user who purchases and manages tickets.                         | View active events, top up DICKEN, buy tickets, receive Ticket NFTs, view My Tickets, transfer eligible tickets, resell ticket at Marketplace, and claim refunds.                                        |
| Organizer       | A registered account that creates and manages concert events.                | Create events, upload banners, create ticket types, set ticket rules, view created events, check approval status, verify tickets, mark tickets as used, revenue analytics, and cancel events. |
| Admin           | A platform management account that reviews organizers and event submissions. | View organizers, review pending events, approve or reject events, monitor event statuses, and later view transactions and verification logs.                               |

### Role Access Rules

* Public Visitors can browse active events and access Login or Register pages.
* New public registrations are assigned the `user` role by default.
* Only Organizers can create and manage events.
* Only Admins can approve or reject pending events.
* Only `active` events are shown to Public Visitors and Customers.
* Customers can top up DICKEN, buy tickets, view My Tickets, transfer eligible tickets, and claim refunds after logging in.
* Organizers and Admins can preview active event details, but management features remain inside their own dashboard routes.

---

## 3. Functional Requirements

### FR-01: User Authentication

* The system shall allow users to register using name, email, and password.
* The system shall allow users to log in using email and password.
* The system shall redirect users based on their assigned role.
* The system shall store additional profile information in the `profiles` table.
* The system shall not store user passwords in the `profiles` table.

### FR-02: Event Browsing

* The system shall display only events with an `active` status to public visitors and users.
* The system shall allow visitors to browse and filter active events.
* The system shall redirect unauthenticated visitors to Login or Register before protected actions.

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

* The system shall allow users to view their DICKEN balance.
* The system shall allow users to top up DICKEN through Stripe Test Mode.
* The system shall record top-up information in `topup_records` and `transactions`.

### FR-06: Ticket Purchase and NFT Minting

* The system shall allow users with sufficient DICKEN balance to purchase an available ticket.
* The system shall mint a Ticket NFT after successful purchase.
* The system shall store ticket ownership, ticket status, NFT token ID, and transaction hash.
* The system shall prevent ticket purchases when an event is cancelled or ticket supply is unavailable.

### FR-07: Ticket Management

* The system shall allow users to view purchased tickets in My Tickets.
* The system shall display ticket details, ticket status, QR code, and transaction hash.
* The system shall allow transfer only when transfer permission is enabled. (what will happen if the person cannot go and want to give it to another person)
* The system shall allow users to claim refunds after an event is cancelled.

### FR-08: Ticket Verification

* The system shall allow organizers to verify a ticket through its QR code.
* The system shall show whether a ticket is valid, invalid, already used, refunded, or cancelled.
* The system shall allow organizers to mark a valid ticket as used.
* The system shall save verification results in `verification_logs`.

### FR-09: Ticket Resale Marketplace

- The system shall allow users to list eligible tickets for resale.
- The system shall allow users to set a resale price in DICKEN.
- The system shall allow users to purchase listed resale tickets using DICKEN.
- The system shall transfer Ticket NFT ownership to the resale buyer after successful payment.
- The system shall prevent resale when ticket transfer permission is disabled.

### FR-10: Organizer Revenue Analytics

- The system shall allow organizers to view ticket sales for their own events.
- The system shall display total tickets sold and remaining ticket supply.
- The system shall display revenue by ticket type.
- The system shall display total revenue earned in DICKEN.
- The system shall display refund amounts for cancelled events.

---

## 4. Non-Functional Requirements

### Security

* Password authentication shall be handled through Supabase Auth.
* User passwords shall not be stored in custom application tables.
* User private keys and seed phrases shall never be stored by CornShirt.
* Supabase service-role keys and blockchain private keys shall remain server-only and stored in environment variables.
* Role-based access shall restrict access to User, Organizer, and Admin dashboard functions.

### Usability

* The system shall provide responsive layouts for desktop and mobile screens.
* Users shall receive clear success, error, loading, and empty-state messages.
* The system shall use understandable labels for DICKEN balance, ticket purchase, and ticket verification.

### Performance

* Active event listings should load efficiently from Supabase.
* Event banner images should be stored using Supabase Storage.
* Database queries should request only the fields required by the page.

---

## 5. Main Business Rules

| Rule ID | Rule                                                                    |
| ------- | ----------------------------------------------------------------------- |
| BR-01   | New public registrations are assigned the `user` role by default.       |
| BR-02   | Only organizers can create events.                                      |
| BR-03   | New organizer events are saved as `pending`.                            |
| BR-04   | Only admins can change an event from `pending` to `active`.             |
| BR-05   | Public visitors and users can only browse `active` events.              |
| BR-06   | Ticket types must belong to one event.                                  |
| BR-07   | Ticket purchases cannot exceed the ticket supply or purchase limit.     |
| BR-08   | Used, refunded, cancelled, or invalid tickets cannot be used for entry. |
| BR-09   | A ticket can only be transferred when its ticket type allows transfer.  |
| BR-10   | Refunds are only available after an event has been cancelled.           |

---

## 6. Out of Scope / Future Features

* Platform fee calculation
* Advanced admin user suspension controls
* Advanced transaction analytics
* Multi-chain deployment
