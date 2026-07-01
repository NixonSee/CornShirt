import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  ShieldCheck,
  ShieldX,
  Ticket,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";

import RoleNav from "@/components/RoleNav";
import { withEventReturnTo } from "@/lib/eventReturnTo";
import { getActiveEventById } from "@/lib/publicEvents";
import { getVerifiedRole } from "@/lib/requireRole";

import PurchaseButton from "./PurchaseButton";

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
            <Link href={eventsHref}>Events</Link>
            <Link href="/login">Log in</Link>
            <Link className="button" href="/register">
              Create account
            </Link>
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
          <aside
            className="event-detail-panel ticket-options-panel"
            aria-labelledby="ticket-options-title"
          >
            <p className="section-kicker">Choose your entry</p>
            <h2 id="ticket-options-title">Available ticket types</h2>

            <div className="ticket-option-list">
              {event.ticketTypes.map((ticketType) => (
                <article className="ticket-option-card" key={ticketType.id}>
                  <div className="ticket-option-heading">
                    <div>
                      <Ticket aria-hidden="true" size={20} />
                      <h3>{ticketType.name}</h3>
                    </div>
                    <strong>{ticketType.price} DICKEN</strong>
                  </div>

                  <div className="ticket-option-meta">
                    <span>
                      <Users aria-hidden="true" size={17} />
                      {ticketType.remaining} remaining
                    </span>
                    <span>Limit {ticketType.purchaseLimit} per customer</span>
                    <span>
                      {ticketType.transferAllowed ? (
                        <ShieldCheck aria-hidden="true" size={17} />
                      ) : (
                        <ShieldX aria-hidden="true" size={17} />
                      )}
                      {ticketType.transferAllowed
                        ? "Transfer allowed"
                        : "Transfer disabled"}
                    </span>
                  </div>

                  <PurchaseButton
                    isCustomer={isCustomer}
                    loginHref={withEventReturnTo("/login", returnPath)}
                    ticketTypeName={ticketType.name}
                  />
                </article>
              ))}
            </div>
          </aside>

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
