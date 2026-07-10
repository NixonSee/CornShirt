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

function getHeroDateParts(event: Event): {
  date: string;
  time: string;
  timezone: string;
} {
  if (!event.dateTime) {
    return { date: event.date, time: "", timezone: "" };
  }

  const date = new Date(event.dateTime);
  if (Number.isNaN(date.getTime())) {
    return { date: event.date, time: "", timezone: "" };
  }

  return {
    date: new Intl.DateTimeFormat("en-MY", {
      dateStyle: "medium",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(date),
    time: new Intl.DateTimeFormat("en-MY", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(date),
    timezone: "UTC+8",
  };
}

export default function EventDetailContent({
  event,
  isCustomer,
  loginHref,
  eventsHref,
}: EventDetailContentProps) {
  const heroDate = getHeroDateParts(event);

  return (
    <main className="event-detail-page">
      <section
        className={`event-detail-hero event-detail-hero-${event.accent}`}
        style={{ backgroundImage: `url("${event.image}")` }}
      >
        <div className="event-detail-hero-nav-shade" aria-hidden="true" />
        <div className="event-detail-hero-inner">
          <div className="event-detail-hero-layout">
            <div className="event-detail-hero-copy">
              <p className="event-detail-kicker">
                {event.artist} / Live ticketing
              </p>
              <h1>{event.title}</h1>

              <div className="event-detail-meta">
                <span className="event-detail-meta-row">
                  <CalendarDays aria-hidden="true" size={19} />
                  <span>{heroDate.date}</span>
                  {heroDate.time ? <span>{heroDate.time}</span> : null}
                  {heroDate.timezone ? (
                    <span className="event-detail-timezone">
                      {heroDate.timezone}
                    </span>
                  ) : null}
                </span>
                <span className="event-detail-meta-row">
                  <MapPin aria-hidden="true" size={19} />
                  <span>{event.venue}</span>
                </span>
              </div>
            </div>

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
          <div>
            <p className="section-kicker">About the event</p>
            <h2>Experience {event.title}</h2>
            <p>{event.description}</p>
          </div>
          <Link className="detail-back-link" href={eventsHref}>
            Back to all events
          </Link>
        </article>
      </section>
    </main>
  );
}
