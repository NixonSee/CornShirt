import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { categories, events, filterEvents, getEventById } from "./data.ts";

test("catalogue matches the five events and categories from index.html", () => {
  assert.deepEqual(
    events.map((event) => event.title),
    [
      "Neon Corn Festival",
      "Harvest Beats Night",
      "DICKEN Live Arena",
      "Indie Kernel Sessions",
      "Soul Silo Evening",
    ],
  );
  assert.deepEqual(categories, [
    "All",
    "Rock",
    "Electronic",
    "Indie",
    "Soul",
    "Pop",
  ]);
});

test("search matches title, artist, city, and category without case sensitivity", () => {
  assert.deepEqual(
    filterEvents(events, "chain PULSE", "All").map((event) => event.title),
    ["DICKEN Live Arena"],
  );
  assert.deepEqual(
    filterEvents(events, "johor bahru", "All").map((event) => event.title),
    ["Indie Kernel Sessions"],
  );
});

test("category and search filters apply together", () => {
  assert.deepEqual(
    filterEvents(events, "kuala lumpur", "Electronic").map(
      (event) => event.title,
    ),
    ["Neon Corn Festival"],
  );
  assert.deepEqual(filterEvents(events, "penang", "Rock"), []);
});

test("blank search with All returns the complete catalogue", () => {
  assert.equal(filterEvents(events, "   ", "All").length, 5);
});

test("every public event exposes complete ticket options", () => {
  events.forEach((event) => {
    assert.ok(event.ticketTypes.length > 0);
    event.ticketTypes.forEach((ticket) => {
      assert.ok(ticket.name.length > 0);
      assert.ok(ticket.price > 0);
      assert.ok(ticket.remaining >= 0);
      assert.ok(ticket.purchaseLimit > 0);
      assert.equal(typeof ticket.transferAllowed, "boolean");
    });
  });
});

test("event lookup returns known events and omits unknown IDs", () => {
  assert.equal(getEventById("neon-corn-festival")?.title, "Neon Corn Festival");
  assert.equal(getEventById("not-an-event"), undefined);
});

test("visitor keeps feature markup inline without local component files", () => {
  const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  assert.equal(pageSource.includes('./components/'), false);
  assert.equal(pageSource.includes('aria-label="Featured events"'), true);
  assert.equal(
    existsSync(new URL("./components/HeroCarousel.tsx", import.meta.url)),
    false,
  );
  assert.equal(
    existsSync(new URL("./components/EventBrowser.tsx", import.meta.url)),
    false,
  );
});

test("visitor reuses the accessible shared search component", () => {
  const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const searchBarSource = readFileSync(
    new URL("../../components/common/SearchBar.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    pageSource.includes(
      'import { SearchBar } from "@/components/common";',
    ),
    true,
  );
  assert.match(
    pageSource,
    /<SearchBar[\s\S]*?inputId="eventSearch"[\s\S]*?ariaLabel="Search events"[\s\S]*?fluid/,
  );
  assert.equal(searchBarSource.includes("fluid?: boolean"), true);
  assert.equal(searchBarSource.includes("inputId?: string"), true);
  assert.equal(searchBarSource.includes("ariaLabel?: string"), true);
});

test("event section uses compact filters and purchase-focused cards", () => {
  const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  assert.equal(pageSource.includes('className="event-controls"'), true);
  assert.equal(pageSource.includes('aria-label="Filter events"'), true);
  assert.equal(pageSource.includes('className="category-row"'), false);
  assert.equal(pageSource.includes(">Details<"), false);
  assert.equal(pageSource.includes('className="event-place"'), true);
  assert.equal(pageSource.includes('className="event-date"'), true);
  assert.equal(
    pageSource.includes('className="button full event-buy-button"'),
    true,
  );
  assert.match(
    pageSource,
    /className="button full event-buy-button"\s+href=\{`\/events\/\$\{event\.id\}`\}/,
  );
});

test("event section uses the dark reference treatment with adjacent controls", () => {
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  assert.match(
    styles,
    /\.events-section\s*\{[^}]*background:\s*#000000/s,
  );
  assert.match(
    styles,
    /\.event-controls\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s,
  );
  assert.match(
    styles,
    /\.event-body\s*\{[^}]*background:\s*#292929;[^}]*color:\s*#ffffff;/s,
  );
  assert.doesNotMatch(
    styles,
    /@media \(max-width: 560px\)[\s\S]*?\.event-controls\s*\{[^}]*flex-direction:\s*column;/,
  );
});

test("hero is minimal and every event exposes its public detail route", () => {
  const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

  assert.equal(pageSource.includes('className="hero-eyebrow"'), false);
  assert.equal(pageSource.includes('className="hero-description"'), false);
  assert.equal(pageSource.includes('className="hero-event-meta"'), false);
  assert.equal(pageSource.includes("<h1>{activeEvent.title}</h1>"), true);
  assert.equal(
    pageSource.includes('href={`/events/${activeEvent.id}`}'),
    true,
  );
  assert.equal(pageSource.includes('className="event-card-link"'), true);
  assert.match(
    styles,
    /\.home-hero-inner\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*flex-end;/s,
  );
  assert.match(
    styles,
    /\.hero-slide::after\s*\{[^}]*background:\s*#0000004d;/s,
  );
  assert.doesNotMatch(styles, /\.hero-slide-(gold|red|violet|teal)::after/);
  assert.match(
    styles,
    /\.home-hero-copy\s*\{[^}]*max-width:\s*960px;/s,
  );
  assert.match(
    styles,
    /\.home-hero h1\s*\{[^}]*max-width:\s*960px;[^}]*font-size:\s*clamp\(36px, 5vw, 60px\);/s,
  );
});

test("public event details render ticket types and protected return links", () => {
  const routeUrl = new URL("../events/[eventId]/page.tsx", import.meta.url);
  const notFoundUrl = new URL("../events/[eventId]/not-found.tsx", import.meta.url);

  assert.equal(existsSync(routeUrl), true);
  assert.equal(existsSync(notFoundUrl), true);

  const routeSource = readFileSync(routeUrl, "utf8");
  assert.equal(routeSource.includes("params: Promise<{ eventId: string }>"), true);
  assert.equal(routeSource.includes("const { eventId } = await params"), true);
  assert.equal(routeSource.includes("notFound()"), true);
  assert.equal(routeSource.includes("event.ticketTypes.map"), true);
  assert.equal(routeSource.includes('withEventReturnTo("/login"'), true);
});
