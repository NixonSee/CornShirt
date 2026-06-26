# CornShirt Features and Flow

## 1. Roles and Permissions

# CornShirt Roles, Features and Permissions
## Public Visitor
* Browse active events
* Search or filter active events
* * View active event details, including artist, venue, date, description, and ticket types
* Redirect to Login or Sign Up when attempting protected actions, such as buying tickets, accessing My Tickets, topping up DICKEN, or opening dashboards

---

## Customer
### Account and Wallet
* Register and log in using email and password
* Access a system-managed CornShirt wallet
* Use an assigned wallet address stored in `profiles.wallet_address`
* View DICKEN token balance
* Top up DICKEN through Stripe Test Mode
* Receive platform-managed Ticket NFTs through the CornShirt wallet

### Event and Ticket Features
* Browse active admin-approved events
* View event details and available ticket types
* Top up DICKEN through Stripe Test Mode
* Buy tickets using DICKEN
* Receive a platform-managed Ticket NFT after successful purchase
* View My Tickets
* View ticket details, ownership status, and transaction hash
* Display or download a digital ticket
* View ticket QR code
* View transaction history
* Transfer eligible tickets to another supported wallet address or account
* Claim a refund when an event is cancelled

### Marketplace
* List eligible tickets for resale
* Set a resale price in DICKEN
* View active resale listings
* Purchase resale tickets using DICKEN
* Cancel an active resale listing
* Transfer platform-managed Ticket NFT ownership to the resale buyer after successful payment
* Prevent resale when ticket transfer permission is disabled
* View resale transaction history

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
* Cancel events and provide a cancellation reason
* Trigger refund eligibility for affected valid ticket holders after cancellation
* View refund records related to cancelled events

### Financial Management
* View ticket sales for each event
* View total tickets sold and remaining ticket supply
* View revenue by ticket type
* View total revenue earned in DICKEN
* View transaction records related to the organizer’s events
* View refund amounts for cancelled events

> Note: Financial information becomes available after customers begin purchasing tickets and transaction records are created.

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
Views event details and ticket types
↓
Clicks Buy Ticket
↓
Redirected to Login/Register if not authenticated
↓
After login, returns to the selected event

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

Customer visits an active event page
↓
Selects a ticket type
↓
Clicks Buy Ticket
↓
System checks whether the customer is logged in
↓
If not logged in, redirect to Login/Register
↓
Customer logs in and returns to the selected event
↓
System checks DICKEN balance
↓
Customer tops up DICKEN through Stripe Test Mode if balance is insufficient
↓
System deducts DICKEN balance
↓
Backend mints a platform-managed Ticket NFT
↓
Ticket appears in My Tickets

---

## 6. Ticket Resale Flow

Customer opens My Tickets
↓
Selects an eligible ticket
↓
System checks whether transfer permission is enabled
↓
Customer sets a resale price in DICKEN
↓
Ticket is listed in the Marketplace
↓
Another customer purchases the resale ticket
↓
System transfers DICKEN payment to the seller
↓
System transfers platform-managed Ticket NFT ownership to the buyer
↓
Resale transaction is recorded

---

## 7. Ticket Verification Flow

Organizer scans ticket QR code
↓
System checks ticket status
↓
Shows valid / invalid / used / refunded result
↓
Organizer marks valid ticket as used
