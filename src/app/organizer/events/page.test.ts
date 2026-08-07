import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../../../components/organizer/OrganizerDashboardClient.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const client = readFileSync(
  new URL("./MyEventsClient.tsx", import.meta.url),
  "utf8",
);

test("organizer dashboard and My Events share all six status filters", () => {
  assert.match(dashboard, /ORGANIZER_EVENT_FILTERS\.map/);
  assert.match(dashboard, /filterOrganizerEvents\(events, filter\)/);
  assert.match(page, /<MyEventsClient events=\{displayEvents\}\s*\/>/);
  assert.match(client, /ORGANIZER_EVENT_FILTERS\.map/);
  assert.match(client, /aria-label="Filter my events by status"/);
  assert.match(client, /filterOrganizerEvents\(events, filter\)/);
});
