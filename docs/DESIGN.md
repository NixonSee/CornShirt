# CornShirt UI and Visual Design Guide

This document is the UI source of truth for implementing CornShirt from the HTML designs in `docs/html-designs/`. The live app should follow the page structure from the prototype files and use the color, typography, spacing, radius, and component language defined in `docs/html-designs/design.css`.

## Design Sources

- Public visitor experience: `docs/html-designs/index.html`
- Customer experience: starts from `index.html` and adds authenticated customer features
- Organizer dashboard: organizer page design from `docs/html-designs/CornShirt Prototype.html` and the extracted `docs/html-designs/organizer.html`
- Admin dashboard: admin page design from `docs/html-designs/CornShirt Prototype.html` and the extracted `docs/html-designs/admin.html`
- Login page: `docs/html-designs/login.html`
- Register page: `docs/html-designs/register.html`
- Visual tokens and shared classes: `docs/html-designs/design.css`

## Page Ownership

### Public Visitor: `index.html`

The public home page is an event discovery page, not a generic landing page. It should open with the CornShirt brand, sticky public header, full-width concert hero, and active event browsing grid from `index.html`.

Public visitors can:

- Browse active, admin-approved events
- Search and filter by event, artist, city, or category
- Preview event metadata, price, and status
- Use protected calls to action that route to login or registration

Protected actions include buying tickets, viewing full ticket details, accessing dashboards, wallet actions, and account-only pages.

### Customer: Authenticated `index.html` Experience

Customers use the same public event browsing foundation as `index.html`, but the page becomes account-aware after login. The visual shell should remain consistent with the public site: same sticky header, hero treatment, event cards, category filters, and dark fire-accent theme.

Customer-only additions should include:

- Wallet balance and DICKEN top-up entry points
- My Tickets access
- Ticket purchase actions on event cards and event detail pages
- Ticket NFT status, transaction hash, QR code display, transfer, resale, and refund actions where relevant
- Transaction history access

Do not move customers into a separate visual language unless the workflow is dashboard-specific. Customer pages should feel like the public marketplace plus account tools.

### Organizer: Prototype Dashboard

Organizer pages use the organizer dashboard design from the CornShirt prototype. The layout is a dark two-column dashboard:

- Sticky left sidebar with CornShirt brand, role badge, and organizer navigation
- Main content area with page title, short description, and primary action
- Metric cards for created events, pending approval, revenue, sold tickets, or remaining supply
- Panels for event creation, ticket verification, revenue summaries, and operational actions
- Tables for created events, ticket types, verification logs, and transaction records

Organizer screens should prioritize operational clarity. Use compact cards, tables, forms, and status badges instead of marketing-style sections.

### Admin: Prototype Dashboard

Admin pages use the admin dashboard design from the CornShirt prototype. They share the same dark sidebar dashboard system as organizer pages, with admin-specific navigation and review workflows.

Admin screens should include:

- Platform metrics such as organizers, pending events, active events, total events, and cancelled events
- Pending event review tables
- Approve, reject, and return-to-draft decisions
- Organizer and event monitoring views
- Future monitoring panels for transaction records, verification logs, cancellations, and refund status

Admin UI should be decisive and scan-friendly. Tables, badges, and action rows are preferred over large decorative cards.

### Login and Register

Login and registration use the authentication layout from `login.html` and `register.html`:

- Centered translucent `auth-card`
- Background image from `public/Background Login Image.png`
- CornShirt logo and brand lockup
- Clear form fields with strong labels
- Full-width primary action
- Muted helper text and footer links between login and registration

Login may show demo role links during prototype mode, but production login should route users by authenticated role.

## Visual System

### Theme

The application uses a dark concert-commerce theme with a warm fire accent. The color scheme must come from `docs/html-designs/design.css`.

Core tokens:

```css
--background: oklch(0.16 0 0);
--foreground: oklch(0.97 0 0);
--card: oklch(0.2 0 0);
--primary: oklch(0.76 0.18 60);
--secondary: oklch(0.26 0 0);
--muted-foreground: oklch(0.68 0 0);
--success: oklch(0.7 0.17 150);
--warning: oklch(0.8 0.16 80);
--destructive: oklch(0.58 0.22 27);
--border: oklch(0.3 0 0);
--sidebar: oklch(0.12 0 0);
--gradient-fire: linear-gradient(135deg, oklch(0.76 0.18 60), oklch(0.65 0.2 35));
--gradient-glow: radial-gradient(circle at 50% 0%, oklch(0.76 0.18 60 / 0.25), transparent 70%);
```

Use `--gradient-fire` for primary actions and selective emphasis. Use `--gradient-glow` for page-level atmosphere only. Avoid introducing unrelated blue, slate, purple, or light dashboard themes.

### Typography

- Display font: `Archivo`
- Body font: `Inter`
- Headings use `Archivo`, heavy weight, and tight line-height
- Body text, labels, navigation, tables, and controls use `Inter`
- Letter spacing stays at `0`
- Large type belongs in the public hero only; dashboards should use restrained heading sizes

### Layout

Public pages use:

- Sticky top header
- Full-width hero with background image and overlaid copy
- Constrained inner content at roughly `1180px`
- Event grid cards below the hero
- Footer with simple muted text

Dashboard pages use:

- `260px` sidebar and flexible main content on desktop
- Sticky sidebar on desktop
- Single-column responsive layout below `900px`
- Metric grids, panels, and tables with clear vertical rhythm

Auth pages use:

- Centered card layout
- `min(100%, 440px)` card width
- Blurred card surface over image background
- One primary form flow per page

### Components

Primary components should match `design.css`:

- `.button`: fire gradient primary action
- `.button-secondary` and `.button-outline`: secondary or neutral actions
- `.auth-card`, `.state-card`, `.panel`, `.metric`, `.table-card`: dark card surfaces with borders and shadow
- `.status`: rounded status badge with `good`, `warn`, and destructive variants as needed
- `.event-card`: card with media area, event metadata, and action row
- `.sidebar`, `.side-nav`, `.role-badge`: dashboard navigation system
- `.field`: labeled form field with focus ring from `--ring`

Cards should use the radius system from `design.css`: `--radius`, `--radius-lg`, and `--radius-xl`. Keep dashboards compact and scannable.

### Imagery and Brand

Use the existing assets:

- `public/CornShirt-Logo.png` for brand marks
- `public/Background Login Image.png` for auth backgrounds, public hero, and event card media placeholders
- `public/DICKEN token.png` where token identity is useful

Primary imagery should support the concert-ticket context. Avoid abstract decorative backgrounds that do not reveal events, tickets, wallet state, or role workflows.

### States and Feedback

Use consistent state language:

- `ACTIVE` and `VALID`: success badge
- `PENDING`, `SELLING FAST`, and `RESALE LISTED`: warning badge
- `REJECTED`, `CANCELLED`, `INVALID`, and failed payment or verification states: destructive styling
- Empty event searches use the existing dashed empty state pattern
- Forms use focused borders and rings from `--ring`
- Hover states may lift buttons and cards subtly, matching `design.css`

### Responsive Behavior

Follow the breakpoints from `design.css`:

- Below `900px`, dashboards and two-column grids collapse to one column
- Below `900px`, event grids move from three columns to two
- Below `560px`, role grids, metric grids, and event grids become one column
- Headers may stack vertically on small screens
- Table padding tightens on small screens

All text must fit within cards, buttons, badges, and table cells without overlap.

## Implementation Notes

- Treat `docs/html-designs/design.css` as the visual token source when translating into app styles.
- `src/app/page.tsx` should represent the public visitor event-browsing page instead of redirecting directly to login.
- Customer browsing should build on the public event page and reveal authenticated controls based on role/session state.
- Organizer and admin routes should use the prototype dashboard language, not the current light dashboard palette.
- Login and register routes should use the auth page design directly.
- Keep role-specific functionality documented in `docs/ROLE_FEATURES_AND_FLOW.md` aligned with this visual guide.
