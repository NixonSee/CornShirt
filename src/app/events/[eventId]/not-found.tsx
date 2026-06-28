import Link from "next/link";

export default function EventNotFound() {
  return (
    <main className="event-not-found">
      <section className="state-card">
        <p className="section-kicker">Event unavailable</p>
        <h1>We couldn&apos;t find that event.</h1>
        <p className="muted">
          It may no longer be active, or the event link may be incorrect.
        </p>
        <Link className="button full" href="/visitor#events">
          Browse live events
        </Link>
      </section>
    </main>
  );
}
