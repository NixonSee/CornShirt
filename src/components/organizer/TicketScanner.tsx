"use client";

import { Camera, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { useState } from "react";

import { Button } from "@/components/common";

type VerifyResult =
  | "valid"
  | "invalid"
  | "used"
  | "refunded"
  | "cancelled"
  | "owner_mismatch";

interface VerifyTicket {
  id: string;
  eventName: string;
  ticketType: string;
  status: string;
  tokenId: number | null;
}

interface VerifyResponse {
  result: VerifyResult;
  onchain: "matched" | "unminted" | "owner_mismatch" | "burned" | null;
  ticket: VerifyTicket;
}

const RESULT_LABEL: Record<VerifyResult, string> = {
  valid: "Valid ticket",
  invalid: "Invalid ticket",
  used: "Already used",
  refunded: "Refunded",
  cancelled: "Cancelled",
  owner_mismatch: "Owner mismatch",
};

function resultVariant(result: VerifyResult): "good" | "bad" | "warn" {
  if (result === "valid") return "good";
  if (result === "owner_mismatch") return "warn";
  return "bad";
}

export function TicketScanner() {
  const [manualValue, setManualValue] = useState("");
  const [scannerPaused, setScannerPaused] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [response, setResponse] = useState<VerifyResponse | null>(null);
  const [markedUsed, setMarkedUsed] = useState(false);
  const [error, setError] = useState("");

  async function verify(qr: string) {
    if (!qr.trim() || isVerifying) return;
    setIsVerifying(true);
    setScannerPaused(true);
    setError("");
    setResponse(null);
    setMarkedUsed(false);

    try {
      const res = await fetch("/api/organizer/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | VerifyResponse
        | { error?: string };

      if (!res.ok || !("result" in body)) {
        setError(("error" in body && body.error) || "Ticket could not be verified.");
      } else {
        setResponse(body);
      }
    } catch {
      setError("Verification request failed. Check your connection.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function markUsed() {
    if (!response || response.result !== "valid" || isMarking) return;
    setIsMarking(true);
    setError("");

    try {
      const res = await fetch(
        `/api/organizer/tickets/${response.ticket.id}/use`,
        { method: "POST" },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(body.error ?? "Ticket could not be marked as used.");
      } else {
        setMarkedUsed(true);
      }
    } catch {
      setError("Mark-as-used request failed. Check your connection.");
    } finally {
      setIsMarking(false);
    }
  }

  function scanNext() {
    setResponse(null);
    setMarkedUsed(false);
    setError("");
    setManualValue("");
    setScannerPaused(false);
  }

  function handleScan(codes: IDetectedBarcode[]) {
    const value = codes[0]?.rawValue;
    if (value) void verify(value);
  }

  return (
    <div className="ticket-scanner">
      <div className="ticket-scanner-camera">
        <Scanner
          onScan={handleScan}
          onError={(scanError) =>
            setError(
              scanError.message ||
                "Camera could not start. Use manual entry below.",
            )
          }
          paused={scannerPaused}
          constraints={{ facingMode: "environment" }}
          styles={{ container: { width: "100%" } }}
        />
      </div>

      <form
        className="ticket-scanner-manual"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(manualValue);
        }}
      >
        <label>
          <span>Or paste the QR value / ticket id</span>
          <input
            type="text"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder="cornshirt:ticket:..."
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          icon={<Camera size={16} />}
          loading={isVerifying}
          disabled={!manualValue.trim()}
        >
          Verify
        </Button>
      </form>

      {error ? (
        <p role="alert" className="customer-account-error">
          {error}
        </p>
      ) : null}

      {response ? (
        <div className="ticket-scanner-result">
          <span className={`status ${resultVariant(response.result)}`}>
            {RESULT_LABEL[response.result]}
          </span>
          <dl>
            <div>
              <dt>Event</dt>
              <dd>{response.ticket.eventName}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{response.ticket.ticketType}</dd>
            </div>
            <div>
              <dt>Token ID</dt>
              <dd>{response.ticket.tokenId ?? "Pending"}</dd>
            </div>
          </dl>

          {response.onchain === "unminted" ? (
            <p className="muted dashboard-panel-text">
              <ShieldAlert
                size={15}
                style={{ verticalAlign: "-2px", marginRight: 6 }}
              />
              This ticket has no on-chain token yet — status was verified from
              database records only.
            </p>
          ) : null}
          {response.onchain === "owner_mismatch" ? (
            <p className="muted dashboard-panel-text">
              <ShieldAlert
                size={15}
                style={{ verticalAlign: "-2px", marginRight: 6 }}
              />
              The on-chain owner does not match the ticket&apos;s wallet on
              record.
            </p>
          ) : null}

          <div className="ticket-scanner-actions">
            {markedUsed ? (
              <span className="status good">
                <CheckCircle2
                  size={15}
                  style={{ verticalAlign: "-2px", marginRight: 6 }}
                />
                Marked as used
              </span>
            ) : (
              <Button
                onClick={markUsed}
                loading={isMarking}
                disabled={response.result !== "valid"}
              >
                Mark as used
              </Button>
            )}
            <Button
              variant="outline"
              icon={<RefreshCw size={16} />}
              onClick={scanNext}
            >
              Scan next ticket
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
