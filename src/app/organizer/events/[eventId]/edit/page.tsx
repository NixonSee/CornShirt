import Link from "next/link";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Edit Event</h1>
          <p className="muted dashboard-subtitle">
            Update draft event details before submitting for approval.
          </p>
        </div>
        <Link className="button-secondary" href={`/organizer/events/${eventId}`}>
          Back to event
        </Link>
      </div>

      <article className="panel">
        <h2>Edit form coming soon</h2>
        <p className="muted dashboard-panel-text">
          The edit form for event <span className="mono">{eventId}</span> — details,
          banner, and ticket types — will live here.
        </p>
      </article>
    </>
  );
}
