# Unfinished Features TODO Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an evidence-based Markdown checklist containing every CornShirt requirement that has no meaningful implementation, while excluding completed and partially implemented features.

**Architecture:** Treat the specification documents as the requirement inventory and the repository as implementation evidence. Classify a feature as completely missing only when no route, service, SQL object, contract, or meaningful UI workflow implements it; publish only that classification in dependency order.

**Tech Stack:** Markdown, PowerShell, ripgrep, Git

---

### Task 1: Build the requirement and implementation inventory

**Files:**
- Read: `docs/SPECS.md`
- Read: `docs/ROLE_FEATURES_AND_FLOW.md`
- Read: `docs/API_AND_ROUTES.md`
- Read: `docs/SMART_CONTRACTS.md`
- Inspect: `src/`
- Inspect: `scripts/`
- Inspect: `package.json`

- [ ] **Step 1: Extract the documented functional requirements**

Run:

```powershell
rg -n '^### FR-|shall|Future' docs/SPECS.md docs/ROLE_FEATURES_AND_FLOW.md docs/API_AND_ROUTES.md docs/SMART_CONTRACTS.md
```

Expected: an inventory covering authentication, events, top-up, purchase, NFT minting, ticket management, verification, resale, analytics, and future features.

- [ ] **Step 2: Inventory implementation files by feature keyword**

Run:

```powershell
rg -n 'stripe|top.?up|DICKEN|ERC-?20|ERC-?721|NFT|mint|purchase|refund|transfer|verify|resale|marketplace|revenue|wallet' src scripts package.json
```

Expected: evidence for implemented or partial feature surfaces and an absence of evidence for completely missing functionality.

- [ ] **Step 3: Inspect every apparent implementation before classifying it**

Open each matching route, service, page, SQL file, and test returned by Step 2. Mark a requirement as partial if any meaningful part exists, including a route shell, UI workflow, helper, SQL object, or contract integration scaffold.

- [ ] **Step 4: Produce the missing-only candidate list**

For each candidate, record the requirement ID, affected roles, prerequisite, evidence that adjacent features exist, and the absence of implementation after repository-wide search. Do not include bugs, test failures, partial features, or out-of-scope requirements.

### Task 2: Create the missing-only TODO document

**Files:**
- Create: `docs/UNFINISHED_FEATURES_TODO.md`

- [ ] **Step 1: Write the document header and scope rule**

Use this exact opening structure:

```markdown
# Completely Missing Features TODO

This checklist contains only requirements with no meaningful implementation in the current repository. Completed and partially implemented features are intentionally excluded.

Sources: `SPECS.md`, `ROLE_FEATURES_AND_FLOW.md`, `API_AND_ROUTES.md`, and `SMART_CONTRACTS.md`.
```

- [ ] **Step 2: Add dependency-ordered sections**

Use only sections that contain at least one verified missing feature, selected from:

```markdown
## 1. Blockchain and Token Infrastructure
## 2. Stripe and DICKEN Top-Up
## 3. Ticket Purchase and NFT Minting
## 4. Ticket Ownership Operations
## 5. Refunds and Cancellation Settlement
## 6. Verification and Monitoring
```

- [ ] **Step 3: Write each checklist item with measurable completion criteria**

Use this structure for every item:

```markdown
- [ ] **Feature name** — Requirement: `FR-XX`; Roles: Customer, Organizer
  - Missing behavior: One concise statement of the behavior absent from the repository.
  - Complete when: One observable end-to-end outcome that proves the feature exists.
  - Prerequisite: Another checklist item, or `None`.
```

Do not claim a feature is missing solely because its implementation is incomplete.

- [ ] **Step 4: Add the maintenance rule**

End with:

```markdown
## Maintenance

Remove an item from this document as soon as meaningful implementation begins. Track its remaining work in the relevant implementation plan rather than keeping partial features in this missing-only list.
```

### Task 3: Verify accuracy and formatting

**Files:**
- Verify: `docs/UNFINISHED_FEATURES_TODO.md`
- Compare: `docs/SPECS.md`
- Compare: `docs/ROLE_FEATURES_AND_FLOW.md`
- Compare: `docs/API_AND_ROUTES.md`
- Compare: `docs/SMART_CONTRACTS.md`

- [ ] **Step 1: Recheck every listed feature against the repository**

For each checklist item, run a focused `rg -n` search using its domain terms across `src`, `scripts`, `package.json`, and any contract directories. If meaningful implementation exists, remove the item.

- [ ] **Step 2: Check requirement coverage**

Read every `FR-*` section and every role feature. Confirm that each completely missing behavior appears once and that completed, partial, future/out-of-scope, bug, and test-failure work does not appear.

- [ ] **Step 3: Check document quality**

Run:

```powershell
rg -n 'TBD|implement later|appropriate error handling|write tests for' docs/UNFINISHED_FEATURES_TODO.md
git diff --check -- docs/UNFINISHED_FEATURES_TODO.md
```

Expected: the placeholder search returns no matches and `git diff --check` returns no errors.

- [ ] **Step 4: Review the final diff**

Run:

```powershell
git diff -- docs/UNFINISHED_FEATURES_TODO.md
```

Expected: one focused documentation file containing only verified completely missing features.

- [ ] **Step 5: Commit the TODO document**

```powershell
git add -- docs/UNFINISHED_FEATURES_TODO.md
git commit -m "docs: add missing features roadmap"
```
