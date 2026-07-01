"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";

interface UserDisplay {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  wallet_address: string | null;
  created_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
  deactivation_reason: string | null;
}

interface Props {
  users: UserDisplay[];
  currentUserId: string | null;
}

const mutedStyle = { color: "#a0a0a0" };
const thStyle = { color: "#a0a0a0", fontSize: 13 } as const;

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusClass(status: string): string {
  return status === "deactivated" ? "status bad" : "status good";
}

export function UsersTable({ users, currentUserId }: Props) {
  const router = useRouter();
  const [actionTarget, setActionTarget] = useState<{
    user: UserDisplay;
    type: "deactivate" | "reactivate";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (users.length === 0) {
    return (
      <p style={{ textAlign: "left", padding: "20px 0", ...mutedStyle }}>
        No users found.
      </p>
    );
  }

  async function handleConfirm() {
    if (!actionTarget) return;
    setIsSubmitting(true);
    setError("");

    const endpoint =
      actionTarget.type === "deactivate"
        ? `/api/admin/users/${actionTarget.user.user_id}/deactivate`
        : `/api/admin/users/${actionTarget.user.user_id}/reactivate`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:
        actionTarget.type === "deactivate"
          ? JSON.stringify({ reason })
          : undefined,
    });

    setIsSubmitting(false);

    if (res.ok) {
      setActionTarget(null);
      setReason("");
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "Something went wrong");
    }
  }

  return (
    <>
      <div className="table-card" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={thStyle}>User</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Role</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Joined</th>
              <th style={thStyle}>Actions</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Profile</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>
                  <strong style={{ color: "var(--primary)" }}>
                    {u.name}
                  </strong>
                  <br />
                  <span style={{ fontSize: 12, ...mutedStyle }}>
                    {u.email}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span style={{ fontSize: 12, ...mutedStyle }}>
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span className={statusClass(u.status)}>
                    {u.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span style={{ fontSize: 12, ...mutedStyle }}>
                    {formatDate(u.created_at)}
                  </span>
                </td>
                <td>
                  <div className="button-row" style={{ marginTop: 0 }}>
                    {u.role !== "admin" && u.user_id !== currentUserId && (
                      u.status === "deactivated" ? (
                        <Button
                          variant="primary"
                          onClick={() =>
                            setActionTarget({ user: u, type: "reactivate" })
                          }
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          onClick={() =>
                            setActionTarget({ user: u, type: "deactivate" })
                          }
                        >
                          Deactivate
                        </Button>
                      )
                    )}
                  </div>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span
                    style={{
                      color: "var(--primary)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "default",
                    }}
                  >
                    View profile
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!actionTarget}
        onClose={() => {
          if (!isSubmitting) {
            setActionTarget(null);
            setReason("");
            setError("");
          }
        }}
        title={
          actionTarget
            ? actionTarget.type === "deactivate"
              ? `Deactivate ${actionTarget.user.name}`
              : `Reactivate ${actionTarget.user.name}`
            : ""
        }
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => {
                setActionTarget(null);
                setReason("");
                setError("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={
                actionTarget?.type === "deactivate" ? "destructive" : "success"
              }
              onClick={handleConfirm}
              loading={isSubmitting}
            >
              {actionTarget?.type === "deactivate" ? "Deactivate" : "Reactivate"}
            </Button>
          </>
        }
      >
        {error && (
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
            {error}
          </p>
        )}

        {actionTarget?.type === "deactivate" ? (
          <>
            <p style={{ marginBottom: 12, fontSize: 14 }}>
              Deactivate &ldquo;{actionTarget.user.name}&rdquo; ({actionTarget.user.email})? 
              They will lose access to the platform.
            </p>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--foreground)",
                marginBottom: 6,
              }}
            >
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Terms of service violation, inactivity, etc."
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
            />
          </>
        ) : (
          <p style={{ fontSize: 14 }}>
            Reactivate &ldquo;{actionTarget?.user.name}&rdquo; (
            {actionTarget?.user.email})?
          </p>
        )}
      </Modal>
    </>
  );
}
