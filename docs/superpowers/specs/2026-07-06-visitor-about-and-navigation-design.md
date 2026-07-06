# Visitor About Page and Navigation Design

## Goal

Redesign the public About Us page with the approved Editorial Trust direction and replace duplicated public headers with one visitor-only navigation component that exposes the About Us route consistently.

## Scope

- Redesign `src/app/visitor/about/page.tsx`.
- Create a reusable visitor navigation component.
- Use the shared navigation on the visitor landing page, About Us page, and public event-details page.
- Keep the organizer application page's focused `Back to events` header unchanged.
- Do not modify authenticated customer, organizer, or admin navigation.
- Preserve the event-details return-aware login URL.

## Shared Visitor Navigation

Create `src/components/VisitorNav.tsx` as the single public-navigation component. It displays:

- CornShirt Hub logo linking to `/visitor`.
- `About Us` linking to `/visitor/about`.
- `Become an Organizer` linking to `/visitor/apply`.
- `Log In`, with a configurable `loginHref` that defaults to `/login`.

The component marks About Us as active on `/visitor/about`. It uses semantic links instead of router-driven buttons and has a compact responsive layout that keeps all actions keyboard accessible. Public event details pass their existing return-aware login URL into the component. The visitor landing and About Us pages use the default login URL.

## About Page Direction

The page uses the approved Editorial Trust direction and the existing dark CornShirt visual language.

### Hero

- Eyebrow: `Built for the live moment`.
- Headline: `Tickets people can actually trust.`
- Supporting copy explains transparent NFT ticketing and DICKEN checkout in plain language.
- Primary action returns to the event-discovery section.
- Secondary action opens the organizer application.
- Decorative ticket/grid elements are CSS-driven and non-interactive.

### Product Promises

Use three grounded promises rather than unsupported numerical claims:

1. Verified ownership.
2. Transparent transfers.
3. DICKEN checkout.

### Mission and Values

Replace placeholder text with concise CornShirt-specific copy. The mission explains that blockchain infrastructure should make ticketing more trustworthy without making the customer experience more complicated. Three value cards cover trust, access, and live culture.

### Team

Keep the existing members and assets:

- Nixon See with `/Nixon pic.jpeg`.
- Max with `/Max.mp4`.
- Jeng Siang with `/Js.mp4`.

Replace placeholder biographies with short, credible role-focused descriptions. Videos remain muted, looping, and inline, and receive descriptive accessibility labels. Team-card hover and focus treatments are implemented in CSS rather than DOM style mutation. Reduced-motion styles disable decorative transitions and movement elsewhere on the page.

### Closing Action

End with a high-contrast CTA inviting visitors to browse events or become an organizer, followed by the existing shared footer.

## Styling

Add scoped `visitor-nav-*` and `about-*` classes to `src/app/globals.css`. Remove inline presentation styles from the About page. The layout must support desktop, tablet, and mobile widths without horizontal overflow, with visible focus states and adequate contrast.

## Page Architecture

Convert the About page to a server component and export Next.js metadata instead of rendering `<title>` and `<meta>` directly. Keep small presentational data arrays in the page module; no API or database changes are needed.

## Files

- Create `src/components/VisitorNav.tsx`.
- Modify `src/app/visitor/page.tsx`.
- Modify `src/app/visitor/about/page.tsx`.
- Modify `src/app/events/[eventId]/page.tsx`.
- Modify `src/app/globals.css`.
- Add focused source-level tests for shared visitor navigation and the About-page structure.

## Verification

- The About page renders the approved sections and no placeholder Lorem Ipsum remains.
- Visitor home, About Us, and public event details render `VisitorNav`.
- About Us is visible and active on its route.
- Event-details login preserves its return destination.
- Organizer application and authenticated role navigation remain unchanged.
- ESLint passes for touched TypeScript files.
- Focused tests pass.
- The production build is attempted and any unrelated repository blocker is reported separately.
