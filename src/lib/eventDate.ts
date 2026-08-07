// Events are scheduled in Malaysia time — the same zone every date in the app is
// displayed in. Pinning it here means the browser and the server derive an
// identical cutoff, so the form can never accept a date the API then rejects.
export const APP_TIME_ZONE = "Asia/Kuala_Lumpur";

// Malaysia is UTC+8 all year — no DST — so a fixed offset is safe.
export const APP_UTC_OFFSET = "+08:00";

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// hourCycle "h23" rather than hour12:false — the latter can render midnight as 24.
const FORM_VALUE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" for the calendar day `now` falls on in Malaysia. en-CA is the
// locale whose numeric format is already ISO-ordered.
export function localDateKey(now = new Date()): string {
  return DATE_KEY_FORMATTER.format(now);
}

// The earliest schedulable slot — tomorrow at midnight — as the `min` attribute
// for <input type="datetime-local">. Adding a day to the *key* rather than to
// `now` keeps the arithmetic away from DST and offset edge cases.
export function minEventDate(now = new Date()): string {
  const today = localDateKey(now);
  const tomorrow = new Date(`${today}T00:00:00.000Z`).getTime() + DAY_MS;
  return `${new Date(tomorrow).toISOString().slice(0, 10)}T00:00`;
}

// Returns null when the date is acceptable, otherwise the message to show.
// Mirrors the passwordPolicyError / parsePositiveMyrAmount idiom.
export function eventDateError(
  value: string | null | undefined,
  now = new Date(),
): string | null {
  if (!value) return "Event date is required.";
  if (Number.isNaN(new Date(value).getTime())) {
    return "Enter a valid event date and time.";
  }

  // The form value is a bare wall-clock string with no offset, so re-parsing it
  // into a Date would reinterpret it in the runtime's zone — UTC on the server,
  // the user's zone in the browser. Comparing the YYYY-MM-DD prefix as a string
  // has no such ambiguity.
  const day = value.slice(0, 10);
  const today = localDateKey(now);

  if (day < today) {
    return "Event date cannot be in the past. Choose a date from tomorrow onwards.";
  }
  if (day === today) {
    return "Events cannot be scheduled for today. Choose a date from tomorrow onwards.";
  }

  return null;
}

// The form value is a bare wall clock the organizer means in Malaysia time.
// Stamping the offset before it reaches Postgres is what stops a timestamptz
// column from reading it as UTC and storing an instant eight hours late.
// "2026-10-10T20:00" -> "2026-10-10T12:00:00.000Z"
export function toEventInstant(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const instant = new Date(
    `${match[1]}T${match[2]}:${match[3]}:00${APP_UTC_OFFSET}`,
  );
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

// The inverse: a stored instant back to the Malaysian wall clock a
// <input type="datetime-local"> expects. "2026-10-10T12:00:00Z" -> "2026-10-10T20:00"
export function toEventFormValue(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = FORM_VALUE_FORMATTER.formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
