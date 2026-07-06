# Event Detail Visitor Navigation Design

## Goal

Make the public event-details header match the visitor marketplace while preserving every authenticated role's current behavior.

## Scope

Modify only the visitor branch of `src/app/events/[eventId]/page.tsx`.

- Keep the existing CornShirt logo and public header structure.
- Replace the current `Events`, `Log in`, and `Create account` actions with `Become an Organizer` and `Log In`.
- Link `Become an Organizer` to `/visitor/apply`.
- Link `Log In` through `withEventReturnTo("/login", returnPath)` so successful customer login returns to the same event.
- Preserve the existing customer `RoleNav` exactly.
- Do not change admin or organizer behavior, navigation, routing, or access rules.
- Preserve customer-only ticket purchasing and the existing event-back-link behavior.

## Fallback Behavior

Unauthenticated sessions and missing-profile results continue through the existing public visitor branch. No client-side session lookup or new route is required.

## Verification

- Add a source-level contract test for the visitor actions and return-to-event login link.
- Confirm the existing customer `RoleNav` branch remains present.
- Run the focused test and targeted ESLint.
- Run the production build if the existing local dependency state permits it.
