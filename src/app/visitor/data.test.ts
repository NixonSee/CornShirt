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
  assert.match(discoverySource, /Loading live events/);
  assert.match(discoverySource, /Unable to load live events/);
  assert.doesNotMatch(carouselSource, /import \{ events \}/);
  assert.doesNotMatch(browserSource, /categories, events/);
  assert.match(carouselSource, /events: readonly Event\[\]/);
  assert.match(browserSource, /events: readonly Event\[\]/);
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
    new URL("../../components/VisitorNav.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /import VisitorNav from "@\/components\/VisitorNav"/);
  assert.match(pageSource, /<VisitorNav\s*\/>/);
  assert.match(navSource, /className="app-topbar visitor-nav"/);
  assert.match(navSource, /className="app-topbar-brand visitor-nav-brand"/);
  assert.match(navSource, /className="app-topbar-actions visitor-nav-actions"/);
  assert.match(navSource, /width=\{190\}[\s\S]*height=\{50\}/);
});

test("event section retains its compact dark responsive treatment", () => {
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.events-section\s*\{[^}]*background:\s*#000000/s);
  assert.match(
    styles,
    /\.event-controls\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s,
  );
  assert.match(
    styles,
    /\.event-body\s*\{[^}]*background:\s*#292929;[^}]*color:\s*#ffffff;/s,
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
  const visitorNavSource = readFileSync(
    new URL("../../components/VisitorNav.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(publicSource, /getVerifiedRole|RoleNav/);
  assert.match(publicSource, /<VisitorNav loginHref=\{loginHref\}\s*\/>/);
  assert.match(visitorNavSource, /href="\/visitor\/apply"/);
  assert.match(visitorNavSource, /href="\/visitor\/about"/);
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
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  assert.ok(
    routeSource.indexOf('className="event-detail-panel ticket-options-panel"') <
      routeSource.indexOf('className="event-detail-panel event-about-panel"'),
  );
  assert.match(
    styles,
    /\.event-detail-content\s*\{[^}]*grid-template-columns:\s*1fr;/s,
  );
  assert.match(
    styles,
    /\.event-detail-content\s*\{[^}]*width:\s*min\(900px,\s*calc\(100% - 32px\)\);/s,
  );
});
