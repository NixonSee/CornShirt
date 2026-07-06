# Application and Password Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace three existing CornShirt interfaces with the approved guided application, summary-card detail modal, and focused password setup while preserving all current data and actions.

**Architecture:** Keep behavior and state inside the existing client components. Add narrowly prefixed CSS classes to `globals.css` for responsive layouts and visual states; do not introduce alternate routes or source files. The admin table and approve/reject confirmation modal remain unchanged while only the detail modal receives new markup.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth, Lucide React, shared CornShirt `Button` and `Modal` components, global CSS.

---

## File Map

- Modify `src/app/visitor/apply/page.tsx`: guided application state, step validation, accessible upload controls, submission and success presentation.
- Modify `src/components/admin/PartnerApplicationsTable.tsx`: application-detail modal content only.
- Modify `src/app/auth/set-password/page.tsx`: password strength/match display and redesigned loading, form, and done states.
- Modify `src/app/globals.css`: prefixed styles for the three redesigned experiences and responsive behavior.

No source or test files will be created. The repository does not provide a component test harness, and the user requested direct replacement of existing files, so verification uses ESLint, production compilation, and browser inspection instead of adding test infrastructure.

### Task 1: Build the guided visitor application

**Files:**
- Modify: `src/app/visitor/apply/page.tsx`

- [ ] **Step 1: Add wizard state and step metadata**

Import `useRef`, `ChevronLeft`, `ChevronRight`, `CircleCheck`, and `ShieldCheck`. Add a numeric `step` state and fixed metadata after the existing file state:

```tsx
const [step, setStep] = useState(0);

const steps = [
  { label: "Your details", shortLabel: "You", icon: User },
  { label: "Business profile", shortLabel: "Business", icon: Building2 },
  { label: "Location & story", shortLabel: "Profile", icon: MapPin },
  { label: "Documents & review", shortLabel: "Review", icon: FileText },
] as const;
```

- [ ] **Step 2: Add step validation without changing final submission rules**

Add a `goForward` function that validates the fields owned by the current step, sets the existing error message, and advances only when valid:

```tsx
function goForward() {
  setError("");

  if (step === 0 && (!form.applicant_name.trim() || !form.applicant_email.trim())) {
    setError("Add your full name and email before continuing.");
    return;
  }

  if (step === 1 && !form.company_name.trim()) {
    setError("Add your company name before continuing.");
    return;
  }

  setStep((current) => Math.min(current + 1, steps.length - 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

Use `type="button"` for Back and Continue controls so only the final step submits the form.

- [ ] **Step 3: Replace the single-page form with the approved four-step structure**

Render an atmospheric header area, progress bar, step navigation, and one active content panel. Keep every existing input bound to the same `form` keys. The final step includes the three `FileUpload` components and a review summary using the existing state:

```tsx
<div className="partner-apply-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
  <div className="partner-apply-progress-copy">
    <span>Step {step + 1} of {steps.length}</span>
    <strong>{steps[step].label}</strong>
  </div>
  <div className="partner-apply-progress-track">
    <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
  </div>
</div>
```

```tsx
{step === 0 && <PersonalStep form={form} setField={setField} />}
{step === 1 && <BusinessStep form={form} setField={setField} />}
{step === 2 && <ProfileStep form={form} setField={setField} />}
{step === 3 && (
  <DocumentsStep
    form={form}
    files={files}
    setFileField={setFileField}
  />
)}
```

Define these focused step components in the same file. Their props use `typeof initialForm` by lifting the initial object to a module-level `initialForm` constant, preventing duplicate field types.

- [ ] **Step 4: Make file uploads keyboard-accessible**

Replace the dynamically created file input with a visually hidden real input and a ref:

```tsx
const inputRef = useRef<HTMLInputElement>(null);

<input
  ref={inputRef}
  className="partner-upload-input"
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={(event) => onChange(event.target.files?.[0] ?? null)}
/>
<button
  type="button"
  className={`partner-upload-dropzone${drag ? " is-dragging" : ""}`}
  onClick={() => inputRef.current?.click()}
>
  <UploadCloud aria-hidden="true" />
  <strong>{label}</strong>
  <span>Click to browse or drag PDF, JPG, or PNG</span>
</button>
```

Preserve drag/drop, chosen filename, file size, and removal behavior.

- [ ] **Step 5: Redesign success state without changing navigation**

Keep `router.push("/visitor")` and render the approved completion language with `CircleCheck`, a concise next-step timeline, and one Back to Browse action.

- [ ] **Step 6: Run targeted lint for the application page**

Run:

```powershell
npx eslint src/app/visitor/apply/page.tsx
```

Expected: exit code 0 with no warnings or errors.

### Task 2: Redesign only the application-detail modal

**Files:**
- Modify: `src/components/admin/PartnerApplicationsTable.tsx`

- [ ] **Step 1: Preserve non-target markup before editing**

Record the table and approve/reject modal portions with:

```powershell
git diff -- src/components/admin/PartnerApplicationsTable.tsx
```

Expected before editing: no tracked diff in the file.

- [ ] **Step 2: Replace only the View Detail `Modal` children**

Keep its `isOpen`, `onClose`, `wide`, and Close action unchanged. Replace the detail body with a header, rejection callout, four information cards, and document cards:

```tsx
<div className="application-detail-hero">
  <div>
    <span className="application-detail-eyebrow">Partner application</span>
    <h3>{detailApp.company_name || detailApp.applicant_name}</h3>
    <p>{detailApp.applicant_name} · {detailApp.applicant_email}</p>
  </div>
  <div className="application-detail-status">
    <span className={statusClass(detailApp.status)}>{detailApp.status.toUpperCase()}</span>
    <span>Applied {formatDate(detailApp.created_at)}</span>
  </div>
</div>
```

```tsx
<div className="application-detail-grid">
  <DetailCard icon={UserRound} title="Personal information" fields={...} />
  <DetailCard icon={Building2} title="Business information" fields={...} />
  <DetailCard icon={MapPin} title="Address" fields={...} />
  <DetailCard icon={AlignLeft} title="About" description={detailApp.description} />
</div>
```

The rejection callout remains conditional on `status === "rejected" && review_notes`. Documents keep their current `download_url`, `target`, `rel`, labels, filenames, and formatted sizes.

- [ ] **Step 3: Replace `DetailGroup` with `DetailCard`**

Use a single helper that accepts either fields or a description:

```tsx
function DetailCard({ icon: Icon, title, fields = [], description }: DetailCardProps) {
  return (
    <section className="application-detail-card">
      <div className="application-detail-card-title">
        <span><Icon size={16} /></span>
        <h4>{title}</h4>
      </div>
      {description ? <p>{description || "Not provided"}</p> : (
        <dl>{fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value || "Not provided"}</dd>
          </div>
        ))}</dl>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Confirm the table and confirmation modal did not change**

Inspect:

```powershell
git diff --word-diff=plain -- src/components/admin/PartnerApplicationsTable.tsx
```

Expected: changes are limited to imports, the View Detail modal body, and the `DetailCard` helper; table rows and the Approve/Reject Confirmation Modal block are unchanged.

- [ ] **Step 5: Run targeted lint for the admin component**

Run:

```powershell
npx eslint src/components/admin/PartnerApplicationsTable.tsx
```

Expected: exit code 0 with no warnings or errors.

### Task 3: Build the focused password setup

**Files:**
- Modify: `src/app/auth/set-password/page.tsx`

- [ ] **Step 1: Add derived password feedback**

Import `Image`, `LockKeyhole`, `ShieldCheck`, and `ArrowRight`. Derive strength without adding persisted state:

```tsx
const passwordChecks = [
  password.length >= 6,
  /[A-Z]/.test(password) && /[a-z]/.test(password),
  /\d/.test(password),
  /[^A-Za-z0-9]/.test(password),
];
const strength = passwordChecks.filter(Boolean).length;
const passwordsMatch = confirm.length > 0 && password === confirm;
```

The only submission requirements remain six characters and matching confirmation, preserving backend behavior.

- [ ] **Step 2: Redesign the loading state**

Wrap the existing spinner and message in `password-setup-page` and `password-setup-state-card`, retaining the current loading behavior and copy.

- [ ] **Step 3: Redesign the form state**

Use a full-height background with a focused translucent card. Preserve both controlled inputs and the existing submit handler. Add accessible visibility controls and the strength meter:

```tsx
<div className="password-strength" aria-live="polite">
  <div className="password-strength-bars" aria-hidden="true">
    {[1, 2, 3, 4].map((level) => (
      <span key={level} className={strength >= level ? "is-active" : ""} />
    ))}
  </div>
  <span>{strengthLabel}</span>
</div>
```

The confirm field shows neutral helper text until populated, then success or mismatch text based on `passwordsMatch`.

- [ ] **Step 4: Redesign the completion state**

Keep `supabase.auth.signOut()` and `router.replace("/login")`. Use the same focused card, `CheckCircle`, a short account-ready message, and a full-width Go to Login action.

- [ ] **Step 5: Run targeted lint for the password page**

Run:

```powershell
npx eslint src/app/auth/set-password/page.tsx
```

Expected: exit code 0 with no warnings or errors.

### Task 4: Add scoped global styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add visitor application styles**

Add one documented block prefixed with `partner-apply-` and `partner-upload-`. It must include the shell, hero, progress, steps, panel, fields, review summary, actions, upload dropzone, and success card. Use existing CSS variables and `--gradient-fire` rather than new global tokens.

- [ ] **Step 2: Add detail modal styles**

Add one documented block prefixed with `application-detail-`. Style only descendants introduced inside the existing wide modal. Do not change `.modal-card`, `.modal-actions`, table selectors, or confirmation-modal selectors.

- [ ] **Step 3: Add password setup styles**

Add one documented block prefixed with `password-setup-` and `password-strength`. Use `url("/Background Login Image.png")` with a dark overlay, a maximum card width of 460px, and visible `:focus-visible` rings.

- [ ] **Step 4: Add responsive rules**

At 900px, collapse application and detail grids to one column. At 560px, reduce page/card padding, stack wizard labels safely, and make action buttons full width. Keep all text and controls inside the viewport.

- [ ] **Step 5: Check CSS syntax through the production compiler**

Run:

```powershell
npm run build
```

Expected: Next.js production build completes successfully with no CSS parsing failures.

### Task 5: Full verification and scope audit

**Files:**
- Verify: `src/app/visitor/apply/page.tsx`
- Verify: `src/components/admin/PartnerApplicationsTable.tsx`
- Verify: `src/app/auth/set-password/page.tsx`
- Verify: `src/app/globals.css`

- [ ] **Step 1: Run all targeted lint checks together**

Run:

```powershell
npx eslint src/app/visitor/apply/page.tsx src/components/admin/PartnerApplicationsTable.tsx src/app/auth/set-password/page.tsx
```

Expected: exit code 0.

- [ ] **Step 2: Run the production build again after all fixes**

Run:

```powershell
npm run build
```

Expected: exit code 0 and all routes compile.

- [ ] **Step 3: Audit whitespace and accidental edits**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; tracked source changes are limited to the four approved files plus the approved design/plan documents. Existing `.superpowers` directories remain untracked and untouched except for this redesign companion session.

- [ ] **Step 4: Inspect the final source diff**

Run:

```powershell
git diff -- src/app/visitor/apply/page.tsx src/components/admin/PartnerApplicationsTable.tsx src/app/auth/set-password/page.tsx src/app/globals.css
```

Expected: current API endpoints, form field keys, Supabase calls, table markup, and approve/reject confirmation modal behavior remain intact.

- [ ] **Step 5: Commit only after repository-write approval**

If the user approves a commit, stage only the requested source files and documentation:

```powershell
git add src/app/visitor/apply/page.tsx src/components/admin/PartnerApplicationsTable.tsx src/app/auth/set-password/page.tsx src/app/globals.css docs/superpowers/specs/2026-07-02-application-and-password-redesign-design.md docs/superpowers/plans/2026-07-02-application-and-password-redesign.md
git commit -m "feat: redesign application and password flows"
```

Do not stage `.superpowers/` or any unrelated user changes.
