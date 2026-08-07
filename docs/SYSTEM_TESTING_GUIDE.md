# CornShirt End-to-End System Testing Guide

This guide tests the complete CornShirt workflow: public browsing, organizer
onboarding, event approval, Stripe ticket purchases, My Tickets, direct
transfers, marketplace resale, QR admission, cancellation, and refunds.

The system is a university prototype. Use only:

- Stripe Test Mode
- The local Hardhat blockchain
- Test user accounts and test data
- MYR as the displayed currency

Never enter a real payment card or production secret.

## 1. Test objectives

The test run should prove that:

- Each role can access only its permitted pages and actions.
- An organizer can apply, be approved, and submit an event.
- An admin can review organizers and approve or reject events.
- An approved event becomes available to customers.
- A successful Stripe payment creates exactly one ticket and one NFT.
- Purchased tickets appear in My Tickets.
- Direct transfers preserve the same NFT and do not use Stripe.
- A marketplace resale transfers the existing NFT instead of minting another.
- Stripe webhook retries do not create duplicate records or payments.
- QR verification follows the current on-chain ticket owner and ticket status.
- Cancelled events allow eligible ticket holders to claim the correct refund.
- Database, Stripe, and blockchain records remain consistent.

## 2. Required test accounts

Prepare separate accounts so that role and ownership checks are meaningful.

| Account | Role | Purpose |
| --- | --- | --- |
| Admin A | Admin | Approve organizers and events; inspect administrative pages |
| Organizer A | Organizer | Create the main test event and verify its tickets |
| Organizer B | Organizer | Test access denial against Organizer A's event |
| Customer A | Customer | Primary buyer, sender, and marketplace seller |
| Customer B | Customer | Transfer recipient and marketplace buyer |
| Customer C | Customer, optional | Test concurrent marketplace checkout |

Use unique email addresses. Customer B must register before Customer A attempts
a direct transfer to that email address.

## 3. Recommended test event

Create one future event owned by Organizer A. Use several ticket types so each
feature can be tested without conflicting with a one-ticket-per-customer limit.

| Ticket type | Suggested purpose |
| --- | --- |
| Zone A | Direct transfer from Customer A to Customer B |
| Zone B | Marketplace listing, cancellation, relisting, and resale |
| Zone C | QR verification and admission |
| Zone D | Event cancellation and refund |
| Zone E | Optional concurrent checkout and failure cases |

Configure a price and supply for every venue zone. Enable transfer where
applicable. The UI should show ticket types in alphabetical order:
Zone A, Zone B, Zone C, Zone D, then Zone E.

## 4. One-time database preparation

Back up the Supabase project before applying migrations.

For a database that has not received the Stripe ticket marketplace schema, run
this file once in the Supabase SQL Editor:

`scripts/sql/2026-07-23-stripe-ticket-marketplace-workflows.sql`

If the project previously ran an older version of that migration, also run this
repair once:

`scripts/sql/2026-07-23-repair-resale-finalization.sql`

Do not rerun these scripts before every test cycle. Confirm that the expected
tables exist, including:

- `custodial_wallets`
- `resale_listings`
- `seller_proceeds`
- `stripe_webhook_events`
- `ticket_operations`
- `tickets`
- `transactions`

Legacy tickets without a confirmed blockchain token ID are not suitable for
transfer, resale, refund, or on-chain QR tests. Buy fresh tickets during this
test run.

## 5. Environment checklist

Confirm `.env.local` contains values for these keys:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
WALLET_ENCRYPTION_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_PROJECT_ID
PLATFORM_CONTRACT_PRIVATE_KEY
HARDHAT_RPC_URL
TICKET_NFT_CONTRACT_ADDRESS
```

Do not print or paste the values into test notes. The Stripe keys must belong to
Test Mode.

## 6. Start the local services

Use four terminals and keep all of them running during the test.

### Terminal 1: local blockchain

```bash
npm run hardhat:node
```

Do not restart the Hardhat node in the middle of an end-to-end scenario. Its
chain state is temporary.

### Terminal 2: compile and deploy the ticket contract

Run these commands after starting a fresh Hardhat node:

```bash
npm run hardhat:compile
npm run hardhat:deploy
```

Deployment updates `TICKET_NFT_CONTRACT_ADDRESS` in `.env.local`.

If the Hardhat node is restarted, deploy again and use fresh test tickets.
Existing Supabase token IDs may refer to the previous chain and must not be used
as proof against the new chain.

### Terminal 3: Stripe webhook forwarding

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the newly printed `whsec_...` signing secret into
`STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Terminal 4: Next.js

Start or restart Next.js after changing `.env.local`:

```bash
npm run dev
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks
`npm.ps1`.

## 7. Baseline automated checks

Run the available project checks before manual testing:

```bash
npm run lint
npm run test:helpers
npm run test:contracts
```

`test:contracts` requires the local Hardhat node.

Also perform a production build:

```bash
npm run build
```

Stop the development server before building on Windows if `.next` is locked.
Restart `npm run dev` afterward.

Record the result of every command. A pre-existing warning can be documented,
but a new error should be fixed before continuing.

## 8. Full manual test flow

### Phase A: public visitor experience

1. Open `/` while logged out.
2. Confirm the navbar does not cover the top of the hero image.
3. Confirm the hero, carousel controls, search, filters, and event cards render.
4. Open an active event and verify its details.
5. Confirm prices use MYR formatting, for example `RM95.00`.
6. Confirm ticket types are ordered alphabetically.
7. Search for an artist, event, or venue and verify the results.
8. Change the event filter and verify that the displayed events change.
9. Visit `/visitor/about` and `/visitor/apply`.
10. Try opening customer, organizer, and admin routes while logged out.

Expected:

- Only active public events are shown.
- No private customer, organizer, or admin data is exposed.
- Protected routes redirect to login or return an authorization error.
- Navigation remains usable on desktop and mobile widths.

### Phase B: organizer application and approval

1. Log out and open `/visitor/apply`.
2. Complete all application steps with Organizer A's details.
3. Upload all three required documents.
4. Submit the application once.
5. Log in as Admin A.
6. Open `/admin/partner-applications`.
7. Review and approve Organizer A's application.
8. Open the invitation email sent to Organizer A.
9. Follow the invitation link and set the organizer password.
10. Log in as Organizer A.

Expected:

- Incomplete steps or missing documents prevent submission.
- The application appears once in the admin review queue.
- Approval creates or updates the organizer profile.
- The invitation link leads to the password setup flow.
- Organizer A can access organizer pages but not admin pages.

Repeat separately with another test application and reject it. Confirm the
rejected applicant does not receive organizer access.

### Phase C: event creation and admin approval

1. Log in as Organizer A.
2. Open `/organizer/create-event`.
3. Enter a future date, event name, description, venue, and banner.
4. Set a price and supply for every venue zone.
5. Configure transfer and purchase limits as required.
6. Submit the event.
7. Confirm it appears as pending under `/organizer/events`.
8. While pending, edit a harmless field and save it.
9. Log out and check that the pending event is not public.
10. Log in as Admin A and open `/admin/pending-events`.
11. Review and approve the event.
12. Return to the public and customer event pages.

Expected:

- The form rejects missing required fields and unpriced venue zones.
- A newly submitted event is pending, not immediately active.
- The owner can edit the event while it is pending.
- Approval changes it to active and makes it publicly purchasable.
- Ticket supply, prices, limits, and transfer settings match the submission.
- Zone A appears above Zone B, and so on.

Test rejection with a separate event. Confirm a rejected event is not
purchasable.

### Phase D: customer registration and wallet provisioning

1. Register Customer A through `/register`.
2. Log in and open the customer dashboard.
3. Open My Tickets and the profile or wallet display.
4. Repeat for Customer B.

Expected:

- Each customer receives a managed custodial wallet.
- Wallet provisioning reaches a ready state.
- The public wallet address may be displayed.
- A private key is never displayed in the browser, response body, logs, or UI.
- Organizer and admin accounts do not receive customer wallets.

### Phase E: primary Stripe ticket purchase

Log in as Customer A and purchase the fresh tickets required by the later
phases. Test one ticket type fully before purchasing the others.

1. Open the approved event.
2. Select Zone A and click **Buy ticket**.
3. Complete Stripe Checkout with:
   - Card number: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Any valid test billing details
4. Wait for the application result page.
5. Watch the Stripe CLI for `checkout.session.completed`.
6. Confirm the webhook request returns HTTP 200.
7. Open `/customer/tickets`.
8. Open `/customer/transactions`.
9. Refresh both pages and revisit the purchase result URL.

Expected:

- The amount shown by Stripe matches the MYR ticket price.
- The Stripe redirect alone does not create the ticket; the signed webhook
  completes the purchase.
- The purchase operation reaches `completed`.
- Exactly one ticket and one NFT are created.
- The ticket appears once in My Tickets.
- Inventory decreases exactly once.
- One purchase transaction is recorded.
- Refreshing or revisiting does not mint or insert duplicates.

Repeat for Zones B, C, D, and optionally E, subject to the event's purchase
limit.

### Phase F: My Tickets

For each ticket bought by Customer A:

1. Open its details in `/customer/tickets`.
2. Confirm the event, zone, status, QR value, and token information.
3. Confirm the available actions match its status and event configuration.
4. Resize the browser to a narrow mobile width and open the resale modal.

Expected:

- A new ticket is valid and belongs to Customer A.
- Its token ID and transaction data are consistent with the completed purchase.
- The QR code remains readable.
- The resale modal is compact, readable, keyboard accessible, and does not
  overflow the viewport.
- Used, refunded, cancelled, or ineligible tickets do not offer invalid actions.

### Phase G: direct transfer

Use Customer A's Zone A ticket.

1. Log in as Customer A.
2. Select **Transfer** for Zone A.
3. Enter Customer B's registered email address.
4. Confirm the transfer.
5. Check Customer A's My Tickets.
6. Log in as Customer B and check My Tickets.
7. Check transaction history for both users.

Expected:

- No Stripe Checkout is opened.
- The same NFT token ID moves from Customer A's wallet to Customer B's wallet.
- Zone A disappears from Customer A and appears for Customer B.
- Ownership and transaction history are updated once.
- No replacement NFT is minted.

Negative cases:

- Transfer to an unregistered email is rejected safely.
- Transfer to the current owner is rejected.
- An active marketplace listing cannot be transferred.
- A used, refunded, or cancelled ticket cannot be transferred.

### Phase H: listing creation and cancellation

Use Customer A's Zone B ticket.

1. Log in as Customer A.
2. Select **List for resale**.
3. Enter a valid MYR resale price.
4. Publish the listing.
5. Open `/customer/marketplace`.
6. Confirm the listing appears once with the correct event, zone, seller, and
   price.
7. Try to buy the listing while still logged in as Customer A.
8. Cancel the listing.
9. Confirm it disappears from active marketplace results.
10. Confirm the ticket can be listed again.

Expected:

- Invalid, empty, zero, or disallowed prices are rejected.
- The owner cannot buy their own listing.
- Cancellation changes the listing state without transferring the NFT.
- Zone B remains in Customer A's My Tickets.
- Only the listing owner can cancel it.

### Phase I: marketplace resale with Stripe

1. Relist Customer A's Zone B ticket.
2. Log out and log in as Customer B.
3. Open `/customer/marketplace`.
4. Open the Zone B listing and click **Buy with Stripe**.
5. Complete Stripe Checkout using the test card.
6. Watch for `checkout.session.completed` in the Stripe CLI.
7. Confirm the webhook returns HTTP 200.
8. Open Customer B's My Tickets and Transactions.
9. Log in as Customer A and open My Tickets and Transactions.

Expected:

- The listing is reserved during checkout and cannot be sold twice.
- The completed webhook transfers the existing NFT to Customer B.
- The token ID is unchanged.
- Zone B disappears from Customer A and appears for Customer B.
- The listing becomes purchased and is removed from active marketplace results.
- Seller proceeds are created exactly once for Customer A.
- One resale transaction is recorded.
- No new ticket NFT is minted.
- Refreshing the result page does not repeat the transfer or proceeds.

If the Stripe CLI shows HTTP 500 for `checkout.session.completed`, treat the
resale as failed even if Stripe displays payment success. Save the event ID,
server error, operation ID, and listing ID before investigating.

### Phase J: optional concurrent marketplace checkout

Use Zone E and Customers B and C.

1. Customer A lists Zone E.
2. Customer B begins Stripe Checkout.
3. Before B completes payment, Customer C opens the same listing.
4. Attempt to buy it as Customer C.
5. Complete or cancel Customer B's checkout.

Expected:

- The listing is reserved for only one checkout at a time.
- Customer C cannot complete a competing purchase while the reservation is
  active.
- At most one buyer receives the ticket.
- At most one seller proceeds and one resale transaction are created.
- If B cancels and the reservation expires, the listing becomes available
  again.

### Phase K: webhook idempotency

Use Stripe's test tools to resend a previously processed
`checkout.session.completed` event to the local webhook endpoint.

Expected:

- The webhook responds successfully for an already completed operation.
- No second NFT is minted.
- No second transfer occurs.
- Inventory is not decremented again.
- No duplicate ticket, transaction, seller proceeds, or refund is created.
- The webhook event and operation records show safe replay handling.

Do not fabricate a webhook with an invalid signature. If testing signature
rejection separately, expect a non-success response and no business-state
change.

### Phase L: QR verification and admission

Use Customer A's Zone C ticket while it is still valid.

1. Log in as Organizer A.
2. Open `/organizer/verify-ticket`.
3. Scan the QR code with the camera, or paste the QR value or ticket ID.
4. Confirm the result is valid and ownership matches the blockchain.
5. Click **Mark as used**.
6. Scan or paste the same ticket again.
7. Check the ticket in Customer A's My Tickets.
8. Log in as Organizer B and try to verify Organizer A's ticket.

Expected:

- Organizer A sees a valid result before admission.
- The verified owner matches the current on-chain owner.
- Marking it used succeeds once.
- A second scan reports that it is already used.
- My Tickets shows the used state.
- Organizer B cannot admit a ticket for an event they do not own.
- Invalid QR text is rejected without exposing internal data.

Also verify a transferred or resold ticket. It must validate for the new owner,
not the original owner.

### Phase M: event cancellation and refund

Use Customer A's Zone D ticket. Do not mark this ticket as used.

1. Log in as Organizer A or Admin A.
2. Cancel the active event and provide a reason.
3. Open the public event and try to purchase another ticket.
4. Log in as Customer A and open Zone D in My Tickets.
5. Confirm the ticket is refund eligible.
6. Read the refund disclosure and submit the claim.
7. Watch the Stripe and Next.js logs.
8. Refresh My Tickets and Transactions.
9. Attempt to claim the same refund again.

Expected:

- The cancelled event can no longer sell tickets.
- Every current NFT ticket holder receives one cancellation email with a link
  to `/customer/tickets` for requesting the refund.
- Eligible tickets expose the refund action.
- The refund is made against the latest paid acquisition.
- Stripe creates one refund.
- The NFT burn is confirmed on the local blockchain.
- The ticket becomes refunded.
- A repeated claim does not create a second Stripe refund or state change.

Ownership and payment can differ after a free direct transfer. Confirm the UI
discloses that the refund returns to the payer of the latest paid acquisition,
not automatically to the current holder.

Test organizer cancellation ownership separately: Organizer B must not be able
to cancel Organizer A's event.

## 9. Payment cancellation and recovery tests

### Cancelled primary checkout

1. Start a primary purchase.
2. Cancel from Stripe Checkout instead of paying.
3. Return to the event after the reservation expires.

Expected:

- No ticket or NFT is created.
- No completed purchase transaction is recorded.
- Reserved inventory becomes available again.

### Cancelled resale checkout

1. Start checkout for an active listing.
2. Cancel without payment.
3. Wait for the listing reservation to expire.

Expected:

- Ownership remains with the seller.
- No seller proceeds are created.
- The listing becomes available again.

### Stripe listener restart

If `stripe listen` is restarted:

1. Copy the new webhook signing secret.
2. Update `STRIPE_WEBHOOK_SECRET`.
3. Restart Next.js.
4. Perform a fresh test payment.

Expected:

- The fresh signed webhook is accepted.
- A stale signing secret is not silently accepted.

## 10. Authorization and negative test matrix

| Test | Expected result |
| --- | --- |
| Logged-out request to a protected API | HTTP 401 or login redirect |
| Customer calls an organizer or admin action | HTTP 403 |
| Organizer calls an admin action | HTTP 403 |
| Organizer B edits Organizer A's event | Rejected |
| Organizer B cancels Organizer A's event | Rejected |
| Organizer B admits Organizer A's ticket | Rejected |
| Customer buys their own listing | Rejected |
| Customer cancels another seller's listing | Rejected |
| Customer transfers a ticket they do not own | Rejected |
| Customer buys an inactive or cancelled event | Rejected |
| Reuse of a used QR code | Reports used; no second admission |
| Transfer or list a used/refunded ticket | Rejected |
| Invalid Stripe webhook signature | Rejected; no state change |
| Duplicate webhook event | Safe success; no duplicate side effect |

For API failures, the response should be safe and understandable. It must not
contain secret keys, private keys, raw database errors, or stack traces.

## 11. Responsive and usability checks

Test at desktop, tablet, and mobile widths.

- The navbar must not cover the hero image or page content.
- Hero spacing should be intentional and not leave a large empty band.
- Ticket types remain alphabetically ordered.
- Cards, buttons, prices, and status labels remain readable.
- Modal content fits the viewport and scrolls when necessary.
- A modal can be closed with its close control, Cancel, and Escape.
- Keyboard focus stays visible and follows a logical order.
- Form inputs have labels and useful validation messages.
- Loading buttons cannot be submitted repeatedly.
- Errors preserve user-entered form values where safe.
- The QR scanner provides manual paste as a fallback for camera denial.
- Color is not the only indication of ticket or payment status.

## 12. Database verification

Use read-only queries in the Supabase SQL Editor after completing the flows.
Replace no values in these general latest-record queries unless narrowing the
result is necessary.

### Ticket operations

```sql
select
  operation_id,
  operation_kind,
  state,
  retry_count,
  safe_error_category,
  stripe_checkout_session_id,
  stripe_payment_intent_id,
  stripe_refund_id,
  token_id,
  asset_transaction_hash,
  created_at,
  completed_at
from ticket_operations
order by created_at desc
limit 20;
```

### Stripe webhook events

```sql
select
  stripe_event_id,
  event_type,
  status,
  attempts,
  safe_error_category,
  last_received_at,
  completed_at
from stripe_webhook_events
order by last_received_at desc
limit 20;
```

### Marketplace listings

```sql
select
  listing_id,
  ticket_id,
  status,
  seller_user_id,
  buyer_user_id,
  reserved_until,
  purchased_at
from resale_listings
order by created_at desc
limit 20;
```

### Seller proceeds

```sql
select
  operation_id,
  listing_id,
  ticket_id,
  seller_user_id,
  amount_sen,
  currency,
  status,
  created_at
from seller_proceeds
order by created_at desc
limit 20;
```

Amounts are stored in sen. For example:

- `9500` sen = `RM95.00`
- `100000` sen = `RM1,000.00`

The database should store the currency as MYR while integer payment amounts use
sen to avoid floating-point rounding errors.

## 13. Cross-system reconciliation

Use the Stripe Dashboard, Supabase, application UI, and local blockchain
together. A green UI message alone is not sufficient proof.

### Primary purchase

- Stripe has one successful test payment.
- The webhook event completed.
- One purchase operation completed.
- One ticket exists for the buyer.
- One token ID exists and its owner is the buyer's wallet.
- Inventory decreased once.
- One purchase transaction exists.

### Direct transfer

- There is no Stripe payment.
- The token ID did not change.
- The blockchain owner is the recipient's wallet.
- The ticket's application owner is the recipient.
- One transfer record exists.

### Marketplace resale

- Stripe has one successful resale payment.
- The resale operation completed.
- The listing is purchased.
- The existing token belongs to the buyer.
- One seller proceeds record exists.
- One resale transaction exists.
- No replacement token was minted.

### Refund

- Stripe has one refund.
- The refund operation completed.
- The ticket is refunded.
- The NFT is burned and `ownerOf` no longer returns an active owner.
- A second refund was not created.

### QR admission

- The token owner matched the application owner when verified.
- The ticket was marked used once.
- A later verification reports used.
- A verification log exists for the attempt.

## 14. Result log

Copy this table into the test report and add one row per scenario.

| ID | Scenario | Account | Test data | Expected | Actual | Pass/Fail | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-01 | Public event browsing | Visitor | Main event | Active event visible |  |  | Screenshot |
| E2E-02 | Organizer application | Organizer A | Application ID | Admin can approve |  |  | ID/screenshot |
| E2E-03 | Event approval | Admin A | Event ID | Event becomes active |  |  | ID/screenshot |
| E2E-04 | Primary purchase | Customer A | Zone A | One ticket and NFT |  |  | Stripe event/operation |
| E2E-05 | Direct transfer | A to B | Zone A | Same token moves to B |  |  | Token/transaction |
| E2E-06 | Listing cancellation | Customer A | Zone B | Listing cancelled |  |  | Listing ID |
| E2E-07 | Marketplace resale | A to B | Zone B | Same token moves to B |  |  | Stripe/listing/operation |
| E2E-08 | QR admission | Organizer A | Zone C | Valid then used |  |  | Verification record |
| E2E-09 | Cancellation/refund | Customer A | Zone D | One refund and burn |  |  | Refund/operation |
| E2E-10 | Duplicate webhook | System | Stripe event ID | No duplicate effect |  |  | Database comparison |

## 15. Bug report template

```text
Title:
Environment:
Date and time:
Role/account:
Page or API route:
Event ID:
Ticket ID:
Listing ID:
Operation ID:
Stripe event ID:
Token ID:

Preconditions:
1.

Steps to reproduce:
1.
2.
3.

Expected result:

Actual result:

HTTP status:
Safe error message:
Screenshots or video:
Relevant Next.js log:
Relevant Stripe CLI log:
Database state before and after:
Reproducibility:
```

Never attach secret values, wallet private keys, complete environment files, or
unredacted personal documents to a bug report.

## 16. Completion criteria

The release candidate passes system testing only when:

- Baseline lint, helper, contract, and build checks pass or have explicitly
  accepted findings.
- All critical end-to-end scenarios pass.
- Stripe webhook completion returns HTTP 200 for successful purchases.
- Primary purchase, transfer, resale, refund, and QR states reconcile across all
  relevant systems.
- Replaying a webhook produces no duplicate financial or ticket side effect.
- Role and ownership boundaries reject unauthorized actions.
- No secret or wallet private key appears in the client or logs.
- No unresolved critical or high-severity defect remains.

If a test fails, preserve the affected records and identifiers for diagnosis.
Do not repeatedly retry a payment or refund without first checking whether the
previous operation already completed.
