> **Superseded:** CornShirt no longer uses the earlier token-based payment design. See `docs/superpowers/specs/2026-07-09-remove-dicken-stripe-myr-migration-design.md` for the approved Stripe MYR and Ticket NFT architecture. This file is retained only as historical project context.

# Customer DICKEN Top-Up Page Design

## Scope

Create a customer-only DICKEN top-up preview page at `/customer/top-up` and remove the obsolete **My Tickets** preview section from the customer marketplace page. The existing `/customer/tickets` route and customer navigation item remain unchanged.

Stripe checkout is intentionally out of scope. The page must not create Stripe sessions, call payment APIs, update balances, or write transaction records.

## Page Structure

The new page follows Option A, the focused checkout layout, and the customer visual language in `docs/DESIGN.md`:

- Reuse `RoleNav` with the customer role and the shared `Footer`.
- Use a constrained page heading for **Top Up DICKEN**.
- Show a wallet summary using the authenticated customer's stored `profiles.wallet_address`.
- Do not invent a DICKEN balance. If no authoritative balance source exists, label the balance as unavailable and explain that wallet balance support is not connected.
- Place the amount selector in one prominent dark card with CornShirt's fire accent.
- Show the existing `public/DICKEN token.png` asset where it supports token identity.
- Keep the layout responsive and single-column on small screens.

## Amount Preview

The client-side form supports four presets: 200, 500, 1,000, and 2,000 DICKEN. It also supports a custom whole-number amount.

The preview conversion is fixed at:

`1 DICKEN = RM 1.00`

Selecting a preset or entering a valid custom amount updates the Ringgit preview immediately. Empty, non-numeric, decimal, zero, and negative custom values do not produce a payable amount. Formatting uses Malaysian Ringgit and readable thousands separators.

## Stripe Preview

Stripe appears only as the intended future payment provider. The primary checkout control reads **Stripe checkout coming soon** and remains disabled regardless of the selected amount.

The implementation must not import or initialize Stripe, expose Stripe keys, add an API route, create a checkout session, or modify database records. Supporting copy makes the preview-only state explicit.

## Customer Marketplace Cleanup

Remove the entire **My Tickets** preview section from `src/app/customer/page.tsx`. Also remove state, imports, and modal markup that existed only for the removed tickets and top-up previews.

Keep event discovery, customer authentication and role routing, `RoleNav`, account error handling, and `Footer` intact. Access to My Tickets and Top Up DICKEN remains available through customer navigation routes.

## Data and Access

The top-up route is protected with `requireRole(["customer", "user"])`. It reads only the authenticated profile's `wallet_address`. A missing wallet displays a clear unavailable state without blocking the amount preview.

No admin or organizer files are changed.

## Testing

Automated tests cover:

- Customer/user role protection and wallet lookup.
- Preset and custom-amount conversion at RM 1.00 per DICKEN.
- Disabled Stripe checkout and absence of Stripe integration calls.
- Option A layout hooks and responsive styles.
- Removal of the My Tickets preview and obsolete modal code from the customer marketplace.
- Preservation of customer event discovery and shared navigation/footer components.
