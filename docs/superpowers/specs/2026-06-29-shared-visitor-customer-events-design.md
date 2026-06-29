# Shared Visitor and Customer Event Discovery Design

## Goal

Remove duplicated event-discovery code from the visitor and customer pages while keeping their carousel, search, filtering, event cards, empty state, and navigation behavior identical.

## Component Structure

Create the exact requested directory:

```text
src/components/visitor&customer/
  EventDiscovery.tsx
  HeroCarousel.tsx
  EventBrowser.tsx
  index.ts
```

- `HeroCarousel.tsx` owns the active slide, autoplay timer, pause behavior, keyboard navigation, arrows, dots, and event-detail navigation.
- `EventBrowser.tsx` owns the search query, category selection, filtered results, event cards, and empty state.
- `EventDiscovery.tsx` is a small composition component that renders `HeroCarousel` followed by `EventBrowser`.
- `index.ts` exports the public shared component interface.

The existing event catalogue and filtering function remain in `src/app/visitor/data.ts`. The shared components import that data so both pages use the same source of truth without duplicating props or state.

## Page Responsibilities

`src/app/visitor/page.tsx` retains the public metadata and login header, renders `EventDiscovery`, and uses the shared `Footer`.

`src/app/customer/page.tsx` retains authentication and profile loading, `RoleNav`, account controls, ticket tools, modals, and the shared `Footer`. It renders the same `EventDiscovery` component as the visitor page.

No shared component receives a visitor/customer variant because the event experience is required to remain identical.

## Behavior and Error Handling

This is a structural refactor with no intended visual or behavioral changes. Carousel timing and accessibility controls remain unchanged. Search and category filters continue to combine, and unmatched searches continue to display the existing empty state. Customer authentication and profile errors remain owned by the customer page.

## Verification

- Update source-level tests to assert both pages use `EventDiscovery` and that shared components contain the expected carousel and browser behavior.
- Run the focused visitor and customer tests.
- Run ESLint and the Next.js production build.
- Confirm no existing shared component implementation is changed unnecessarily.
