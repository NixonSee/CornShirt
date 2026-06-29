export default async function AllEventsPage() {
  return (
    <div
      className="main"
      style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}
    >
      <div className="top-row">
        <div>
          <h1 style={{ fontSize: 28, color: "var(--primary)" }}>
            All Events
          </h1>
          <p
            style={{
              textAlign: "left",
              marginTop: 8,
              fontSize: 14,
              color: "var(--foreground)",
            }}
          >
            View and manage all events on the platform.
          </p>
        </div>
      </div>
    </div>
  );
}
