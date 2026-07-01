"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/common";
import { ArrowLeft, UploadCloud, X, CheckCircle, Building2, User, MapPin, FileText, Send } from "lucide-react";

export default function ApplyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
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
  });

  const [files, setFiles] = useState<Record<string, File | null>>({
    business_license: null,
    owner_id_proof: null,
    tax_certificate: null,
  });

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setFileField(type: string, file: File | null) {
    setFiles((prev) => ({ ...prev, [type]: file }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const body = new FormData();
    for (const [key, val] of Object.entries(form)) {
      body.append(key, val);
    }
    for (const [type, file] of Object.entries(files)) {
      if (file) body.append(type, file);
    }

    try {
      const res = await fetch("/api/apply", { method: "POST", body });
      if (res.ok) {
        setSuccess(true);
      } else {
        const err = await res.json();
        setError(err.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="auth-page" style={{ padding: 24 }}>
        <section
          className="auth-card"
          style={{
            textAlign: "center",
            padding: "48px 32px",
            width: "min(100%, 500px)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CheckCircle size={32} style={{ color: "#ffffff" }} />
          </div>
          <h1 style={{ fontSize: 28, color: "var(--primary)", marginBottom: 12 }}>
            Application Submitted!
          </h1>
          <p
            style={{
              color: "var(--foreground)",
              lineHeight: 1.7,
              marginBottom: 28,
              fontSize: 14,
            }}
          >
            Thank you for your interest in becoming a CornShirt Partner!
            <br />
            Your application has been received and is pending review.
            <br />
            We will get back to you via email once a decision has been made.
          </p>
          <Button onClick={() => router.push("/visitor")}>Back to Browse</Button>
        </section>
      </main>
    );
  }

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
        <nav className="app-topbar-actions">
          <Button variant="outline" onClick={() => router.push("/visitor")}>
            <ArrowLeft size={16} /> Back
          </Button>
        </nav>
      </header>

      <div className="main" style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32, marginTop: 32 }}>
          <h1 style={{ fontSize: 30, color: "var(--primary)", marginBottom: 8 }}>
            Become a Partner
          </h1>
          <p style={{ color: "var(--foreground)", fontSize: 14, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            Fill in the details below to apply as an event organizer on CornShirt.
            Your application will be reviewed by our team.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              border: "1px solid var(--destructive)",
              borderRadius: 8,
              background: "var(--destructive-foreground)",
              color: "var(--destructive)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          <Section icon={User} title="Personal Information">
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="field">
                <label>Full name <span style={{ color: "var(--destructive)" }}>*</span></label>
                <input value={form.applicant_name} onChange={(e) => setField("applicant_name", e.target.value)} required placeholder="e.g. John Doe" />
              </div>
              <div className="field">
                <label>Email <span style={{ color: "var(--destructive)" }}>*</span></label>
                <input type="email" value={form.applicant_email} onChange={(e) => setField("applicant_email", e.target.value)} required placeholder="e.g. john@example.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="e.g. +6012-345 6789" />
              </div>
            </div>
          </Section>

          <Section icon={Building2} title="Business Information">
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="field">
                <label>Company name <span style={{ color: "var(--destructive)" }}>*</span></label>
                <input value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} required placeholder="e.g. CornShirt Sdn Bhd" />
              </div>
              <div className="field">
                <label>Business registration no.</label>
                <input value={form.business_reg_no} onChange={(e) => setField("business_reg_no", e.target.value)} placeholder="e.g. 202501000001" />
              </div>
              <div className="field">
                <label>Tax ID</label>
                <input value={form.tax_id} onChange={(e) => setField("tax_id", e.target.value)} placeholder="e.g. C-12345678" />
              </div>
              <div className="field">
                <label>Website</label>
                <input value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="e.g. https://example.com" />
              </div>
            </div>
          </Section>

          <Section icon={MapPin} title="Address">
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Address</label>
              <input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="e.g. 123, Jalan Merdeka" />
            </div>
            <div className="grid-3" style={{ gap: 16 }}>
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="e.g. Kuala Lumpur" />
              </div>
              <div className="field">
                <label>State</label>
                <input value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="e.g. Wilayah Persekutuan" />
              </div>
              <div className="field">
                <label>Postal code</label>
                <input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} placeholder="e.g. 50450" />
              </div>
            </div>
          </Section>

          <Section icon={FileText} title="About You">
            <div className="field">
              <label>Tell us about yourself / your business</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
                placeholder="Describe your experience organizing events, your target audience, and why you'd like to partner with CornShirt..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--input)",
                  background: "var(--secondary)",
                  color: "var(--primary-foreground)",
                  fontSize: 14,
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--ring)";
                  e.target.style.boxShadow = "0 0 0 3px #f6a73033";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--input)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </Section>

          <Section icon={UploadCloud} title="Documents">
            <p style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 16, lineHeight: 1.5 }}>
              Upload the following documents to verify your identity and business.
              Only one file per document type. Accepted formats: PDF, JPG, PNG.
            </p>
            <div className="grid-3" style={{ gap: 16 }}>
              <FileUpload
                label="Business License"
                required
                file={files.business_license}
                onChange={(f) => setFileField("business_license", f)}
              />
              <FileUpload
                label="Owner ID / Passport"
                required
                file={files.owner_id_proof}
                onChange={(f) => setFileField("owner_id_proof", f)}
              />
              <FileUpload
                label="Tax Certificate"
                required
                file={files.tax_certificate}
                onChange={(f) => setFileField("tax_certificate", f)}
              />
            </div>
          </Section>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginBottom: 40,
            }}
          >
            <Button variant="outline" onClick={() => router.push("/visitor")} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting} icon={<Send size={16} />}>
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--input)",
        borderRadius: "var(--radius-lg)",
        background: "var(--card)",
        padding: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <Icon size={18} />
          </div>
        <h2 style={{ fontSize: 17, color: "var(--primary)", margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function FileUpload({
  label,
  required,
  file,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  }

  function openPicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = () => {
      if (input.files?.[0]) onChange(input.files[0]);
    };
    input.click();
  }

  if (file) {
    return (
      <div
        style={{
          border: "1px solid var(--input)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          background: "var(--secondary)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
            {label}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--destructive)",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--foreground)",
          }}
        >
          <FileText size={14} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </span>
          <span style={{ color: "var(--muted-foreground)" }}>
            {(file.size / 1024).toFixed(0)} KB
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={openPicker}
      style={{
        border: `2px dashed ${drag ? "var(--primary)" : "var(--input)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "24px 16px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.15s",
        background: drag ? "var(--secondary)" : "transparent",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 10px",
          opacity: 0.85,
        }}
      >
        <UploadCloud size={20} style={{ color: "#ffffff" }} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: 0 }}>
        {label}{required ? " *" : ""}
      </p>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
        Click or drag PDF, JPG, PNG
      </p>
    </div>
  );
}
