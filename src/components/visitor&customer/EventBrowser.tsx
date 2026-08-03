"use client";

import { ArrowRight, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  filterEvents,
  getEventCategories,
  type Event,
} from "@/app/visitor/data";
import { SearchBar } from "@/components/common";

interface EventBrowserProps {
  events: readonly Event[];
  detailBasePath?: string;
}

const FEATURED_EVENT_COUNT = 3;
const INITIAL_CATALOG_COUNT = 7;
const EVENT_TIME_ZONE = "Asia/Kuala_Lumpur";

const eventDateFormatter = new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: EVENT_TIME_ZONE,
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-MY", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

const eventMonthFormatter = new Intl.DateTimeFormat("en-MY", {
  month: "short",
  timeZone: EVENT_TIME_ZONE,
});

const eventDayFormatter = new Intl.DateTimeFormat("en-MY", {
  day: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

function getEventDate(event: Event): Date | null {
  if (!event.dateTime) return null;
  const date = new Date(event.dateTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCompactEventDate(event: Event): string {
  const date = getEventDate(event);
  return date ? eventDateFormatter.format(date) : event.date;
}

function getEventTime(event: Event): string {
  const date = getEventDate(event);
  return date ? eventTimeFormatter.format(date) : "Time TBC";
}

function getDateBadge(event: Event): { day: string; month: string } {
  const date = getEventDate(event);

  if (!date) {
    return { day: "--", month: "TBC" };
  }

  return {
    day: eventDayFormatter.format(date),
    month: eventMonthFormatter.format(date),
  };
}

export default function EventBrowser({
  events,
  detailBasePath = "/events",
}: EventBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(INITIAL_CATALOG_COUNT);
  const categories = useMemo(() => getEventCategories(events), [events]);
  const visibleEvents = useMemo(
    () => filterEvents(events, query, activeCategory),
    [activeCategory, events, query],
  );
  const featuredEvents = visibleEvents.slice(0, FEATURED_EVENT_COUNT);
  const displayedCatalogEvents = visibleEvents.slice(0, visibleCatalogCount);
  const remainingEventCount = visibleEvents.length - displayedCatalogEvents.length;

  function resetCatalogCount() {
    setVisibleCatalogCount(INITIAL_CATALOG_COUNT);
  }

  return (
    <section id="events" className="events-section live-events-browser">
      <div className="live-events-shell">
        <header className="live-events-heading">
          <div>
            <p className="live-events-eyebrow">Discover what&apos;s next</p>
            <h2>Live events</h2>
          </div>

          <div className="live-events-toolbar" aria-label="Event search and filters">
            <SearchBar
              value={query}
              onChange={(value) => {
                setQuery(value);
                resetCatalogCount();
              }}
              placeholder="Search artists, venues..."
              inputId="eventSearch"
              ariaLabel="Search events"
              fluid
            />

            <label className="live-events-filter">
              <span>Filter</span>
              <select
                aria-label="Filter events"
                value={activeCategory}
                onChange={(event) => {
                  setActiveCategory(event.target.value);
                  resetCatalogCount();
                }}
              >
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {visibleEvents.length > 0 ? (
          <>
            <div className="live-events-section-heading">
              <h3>Featured this week</h3>
            </div>

            <div
              className={`live-featured-grid live-featured-count-${featuredEvents.length}`}
              aria-live="polite"
            >
              {featuredEvents.map((event, index) => {
                const badge = getDateBadge(event);

                return (
                  <article className="live-featured-card" key={event.id}>
                    <Image
                      className="live-featured-image"
                      src={event.image}
                      alt={`${event.title} event artwork`}
                      fill
                      priority={index === 0}
                      sizes={index === 0 ? "(max-width: 700px) 100vw, 62vw" : "(max-width: 700px) 100vw, 38vw"}
                      unoptimized
                    />

                    <div className="live-featured-top">
                      <span className="live-featured-status">
                        {event.status === "ACTIVE" ? "On sale" : event.status}
                      </span>
                      <span className="live-featured-date">
                        <strong>{badge.day}</strong>
                        <span>{badge.month}</span>
                      </span>
                    </div>

                    <div className="live-featured-content">
                      <div>
                        <p className="live-event-type">
                          {index === 0 ? "Featured concert" : `Live ${event.category.toLowerCase()}`}
                        </p>
                        <h4 className="live-featured-title">{event.title}</h4>
                        <div className="live-featured-meta">
                          <span>
                            <MapPin aria-hidden="true" />
                            {event.venue}
                          </span>
                          <span>
                            <Clock aria-hidden="true" />
                            {getEventTime(event)}
                          </span>
                        </div>
                      </div>

                      <Link
                        className="live-featured-details"
                        href={`${detailBasePath}/${event.id}`}
                        aria-label={`View ${event.title} details`}
                      >
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <section className="live-catalog-section">
              <div className="live-events-section-heading">
                <h3>All live events</h3>
                <p>
                  {displayedCatalogEvents.length} more{" "}
                  {displayedCatalogEvents.length === 1 ? "event" : "events"}
                </p>
              </div>

              <div className="live-catalog-grid" id="eventGrid" aria-live="polite">
                {displayedCatalogEvents.map((event) => (
                  <article className="live-catalog-card" key={event.id}>
                    <Link
                      className="live-catalog-card-link"
                      href={`${detailBasePath}/${event.id}`}
                      aria-label={`View ${event.title} details`}
                    >
                      <Image
                        className="live-catalog-image"
                        src={event.image}
                        alt={`${event.title} event artwork`}
                        width={800}
                        height={450}
                        sizes="(max-width: 700px) 100vw, (max-width: 940px) 50vw, 33vw"
                        unoptimized
                      />
                      <span className="live-catalog-content">
                        <span className="live-event-type">{event.category}</span>
                        <strong className="live-catalog-title">{event.title}</strong>
                        <span className="live-catalog-meta">
                          <span>{event.venue}</span>
                          <time dateTime={event.dateTime ?? undefined}>{getCompactEventDate(event)}</time>
                        </span>
                      </span>
                    </Link>
                  </article>
                ))}
              </div>

              {remainingEventCount > 0 ? (
                <div className="live-load-more-wrap">
                  <button
                    className="live-load-more"
                    type="button"
                    onClick={() => setVisibleCatalogCount(visibleEvents.length)}
                  >
                    Load {remainingEventCount} more {remainingEventCount === 1 ? "event" : "events"}
                  </button>
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <div className="live-events-empty" role="status">
            <strong>{events.length === 0 ? "No active events" : "No events found"}</strong>
            <span>
              {events.length === 0
                ? "Check back soon for newly approved concerts."
                : "Try a different artist, venue, or filter."}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
