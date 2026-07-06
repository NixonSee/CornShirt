"use client";

import {
  ArrowRightLeft,
  CalendarDays,
  Hash,
  MapPin,
  QrCode,
  Ticket as TicketIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import QRCode from "react-qr-code";

import { Button, Modal } from "@/components/common";
import {
  canListTicket,
  parseResalePrice,
} from "@/app/customer/marketplace/marketplaceData";

import type { CustomerTicket } from "./ticketData";

interface TicketListProps {
  tickets: readonly CustomerTicket[];
  errorMessage?: string;
}

function shortHash(value: string | null): string {
  if (!value) return "Transaction pending";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function statusVariant(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
    case "valid":
      return "good";
    case "used":
    case "refunded":
    case "cancelled":
    case "canceled":
      return "bad";
    default:
      return "warn";
  }
}

export default function TicketList({ tickets, errorMessage }: TicketListProps) {
  const router = useRouter();
  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(
    null,
  );
  const [resaleTicket, setResaleTicket] = useState<CustomerTicket | null>(null);
  const [price, setPrice] = useState("");
  const [resaleError, setResaleError] = useState("");
  const [isListing, setIsListing] = useState(false);

  async function listForResale() {
    if (!resaleTicket) return;
    const amount = parseResalePrice(price);
    if (amount === null) {
      setResaleError("Enter a positive whole-number DICKEN price.");
      return;
    }
    setIsListing(true);
    setResaleError("");
    const response = await fetch("/api/customer/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: resaleTicket.id, price: amount }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setIsListing(false);
    if (!response.ok) {
      setResaleError(body.error ?? "Ticket could not be listed.");
      return;
    }
    setResaleTicket(null);
    setPrice("");
    router.refresh();
  }

  if (errorMessage) {
    return (
      <section className="ticket-page-state ticket-page-error" role="alert">
        <TicketIcon aria-hidden="true" size={38} />
        <h2>Tickets unavailable</h2>
        <p>{errorMessage}</p>
      </section>
    );
  }

  if (tickets.length === 0) {
    return (
      <section className="ticket-page-state">
        <TicketIcon aria-hidden="true" size={42} />
        <h2>No tickets yet</h2>
        <p>Your purchased NFT-backed concert tickets will appear here.</p>
        <Link className="button" href="/customer#events">
          Browse live events
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="ticket-stack" aria-label="Owned concert tickets">
        {tickets.map((ticket) => (
          <article
            className="ticket-pass"
            key={ticket.id}
            style={
              { "--ticket-accent": ticket.accent } as CSSProperties
            }
          >
            <div className="ticket-pass-stub">
              <p className="ticket-pass-eyebrow">NFT TICKET · ERC-721</p>
              <h2>{ticket.eventName}</h2>
              <p>{ticket.artist}</p>
            </div>

            <div className="ticket-pass-details">
              <dl className="ticket-pass-meta">
                <div>
                  <dt>Type</dt>
                  <dd>{ticket.ticketType}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>
                    <CalendarDays aria-hidden="true" size={16} />
                    {ticket.eventDate}
                  </dd>
                </div>
                <div>
                  <dt>Venue</dt>
                  <dd>
                    <MapPin aria-hidden="true" size={16} />
                    {ticket.venue}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`status ${statusVariant(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Token ID</dt>
                  <dd>
                    <Hash aria-hidden="true" size={16} />
                    {ticket.tokenId}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="ticket-pass-actions">
              <div className="ticket-mini-qr" aria-hidden="true">
                <QRCode value={ticket.qrValue} size={74} />
              </div>
              <p className="ticket-transaction mono">
                {shortHash(ticket.transactionHash)}
              </p>
              <div className="ticket-action-row">
                <Button
                  variant="secondary"
                  icon={<QrCode size={17} />}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  View QR
                </Button>
                <Button
                  variant="outline"
                  icon={<ArrowRightLeft size={17} />}
                  disabled
                  title={
                    ticket.transferAllowed
                      ? "Ticket transfer service is not connected yet"
                      : "This ticket type does not allow transfers"
                  }
                >
                  Transfer unavailable
                </Button>
                {canListTicket({
                  status: ticket.status,
                  transferAllowed: ticket.transferAllowed,
                  hasActiveListing: ticket.hasActiveListing,
                }) ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResaleTicket(ticket);
                      setPrice("");
                      setResaleError("");
                    }}
                  >
                    List for resale
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    title={
                      !ticket.transferAllowed
                        ? "This ticket type does not allow resale"
                        : ticket.hasActiveListing
                          ? "This ticket is already listed"
                          : "Only active tickets can be resold"
                    }
                  >
                    {ticket.hasActiveListing ? "Already listed" : "Resale unavailable"}
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      <Modal
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.eventName ?? "Ticket QR"}
        actions={<Button onClick={() => setSelectedTicket(null)}>Close</Button>}
      >
        {selectedTicket ? (
          <div className="ticket-qr-modal">
            <div className="ticket-qr-large">
              <QRCode value={selectedTicket.qrValue} size={210} />
            </div>
            <strong>{selectedTicket.ticketType}</strong>
            <span>{selectedTicket.tokenId}</span>
            <p>Present this QR code at the venue entrance.</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={resaleTicket !== null}
        onClose={() => setResaleTicket(null)}
        title="List for resale"
        actions={
          <>
            <Button variant="outline" onClick={() => setResaleTicket(null)}>
              Cancel
            </Button>
            <Button loading={isListing} onClick={listForResale}>
              Publish listing
            </Button>
          </>
        }
      >
        <div className="resale-form">
          <p>
            {resaleTicket?.eventName} / {resaleTicket?.ticketType}
          </p>
          <label>
            <span>Resale price in DICKEN</span>
            <input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="95"
            />
          </label>
          <p className="muted">
            You can cancel this listing before resale purchase support is connected.
          </p>
          {resaleError ? <p role="alert" className="customer-account-error">{resaleError}</p> : null}
        </div>
      </Modal>
    </>
  );
}
