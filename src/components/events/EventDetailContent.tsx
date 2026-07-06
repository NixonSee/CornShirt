import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import EventTicketing from "@/app/events/[eventId]/EventTicketing";
import type { Event } from "@/app/visitor/data";

interface EventDetailContentProps {
  event: Event;
  isCustomer: boolean;
  loginHref: string;
  eventsHref: string;
}

export default function EventDetailContent({
  event,
  isCustomer,
  loginHref,
  eventsHref,
}: EventDetailContentProps) {
  return (
    <main className="event-detail-page">
      <section
        className={`event-detail-hero event-detail-hero-${event.accent}`}
        style={{ backgroundImage: `url("${event.image}")` }}
      >
        <div className="event-detail-hero-inner">
          <span
            className={`status ${event.status === "SELLING FAST" ? "warn" : "good"}`}
          >
            {event.status}
          </span>
          <p className="event-detail-kicker">
            {event.artist} / {event.category}
          </p>
          <h1>{event.title}</h1>
          <div className="event-detail-meta">
            <span>
              <CalendarDays aria-hidden="true" size={19} />
              {event.date}
            </span>
            <span>
              <MapPin aria-hidden="true" size={19} />
              {event.venue}
            </span>
          </div>
        </div>
      </section>

      <section className="event-detail-content">
        <EventTicketing
          event={event}
          isCustomer={isCustomer}
          loginHref={loginHref}
        />

        <article className="event-detail-panel event-about-panel">
          <p className="section-kicker">About the event</p>
          <h2>Experience {event.title}</h2>
          <p>{event.description}</p>
          <Link className="detail-back-link" href={eventsHref}>
            Back to all events
          </Link>
        </article>
      </section>
    </main>
  );
}
