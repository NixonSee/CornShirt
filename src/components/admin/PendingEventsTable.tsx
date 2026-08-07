"use client";

import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { EventReviewButtons } from "@/components/common/EventReviewButtons";

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
  const displayEvents = limit ? events.slice(0, limit) : events;

  if (displayEvents.length === 0) {
    return (
      <p style={{ textAlign: "left", padding: "20px 0", ...mutedStyle }}>
        No pending events to review.
      </p>
    );
  }

  return (
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
              <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                <div
                  className="button-row"
                  style={{ marginTop: 0, justifyContent: "center" }}
                >
                  <EventReviewButtons eventId={ev.event_id} eventName={ev.event_name} />
                </div>
              </td>
              <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                <Link
                  href={`/admin/events/${ev.event_id}`}
                  className="view-detail-link"
                >
                  View detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
