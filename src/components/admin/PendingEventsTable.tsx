"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";

interface PendingEvent {
  event_id: string;
  event_name: string;
  organizer_name?: string;
  ticket_type_count: number;
  total_supply: number;
  created_at: string;
}

interface Props {
  events: PendingEvent[];
  limit?: number;
  sortOrder?: "newest" | "oldest";
  onSortChange?: () => void;
}

const mutedStyle = { color: "#a0a0a0" };
const thStyle = { color: "#a0a0a0", fontSize: 13 } as const;

function daysAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Upcoming";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function PendingEventsTable({ events, limit, sortOrder, onSortChange }: Props) {
  const router = useRouter();
  const [actionTarget, setActionTarget] = useState<{
    eventId: string;
    eventName: string;
    type: "approve" | "reject";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayEvents = limit ? events.slice(0, limit) : events;

  async function handleConfirm() {
    if (!actionTarget) return;

    setIsSubmitting(true);

    const res = await fetch(
      `/api/admin/events/${actionTarget.eventId}/${actionTarget.type}`,
      {
        method: "PUT",
      },
    );

    setIsSubmitting(false);
    setActionTarget(null);

    if (res.ok) {
      router.refresh();
    } else {
      const err = await res.json();
      alert(err.error || "Something went wrong");
    }
  }

  if (displayEvents.length === 0) {
    return (
      <p style={{ textAlign: "left", padding: "20px 0", ...mutedStyle }}>
        No pending events to review.
      </p>
    );
  }

  return (
    <>
      <div className="table-card" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={thStyle}>
                {onSortChange ? (
                  <span
                    onClick={onSortChange}
                    style={{
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: sortOrder === "newest" ? "var(--primary)" : "#a0a0a0",
                    }}
                  >
                    Event
                    <ArrowUpDown size={13} />
                  </span>
                ) : (
                  "Event"
                )}
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>Organizer</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
              <th style={thStyle}>Decision</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {displayEvents.map((ev) => (
              <tr key={ev.event_id}>
                <td>
                  <strong style={{ color: "var(--primary)" }}>
                    {ev.event_name}
                  </strong>
                  <br />
                  <span style={{ fontSize: 12, ...mutedStyle }}>
                    {ev.ticket_type_count} ticket type
                    {ev.ticket_type_count !== 1 ? "s" : ""} /{" "}
                    {ev.total_supply.toLocaleString()} supply
                  </span>
                  <br />
                  <span style={{ fontSize: 11, ...mutedStyle }}>
                    {daysAgo(ev.created_at)}
                  </span>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  {ev.organizer_name ? (
                    <strong style={{ color: "var(--primary)" }}>
                      {ev.organizer_name}
                    </strong>
                  ) : (
                    <span style={{ fontSize: 13, ...mutedStyle }}>
                      Unassigned
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  <span className="status warn">PENDING</span>
                </td>
                <td>
                  <div className="button-row" style={{ marginTop: 0 }}>
                    <Button
                      variant="success"
                      onClick={() =>
                        setActionTarget({
                          eventId: ev.event_id,
                          eventName: ev.event_name,
                          type: "approve",
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        setActionTarget({
                          eventId: ev.event_id,
                          eventName: ev.event_name,
                          type: "reject",
                        })
                      }
                    >
                      Reject
                    </Button>
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
                    View detail
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!actionTarget}
        onClose={() => !isSubmitting && setActionTarget(null)}
        title={
          actionTarget?.type === "approve"
            ? "Approve Event"
            : "Reject Event"
        }
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setActionTarget(null)}
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
        {actionTarget?.type === "approve"
          ? `Approve "${actionTarget?.eventName}"? This will make the event visible to all users.`
          : `Reject "${actionTarget?.eventName}"? The event will be returned to draft status.`}
      </Modal>
    </>
  );
}
