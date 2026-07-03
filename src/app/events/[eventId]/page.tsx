import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import RoleNav from "@/components/RoleNav";
import { withEventReturnTo } from "@/lib/eventReturnTo";
import { getActiveEventById } from "@/lib/publicEvents";
import { getVerifiedRole } from "@/lib/requireRole";

import EventTicketing from "./EventTicketing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getActiveEventById(eventId);

  return event
    ? {
        title: `${event.title} | CornShirt`,
        description: event.description,
      }
    : { title: "Event not found | CornShirt" };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, roleResult] = await Promise.all([
    getActiveEventById(eventId),
    getVerifiedRole(),
  ]);

  if (!event) notFound();

  const role =
    roleResult.status === "authenticated"
      ? roleResult.identity.profile.role
      : null;
  const isCustomer = role === "customer" || role === "user";
  const isStaff = role === "admin" || role === "organizer";
  const eventsHref = isCustomer ? "/customer#events" : "/visitor#events";
  const returnPath = `/events/${event.id}`;

  return (
    <>
      {isCustomer ? (
        <RoleNav role="customer" />
      ) : (
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
            {isStaff ? (
              <>
                <Link href={eventsHref}>Events</Link>
                <Link href="/login">Log in</Link>
                <Link className="button" href="/register">
                  Create account
                </Link>
              </>
            ) : (
              <>
                <Link className="button-outline" href="/visitor/apply">
                  Become an Organizer
                </Link>
                <Link
                  className="button"
                  href={withEventReturnTo("/login", returnPath)}
                >
                  Log In
                </Link>
              </>
            )}
          </nav>
        </header>
      )}

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
            loginHref={withEventReturnTo("/login", returnPath)}
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

      <footer className="site-footer">
        CornShirt / NFT concert tickets with DICKEN token checkout.
      </footer>
    </>
  );
}
