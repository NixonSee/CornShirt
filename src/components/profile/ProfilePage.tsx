import type { ReactNode } from "react";
import { FileCheck2 } from "lucide-react";

import { ChangePasswordForm } from "./ChangePasswordForm";
import styles from "./ProfilePage.module.css";

export interface ProfileDetail {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}

export interface ProfileSection {
  title: string;
  description?: string;
  details: ProfileDetail[];
}

export interface ProfileDocument {
  id: string;
  label: string;
  fileName: string;
  fileSize: number | null;
  downloadUrl: string | null;
}

interface ProfilePageProps {
  roleLabel: string;
  name: string;
  email: string;
  status: string;
  sections: ProfileSection[];
  documents?: ProfileDocument[];
  showSecurity?: boolean;
  subtitle?: string;
  headerAction?: ReactNode;
  theme?: "default" | "admin";
}

function initials(name: string) {
  const value = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return value || "CS";
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "File";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProfilePage({
  roleLabel,
  name,
  email,
  status,
  sections,
  documents,
  showSecurity = true,
  subtitle,
  headerAction,
  theme = "default",
}: ProfilePageProps) {
  const normalizedStatus = status.toLowerCase();
  const statusClass =
    normalizedStatus === "active" || normalizedStatus === "approved"
      ? "good"
      : normalizedStatus === "pending"
        ? "warn"
        : "";

  return (
    <main
      className={`${styles.profilePage} ${theme === "admin" ? styles.adminTheme : ""}`.trim()}
    >
      <header className={styles.pageHeading} style={headerAction ? { display: "flex", alignItems: "center", justifyContent: "space-between" } : undefined}>
        <div>
          <h1>Profile</h1>
          <p>{subtitle ?? `Your ${roleLabel.toLowerCase()} account information and security.`}</p>
        </div>
        {headerAction}
      </header>

      <section className={styles.accountPanel}>
        <header className={styles.hero}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(name)}
            </span>
            <div className={styles.heroCopy}>
              <h2>{name}</h2>
              <p>{email}</p>
            </div>
          </div>
          <span className={`status ${statusClass} ${styles.profileStatus}`.trim()}>
            {status || "Active"}
          </span>
        </header>

        <div className={styles.layout}>
          {sections.map((section) => (
            <section className={styles.card} key={section.title}>
              <div className={styles.cardHeading}>
                <div>
                  <h2>{section.title}</h2>
                  {section.description ? <p>{section.description}</p> : null}
                </div>
              </div>
              <dl className={styles.detailList}>
                {section.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd className={detail.mono ? styles.mono : undefined}>
                      {detail.value || "Not provided"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          {documents ? (
            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div>
                  <h2>Verification documents</h2>
                  <p>Private files submitted with your organizer application.</p>
                </div>
              </div>

              {documents.length ? (
                <div className={styles.documentList}>
                  {documents.map((document) => (
                    <article className={styles.document} key={document.id}>
                      <span className={styles.documentIcon} aria-hidden="true">
                        <FileCheck2 size={18} />
                      </span>
                      <div>
                        <strong>{document.label}</strong>
                        <span title={document.fileName}>{document.fileName}</span>
                        <small>{formatFileSize(document.fileSize)}</small>
                      </div>
                      {document.downloadUrl ? (
                        <a
                          href={document.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <span className={styles.documentUnavailable}>Unavailable</span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>
                  No organizer documents are linked to this account.
                </p>
              )}
            </section>
          ) : null}

          {showSecurity && (
            <>
              <ChangePasswordForm email={email} />
              <section className={styles.securityNote}>
                <div>
                  <strong>Keep your account secure</strong>
                  <p>Never share your password, wallet keys, or verification links.</p>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
