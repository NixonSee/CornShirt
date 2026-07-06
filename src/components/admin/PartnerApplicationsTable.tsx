"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  AlignLeft,
  ArrowUpDown,
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  FileCheck2,
  MapPin,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";

interface DocumentInfo {
  document_id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  file_size: number | null;
  mime_type: string | null;
  download_url: string | null;
}

interface ApplicationDisplay {
  application_id: string;
  applicant_name: string;
  applicant_email: string;
  phone: string;
  company_name: string;
  business_reg_no: string;
  tax_id: string;
  website: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  status: string;
  review_notes: string | null;
  created_at: string;
  documents: DocumentInfo[];
}

interface Props {
  applications: ApplicationDisplay[];
  sortOrder?: "newest" | "oldest";
  onSortChange?: () => void;
}

const mutedStyle = { color: "#a0a0a0" };
const thStyle = { color: "#a0a0a0", fontSize: 13 } as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusClass(status: string): string {
  switch (status) {
    case "approved":
      return "status good";
    case "rejected":
      return "status bad";
    default:
      return "status warn";
  }
}

function docTypeLabel(t: string): string {
  switch (t) {
    case "business_license":
      return "Business License";
    case "owner_id_proof":
      return "Owner ID / Passport";
    case "tax_certificate":
      return "Tax Certificate";
    default:
      return t;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PartnerApplicationsTable({
  applications,
  sortOrder,
  onSortChange,
}: Props) {
  const router = useRouter();
  const [detailApp, setDetailApp] = useState<ApplicationDisplay | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    app: ApplicationDisplay;
    type: "approve" | "reject";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  if (applications.length === 0) {
    return (
      <p style={{ textAlign: "left", padding: "20px 0", ...mutedStyle }}>
        No applications found.
      </p>
    );
  }

  async function handleConfirm() {
    if (!actionTarget) return;
    setIsSubmitting(true);
    setActionError("");

    const endpoint =
      actionTarget.type === "approve"
        ? `/api/admin/partner-applications/${actionTarget.app.application_id}/approve`
        : `/api/admin/partner-applications/${actionTarget.app.application_id}/reject`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:
        actionTarget.type === "reject"
          ? JSON.stringify({ reason: rejectReason })
          : undefined,
    });

    setIsSubmitting(false);

    if (res.ok) {
      setActionTarget(null);
      setRejectReason("");
      setDetailApp(null);
      router.refresh();
    } else {
      const err = await res.json();
      setActionError(err.error || "Something went wrong");
    }
  }

  return (
    <>
      <div className="table-card" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={thStyle}>Applicant</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Company</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                {onSortChange ? (
                  <span
                    onClick={onSortChange}
                    style={{
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color:
                        sortOrder === "newest"
                          ? "var(--primary)"
                          : "#a0a0a0",
                    }}
                  >
                    Applied
                    <ArrowUpDown size={13} />
                  </span>
                ) : (
                  "Applied"
                )}
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.application_id}>
                <td>
                  <strong style={{ color: "var(--primary)" }}>
                    {app.applicant_name}
                  </strong>
                  <br />
                  <span style={{ fontSize: 12, ...mutedStyle }}>
                    {app.applicant_email}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span style={{ fontSize: 13, ...mutedStyle }}>
                    {app.company_name}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span className={statusClass(app.status)}>
                    {app.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span style={{ fontSize: 12, ...mutedStyle }}>
                    {formatDate(app.created_at)}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <div
                    className="button-row"
                    style={{ marginTop: 0, justifyContent: "center" }}
                  >
                    <Button
                      variant="primary"
                      onClick={() => setDetailApp(app)}
                    >
                      View detail
                    </Button>
                    {app.status === "pending" && (
                      <>
                        <Button
                          variant="success"
                          onClick={() =>
                            setActionTarget({ app, type: "approve" })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            setActionTarget({ app, type: "reject" })
                          }
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Detail Modal */}
      <Modal
        isOpen={!!detailApp}
        onClose={() => setDetailApp(null)}
        title="Application details"
        wide
        actions={
          <Button variant="primary" onClick={() => setDetailApp(null)}>
            Close
          </Button>
        }
      >
        {detailApp && (
          <div className="application-detail">
            <header className="application-detail-hero">
              <div className="application-detail-identity">
                <span className="application-detail-eyebrow">
                  Partner application
                </span>
                <h3>{detailApp.company_name || detailApp.applicant_name}</h3>
                <p>
                  {detailApp.applicant_name}
                  <span aria-hidden="true">·</span>
                  {detailApp.applicant_email}
                </p>
              </div>
              <div className="application-detail-status">
                <span className={statusClass(detailApp.status)}>
                  {detailApp.status.toUpperCase()}
                </span>
                <span className="application-detail-date">
                  <CalendarDays size={14} aria-hidden="true" />
                  Applied {formatDate(detailApp.created_at)}
                </span>
              </div>
            </header>

            {detailApp.status === "rejected" && detailApp.review_notes && (
              <div className="application-detail-rejection" role="note">
                <span aria-hidden="true">
                  <TriangleAlert size={18} />
                </span>
                <div>
                  <strong>Rejection reason</strong>
                  <p>{detailApp.review_notes}</p>
                </div>
              </div>
            )}

            <div className="application-detail-grid">
              <DetailCard
                icon={UserRound}
                title="Personal information"
                fields={[
                  { label: "Full name", value: detailApp.applicant_name },
                  { label: "Email", value: detailApp.applicant_email },
                  { label: "Phone", value: detailApp.phone },
                ]}
              />
              <DetailCard
                icon={Building2}
                title="Business information"
                fields={[
                  { label: "Company", value: detailApp.company_name },
                  { label: "Registration no.", value: detailApp.business_reg_no },
                  { label: "Tax ID", value: detailApp.tax_id },
                  { label: "Website", value: detailApp.website },
                ]}
              />
              <DetailCard
                icon={MapPin}
                title="Address"
                fields={[
                  { label: "Street", value: detailApp.address },
                  { label: "City", value: detailApp.city },
                  { label: "State", value: detailApp.state },
                  { label: "Postal code", value: detailApp.postal_code },
                ]}
              />
              <DetailCard
                icon={AlignLeft}
                title="About"
                description={detailApp.description}
              />
            </div>

            <section className="application-detail-documents">
              <div className="application-detail-section-heading">
                <span aria-hidden="true"><FileCheck2 size={18} /></span>
                <div>
                  <h3>Submitted documents</h3>
                  <p>{detailApp.documents.length} verification files attached</p>
                </div>
              </div>
              {detailApp.documents.length === 0 ? (
                <p className="application-detail-empty">
                  No documents uploaded.
                </p>
              ) : (
                <div className="application-detail-document-grid">
                  {detailApp.documents.map((doc) => (
                    <article
                      className="application-detail-document"
                      key={doc.document_id}
                    >
                      <span className="application-detail-document-icon" aria-hidden="true">
                        <FileCheck2 size={17} />
                      </span>
                      <div className="application-detail-document-copy">
                        <strong>{docTypeLabel(doc.document_type)}</strong>
                        <span title={doc.file_name}>{doc.file_name}</span>
                        {doc.file_size ? <small>{formatFileSize(doc.file_size)}</small> : null}
                      </div>
                      {doc.download_url && (
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="application-detail-download"
                          aria-label={`Download ${docTypeLabel(doc.document_type)}`}
                        >
                          <Download size={13} />
                          <span>Download</span>
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>

      {/* Approve / Reject Confirmation Modal */}
      <Modal
        isOpen={!!actionTarget}
        onClose={() => {
          if (!isSubmitting) {
            setActionTarget(null);
            setRejectReason("");
            setActionError("");
          }
        }}
        title={
          actionTarget
            ? actionTarget.type === "approve"
              ? `Approve ${actionTarget.app.applicant_name}`
              : `Reject ${actionTarget.app.applicant_name}`
            : ""
        }
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => {
                setActionTarget(null);
                setRejectReason("");
                setActionError("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={
                actionTarget?.type === "approve" ? "success" : "destructive"
              }
              onClick={handleConfirm}
              loading={isSubmitting}
            >
              {actionTarget?.type === "approve" ? "Approve" : "Reject"}
            </Button>
          </>
        }
      >
        {actionError && (
          <p
            style={{
              color: "var(--destructive)",
              fontSize: 13,
              margin: "0 0 12px",
              padding: "8px 12px",
              background: "var(--destructive-foreground)",
              borderRadius: 6,
            }}
          >
            {actionError}
          </p>
        )}

        {actionTarget && actionTarget.type === "approve" && (
          <p style={{ fontSize: 14 }}>
            Approve &ldquo;{actionTarget.app.applicant_name}&rdquo; (
            {actionTarget.app.applicant_email})? An invite email will be sent
            for them to create their account.
          </p>
        )}
        {actionTarget && actionTarget.type !== "approve" && (
          <>
            <p style={{ marginBottom: 12, fontSize: 14 }}>
              Reject &ldquo;{actionTarget.app.applicant_name}&rdquo; (
              {actionTarget.app.applicant_email})? Provide a reason — this will
              be emailed to them.
            </p>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--foreground)",
                marginBottom: 6,
              }}
            >
              Reason *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete documentation, does not meet requirements, etc."
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--input)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
              required
            />
          </>
        )}
      </Modal>
    </>
  );
}

interface DetailCardProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  fields?: { label: string; value: string }[];
  description?: string;
}

function DetailCard({
  icon: Icon,
  title,
  fields = [],
  description,
}: DetailCardProps) {
  return (
    <section className="application-detail-card">
      <div className="application-detail-card-title">
        <span aria-hidden="true"><Icon size={16} /></span>
        <h3>{title}</h3>
      </div>
      {description !== undefined ? (
        <p className="application-detail-description">
          {description || "Not provided"}
        </p>
      ) : (
        <dl>
          {fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
