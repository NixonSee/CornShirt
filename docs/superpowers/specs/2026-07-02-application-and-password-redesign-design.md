# Application and Password Redesign

## Goal

Redesign three existing CornShirt interfaces to improve clarity, visual hierarchy, and user confidence while preserving current behavior and the established dark concert-commerce theme.

## Scope

Modify these existing files directly:

- `src/app/visitor/apply/page.tsx`
- `src/components/admin/PartnerApplicationsTable.tsx`
- `src/app/auth/set-password/page.tsx`

`src/app/globals.css` may receive narrowly scoped shared or responsive styles when this produces a cleaner implementation. No alternate redesign source files or new application routes will be created.

## Visitor Partner Application

Use the approved guided-journey design.

- Divide the application into four steps: personal details, business profile, location and organizer background, then documents and final review.
- Show the current step, overall progress, and clear Back/Continue controls.
- Validate required information before advancing from a step.
- Preserve every existing form field and the three required document uploads.
- Preserve drag-and-drop uploads, file removal, `/api/apply` submission, server errors, network errors, cancellation, and the success state.
- Do not add draft persistence or a Save and Exit control because the current backend does not support it.
- Collapse the layout cleanly for mobile screens.

## Partner Application Detail Modal

Use the approved summary-card design inside `PartnerApplicationsTable.tsx`.

- Redesign only the application-detail popup opened by View detail.
- Keep the surrounding applications table visually and behaviorally unchanged.
- Keep the approve/reject confirmation modal visually and behaviorally unchanged.
- Give the detail popup a stronger applicant header, status badge, submitted date, and close control.
- Show the rejection reason prominently only for rejected applications that have review notes.
- Organize personal, business, address, and organizer-background information into four scannable summary cards.
- Present uploaded documents as compact cards with filenames, sizes, and existing download links.
- Preserve the current Close action and all existing data.

## Set Password

Use the approved focused-card design.

- Retain invitation-token parsing and Supabase session establishment exactly as the current flow requires.
- Present the form in a focused glass-style card over CornShirt concert imagery.
- Add derived password-strength feedback and confirmation-match feedback without changing backend password rules.
- Preserve password visibility controls, validation, Supabase password update, errors, loading, completion, sign-out, and return-to-login behavior.
- Redesign loading and success states so they belong to the same visual system.

## Visual System

- Continue using the existing dark surfaces, warm fire gradient, Archivo headings, Inter body text, and Lucide icons.
- Use the fire gradient selectively for primary actions and progress.
- Use stronger spacing, grouped content, restrained borders, and visible focus states.
- Avoid introducing unrelated colors or a light dashboard treatment.
- Follow the existing 900px and 560px responsive breakpoints where practical.

## Behavior and Data Flow

- The application wizard maintains one form state object and one file-state object across all steps. Only the final action submits the existing `FormData` payload.
- The admin component continues receiving the same `applications` prop and invoking the same approve/reject endpoints. Detail-modal presentation does not mutate application data.
- The password screen continues moving through loading, form, and done states. Strength and matching indicators are client-side derived display state only.

## Error Handling and Accessibility

- Preserve existing server and network error messages and make them visually prominent.
- Associate labels with inputs, retain keyboard navigation, use semantic buttons, expose upload controls accessibly, and provide descriptive labels for icon-only controls.
- Maintain readable contrast, visible focus indicators, and reduced visual density on small screens.

## Verification

- Run targeted ESLint against the three requested source files and `globals.css` if changed.
- Run the production build.
- Inspect the final Git diff to confirm the table and approve/reject confirmation modal were not redesigned.
- Confirm no unrelated tracked or untracked user files were changed.
