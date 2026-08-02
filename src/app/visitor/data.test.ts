import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import * as eventData from "./data.ts";

const databaseRow = {
  event_id: "7c216de0-dbcb-4131-8957-8ebbc952bdfe",
  event_name: "Database Live Concert",
  artist_name: "Live Artist",
  venue: "National Arena",
  event_date: "2026-07-18T12:00:00.000Z",
  description: "Loaded directly from Supabase.",
  banner_image: "https://example.supabase.co/storage/banner.jpg",
  status: "active",
  ticket_types: [
    {
      ticket_type_id: "ticket-type-1",
      type_name: "VIP Admission",
      price: 131,
      total_supply: 476,
      remaining_supply: 60,
      purchase_limit: 4,
      transfer_allowed: true,
    },
  ],
};

test("maps the live Supabase schema into the public event model", () => {
  assert.equal(typeof eventData.mapEventRow, "function");

  const event = eventData.mapEventRow(databaseRow);
  assert.equal(event.id, databaseRow.event_id);
  assert.equal(event.title, databaseRow.event_name);
  assert.equal(event.artist, databaseRow.artist_name);
  assert.equal(event.venue, databaseRow.venue);
  assert.equal(event.description, databaseRow.description);
  assert.equal(event.image, databaseRow.banner_image);
  assert.equal(event.dateTime, databaseRow.event_date);
  assert.equal(event.price, 131);
  assert.equal(event.ticketTypes[0].name, "VIP Admission");
  assert.equal(event.ticketTypes[0].remaining, 60);
  assert.equal(event.ticketTypes[0].purchaseLimit, 4);
  assert.equal(event.ticketTypes[0].transferAllowed, true);
});

test("uses a concert fallback when database values are absent", () => {
  assert.equal(typeof eventData.mapEventRow, "function");

  const event = eventData.mapEventRow({
    ...databaseRow,
    artist_name: null,
    venue: null,
    description: null,
    banner_image: null,
    ticket_types: [],
  });

  assert.equal(event.artist, "Artist TBC");
  assert.equal(event.venue, "Venue TBC");
  assert.equal(event.image, "/Background Image.png");
  assert.equal(event.price, 0);
  assert.deepEqual(event.ticketTypes, []);
});

test("search filters live events by title, artist, venue, and category", () => {
  assert.equal(typeof eventData.mapEventRow, "function");
  const event = eventData.mapEventRow(databaseRow);

  assert.deepEqual(eventData.filterEvents([event], "national arena", "All"), [
    event,
  ]);
  assert.deepEqual(eventData.filterEvents([event], "live artist", "Concert"), [
    event,
  ]);
  assert.deepEqual(eventData.filterEvents([event], "missing", "All"), []);
  assert.deepEqual(eventData.getEventCategories([event]), ["All", "Concert"]);
});

test("production data module no longer contains the dummy catalogue", () => {
  const source = readFileSync(new URL("./data.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /export const events/);
  assert.doesNotMatch(source, /Neon Corn Festival|Harvest Beats Night/);
});

test("shared discovery loads active events once and passes them to both views", () => {
  const base = new URL("../../components/visitor&customer/", import.meta.url);
  const discoverySource = readFileSync(
    new URL("EventDiscovery.tsx", base),
    "utf8",
  );
  const carouselSource = readFileSync(
    new URL("HeroCarousel.tsx", base),
    "utf8",
  );
  const browserSource = readFileSync(
    new URL("EventBrowser.tsx", base),
    "utf8",
  );

  assert.match(discoverySource, /fetch\("\/api\/public\/events"/);
  assert.match(discoverySource, /<HeroCarousel events=\{events\}/);
  assert.match(discoverySource, /<EventBrowser events=\{events\}/);
  assert.match(discoverySource, /className="event-discovery-surface"/);
  assert.match(discoverySource, /Loading live events/);
  assert.match(discoverySource, /Unable to load live events/);
  assert.doesNotMatch(carouselSource, /import \{ events \}/);
  assert.doesNotMatch(browserSource, /categories, events/);
  assert.match(carouselSource, /events: readonly Event\[\]/);
  assert.match(browserSource, /events: readonly Event\[\]/);
  assert.doesNotMatch(carouselSource, /Featured live event/);
  assert.match(carouselSource, /activeEvent\.date/);
  assert.match(carouselSource, /activeEvent\.venue/);
});

test("public API and details query only active Supabase events", () => {
  const apiUrl = new URL("../api/public/events/route.ts", import.meta.url);
  const serverDataUrl = new URL("../../lib/publicEvents.ts", import.meta.url);
  const detailUrl = new URL("../events/[eventId]/page.tsx", import.meta.url);

  assert.equal(existsSync(apiUrl), true);
  assert.equal(existsSync(serverDataUrl), true);

  const apiSource = readFileSync(apiUrl, "utf8");
  const serverDataSource = readFileSync(serverDataUrl, "utf8");
  const detailSource = readFileSync(detailUrl, "utf8");

  assert.match(apiSource, /getActiveEvents/);
  assert.match(serverDataSource, /supabaseAdmin/);
  assert.match(serverDataSource, /\.eq\("status", "active"\)/);
  assert.match(serverDataSource, /ticket_types/);
  assert.match(detailSource, /getActiveEventById/);
  assert.doesNotMatch(detailSource, /getEventById|generateStaticParams/);
});

test("visitor keeps the shared public-navbar dimensions", () => {
  const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const navSource = readFileSync(
    new URL("../../components/nav/SiteNav.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /import VisitorNav from "@\/components\/VisitorNav"/);
  assert.match(pageSource, /<VisitorNav\s*\/>/);
  // The public bar still carries every legacy class globals.css keys off.
  assert.match(navSource, /"app-topbar",/);
  assert.match(navSource, /isVisitor && "visitor-nav"/);
  assert.match(navSource, /app-topbar-brand sitenav-brand/);
  assert.match(navSource, /visitor-nav-brand/);
  assert.match(navSource, /app-topbar-actions sitenav-actions/);
  assert.match(navSource, /visitor-nav-actions/);
  assert.match(navSource, /CornShirt_Hub-removedbg\.png/);
  assert.match(navSource, /width=\{190\}[\s\S]*height=\{60\}/);
});

test("SiteNav preserves the globals.css route-scoping contract", () => {
  const navSource = readFileSync(
    new URL("../../components/nav/SiteNav.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  // ~500 rules scope per-page styling via
  // `.app-shell:has(.side-nav a[href="..."].active)`. If the drawer stops
  // rendering that markup, admin/organizer/customer styling dies silently.
  assert.match(navSource, /className="side-nav"/);
  assert.match(navSource, /isActive\(href\) \? "active" : undefined/);
  // The drawer must stay mounted at every breakpoint, never conditionally rendered.
  assert.doesNotMatch(navSource, /open &&\s*\(?\s*<aside/);
  assert.doesNotMatch(navSource, /open \?\s*\(?\s*<aside/);
  // The centre pill must not reuse `.side-nav`, or it inherits drawer styling
  // and creates a second set of `.active` links in the tree.
  assert.doesNotMatch(navSource, /className="sitenav-pill side-nav"/);
  assert.match(styles, /\.app-shell:has\(\.side-nav a\[href="\/admin\/events"\]\.active\)/);
});

test("event section retains its compact dark responsive treatment", () => {
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.events-section\s*\{[\s\S]*?background:\s*#0d1117/);
  assert.match(
    styles,
    /\.event-controls\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:/,
  );
  assert.match(
    styles,
    /\.event-body\s*\{[\s\S]*?background:\s*#292929;[\s\S]*?color:\s*#ffffff;/,
  );
});

test("visitor and customer event routes own separate navigation", () => {
  const publicUrl = new URL("../events/[eventId]/page.tsx", import.meta.url);
  const customerUrl = new URL(
    "../customer/events/[eventId]/page.tsx",
    import.meta.url,
  );

  assert.equal(existsSync(publicUrl), true);
  assert.equal(existsSync(customerUrl), true);

  const publicSource = readFileSync(publicUrl, "utf8");
  const customerSource = readFileSync(customerUrl, "utf8");
  // Public link hrefs moved into VISITOR_NAV when the navbars were unified.
  const visitorNavSource = readFileSync(
    new URL("../../components/navConfig.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(publicSource, /getVerifiedRole|RoleNav/);
  assert.match(publicSource, /<VisitorNav loginHref=\{loginHref\}\s*\/>/);
  assert.match(visitorNavSource, /href: "\/visitor\/apply"/);
  assert.match(visitorNavSource, /href: "\/visitor\/about"/);
  assert.match(publicSource, /withEventReturnTo\("\/login"/);
  assert.match(customerSource, /requireRole\(\["customer", "user"\]\)/);
  assert.match(customerSource, /<RoleNav role="customer"\s*\/>/);
});

test("shared discovery receives a customer-specific event prefix", () => {
  const customerPage = readFileSync(
    new URL("../customer/page.tsx", import.meta.url),
    "utf8",
  );
  const discovery = readFileSync(
    new URL(
      "../../components/visitor&customer/EventDiscovery.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    customerPage,
    /<EventDiscovery detailBasePath="\/customer\/events"/,
  );
  assert.match(discovery, /detailBasePath = "\/events"/);
});

test("shared event details place ticket options before the about section", () => {
  const routeSource = readFileSync(
    new URL("../../components/events/EventDetailContent.tsx", import.meta.url),
    "utf8",
  );
  const ticketingSource = readFileSync(
    new URL("../events/[eventId]/EventTicketing.tsx", import.meta.url),
    "utf8",
  );
  const countdownPath = new URL(
    "../../components/events/EventCountdown.tsx",
    import.meta.url,
  );
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(routeSource, /className="event-detail-summary"/);
  assert.doesNotMatch(routeSource, /event-detail-hero-badges/);
  assert.doesNotMatch(routeSource, /event-detail-category/);
  assert.doesNotMatch(routeSource, /EventCountdown/);
  assert.doesNotMatch(styles, /event-countdown-/);
  assert.ok(!existsSync(countdownPath));
  assert.match(routeSource, /timezone:\s*"UTC\+8"/);
  assert.match(routeSource, /className="event-detail-hero-layout"/);
  assert.match(routeSource, /className="event-detail-meta-row"/);
  assert.match(ticketingSource, /className=\{`event-ticketing-grid/);
  assert.match(ticketingSource, /className="event-detail-panel event-seatmap-panel"/);
  assert.match(ticketingSource, /<SeatMap/);
  assert.ok(
    routeSource.indexOf("<EventTicketing") <
      routeSource.indexOf('className="event-detail-panel event-about-panel"'),
  );
  assert.match(
    styles,
    /\.event-detail-content\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
  );
  assert.match(
    styles,
    /\.event-detail-content\s*\{[\s\S]*?width:\s*min\(1600px,\s*calc\(100% - clamp\(28px,\s*4vw,\s*72px\)\)\);/,
  );
  assert.match(styles, /\.event-detail-hero-nav-shade\s*\{/);
  assert.match(styles, /\.event-detail-hero::after\s*\{/);
  assert.match(styles, /\.event-detail-hero::after\s*\{[\s\S]*?inset:\s*0;/);
});

test("sorts ticket types by natural alphabetical name", () => {
  const event = eventData.mapEventRow({
    ...databaseRow,
    ticket_types: [
      { ...databaseRow.ticket_types[0], ticket_type_id: "zone-c", type_name: "Zone C" },
      { ...databaseRow.ticket_types[0], ticket_type_id: "zone-d", type_name: "Zone D" },
      { ...databaseRow.ticket_types[0], ticket_type_id: "zone-e", type_name: "Zone E" },
      { ...databaseRow.ticket_types[0], ticket_type_id: "zone-a", type_name: "Zone A" },
      { ...databaseRow.ticket_types[0], ticket_type_id: "zone-b", type_name: "Zone B" },
    ],
  });

  assert.deepEqual(
    event.ticketTypes.map((ticket) => ticket.name),
    ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E"],
  );
});
