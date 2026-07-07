# Unfinished Features TODO Document Design

## Purpose

Create `docs/UNFINISHED_FEATURES_TODO.md` as a practical roadmap containing only CornShirt features that have no meaningful implementation in the current repository.

## Sources of Truth

The audit will compare the implementation against:

- `docs/SPECS.md`
- `docs/ROLE_FEATURES_AND_FLOW.md`
- `docs/API_AND_ROUTES.md`
- The application, SQL, tests, and smart-contract files currently present in the repository

## Inclusion Rule

A feature is included only when its required behavior is completely missing. A route shell, static mockup, database helper, test, or partial workflow counts as partial implementation, so that feature will not appear in this document even if substantial work remains.

The checklist will not include:

- Completed features
- Partially implemented features
- Known bugs or failing tests
- General refactoring, styling, or code-quality work
- Features explicitly listed as out of scope in the specifications

## Organization

Items will be ordered by implementation dependency rather than by page or role:

1. Blockchain and token infrastructure
2. Stripe and DICKEN top-up
3. Ticket purchase and NFT minting
4. Ticket ownership operations
5. Refunds and cancellation settlement
6. Verification and monitoring

Each item will contain:

- A Markdown task checkbox
- The related functional requirement identifier
- The affected roles
- A concise description of the missing behavior
- A measurable completion condition
- Any prerequisite unfinished feature

## Maintenance Rule

When work begins and creates a meaningful partial implementation, remove the feature from this missing-only checklist. Track remaining subtasks in the feature's implementation plan instead. This keeps the document narrowly focused on functionality that has not been started.
