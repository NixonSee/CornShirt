import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

test("customer route protects account data and supports logout", () => {
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /\.select\("name,wallet_address,role"\)/);
  assert.match(source, /router\.replace\("\/login"\)/);
  assert.match(source, /router\.replace\("\/admin"\)/);
  assert.match(source, /router\.replace\("\/organizer"\)/);
  assert.match(source, /supabase\.auth\.signOut\(\)/);
  assert.match(source, /router\.replace\("\/visitor"\)/);
  assert.doesNotMatch(source, />\s*Log In\s*</);
});

test("customer route matches visitor discovery and reuses common components", () => {
  assert.match(source, /import \{ Button, Modal, SearchBar \}/);
  assert.match(
    source,
    /import \{ categories, events, filterEvents \} from "@\/app\/visitor\/data"/,
  );
  assert.match(source, /className="home-hero hero-carousel"/);
  assert.match(source, /className="events-section"/);
  assert.match(source, /className="event-controls"/);
  assert.match(source, /className="event-grid"/);
  assert.match(source, /<SearchBar/);
  assert.match(source, /href=\{`\/events\/\$\{event\.id\}`\}/);
  assert.match(source, /id="my-tickets"/);
  assert.match(source, />\s*My Tickets\s*</);
  assert.match(source, />\s*Top Up\s*</);
  assert.match(source, /Wallet pending/);
  assert.match(source, /<Modal/);
  assert.match(source, /DICKEN top-up is not connected yet/);
  assert.match(source, /Ticket services are not connected yet/);
});

test("customer account controls extend the visitor design responsively", () => {
  assert.match(styles, /\.customer-site-nav\s*\{/);
  assert.match(styles, /\.customer-identity\s*\{/);
  assert.match(styles, /\.customer-wallet\s*\{/);
  assert.match(styles, /\.customer-tools-section\s*\{/);
  assert.match(styles, /\.customer-ticket-state\s*\{/);
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.customer-site-nav\s*\{/,
  );
  assert.match(
    styles,
    /@media \(max-width: 560px\)[\s\S]*?\.customer-header\s*\{/,
  );
});
