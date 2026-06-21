# User Dashboard Design

## Goal

Create the `/user` dashboard as a light-background version of the provided ChainTix-style event dashboard. The page should feel visually close to the reference while using CornShirt branding and the existing project assets.

## Scope

- Replace the stub in `src/app/user/page.tsx`.
- Keep the implementation self-contained unless shared app patterns require otherwise.
- Use the existing App Router page convention and Tailwind styling.
- Use the existing public images, especially `Background Login Image.png` and `CornShirt-Logo.png`.

## Experience

The dashboard opens on a polished event-discovery screen:

- A top navigation bar with CornShirt branding, search, user navigation, notifications, and a wallet action.
- A large hero section using the festival background image, centered launch copy, a small live badge, and a learn-more action.
- Slider dots under the hero before the concert drop listings.
- An `Upcoming Drops` section with a responsive grid of event cards and a filter for Latest, Coming Soon, and Ending Soon ordering.
- Event cards include visual media, status badges, verification text, event names, date/location metadata, and primary ticket actions.
- Event cards navigate to a concert detail page at `/user/concerts/[slug]`.
- Concert detail pages include a hero, event intel, lineup, contract transparency, and an interactive secure pass panel.

## Visual Direction

The overall route background should use a light surface, including `bg-white/95`, while the hero and event media retain dark translucent overlays to match the screenshot's contrast and energy. Accent colors should lean cyan, violet, and gold to echo the reference without turning the entire page into a single dark palette.

## Data

Use static local arrays for categories and demo event drops. No Supabase, wallet, or ticket-purchase logic is required in this pass.

## Testing

Verify with lint/build if available. If a dev server is started, inspect the route visually in the browser for desktop and mobile layout issues.
