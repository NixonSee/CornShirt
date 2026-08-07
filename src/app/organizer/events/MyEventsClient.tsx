"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "@/components/common/Card";
import { formatMyr } from "@/lib/currency";
import {
  filterOrganizerEvents,
  ORGANIZER_EVENT_FILTERS,
  organizerEventFilterLabel,
  type OrganizerEventFilter,
} from "@/lib/organizerEventFilters";

const NUMBER = new Intl.NumberFormat("en-US");

export interface MyEventDisplay {
  event_id: string;
  event_name: string;
  artist_name: string | null;
  venue: string | null;
  status: string | null;
  sold: number;
  supply: number;
  revenue: number;
}

function statusVariant(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return "good";
    case "pending":
      return "warn";
    case "rejected":
    case "cancelled":
    case "canceled":
      return "bad";
    default:
      return "";
  }
}

export default function MyEventsClient({
  events,
}: {
  events: readonly MyEventDisplay[];
}) {
  const [filter, setFilter] = useState<OrganizerEventFilter>("all");
  const filteredEvents = useMemo(
    () => filterOrganizerEvents(events, filter),
    [events, filter],
  );

  return (
    <>
      <div className="organizer-my-events-toolbar">
        <div
          className="organizer-filter-tabs organizer-my-events-filters"
          role="tablist"
          aria-label="Filter my events by status"
        >
          {ORGANIZER_EVENT_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "active" : undefined}
              onClick={() => setFilter(value)}
            >
              {organizerEventFilterLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state dashboard-empty">
          <p>
            No {filter === "all" ? "" : `${filter} `}events
            <span className="muted">
              {events.length === 0
                ? "Create your first event to start selling tickets."
                : "Choose another status to view the rest of your events."}
            </span>
          </p>
        </div>
      ) : (
        <Card variant="table">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.event_id}>
                  <td>
                    <strong>{event.event_name}</strong>
                    <br />
                    <span className="muted event-meta">
                      {[event.artist_name, event.venue]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status ${statusVariant(event.status)}`.trim()}
                    >
                      {(event.status ?? "unknown").toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {NUMBER.format(event.sold)} / {NUMBER.format(event.supply)}
                  </td>
                  <td>{formatMyr(event.revenue)}</td>
                  <td>
                    <Link
                      className="button"
                      href={`/organizer/events/${event.event_id}`}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
