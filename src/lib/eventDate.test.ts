import assert from "node:assert/strict";
import test from "node:test";

import {
  eventDateError,
  localDateKey,
  minEventDate,
  toEventFormValue,
  toEventInstant,
} from "./eventDate.ts";

// 2026-08-07 17:30 UTC is already 2026-08-08 01:30 in Malaysia. Every case runs
// against this instant, so the suite would fail if the rule ever slipped back to
// the runtime's own timezone instead of Asia/Kuala_Lumpur.
const NOW = new Date("2026-08-07T17:30:00.000Z");

const PAST = "Event date cannot be in the past. Choose a date from tomorrow onwards.";
const TODAY = "Events cannot be scheduled for today. Choose a date from tomorrow onwards.";

test("today is the Malaysian calendar day, not the UTC one", () => {
  assert.equal(localDateKey(NOW), "2026-08-08");
  assert.equal(minEventDate(NOW), "2026-08-09T00:00");
});

test("past dates are rejected", () => {
  assert.equal(eventDateError("2026-08-07T20:00", NOW), PAST);
  assert.equal(eventDateError("2026-07-01T09:00", NOW), PAST);
  assert.equal(eventDateError("2020-01-01T10:00", NOW), PAST);
});

test("today is rejected at every hour", () => {
  assert.equal(eventDateError("2026-08-08T00:00", NOW), TODAY);
  assert.equal(eventDateError("2026-08-08T20:00", NOW), TODAY);
  assert.equal(eventDateError("2026-08-08T23:59", NOW), TODAY);
});

test("tomorrow onwards is accepted, from midnight", () => {
  assert.equal(eventDateError("2026-08-09T00:00", NOW), null);
  assert.equal(eventDateError(minEventDate(NOW), NOW), null);
  assert.equal(eventDateError("2027-03-15T19:30", NOW), null);
});

test("the form's wall clock is stored as a Malaysian instant, not a UTC one", () => {
  // 8pm in Malaysia is noon UTC. Storing "20:00" verbatim was the bug: Postgres
  // read it as 8pm UTC, which is 4am the next day in Malaysia.
  assert.equal(toEventInstant("2026-10-10T20:00"), "2026-10-10T12:00:00.000Z");
  assert.equal(toEventInstant("2026-10-10T09:00"), "2026-10-10T01:00:00.000Z");
});

test("a stored instant reads back as the Malaysian wall clock", () => {
  assert.equal(toEventFormValue("2026-10-10T12:00:00.000Z"), "2026-10-10T20:00");
  assert.equal(toEventFormValue("2026-10-10T01:00:00.000Z"), "2026-10-10T09:00");
});

test("every wall clock survives a full write/read round trip", () => {
  // The two rows that exposed the bug, plus the boundaries.
  for (const value of [
    "2026-10-10T20:00",
    "2026-10-10T09:00",
    "2026-10-10T00:00",
    "2026-10-10T23:59",
    "2026-10-10T16:00",
  ]) {
    assert.equal(toEventFormValue(toEventInstant(value)), value);
  }
});

test("midnight round-trips as 00:00, never 24:00", () => {
  assert.equal(toEventInstant("2026-10-10T00:00"), "2026-10-09T16:00:00.000Z");
  assert.equal(toEventFormValue("2026-10-09T16:00:00.000Z"), "2026-10-10T00:00");
});

test("conversions reject missing and malformed values", () => {
  assert.equal(toEventInstant(""), null);
  assert.equal(toEventInstant(null), null);
  assert.equal(toEventInstant(undefined), null);
  assert.equal(toEventInstant("not-a-date"), null);
  assert.equal(toEventInstant("2026-13-45T99:99"), null);

  assert.equal(toEventFormValue(""), "");
  assert.equal(toEventFormValue(null), "");
  assert.equal(toEventFormValue("not-a-date"), "");
});

test("missing and unparseable values keep their own messages", () => {
  assert.equal(eventDateError("", NOW), "Event date is required.");
  assert.equal(eventDateError(null, NOW), "Event date is required.");
  assert.equal(eventDateError(undefined, NOW), "Event date is required.");
  assert.equal(
    eventDateError("not-a-date", NOW),
    "Enter a valid event date and time.",
  );
});
