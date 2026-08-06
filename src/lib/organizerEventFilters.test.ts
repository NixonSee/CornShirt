import assert from "node:assert/strict";
import test from "node:test";

import {
  filterOrganizerEvents,
  ORGANIZER_EVENT_FILTERS,
} from "./organizerEventFilters.ts";

const events = [
  { id: "active", status: "active" },
  { id: "pending", status: "pending" },
  { id: "completed", status: "completed" },
  { id: "rejected", status: "rejected" },
  { id: "cancelled", status: "cancelled" },
  { id: "canceled", status: "canceled" },
];

test("organizer event filters include completed, rejected, and cancelled", () => {
  assert.deepEqual(ORGANIZER_EVENT_FILTERS, [
    "all",
    "live",
    "pending",
    "completed",
    "rejected",
    "cancelled",
  ]);
});

test("organizer filters map live to active and preserve every status in all", () => {
  assert.deepEqual(
    filterOrganizerEvents(events, "live").map((event) => event.id),
    ["active"],
  );
  assert.deepEqual(
    filterOrganizerEvents(events, "completed").map((event) => event.id),
    ["completed"],
  );
  assert.deepEqual(
    filterOrganizerEvents(events, "rejected").map((event) => event.id),
    ["rejected"],
  );
  assert.deepEqual(
    filterOrganizerEvents(events, "cancelled").map((event) => event.id),
    ["cancelled", "canceled"],
  );
  assert.equal(filterOrganizerEvents(events, "all").length, events.length);
});
