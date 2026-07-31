import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailyRevenueSeries,
  buildOrganizerEventSummaries,
  getRevenueTrend,
  type OrganizerEventRow,
  type OrganizerTicketRow,
  type OrganizerTicketTypeRow,
} from "./organizerDashboard";

const events: OrganizerEventRow[] = [
  {
    event_id: "event-1",
    event_name: "Test Event",
    artist_name: "Artist",
    venue: "Arena",
    status: "active",
    event_date: "2026-08-10T12:00:00Z",
    banner_image: null,
  },
];

const ticketTypes: OrganizerTicketTypeRow[] = [
  {
    ticket_type_id: "type-1",
    event_id: "event-1",
    price: 120,
    total_supply: 100,
  },
];

const tickets: OrganizerTicketRow[] = [
  {
    event_id: "event-1",
    ticket_type_id: "type-1",
    status: "valid",
    created_at: "2026-07-30T04:00:00Z",
  },
  {
    event_id: "event-1",
    ticket_type_id: "type-1",
    status: "used",
    created_at: "2026-07-31T04:00:00Z",
  },
  {
    event_id: "event-1",
    ticket_type_id: "type-1",
    status: "refunded",
    created_at: "2026-07-31T05:00:00Z",
  },
];

test("organizer event summaries use issued ticket records for sales and revenue", () => {
  const [summary] = buildOrganizerEventSummaries(events, ticketTypes, tickets);

  assert.equal(summary.sold, 2);
  assert.equal(summary.supply, 100);
  assert.equal(summary.revenue, 240);
  assert.equal(summary.minPrice, 120);
});

test("daily revenue series uses calendar days and excludes refunded tickets", () => {
  const points = buildDailyRevenueSeries(
    tickets,
    ticketTypes,
    new Date("2026-07-31T12:00:00Z"),
    3,
  );

  assert.deepEqual(
    points.map(({ date, label, revenue }) => ({ date, label, revenue })),
    [
      { date: "2026-07-29", label: "29 Jul", revenue: 0 },
      { date: "2026-07-30", label: "30 Jul", revenue: 120 },
      { date: "2026-07-31", label: "31 Jul", revenue: 120 },
    ],
  );
});

test("revenue trend compares real recent 30-day windows", () => {
  const points = Array.from({ length: 60 }, (_, index) => ({
    date: `day-${index}`,
    label: `Day ${index}`,
    revenue: index < 30 ? 10 : 15,
  }));

  assert.deepEqual(getRevenueTrend(points), {
    direction: "up",
    label: "50.0% vs previous 30 days",
  });
});
