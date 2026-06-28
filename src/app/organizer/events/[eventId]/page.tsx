import Link from "next/link";

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Manage Event</h1>
          <p className="muted dashboard-subtitle">
            View sales, ticket types, and operations for this event.
          </p>
        </div>
        <Link className="button-secondary" href="/organizer">
          Back to dashboard
        </Link>
      </div>

      <article className="panel">
        <h2>Event details coming soon</h2>
        <p className="muted dashboard-panel-text">
          Detailed sales, ticket-type breakdown, and operational actions for event{" "}
          <span className="mono">{eventId}</span> will live here.
        </p>
        <Link className="button" href={`/organizer/events/${eventId}/edit`}>
          Edit event
        </Link>
      </article>
    </>
  );
}
