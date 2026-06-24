# API and Routes

## Public Routes
- `/` — Browse active events
- `/login` — Login page
- `/register` — Register page
- `/events/[eventId]` — Event details

## User Routes
- `/user` — User dashboard
- `/user/tickets` — My Tickets
- `/user/top-up` — DICKEN balance and top-up
- `/user/transactions` — Transaction history

## Organizer Routes
- `/organizer` — Organizer dashboard
- `/organizer/create-event` — Create event
- `/organizer/events/[eventId]` — Manage event
- `/organizer/events/[eventId]/edit` — Edit draft event
- `/organizer/verify-ticket` — Verify ticket QR code

## Admin Routes
- `/admin` — Admin dashboard
- `/admin/pending-events` — Review event submissions
- `/admin/organizers` — View organizers
- `/admin/events` — Monitor all events

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