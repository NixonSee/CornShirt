import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailPage = readFileSync(
  new URL("./[eventId]/page.tsx", import.meta.url),
  "utf8",
);
const adminCancelRoute = readFileSync(
  new URL("../../api/admin/events/[eventId]/cancel/route.ts", import.meta.url),
  "utf8",
);
const organizerCancelRoute = readFileSync(
  new URL(
    "../../api/organizer/events/[eventId]/cancel/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const styles = readFileSync(
  new URL("../../globals.css", import.meta.url),
  "utf8",
);

test("pending details expose review controls while cancellation stays active-only", () => {
  assert.match(
    detailPage,
    /event\.status === "pending"\s*&&\s*\(\s*<EventReviewButtons/,
  );
  assert.match(
    detailPage,
    /event\.status === "active"\s*&&\s*\(\s*<CancelEventButton/,
  );
  assert.doesNotMatch(detailPage, /\/approve|\/reject/);
});

test("admin cancellation is active-only while organizer withdrawal stays unchanged", () => {
  assert.match(
    adminCancelRoute,
    /CANCELLABLE_STATUSES = new Set\(\["active"\]\)/,
  );
  assert.match(
    organizerCancelRoute,
    /CANCELLABLE_STATUSES = new Set\(\["pending", "active"\]\)/,
  );
  assert.match(adminCancelRoute, /notifyEventCancellation/);
  assert.match(organizerCancelRoute, /notifyEventCancellation/);
  assert.match(adminCancelRoute, /emailNotifications/);
  assert.match(organizerCancelRoute, /emailNotifications/);
});

test("admin event banners use a dedicated edge-to-edge dark frame", () => {
  assert.match(detailPage, /className="admin-event-hero"/);
  assert.match(detailPage, /EventBanner/);
  assert.match(styles, /\.admin-event-hero\s*\{/);
  assert.match(
    styles,
    /\.event-banner img\s*\{[^}]*display: block;[^}]*object-fit: contain;/s,
  );
});
