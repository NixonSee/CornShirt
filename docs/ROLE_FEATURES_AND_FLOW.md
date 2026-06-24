# CornShirt Features and Flow

## 1. Roles and Permissions

# CornShirt Roles, Features and Permissions
## Public Visitor
* Browse active events
* Search or filter active events
* View event previews
* Redirect to Login or Sign Up when attempting protected actions, such as viewing full event details, buying tickets, or accessing dashboards

---

## Customer
### Account and Wallet
* Register and log in using email and password
* Access a system-managed CornShirt wallet
* View DICKEN token balance
* Top up DICKEN through Stripe Test Mode
* Receive Ticket NFTs through the platform-managed wallet

### Event and Ticket Features
* Browse active admin-approved events
* View event details and available ticket types
* Top up DICKEN through Stripe Test Mode
* Buy tickets using DICKEN
* Receive a Ticket NFT after successful purchase
* View My Tickets
* View ticket details, ownership status, and transaction hash
* Display or download a digital ticket
* View ticket QR code
* View transaction history
* Transfer tickets to another wallet address
* Claim a refund when an event is cancelled

### Marketplace
* Resell tickets through the Marketplace

---

## Organizer
### Event Management
* Create events
* Upload event banner images
* Create ticket types
* Set ticket price in DICKEN
* Set ticket supply
* Set purchase limits
* Set ticket transfer permission
* View organizer-created events
* Check event approval status
* View event details and ticket types
* Edit draft events before submitting them for approval

### Ticket and Event Operations
* Verify tickets using QR code
* Mark verified tickets as used
* Cancel events
* Provide a cancellation reason
* Enable or manage refunds after event cancellation

### Financial Management
* View ticket sales for each event
* View total tickets sold and remaining ticket supply
* View revenue by ticket type
* View total revenue earned in DICKEN
* View transaction records related to the organizer’s events
* View refund amounts for cancelled events

> Note: Financial information becomes available after users begin purchasing tickets and transaction records are created.

---

## Admin
### Organizer and Event Management
* View organizers
* View organizer-created events
* Review pending event submissions
* Approve events
* Reject events or return events to draft status
* Monitor all platform events and their statuses
* View total organizers, pending events, active events, and total events

### Future Monitoring Features
* View transaction records, including top-ups, ticket purchases, transfers, and refunds
* View ticket verification logs
* Monitor cancelled events and refund statuses

---

## 2. Public Event Browsing Flow

Guest visits CornShirt
↓
Views active events
↓
Clicks View Event
↓
Redirected to Login/Register if not authenticated
↓
After login, returns to selected event

---

## 3. Organizer Event Creation Flow

Organizer logs in
↓
Opens Organizer Dashboard
↓
Clicks Create Event
↓
Adds event details and ticket types
↓
Event saved with status `pending`
↓
Admin reviews event

---

## 4. Admin Event Approval Flow

Admin logs in
↓
Opens Pending Events
↓
Reviews organizer event submission
↓
Approves event → status becomes `active`
or
Rejects event → status becomes `draft`
↓
Only active events appear to customers/public visitor

---

## 5. Ticket Purchase Flow

User logs in
↓
Clicks Buy Ticket
↓
Login / Register
↓
User opens Wallet & Balance page
↓
Top up DICKEN using Stripe Test Mode
↓
DICKEN balance increases
↓
User chooses ticket type
↓
System deducts DICKEN balance
↓
Backend mints Ticket NFT
↓
Ticket appears in My Tickets

---

## 6. Ticket Verification Flow

Organizer scans ticket QR code
↓
System checks ticket status
↓
Shows valid / invalid / used / refunded result
↓
Organizer marks valid ticket as used