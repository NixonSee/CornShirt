# Axiata Arena Seat-Map Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five overlapping Axiata Arena zone rectangles with the approved Balanced Bowl coordinates in Supabase.

**Architecture:** Keep the application renderer unchanged and update the authoritative `venue_zones.shape` JSONB values for the single Axiata Arena venue. A guarded SQL transaction verifies the expected five labels before updating and returns the final shapes for review.

**Tech Stack:** PostgreSQL, Supabase SQL Editor, JSONB

---

### Task 1: Create the guarded Supabase update script

**Files:**
- Create: `scripts/sql/update-axiata-arena-seat-map.sql`

- [ ] **Step 1: Add the precondition check**

Create the SQL file with a transaction and a block that refuses to continue unless Axiata Arena has exactly one of each expected zone label:

```sql
begin;

do $$
declare
  matched_count integer;
  distinct_label_count integer;
begin
  select count(*), count(distinct label)
  into matched_count, distinct_label_count
  from public.venue_zones
  where venue_id = 'dda1239b-d6e9-491c-a1b2-ceb486d6a979'
    and label in ('Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E');

  if matched_count <> 5 or distinct_label_count <> 5 then
    raise exception
      'Expected five unique Axiata Arena zones, found % rows and % labels',
      matched_count,
      distinct_label_count;
  end if;
end $$;
```

- [ ] **Step 2: Add the coordinate update**

Append the approved shapes, scoped by both venue and exact label:

```sql
update public.venue_zones
set shape = case label
  when 'Zone A' then '{"type":"rect","x":300,"y":240,"w":400,"h":130}'::jsonb
  when 'Zone B' then '{"type":"rect","x":250,"y":420,"w":500,"h":150}'::jsonb
  when 'Zone C' then '{"type":"rect","x":300,"y":620,"w":400,"h":150}'::jsonb
  when 'Zone D' then '{"type":"rect","x":80,"y":260,"w":150,"h":510}'::jsonb
  when 'Zone E' then '{"type":"rect","x":770,"y":260,"w":150,"h":510}'::jsonb
  else shape
end
where venue_id = 'dda1239b-d6e9-491c-a1b2-ceb486d6a979'
  and label in ('Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E');
```

- [ ] **Step 3: Add database verification and commit**

Append a postcondition block that aborts if any stored shape differs, then return the final rows and commit:

```sql
do $$
declare
  valid_count integer;
begin
  select count(*)
  into valid_count
  from public.venue_zones
  where venue_id = 'dda1239b-d6e9-491c-a1b2-ceb486d6a979'
    and (
      (label = 'Zone A' and shape::jsonb = '{"type":"rect","x":300,"y":240,"w":400,"h":130}'::jsonb)
      or (label = 'Zone B' and shape::jsonb = '{"type":"rect","x":250,"y":420,"w":500,"h":150}'::jsonb)
      or (label = 'Zone C' and shape::jsonb = '{"type":"rect","x":300,"y":620,"w":400,"h":150}'::jsonb)
      or (label = 'Zone D' and shape::jsonb = '{"type":"rect","x":80,"y":260,"w":150,"h":510}'::jsonb)
      or (label = 'Zone E' and shape::jsonb = '{"type":"rect","x":770,"y":260,"w":150,"h":510}'::jsonb)
    );

  if valid_count <> 5 then
    raise exception 'Axiata Arena shape verification failed: % of 5 rows matched', valid_count;
  end if;
end $$;

select zone_id, code, label, shape
from public.venue_zones
where venue_id = 'dda1239b-d6e9-491c-a1b2-ceb486d6a979'
order by label;

commit;
```

- [ ] **Step 4: Validate repository formatting**

Run:

```powershell
git diff --check -- scripts/sql/update-axiata-arena-seat-map.sql
```

Expected: exit code 0 with no whitespace errors.

### Task 2: Apply and visually verify the venue update

**Files:**
- Read: `scripts/sql/update-axiata-arena-seat-map.sql`
- Verify: `src/components/seatmap/SeatMap.tsx`

- [ ] **Step 1: Execute the SQL in Supabase**

Open the Supabase SQL Editor for the project, paste the complete contents of `scripts/sql/update-axiata-arena-seat-map.sql`, and run it once.

Expected: five rows are returned, ordered Zone A through Zone E. Any label mismatch raises an exception and rolls back the transaction.

- [ ] **Step 2: Verify an active Axiata Arena event**

Find an active Axiata Arena event:

```sql
select event_id, event_name
from public.events
where venue_id = 'dda1239b-d6e9-491c-a1b2-ceb486d6a979'
  and status = 'active'
order by event_date
limit 1;
```

Open `/events/` followed by the returned `event_id`. If no row is returned,
approve an Axiata Arena event through the existing admin approval flow before
performing this visual check.

Expected: Zones A-E have visible gaps, no zone overlaps another, and all shapes remain within the map border.

- [ ] **Step 3: Verify ticket selection remains connected**

Click each priced zone on the buyer seat map.

Expected: the matching ticket card receives `ticket-option-card-selected`; sold-out or unpriced zones remain non-clickable according to the existing component behavior.

- [ ] **Step 4: Confirm isolation**

Open an active event linked to a venue other than Axiata Arena.

Expected: its stage and zone geometry are unchanged.
