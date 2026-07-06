# Axiata Arena Seat-Map Layout Design

## Goal

Remove overlaps from the Axiata Arena seat map while preserving its existing structure: Zone A nearest the stage, Zones B and C as central tiers, and Zones D and E as side sections.

## Scope

- Update only the five `venue_zones.shape` records belonging to Axiata Arena (`venue_id = dda1239b-d6e9-491c-a1b2-ceb486d6a979`).
- Keep the existing stage geometry unchanged: `x=350`, `y=70`, `w=300`, `h=110`.
- Do not modify `SeatMap.tsx`, `EventTicketing.tsx`, global CSS, ticket prices, capacities, labels, or event records.
- The update intentionally affects every event linked to Axiata Arena because venue-zone geometry is shared venue data.

## Approved Geometry

The map uses a fixed 1000 by 1000 virtual canvas with its origin at the top-left.

| Zone | x | y | w | h |
|---|---:|---:|---:|---:|
| Zone A | 300 | 240 | 400 | 130 |
| Zone B | 250 | 420 | 500 | 150 |
| Zone C | 300 | 620 | 400 | 150 |
| Zone D | 80 | 260 | 150 | 510 |
| Zone E | 770 | 260 | 150 | 510 |

All five shapes remain rectangles. The 20-unit horizontal gaps between the side sections and Zone B prevent overlap, while the 50-unit vertical gaps separate the three central tiers.

## Data Update

The change should be applied as one Supabase SQL transaction. Before updating, capture the current `zone_id`, `label`, and `shape` values for rollback. Update rows by both the Axiata Arena `venue_id` and exact zone label so no other venue can be affected.

The transaction must verify that exactly five target rows exist. If labels are missing or duplicated, stop and inspect the records instead of committing a partial update.

## Verification

After the update:

1. Query all five Axiata Arena zone shapes and confirm they match the approved coordinates.
2. Open an active event linked to Axiata Arena.
3. Confirm that Zones A-E render without overlap and remain inside the 1000 by 1000 canvas.
4. Confirm that selecting a priced zone still highlights its corresponding ticket type.
5. Confirm another venue's seat map is unchanged.

## Rollback

If visual verification fails, restore the five captured `shape` JSON values in a new transaction. No application deployment is required for either the update or rollback because the event page reads venue geometry from Supabase.
