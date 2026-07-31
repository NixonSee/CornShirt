import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminActivitySeries,
  getAdminActivityTrend,
  type AdminTransactionRow,
} from "./adminDashboard";

const transactions: AdminTransactionRow[] = [
  {
    amount: 120,
    created_at: "2026-07-30T04:00:00Z",
    transaction_type: "purchase",
  },
  {
    amount: 80,
    created_at: "2026-07-31T04:00:00Z",
    transaction_type: "resale",
  },
  {
    amount: -80,
    created_at: "2026-07-31T05:00:00Z",
    transaction_type: "refund",
  },
];

test("admin activity series groups real transactions by calendar day", () => {
  const points = buildAdminActivitySeries(
    transactions,
    new Date("2026-07-31T12:00:00Z"),
    3,
  );

  assert.deepEqual(points, [
    {
      date: "2026-07-29",
      label: "29 Jul",
      transactions: 0,
      volume: 0,
    },
    {
      date: "2026-07-30",
      label: "30 Jul",
      transactions: 1,
      volume: 120,
    },
    {
      date: "2026-07-31",
      label: "31 Jul",
      transactions: 2,
      volume: 80,
    },
  ]);
});

test("admin activity trend compares the latest two 30-day windows", () => {
  const points = Array.from({ length: 60 }, (_, index) => ({
    date: `day-${index}`,
    label: `Day ${index}`,
    transactions: index < 30 ? 2 : 3,
    volume: 0,
  }));

  assert.deepEqual(getAdminActivityTrend(points), {
    direction: "up",
    label: "50.0% vs previous 30 days",
  });
});
