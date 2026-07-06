# Visitor About Page and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Editorial Trust About Us redesign and a reusable visitor-only navbar that exposes About Us consistently across public visitor surfaces.

**Architecture:** Add a server-compatible `VisitorNav` with explicit `active` and `loginHref` props, then replace duplicated headers on visitor home, About Us, and public event details. Rebuild the About page as a metadata-exporting server component with scoped `about-*` CSS and source-level Node regression tests.

**Tech Stack:** Next.js App Router, React, TypeScript, Lucide React, CSS, Node test runner

**Repository safety:** The worktree already contains unrelated staged changes. Do not commit, unstage, or rewrite them; edit only the files listed below.

---

### Task 1: Add the shared visitor navigation with regression coverage

**Files:**
- Create: `src/components/VisitorNav.tsx`
- Create: `src/app/visitor/about/page.test.ts`
- Modify: `src/app/visitor/page.tsx`
- Modify: `src/app/events/[eventId]/page.tsx`
- Read only: `src/app/visitor/apply/page.tsx`

- [ ] **Step 1: Write the failing shared-navigation tests**

Create `src/app/visitor/about/page.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aboutSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const visitorSource = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
const eventSource = readFileSync(
  new URL("../../events/[eventId]/page.tsx", import.meta.url),
  "utf8",
);
const applySource = readFileSync(
  new URL("../apply/page.tsx", import.meta.url),
  "utf8",
);
const navSource = readFileSync(
  new URL("../../../components/VisitorNav.tsx", import.meta.url),
  "utf8",
);

test("shared visitor navigation exposes the public actions", () => {
  assert.match(navSource, /href="\/visitor\/about"/);
  assert.match(navSource, /About Us/);
  assert.match(navSource, /href="\/visitor\/apply"/);
  assert.match(navSource, /Become an Organizer/);
  assert.match(navSource, /loginHref = "\/login"/);
  assert.match(navSource, /aria-current=\{active === "about" \? "page" : undefined\}/);
});

test("visitor surfaces share VisitorNav without changing the application header", () => {
  assert.match(visitorSource, /import VisitorNav from "@\/components\/VisitorNav"/);
  assert.match(visitorSource, /<VisitorNav\s*\/>/);
  assert.match(aboutSource, /<VisitorNav active="about"\s*\/>/);
  assert.match(eventSource, /<VisitorNav loginHref=\{loginHref\}\s*\/>/);
  assert.match(eventSource, /const loginHref = withEventReturnTo\("\/login", returnPath\)/);
  assert.doesNotMatch(applySource, /VisitorNav/);
  assert.match(applySource, /Back to events/);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts
```

Expected: FAIL because `src/components/VisitorNav.tsx` does not exist.

- [ ] **Step 3: Create the shared navigation component**

Create `src/components/VisitorNav.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";

interface VisitorNavProps {
  active?: "about";
  loginHref?: string;
}

export default function VisitorNav({
  active,
  loginHref = "/login",
}: VisitorNavProps) {
  return (
    <header className="app-topbar visitor-nav">
      <Link className="app-topbar-brand visitor-nav-brand" href="/visitor">
        <Image
          src="/CornShirt Hub.png"
          alt="CornShirt Hub"
          width={190}
          height={50}
          priority
        />
      </Link>

      <nav className="app-topbar-actions visitor-nav-actions" aria-label="Visitor navigation">
        <Link
          className={`visitor-nav-link${active === "about" ? " active" : ""}`}
          href="/visitor/about"
          aria-current={active === "about" ? "page" : undefined}
        >
          About Us
        </Link>
        <Link className="button-outline visitor-nav-action" href="/visitor/apply">
          Become an Organizer
        </Link>
        <Link className="button visitor-nav-action" href={loginHref}>
          Log In
        </Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Replace the duplicated visitor-home header**

In `src/app/visitor/page.tsx`, remove the `Image`, `Link`, `useRouter`, and `Button` imports and the inline `<header>`. Import and render:

```tsx
import VisitorNav from "@/components/VisitorNav";

// Inside the fragment, before <main>:
<VisitorNav />
```

Remove `"use client"` because the page no longer has client-side behavior.

- [ ] **Step 5: Replace the public event-details header without losing return flow**

In `src/app/events/[eventId]/page.tsx`, remove `Image` and `Link`, import `VisitorNav`, and derive one login URL:

```tsx
import VisitorNav from "@/components/VisitorNav";

const returnPath = `/events/${event.id}`;
const loginHref = withEventReturnTo("/login", returnPath);

// Replace the complete site-header block:
<VisitorNav loginHref={loginHref} />

// Reuse the same value below:
<EventDetailContent
  event={event}
  isCustomer={false}
  loginHref={loginHref}
  eventsHref="/visitor#events"
/>
```

- [ ] **Step 6: Run the focused tests**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts
```

Expected: the shared-navigation test passes; the About-page usage assertion may remain red until Task 2 replaces the page.

### Task 2: Rebuild the About page with Editorial Trust content

**Files:**
- Modify: `src/app/visitor/about/page.tsx`
- Modify: `src/app/visitor/about/page.test.ts`

- [ ] **Step 1: Add failing About-page structure tests**

Append to `src/app/visitor/about/page.test.ts`:

```ts
test("about page uses the Editorial Trust content architecture", () => {
  assert.match(aboutSource, /export const metadata/);
  assert.match(aboutSource, /Tickets people can actually trust/);
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
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts
```

Expected: FAIL because the existing page has no metadata export, still contains Lorem Ipsum, and lacks the approved sections.

- [ ] **Step 3: Replace the About page**

Rewrite `src/app/visitor/about/page.tsx` as a server component with:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TicketCheck,
} from "lucide-react";

import Footer from "@/components/Footer";
import VisitorNav from "@/components/VisitorNav";

export const metadata: Metadata = {
  title: "About Us | CornShirt",
  description:
    "Meet the CornShirt team and learn how we make live-event ticketing more transparent, secure, and accessible.",
};

const promises = [
  {
    icon: BadgeCheck,
    title: "Verified ownership",
    copy: "Every ticket carries a clear digital record, helping fans know what they own.",
  },
  {
    icon: RefreshCcw,
    title: "Transparent transfers",
    copy: "Ticket movement stays traceable, reducing uncertainty across the event journey.",
  },
  {
    icon: Coins,
    title: "DICKEN checkout",
    copy: "A purpose-built token connects discovery, purchase, and event access in one ecosystem.",
  },
];

const values = [
  { icon: ShieldCheck, title: "Trust by design", copy: "Security and clarity are foundations, not optional extras." },
  { icon: TicketCheck, title: "Access made simple", copy: "The technology works behind the scenes so ticketing feels natural." },
  { icon: RadioTower, title: "Built for live culture", copy: "Every decision starts with the people who make events worth attending." },
];

export default function AboutPage() {
  return (
    <>
      <VisitorNav active="about" />
      <main className="about-page">
        <section className="about-hero">
          <div className="about-shell about-hero-grid">
            <div className="about-hero-copy">
              <span className="about-eyebrow"><Sparkles size={15} /> Built for the live moment</span>
              <h1>Tickets people can <span>actually trust.</span></h1>
              <p>CornShirt turns blockchain-powered ownership into a clear, confident ticketing experience for fans and organizers.</p>
              <div className="about-hero-actions">
                <Link className="button" href="/visitor#events">Browse events <ArrowRight size={17} /></Link>
                <Link className="button-outline" href="/visitor/apply">Become an Organizer</Link>
              </div>
            </div>
            <div className="about-ticket-visual" aria-hidden="true">
              <div className="about-ticket-card about-ticket-card-back" />
              <div className="about-ticket-card about-ticket-card-front">
                <span>CORNSHIRT VERIFIED</span><strong>LIVE / OWNED / YOURS</strong><i>01</i>
              </div>
            </div>
          </div>
        </section>

        <section className="about-promise-strip" aria-label="CornShirt product promises">
          <div className="about-shell about-promise-grid">
            {promises.map(({ icon: Icon, title, copy }) => (
              <article className="about-promise" key={title}><Icon size={22} /><div><h2>{title}</h2><p>{copy}</p></div></article>
            ))}
          </div>
        </section>

        <section className="about-section about-shell about-mission-grid">
          <div><p className="about-section-label">Our mission</p><h2>Make every entry feel certain.</h2></div>
          <div><p>Live events should begin with anticipation, not doubt. CornShirt makes ticket ownership verifiable while keeping the customer journey simple.</p><p>We give organizers clearer control and fans a more confident path from discovery to the door.</p></div>
        </section>

        <section className="about-section about-shell">
          <div className="about-section-heading"><p className="about-section-label">What guides us</p><h2>Built around the people in the crowd.</h2></div>
          <div className="about-values-grid">
            {values.map(({ icon: Icon, title, copy }, index) => (
              <article className="about-value-card" key={title}><span>0{index + 1}</span><Icon size={24} /><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section className="about-section about-shell">
          <div className="about-section-heading"><p className="about-section-label">The builders</p><h2>Meet the team</h2><p>Three collaborators building a more trustworthy live-event experience.</p></div>
          <div className="about-team-grid">
            <article className="about-team-card about-team-card-lead">
              <div className="about-team-media"><Image src="/Nixon pic.jpeg" alt="Nixon See" fill sizes="(max-width: 760px) 100vw, 33vw" /></div>
              <div className="about-team-copy"><span>Team Leader</span><h3>Nixon See</h3><p>Guides the product vision and brings the platform's technical and event experience together.</p></div>
            </article>
            <article className="about-team-card">
              <div className="about-team-media"><video src="/Max.mp4" aria-label="Max" autoPlay loop muted playsInline /></div>
              <div className="about-team-copy"><span>Team Member</span><h3>Max</h3><p>Shapes reliable product flows that make complex ticketing interactions feel straightforward.</p></div>
            </article>
            <article className="about-team-card">
              <div className="about-team-media"><video src="/Js.mp4" aria-label="Jeng Siang" autoPlay loop muted playsInline /></div>
              <div className="about-team-copy"><span>Team Member</span><h3>Jeng Siang</h3><p>Builds the connected experiences that help fans and organizers move confidently through CornShirt.</p></div>
            </article>
          </div>
        </section>

        <section className="about-cta"><div className="about-shell about-cta-inner"><div><p className="about-section-label">The next event starts here</p><h2>Find your place in the crowd.</h2></div><div className="about-hero-actions"><Link className="button" href="/visitor#events">Explore events <ArrowRight size={17} /></Link><Link className="button-outline" href="/visitor/apply">Partner with us</Link></div></div></section>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts
```

Expected: content and navigation tests pass; styling assertions are added in Task 3.

### Task 3: Add responsive scoped styling

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/visitor/about/page.test.ts`

- [ ] **Step 1: Add failing style-contract tests**

Add `styles` near the other test fixtures and append the test:

```ts
const styles = readFileSync(new URL("../../globals.css", import.meta.url), "utf8");

test("visitor navigation and About page have scoped responsive styling", () => {
  assert.match(styles, /\.visitor-nav-actions\s*\{/);
  assert.match(styles, /\.visitor-nav-link\.active\s*\{/);
  assert.match(styles, /\.about-hero-grid\s*\{/);
  assert.match(styles, /\.about-promise-grid\s*\{/);
  assert.match(styles, /\.about-team-grid\s*\{/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.about-hero-grid\s*\{/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*?\.visitor-nav\s*\{/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts
```

Expected: FAIL because the new scoped CSS selectors do not exist.

- [ ] **Step 3: Append the scoped stylesheet**

Append a `/* Visitor navigation and About page */` section to `src/app/globals.css` implementing:

```css
.visitor-nav { position: relative; z-index: 50; }
.visitor-nav-brand img { width: auto; height: 46px; object-fit: contain; }
.visitor-nav-actions { gap: 12px; }
.visitor-nav-link { color: var(--muted-foreground); font-size: 0.88rem; font-weight: 800; text-decoration: none; padding: 10px 4px; border-bottom: 2px solid transparent; }
.visitor-nav-link:hover, .visitor-nav-link.active { color: var(--primary); border-bottom-color: var(--primary); }
.visitor-nav-action { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; }

.about-page { overflow: hidden; background: #090909; color: var(--foreground); }
.about-shell { width: min(1180px, calc(100% - 48px)); margin-inline: auto; }
.about-hero { position: relative; padding: clamp(72px, 10vw, 132px) 0 76px; background: radial-gradient(circle at 78% 24%, #f6a7301f, transparent 30%), linear-gradient(155deg, #171717, #090909 64%); border-bottom: 1px solid var(--border); }
.about-hero-grid { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr); gap: clamp(44px, 8vw, 110px); align-items: center; }
.about-eyebrow, .about-section-label { color: var(--primary); font-size: .76rem; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
.about-eyebrow { display: inline-flex; align-items: center; gap: 8px; }
.about-hero h1 { max-width: 760px; margin: 18px 0 22px; font-family: var(--font-display); font-size: clamp(3.2rem, 7vw, 6.7rem); line-height: .91; letter-spacing: -.055em; }
.about-hero h1 span { color: var(--primary); }
.about-hero-copy > p { max-width: 640px; color: var(--muted-foreground); font-size: clamp(1rem, 1.8vw, 1.18rem); line-height: 1.75; }
.about-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.about-hero-actions :is(.button, .button-outline) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; text-decoration: none; }
.about-ticket-visual { position: relative; min-height: 420px; }
.about-ticket-card { position: absolute; inset: 50% auto auto 50%; width: min(100%, 430px); aspect-ratio: 1.55; border: 1px solid #ffffff26; border-radius: 24px; }
.about-ticket-card-back { transform: translate(-44%, -56%) rotate(9deg); background: linear-gradient(135deg, #2a2117, #151515); }
.about-ticket-card-front { transform: translate(-54%, -44%) rotate(-4deg); display: grid; align-content: space-between; padding: 32px; background: linear-gradient(145deg, #211b13, #0d0d0d); box-shadow: 0 32px 80px #000a; }
.about-ticket-card-front span { color: var(--primary); font-size: .7rem; font-weight: 900; letter-spacing: .18em; }
.about-ticket-card-front strong { max-width: 250px; font-family: var(--font-display); font-size: clamp(1.8rem, 3.5vw, 3rem); line-height: .95; }
.about-ticket-card-front i { color: #ffffff42; font-family: var(--font-display); font-size: 4rem; font-style: normal; justify-self: end; }
.about-promise-strip { border-bottom: 1px solid var(--border); background: #101010; }
.about-promise-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.about-promise { display: flex; gap: 16px; padding: 30px 26px; border-right: 1px solid var(--border); }
.about-promise:last-child { border-right: 0; }
.about-promise svg { flex: 0 0 auto; color: var(--primary); }
.about-promise h2 { margin: 0 0 7px; font-size: 1rem; }
.about-promise p, .about-section p, .about-value-card p, .about-team-copy p { color: var(--muted-foreground); line-height: 1.7; }
.about-promise p { margin: 0; font-size: .83rem; }
.about-section { padding-block: clamp(72px, 9vw, 116px); }
.about-mission-grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: clamp(40px, 8vw, 120px); border-bottom: 1px solid var(--border); }
.about-section h2, .about-cta h2 { margin: 10px 0 0; font-family: var(--font-display); font-size: clamp(2.25rem, 5vw, 4.6rem); line-height: .98; letter-spacing: -.04em; }
.about-section-heading { max-width: 690px; margin-bottom: 38px; }
.about-values-grid, .about-team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.about-value-card, .about-team-card { border: 1px solid var(--border); border-radius: 22px; background: linear-gradient(145deg, #181818, #111); transition: transform .2s ease, border-color .2s ease; }
.about-value-card { min-height: 270px; padding: 28px; }
.about-value-card:hover, .about-team-card:hover { transform: translateY(-5px); border-color: #f6a73075; }
.about-value-card > span { float: right; color: #ffffff26; font: 800 2.4rem var(--font-display); }
.about-value-card svg { color: var(--primary); }
.about-value-card h3 { margin: 52px 0 10px; font-size: 1.25rem; }
.about-team-card { overflow: hidden; }
.about-team-media { position: relative; aspect-ratio: 1 / .92; overflow: hidden; background: #1a1a1a; }
.about-team-media :is(img, video) { width: 100%; height: 100%; object-fit: cover; }
.about-team-copy { padding: 24px; }
.about-team-copy span { color: var(--primary); font-size: .7rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
.about-team-copy h3 { margin: 8px 0; font-size: 1.45rem; }
.about-cta { padding-block: 72px; border-block: 1px solid var(--border); background: radial-gradient(circle at 90% 50%, #f6a73020, transparent 34%), #121212; }
.about-cta-inner { display: flex; align-items: end; justify-content: space-between; gap: 40px; }

@media (max-width: 900px) {
  .about-hero-grid, .about-mission-grid { grid-template-columns: 1fr; }
  .about-ticket-visual { min-height: 330px; }
  .about-promise-grid, .about-values-grid, .about-team-grid { grid-template-columns: 1fr; }
  .about-promise { border-right: 0; border-bottom: 1px solid var(--border); }
  .about-promise:last-child { border-bottom: 0; }
  .about-team-media { aspect-ratio: 16 / 9; }
  .about-cta-inner { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 600px) {
  .visitor-nav { align-items: flex-start; gap: 12px; padding-block: 12px; }
  .visitor-nav-brand img { height: 38px; }
  .visitor-nav-actions { flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
  .visitor-nav-link { order: 3; width: 100%; text-align: right; padding-block: 5px; }
  .visitor-nav-action { min-height: 36px; padding: 8px 10px; font-size: .76rem; }
  .about-shell { width: min(100% - 28px, 1180px); }
  .about-hero { padding-top: 62px; }
  .about-ticket-visual { min-height: 260px; }
  .about-ticket-card-front { padding: 22px; }
  .about-section { padding-block: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .about-value-card, .about-team-card { transition: none; }
  .about-value-card:hover, .about-team-card:hover { transform: none; }
}
```

- [ ] **Step 4: Run focused tests and lint**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts
npx.cmd eslint src/components/VisitorNav.tsx src/app/visitor/page.tsx src/app/visitor/about/page.tsx "src/app/events/[eventId]/page.tsx" src/app/visitor/about/page.test.ts
```

Expected: both commands exit 0.

### Task 4: Final regression and build verification

**Files:**
- Verify only; no new edits unless a check identifies a task-scoped defect.

- [ ] **Step 1: Run relevant visitor tests**

Run:

```powershell
node --test src/app/visitor/about/page.test.ts src/app/visitor/data.test.ts
```

Expected: the new About tests pass. If `data.test.ts` reports its known source-shape expectations around older event ticketing structure, report those separately rather than changing unrelated ticketing code.

- [ ] **Step 2: Check diff hygiene and scope**

Run:

```powershell
git diff --check
git diff -- src/components/VisitorNav.tsx src/app/visitor/page.tsx src/app/visitor/about/page.tsx "src/app/events/[eventId]/page.tsx" src/app/globals.css src/app/visitor/about/page.test.ts
```

Expected: no whitespace errors; the diff is limited to the approved visitor navigation and About-page work, while pre-existing changes in overlapping files are preserved.

- [ ] **Step 3: Attempt the production build**

Run:

```powershell
npm.cmd run build
```

Expected: exit 0, or an unrelated existing dependency/configuration blocker is documented with its exact error and file.
