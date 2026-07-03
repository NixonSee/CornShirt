"use client";

import {
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/common";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleCheck,
  FileText,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  X,
} from "lucide-react";

const initialForm = {
  applicant_name: "",
  applicant_email: "",
  phone: "",
  company_name: "",
  business_reg_no: "",
  tax_id: "",
  website: "",
  description: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
};

type ApplicationForm = typeof initialForm;
type ApplicationField = keyof ApplicationForm;
type DocumentType = "business_license" | "owner_id_proof" | "tax_certificate";
type ApplicationFiles = Record<DocumentType, File | null>;

const steps = [
  { label: "Your details", shortLabel: "You", icon: User },
  { label: "Business profile", shortLabel: "Business", icon: Building2 },
  { label: "Location & story", shortLabel: "Profile", icon: MapPin },
  { label: "Documents & review", shortLabel: "Review", icon: FileText },
] as const;

const documentLabels: Record<DocumentType, string> = {
  business_license: "Business License",
  owner_id_proof: "Owner ID / Passport",
  tax_certificate: "Tax Certificate",
};

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [files, setFiles] = useState<ApplicationFiles>({
    business_license: null,
    owner_id_proof: null,
    tax_certificate: null,
  });

  function setField(field: ApplicationField, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function setFileField(type: DocumentType, file: File | null) {
    setFiles((previous) => ({ ...previous, [type]: file }));
  }

  function scrollToFormTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goForward() {
    setError("");

    if (
      step === 0 &&
      (!form.applicant_name.trim() || !form.applicant_email.trim())
    ) {
      setError("Add your full name and email before continuing.");
      return;
    }

    if (step === 1 && !form.company_name.trim()) {
      setError("Add your company name before continuing.");
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
    scrollToFormTop();
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
    scrollToFormTop();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (step < steps.length - 1) {
      goForward();
      return;
    }

    const missingDocument = Object.values(files).some((file) => !file);
    if (missingDocument) {
      setError("Upload all three verification documents before submitting.");
      return;
    }

    setError("");
    setSubmitting(true);

    const body = new FormData();
    for (const [key, value] of Object.entries(form)) body.append(key, value);
    for (const [type, file] of Object.entries(files)) {
      if (file) body.append(type, file);
    }

    try {
      const response = await fetch("/api/apply", { method: "POST", body });
      if (response.ok) {
        setSuccess(true);
      } else {
        const responseError = await response.json();
        setError(responseError.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="partner-apply-success-page">
        <section className="partner-apply-success-card">
          <div className="partner-apply-success-icon" aria-hidden="true">
            <CircleCheck size={34} strokeWidth={2.2} />
          </div>
          <span className="partner-apply-eyebrow">Application received</span>
          <h1>You&apos;re one step closer to the stage.</h1>
          <p>
            Thanks for applying to become a CornShirt partner. Our team will
            review your details and supporting documents, then contact you by
            email.
          </p>
          <div className="partner-apply-success-timeline">
            <SuccessStep label="Submitted" detail="Your application is safely with us." />
            <SuccessStep label="Under review" detail="Our team checks your information." />
            <SuccessStep label="Decision by email" detail="We will send you the next steps." />
          </div>
          <Button onClick={() => router.push("/visitor")} fullWidth>
            Back to Browse
          </Button>
        </section>
      </main>
    );
  }

  const ActiveStepIcon = steps[step].icon;

  return (
    <>
      <title>Become an Organizer — CornShirt</title>
      <header className="app-topbar">
        <Link className="app-topbar-brand" href="/visitor">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt logo"
            width={140}
            height={40}
            priority
          />
        </Link>
        <nav className="app-topbar-actions" aria-label="Application actions">
          <Button variant="outline" onClick={() => router.push("/visitor")}>
            <ArrowLeft size={16} /> Back to events
          </Button>
        </nav>
      </header>

      <main className="partner-apply-page">
        <section className="partner-apply-intro">
          <div className="partner-apply-intro-copy">
            <span className="partner-apply-eyebrow">
              <Sparkles size={14} aria-hidden="true" /> Partner with CornShirt
            </span>
            <h1>Bring remarkable live experiences to life.</h1>
            <p>
              Tell us about you and your business. The application takes about
              five minutes, and you&apos;ll always know what comes next.
            </p>
          </div>
          <div className="partner-apply-trust-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
              <strong>Your information stays protected</strong>
              <span>Documents are used only to verify your organizer account.</span>
            </div>
          </div>
        </section>

        <div className="partner-apply-layout">
          <aside className="partner-apply-sidebar" aria-label="Application progress">
            <div className="partner-apply-sidebar-heading">
              <span>Application progress</span>
              <strong>{Math.round(((step + 1) / steps.length) * 100)}%</strong>
            </div>
            <div className="partner-apply-sidebar-track" aria-hidden="true">
              <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
            <ol className="partner-apply-step-list">
              {steps.map((item, index) => {
                const StepIcon = item.icon;
                const isComplete = index < step;
                const isActive = index === step;
                return (
                  <li
                    key={item.label}
                    className={`${isActive ? "is-active" : ""} ${
                      isComplete ? "is-complete" : ""
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className="partner-apply-step-icon">
                      {isComplete ? <Check size={16} /> : <StepIcon size={16} />}
                    </span>
                    <span>
                      <small>0{index + 1}</small>
                      <strong>{item.label}</strong>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="partner-apply-sidebar-note">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>You can review everything before submitting.</span>
            </div>
          </aside>

          <form className="partner-apply-form" onSubmit={handleSubmit}>
            <div className="partner-apply-mobile-progress">
              <div>
                <span>Step {step + 1} of {steps.length}</span>
                <strong>{steps[step].shortLabel}</strong>
              </div>
              <div className="partner-apply-sidebar-track" aria-hidden="true">
                <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
              </div>
            </div>

            <section className="partner-apply-panel">
              <header className="partner-apply-panel-header">
                <div className="partner-apply-panel-icon" aria-hidden="true">
                  <ActiveStepIcon size={21} />
                </div>
                <div>
                  <span>Step {step + 1}</span>
                  <h2>{steps[step].label}</h2>
                </div>
              </header>

              {error && (
                <div className="partner-apply-alert" role="alert">
                  {error}
                </div>
              )}

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
            </section>

            <div className="partner-apply-actions">
              <Button
                type="button"
                variant="outline"
                onClick={step === 0 ? () => router.push("/visitor") : goBack}
                disabled={submitting}
              >
                <ChevronLeft size={17} /> {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={goForward}>
                  Continue <ArrowRight size={17} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={submitting}
                  icon={<Send size={16} />}
                >
                  Submit application
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

function PersonalStep({
  form,
  setField,
}: {
  form: ApplicationForm;
  setField: (field: ApplicationField, value: string) => void;
}) {
  return (
    <div className="partner-apply-step-content">
      <StepIntro
        title="Let’s start with you."
        description="Use the contact details you would like our review team to use."
      />
      <div className="partner-apply-field-grid">
        <Field label="Full name" required>
          <input
            id="applicant-name"
            value={form.applicant_name}
            onChange={(event) => setField("applicant_name", event.target.value)}
            autoComplete="name"
            placeholder="e.g. Aisha Rahman"
            required
          />
        </Field>
        <Field label="Email address" required>
          <input
            id="applicant-email"
            type="email"
            value={form.applicant_email}
            onChange={(event) => setField("applicant_email", event.target.value)}
            autoComplete="email"
            placeholder="e.g. aisha@example.com"
            required
          />
        </Field>
        <Field label="Phone number" hint="Optional">
          <input
            id="applicant-phone"
            type="tel"
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            autoComplete="tel"
            placeholder="e.g. +60 12-345 6789"
          />
        </Field>
      </div>
    </div>
  );
}

function BusinessStep({
  form,
  setField,
}: {
  form: ApplicationForm;
  setField: (field: ApplicationField, value: string) => void;
}) {
  return (
    <div className="partner-apply-step-content">
      <StepIntro
        title="Tell us about the business."
        description="These details help us verify who will be organizing events on CornShirt."
      />
      <div className="partner-apply-field-grid">
        <Field label="Company name" required>
          <input
            id="company-name"
            value={form.company_name}
            onChange={(event) => setField("company_name", event.target.value)}
            autoComplete="organization"
            placeholder="e.g. Midnight Events Sdn Bhd"
            required
          />
        </Field>
        <Field label="Business registration no." hint="Optional">
          <input
            id="business-registration"
            value={form.business_reg_no}
            onChange={(event) => setField("business_reg_no", event.target.value)}
            placeholder="e.g. 202501000001"
          />
        </Field>
        <Field label="Tax ID" hint="Optional">
          <input
            id="tax-id"
            value={form.tax_id}
            onChange={(event) => setField("tax_id", event.target.value)}
            placeholder="e.g. C-12345678"
          />
        </Field>
        <Field label="Website" hint="Optional">
          <input
            id="website"
            type="url"
            value={form.website}
            onChange={(event) => setField("website", event.target.value)}
            autoComplete="url"
            placeholder="e.g. https://example.com"
          />
        </Field>
      </div>
    </div>
  );
}

function ProfileStep({
  form,
  setField,
}: {
  form: ApplicationForm;
  setField: (field: ApplicationField, value: string) => void;
}) {
  return (
    <div className="partner-apply-step-content">
      <StepIntro
        title="Where are you based?"
        description="Share your operating address and the kind of live experiences you create."
      />
      <div className="partner-apply-field-grid">
        <Field label="Street address" className="is-wide" hint="Optional">
          <input
            id="business-address"
            value={form.address}
            onChange={(event) => setField("address", event.target.value)}
            autoComplete="street-address"
            placeholder="e.g. 123, Jalan Merdeka"
          />
        </Field>
        <Field label="City" hint="Optional">
          <input
            id="business-city"
            value={form.city}
            onChange={(event) => setField("city", event.target.value)}
            autoComplete="address-level2"
            placeholder="e.g. Kuala Lumpur"
          />
        </Field>
        <Field label="State" hint="Optional">
          <input
            id="business-state"
            value={form.state}
            onChange={(event) => setField("state", event.target.value)}
            autoComplete="address-level1"
            placeholder="e.g. Wilayah Persekutuan"
          />
        </Field>
        <Field label="Postal code" hint="Optional">
          <input
            id="business-postal-code"
            value={form.postal_code}
            onChange={(event) => setField("postal_code", event.target.value)}
            autoComplete="postal-code"
            placeholder="e.g. 50450"
          />
        </Field>
        <Field label="Your organizer story" className="is-wide" hint="Optional">
          <textarea
            id="organizer-description"
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            rows={5}
            placeholder="Tell us about your experience, your audience, and the events you want to bring to CornShirt."
          />
        </Field>
      </div>
    </div>
  );
}

function DocumentsStep({
  form,
  files,
  setFileField,
}: {
  form: ApplicationForm;
  files: ApplicationFiles;
  setFileField: (type: DocumentType, file: File | null) => void;
}) {
  return (
    <div className="partner-apply-step-content">
      <StepIntro
        title="Verify and review."
        description="Upload one file for each document, then check the summary before submitting."
      />
      <div className="partner-upload-grid">
        {(Object.keys(documentLabels) as DocumentType[]).map((type) => (
          <FileUpload
            key={type}
            label={documentLabels[type]}
            file={files[type]}
            onChange={(file) => setFileField(type, file)}
          />
        ))}
      </div>
      <div className="partner-apply-review">
        <div className="partner-apply-review-heading">
          <div>
            <span className="partner-apply-eyebrow">Final check</span>
            <h3>Your application summary</h3>
          </div>
          <span className="partner-apply-review-badge">
            <ShieldCheck size={15} /> Secure submission
          </span>
        </div>
        <dl>
          <ReviewItem label="Applicant" value={form.applicant_name} />
          <ReviewItem label="Email" value={form.applicant_email} />
          <ReviewItem label="Company" value={form.company_name} />
          <ReviewItem
            label="Location"
            value={[form.city, form.state].filter(Boolean).join(", ")}
          />
        </dl>
      </div>
    </div>
  );
}

function StepIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="partner-apply-step-intro">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`partner-apply-field ${className}`.trim()}>
      <span>
        <strong>{label}</strong>
        {required ? <em>Required</em> : hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function FileUpload({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) onChange(droppedFile);
  }

  return (
    <div
      className={`partner-upload ${dragging ? "is-dragging" : ""} ${
        file ? "has-file" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="partner-upload-input"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        aria-label={`Upload ${label}`}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <div className="partner-upload-file-icon" aria-hidden="true">
            <FileText size={20} />
          </div>
          <div className="partner-upload-file-copy">
            <strong>{label}</strong>
            <span title={file.name}>{file.name}</span>
            <small>{formatFileSize(file.size)}</small>
          </div>
          <button
            type="button"
            className="partner-upload-remove"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="partner-upload-picker"
          onClick={() => inputRef.current?.click()}
        >
          <span className="partner-upload-picker-icon">
            <UploadCloud size={20} />
          </span>
          <strong>{label}</strong>
          <span>Click to browse or drag a file</span>
          <small>PDF, JPG or PNG</small>
        </button>
      )}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

function SuccessStep({ label, detail }: { label: string; detail: string }) {
  return (
    <div>
      <span><Check size={14} /></span>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
