import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const aboutSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");
const visitorSource = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
const eventSource = readFileSync(
  new URL("../../events/[eventId]/page.tsx", import.meta.url),
  "utf8",
);
const applySource = readFileSync(
  new URL("../apply/page.tsx", import.meta.url),
  "utf8",
);
const navUrl = new URL("../../../components/VisitorNav.tsx", import.meta.url);
const navSource = existsSync(fileURLToPath(navUrl))
  ? readFileSync(navUrl, "utf8")
  : "";

test("shared visitor navigation exposes the public actions", () => {
  assert.notEqual(navSource, "", "VisitorNav component should exist");
  assert.match(navSource, /href="\/visitor\/about"/);
  assert.match(navSource, /About Us/);
  assert.match(navSource, /href="\/visitor\/apply"/);
  assert.match(navSource, /Become an Organizer/);
  assert.match(navSource, /loginHref = "\/login"/);
  assert.match(
    navSource,
    /aria-current=\{active === "about" \? "page" : undefined\}/,
  );
});

test("visitor surfaces share VisitorNav without changing the application header", () => {
  assert.match(
    visitorSource,
    /import VisitorNav from "@\/components\/VisitorNav"/,
  );
  assert.match(visitorSource, /<VisitorNav\s*\/>/);
  assert.match(aboutSource, /<VisitorNav active="about"\s*\/>/);
  assert.match(eventSource, /<VisitorNav loginHref=\{loginHref\}\s*\/>/);
  assert.match(
    eventSource,
    /const loginHref = withEventReturnTo\("\/login", returnPath\)/,
  );
  assert.doesNotMatch(applySource, /VisitorNav/);
  assert.match(applySource, /Back to events/);
});

test("about page uses the Editorial Trust content architecture", () => {
  assert.match(aboutSource, /export const metadata/);
  assert.match(aboutSource, /Tickets people can[\s\S]*?actually trust/);
  assert.match(aboutSource, /Verified ownership/);
  assert.match(aboutSource, /Transparent transfers/);
  assert.match(aboutSource, /DICKEN checkout/);
  assert.match(aboutSource, /Our mission/);
  assert.match(aboutSource, /Meet the team/);
  assert.match(aboutSource, /\/Nixon pic\.jpeg/);
  assert.match(aboutSource, /\/Max\.mp4/);
  assert.match(aboutSource, /\/Js\.mp4/);
  assert.doesNotMatch(aboutSource, /Lorem ipsum/i);
  assert.doesNotMatch(aboutSource, /useRouter|onMouseEnter|onMouseLeave/);
});

test("visitor navigation and About page have scoped responsive styling", () => {
  assert.match(styles, /\.visitor-nav-actions\s*\{/);
  assert.match(styles, /\.visitor-nav-link\.active\s*\{/);
  assert.match(styles, /\.about-hero-grid\s*\{/);
  assert.match(styles, /\.about-promise-grid\s*\{/);
  assert.match(styles, /\.about-team-grid\s*\{/);
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.about-hero-grid\s*\{/,
  );
  assert.match(
    styles,
    /@media \(max-width: 600px\)[\s\S]*?\.visitor-nav\s*\{/,
  );
  assert.match(
    styles,
    /@media \(max-width: 600px\)[\s\S]*?\.visitor-nav\s*\{[^}]*flex-wrap:\s*wrap;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 600px\)[\s\S]*?\.visitor-nav-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
  );
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
