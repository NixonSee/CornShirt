"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SearchBar } from "@/components/common";
import { categories, events, filterEvents } from "./data";

export default function VisitorPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const activeEvent = events[activeIndex];
  const visibleEvents = useMemo(
    () => filterEvents(events, query, activeCategory),
    [activeCategory, query],
  );

  useEffect(() => {
    if (isPaused || events.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const changeSlide = (direction: number) => {
    setActiveIndex(
      (current) => (current + direction + events.length) % events.length,
    );
  };

  return (
    <>
      <title>CornShirt - NFT Concert Tickets with DICKEN</title>
      <meta
        name="description"
        content="Browse live concerts and buy NFT tickets with DICKEN tokens on CornShirt."
      />

      <header className="site-header">
        <Link className="auth-logo" href="/visitor">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt logo"
            width={190}
            height={50}
            priority
          />
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          <Link className="button" href="/login">
            Log In
          </Link>
        </nav>
      </header>

      <main>
        <section
          className="home-hero hero-carousel"
          aria-label="Featured events"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPaused(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") changeSlide(-1);
            if (event.key === "ArrowRight") changeSlide(1);
          }}
          tabIndex={0}
        >
          {events.map((event, index) => (
            <div
              className={`hero-slide hero-slide-${event.accent}${index === activeIndex ? " active" : ""}`}
              style={{ backgroundImage: `url("${event.image}")` }}
              aria-hidden={index !== activeIndex}
              key={event.id}
            />
          ))}

          <div className="home-hero-inner" aria-live="polite">
            <div className="home-hero-copy" key={activeEvent.id}>
              <h1>{activeEvent.title}</h1>

              <div className="button-row">
                <Link
                  className="button"
                  href={`/events/${activeEvent.id}`}
                >
                  Details
                </Link>
              </div>
            </div>
          </div>

          <button
            className="carousel-arrow carousel-arrow-left"
            type="button"
            aria-label="Show previous featured event"
            onClick={() => changeSlide(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            type="button"
            aria-label="Show next featured event"
            onClick={() => changeSlide(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>

          <div className="carousel-dots" aria-label="Choose featured event">
            {events.map((event, index) => (
              <button
                className={`carousel-dot${index === activeIndex ? " active" : ""}`}
                type="button"
                aria-label={`Show ${event.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                key={event.id}
              />
            ))}
          </div>
        </section>

        <section id="events" className="events-section">
          <div className="events-toolbar">
            <h2>Live events</h2>

            <div className="event-controls">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search artists, cities..."
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
                    href={`/events/${event.id}`}
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
                      <Link href={`/events/${event.id}`}>{event.title}</Link>
                    </h3>
                    <p className="event-place">
                      <MapPin aria-hidden="true" size={18} />
                      {event.city}
                    </p>
                    <p className="event-date">
                      <CalendarDays aria-hidden="true" size={18} />
                      {event.date}
                    </p>

                    <Link
                      className="button full event-buy-button"
                      href={`/events/${event.id}`}
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state visible" id="emptyState" role="status">
              <p>No events found</p>
              <span>Try a different search or category.</span>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        CornShirt / NFT concert tickets with DICKEN token checkout.
      </footer>
    </>
  );
}
