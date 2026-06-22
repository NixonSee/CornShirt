# User Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a light CornShirt user dashboard that closely follows the provided event-discovery screenshot.

**Architecture:** Replace the existing `/user` page stub with a static App Router page component. Keep demo data arrays, helper class strings, and markup in `src/app/user/page.tsx` so this isolated route does not create unnecessary shared abstractions.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, `next/image`, `lucide-react`.

---

### Task 1: Replace User Dashboard Page

**Files:**
- Modify: `src/app/user/page.tsx`

- [ ] **Step 1: Confirm current stub**

Run: `Get-Content -Raw src\app\user\page.tsx`
Expected: the file exports the simple `UserDashboardPage` stub.

- [ ] **Step 2: Implement the dashboard page**

Replace the file with a dashboard component that imports `Image` from `next/image`, `Link` from `next/link`, and icons from `lucide-react`. Define shared concert data in `src/app/user/events.ts`. Render a `main` with `bg-white/95`, a top nav, image hero, responsive event grid, a filter dropdown for Latest, Coming Soon, and Ending Soon ordering, and card links to `/user/concerts/[slug]`.

- [ ] **Step 2a: Add the concert detail page**

Create `src/app/user/concerts/[slug]/page.tsx` and `src/app/user/concerts/[slug]/SecurePassPanel.tsx`. The page should use `generateStaticParams`, look up the shared event by slug, render the second-reference-style detail layout, and provide selectable ticket tiers with calculated totals.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: exit code 0, or only unrelated pre-existing warnings if the repo already has them.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: exit code 0 and `/user` compiles.

### Task 2: Visual Check

**Files:**
- Verify: `src/app/user/page.tsx`

- [ ] **Step 1: Start development server**

Run: `npm run dev`
Expected: server starts on an available localhost port.

- [ ] **Step 2: Inspect `/user`**

Open `http://localhost:<port>/user` in the browser. Verify desktop and mobile layouts show a light page shell, dark hero image treatment, readable nav, non-overlapping text, filter dropdown, responsive concert event cards, and working navigation to `/user/concerts/<slug>`.
