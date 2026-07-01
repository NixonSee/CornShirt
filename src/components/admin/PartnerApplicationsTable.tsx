"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Download } from "lucide-react";
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
        title={
          detailApp
            ? `Application — ${detailApp.applicant_name}`
            : ""
        }
        wide
        actions={
          <Button variant="primary" onClick={() => setDetailApp(null)}>
            Close
          </Button>
        }
      >
        {detailApp && (
          <>
            {/* Top status bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={statusClass(detailApp.status)}>
                  {detailApp.status.toUpperCase()}
                </span>
                <span style={{ fontSize: 14, color: "var(--foreground)" }}>
                  {detailApp.applicant_name}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                Applied {formatDate(detailApp.created_at)}
              </span>
            </div>

            {/* Rejection reason */}
            {detailApp.status === "rejected" && detailApp.review_notes && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 8,
                  borderLeft: "4px solid var(--destructive)",
                  background: "var(--card)",
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    color: "var(--destructive)",
                    fontSize: 12,
                    fontWeight: 900,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  REJECTION REASON
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--foreground)",
                    lineHeight: 1.5,
                  }}
                >
                  {detailApp.review_notes}
                </p>
              </div>
            )}

            {/* 2-column grid for fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 24px",
                marginBottom: 20,
              }}
            >
              <DetailGroup title="Personal Information" fields={[
                { label: "Full Name", value: detailApp.applicant_name },
                { label: "Email", value: detailApp.applicant_email },
                { label: "Phone", value: detailApp.phone },
              ]} />

              <DetailGroup title="Business Information" fields={[
                { label: "Company", value: detailApp.company_name },
                { label: "Reg. No.", value: detailApp.business_reg_no },
                { label: "Tax ID", value: detailApp.tax_id },
                { label: "Website", value: detailApp.website },
              ]} />

              <DetailGroup title="Address" fields={[
                { label: "Street", value: detailApp.address },
                { label: "City", value: detailApp.city },
                { label: "State", value: detailApp.state },
                { label: "Postal Code", value: detailApp.postal_code },
              ]} />

              <div>
                <h3
                  style={{
                    fontSize: 13,
                    color: "var(--primary)",
                    margin: "0 0 8px",
                    paddingBottom: 6,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  About
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    margin: 0,
                    lineHeight: 1.6,
                    color: "var(--foreground)",
                  }}
                >
                  {detailApp.description}
                </p>
              </div>
            </div>

            {/* Documents — full width */}
            <div>
              <h3
                style={{
                  fontSize: 13,
                  color: "var(--primary)",
                  margin: "0 0 10px",
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Documents
              </h3>
              {detailApp.documents.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                  No documents uploaded.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  {detailApp.documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      style={{
                        padding: "12px 14px",
                        border: "1px solid var(--input)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {docTypeLabel(doc.document_type)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted-foreground)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.file_name}{" "}
                          {doc.file_size ? `(${formatFileSize(doc.file_size)})"` : ""}
                        </div>
                      </div>
                      {doc.download_url && (
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "var(--primary)",
                            fontWeight: 700,
                            fontSize: 11,
                            textDecoration: "none",
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--primary)",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          <Download size={12} /> Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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

function DetailGroup({
  title,
  fields,
}: {
  title: string;
  fields: { label: string; value: string }[];
}) {
  return (
    <div>
      <h3
        style={{
          fontSize: 13,
          color: "var(--primary)",
          margin: "0 0 8px",
          paddingBottom: 6,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {fields.map((f) => (
          <div
            key={f.label}
            style={{
              display: "flex",
              gap: 6,
              fontSize: 13,
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                color: "var(--muted-foreground)",
                fontSize: 11,
                minWidth: 50,
              }}
            >
              {f.label}
            </span>
            <span style={{ color: "var(--foreground)" }}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
