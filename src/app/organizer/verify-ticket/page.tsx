import { Card } from "@/components/common/Card";
import { TicketScanner } from "@/components/organizer/TicketScanner";

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

      <Card variant="panel" title="Scan a ticket">
        <TicketScanner />
      </Card>
    </>
  );
}
