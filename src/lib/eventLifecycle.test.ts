import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_DURATION_MS,
  getEventEndTime,
  getLiveEventCutoff,
  isEventLive,
} from "./eventLifecycle.ts";

const START = "2026-08-03T10:00:00.000Z";

test("an active event remains live for exactly three hours", () => {
  assert.equal(
    getEventEndTime(START)?.toISOString(),
    "2026-08-03T13:00:00.000Z",
  );
  assert.equal(
    isEventLive(
      { status: "active", event_date: START },
      new Date("2026-08-03T12:59:59.999Z"),
    ),
    true,
  );
  assert.equal(
    isEventLive(
      { status: "active", event_date: START },
      new Date("2026-08-03T13:00:00.000Z"),
    ),
    false,
  );
});

test("status and valid event date are both required", () => {
  assert.equal(
    isEventLive(
      { status: "completed", event_date: START },
      new Date("2026-08-03T11:00:00.000Z"),
    ),
    false,
  );
  assert.equal(isEventLive({ status: "active", event_date: null }), false);
  assert.equal(isEventLive({ status: "active", event_date: "invalid" }), false);
});

test("live event cutoff is three hours before now", () => {
  const now = new Date("2026-08-03T13:00:00.000Z");
  assert.equal(getLiveEventCutoff(now).getTime(), now.getTime() - EVENT_DURATION_MS);
});

