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
import { useState, type CSSProperties } from "react";
import QRCode from "react-qr-code";

import { Button, Modal } from "@/components/common";

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
  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(
    null,
  );

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
    </>
  );
}
