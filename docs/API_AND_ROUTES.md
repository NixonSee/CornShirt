# API and Routes

## Public Routes
- `/` - Browse active events
- `/login` - Login page
- `/register` - Register page
- `/events/[eventId]` - Event details

## Customer Routes
- `/customer` - Customer dashboard
- `/customer/tickets` - My Tickets
- `/customer/top-up` - DICKEN balance and top-up
- `/customer/marketplace` - Browse, list, and cancel active resale listings
- `/customer/transactions` - Transaction history
- `/customer/events/[eventId]` - Customer event details and purchase controls

## Organizer Routes
- `/organizer` - Organizer dashboard
- `/organizer/create-event` - Create event
- `/organizer/events/[eventId]` - Manage event
- `/organizer/events/[eventId]/edit` - Edit draft event
- `/organizer/verify-ticket` - Verify ticket QR code

## Admin Routes
- `/admin` - Admin dashboard
- `/admin/pending-events` - Review event submissions
- `/admin/organizers` - View organizers
- `/admin/events` - Monitor all events

## API Routes
- `POST /api/customer/wallet/provision` - Idempotently create the authenticated customer's CornShirt-managed wallet. Returns only the public address and provisioning status.
- `/api/customer/marketplace` - Create an eligible resale listing
- `/api/customer/marketplace/[listingId]` - Cancel the authenticated seller's active listing

Wallet provisioning is customer-only. Organizer and admin accounts do not receive managed wallets automatically. Encrypted private-key material remains server-only and is never returned by this API.

Resale purchase remains unavailable until DICKEN settlement and Ticket NFT ownership transfer services are connected.

## Future API Routes
- `/api/events`
- `/api/events/[eventId]`
- `/api/admin/events/[eventId]/approve`
- `/api/admin/events/[eventId]/reject`
- `/api/top-up`
- `/api/tickets/purchase`
- `/api/tickets/transfer`
- `/api/tickets/verify`
- `/api/refunds/claim`
