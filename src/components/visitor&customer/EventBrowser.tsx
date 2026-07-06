"use client";

import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  filterEvents,
  getEventCategories,
  type Event,
} from "@/app/visitor/data";
import { Button, SearchBar } from "@/components/common";

interface EventBrowserProps {
  events: readonly Event[];
  detailBasePath?: string;
}

export default function EventBrowser({
  events,
  detailBasePath = "/events",
}: EventBrowserProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = useMemo(() => getEventCategories(events), [events]);
  const visibleEvents = useMemo(
    () => filterEvents(events, query, activeCategory),
    [activeCategory, events, query],
  );

  return (
    <section id="events" className="events-section">
      <div className="events-toolbar">
        <h2>Live events</h2>

        <div className="event-controls">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search artists, venues..."
            inputId="eventSearch"
            ariaLabel="Search events"
            fluid
          />

          <label className="filter-box">
            <span>Filter</span>
            <select
              aria-label="Filter events"
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visibleEvents.length > 0 ? (
        <div className="event-grid" id="eventGrid">
          {visibleEvents.map((event) => (
            <article className="event-card" key={event.id}>
              <Link
                className="event-card-link"
                href={`${detailBasePath}/${event.id}`}
                aria-label={`View details for ${event.title}`}
              >
                <div
                  className={`event-media event-media-${event.accent}`}
                  style={{ backgroundImage: `url("${event.image}")` }}
                >
                  <span
                    className={`status ${event.status === "SELLING FAST" ? "warn" : "good"}`}
                  >
                    {event.status}
                  </span>
                </div>
              </Link>

              <div className="event-body">
                <h3>
                  <Link href={`${detailBasePath}/${event.id}`}>{event.title}</Link>
                </h3>
                <p className="event-place">
                  <MapPin aria-hidden="true" size={18} />
                  {event.venue}
                </p>
                <p className="event-date">
                  <CalendarDays aria-hidden="true" size={18} />
                  {event.date}
                </p>

                <Button
                  className="event-buy-button"
                  fullWidth
                  onClick={() => router.push(`${detailBasePath}/${event.id}`)}
                >
                  View Details
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state visible" id="emptyState" role="status">
          <p>{events.length === 0 ? "No active events" : "No events found"}</p>
          <span>
            {events.length === 0
              ? "Check back soon for newly approved concerts."
              : "Try a different search or category."}
          </span>
        </div>
      )}
    </section>
  );
}
