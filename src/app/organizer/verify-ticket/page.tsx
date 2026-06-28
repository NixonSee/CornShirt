export default function VerifyTicketPage() {
  return (
    <>
      <div className="top-row">
        <div>
          <h1>Verify Ticket</h1>
          <p className="muted dashboard-subtitle">
            Scan a ticket QR code, check its status, and mark valid tickets as used.
          </p>
        </div>
      </div>

      <article className="panel">
        <h2>QR scanner coming soon</h2>
        <p className="muted dashboard-panel-text">
          The QR verification flow — valid / invalid / used / refunded result and
          mark-as-used action — will live here.
        </p>
      </article>
    </>
  );
}
