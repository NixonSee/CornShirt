"use client";

import {
  CalendarDays,
  Check,
  Copy,
  Hash,
  Mail,
  MapPin,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Ticket as TicketIcon,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";
import QRCode from "react-qr-code";

import { Button, Modal } from "@/components/common";
import {
  canListTicket,
  parseResaleMyrPrice,
} from "@/app/customer/marketplace/marketplaceData";

import type { CustomerTicket } from "./ticketData";

interface TicketListProps {
  tickets: readonly CustomerTicket[];
  errorMessage?: string;
}

type TicketFilter = "all" | "valid" | "listed" | "used";
type TicketCategory = Exclude<TicketFilter, "all"> | "other";

const TICKET_FILTERS: readonly {
  value: TicketFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "valid", label: "Valid" },
  { value: "listed", label: "Listed" },
  { value: "used", label: "Used" },
];

const TICKET_SORT_RANK: Record<TicketCategory, number> = {
  valid: 0,
  listed: 1,
  used: 2,
  other: 3,
};

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

function ticketCategory(ticket: CustomerTicket): TicketCategory {
  const status = ticket.status.toLowerCase();

  if (status === "used") return "used";
  if (
    ticket.hasActiveListing &&
    ["active", "valid"].includes(status)
  ) {
    return "listed";
  }
  if (["active", "valid"].includes(status)) return "valid";
  return "other";
}

function displayStatus(ticket: CustomerTicket): string {
  if (ticketCategory(ticket) === "listed") return "LISTED";

  return ticket.status;
}

export default function TicketList({ tickets, errorMessage }: TicketListProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<TicketFilter>("all");
  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(
    null,
  );
  const [ticketIdCopied, setTicketIdCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [resaleTicket, setResaleTicket] = useState<CustomerTicket | null>(null);
  const [price, setPrice] = useState("");
  const [resaleError, setResaleError] = useState("");
  const [isListing, setIsListing] = useState(false);
  const [refundTicket, setRefundTicket] = useState<CustomerTicket | null>(null);
  const [refundError, setRefundError] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [transferTarget, setTransferTarget] = useState<CustomerTicket | null>(
    null,
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferError, setTransferError] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const transferKey = useRef<string | null>(null);
  const ticketCounts: Record<TicketFilter, number> = {
    all: tickets.length,
    valid: 0,
    listed: 0,
    used: 0,
  };

  tickets.forEach((ticket) => {
    const category = ticketCategory(ticket);
    if (category !== "other") ticketCounts[category] += 1;
  });

  const visibleTickets = tickets
    .map((ticket, index) => ({ ticket, index }))
    .filter(
      ({ ticket }) =>
        activeFilter === "all" || ticketCategory(ticket) === activeFilter,
    )
    .sort(
      (left, right) =>
        TICKET_SORT_RANK[ticketCategory(left.ticket)] -
          TICKET_SORT_RANK[ticketCategory(right.ticket)] ||
        left.index - right.index,
    )
    .map(({ ticket }) => ticket);
  const activeFilterLabel =
    TICKET_FILTERS.find((filter) => filter.value === activeFilter)?.label ??
    "selected";

  async function copyTicketId(value: string) {
    setCopyError("");

    try {
      await navigator.clipboard.writeText(value);
      setTicketIdCopied(true);
    } catch {
      setCopyError(
        "Copy was blocked by the browser. Press and hold the value to copy it manually.",
      );
    }
  }

  async function listForResale() {
    if (!resaleTicket) return;
    const amount = parseResaleMyrPrice(price);
    if (amount === null) {
      setResaleError("Enter a positive MYR price with up to two decimal places.");
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

  async function claimRefund() {
    if (!refundTicket) return;
    setIsRefunding(true);
    setRefundError("");
    const response = await fetch("/api/customer/refunds/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: refundTicket.id }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setIsRefunding(false);
    if (!response.ok) {
      setRefundError(body.error ?? "Refund could not be processed.");
      return;
    }
    setRefundTicket(null);
    router.refresh();
  }

  async function submitTransfer() {
    if (!transferTarget) return;
    transferKey.current ??= crypto.randomUUID();
    setIsTransferring(true);
    setTransferError("");
    const response = await fetch(
      `/api/customer/tickets/${transferTarget.id}/transfer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          idempotencyKey: transferKey.current,
        }),
      },
    );
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setIsTransferring(false);
    if (!response.ok) {
      setTransferError(body.error ?? "Ticket could not be transferred.");
      return;
    }
    setTransferTarget(null);
    setRecipientEmail("");
    transferKey.current = null;
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
      <nav className="ticket-filter-bar" aria-label="Filter tickets by status">
        {TICKET_FILTERS.map((filter) => (
          <button
            type="button"
            className={`ticket-filter-chip${activeFilter === filter.value ? " active" : ""}`}
            aria-pressed={activeFilter === filter.value}
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
          >
            <span>{filter.label}</span>
            <span className="ticket-filter-count">
              {ticketCounts[filter.value]}
            </span>
          </button>
        ))}
      </nav>

      {visibleTickets.length > 0 ? (
        <section className="ticket-stack" aria-label="Owned concert tickets">
          {visibleTickets.map((ticket) => (
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
                      className={`status ${statusVariant(displayStatus(ticket))}`}
                      title={
                        ticket.hasActiveListing
                          ? "Listed on the Marketplace and waiting for a buyer"
                          : undefined
                      }
                    >
                      {displayStatus(ticket)}
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
              {ticket.qrValue && ticket.isNftBacked ? (
                <div className="ticket-mini-qr" aria-hidden="true">
                  <QRCode value={ticket.qrValue} size={74} />
                </div>
              ) : (
                <p className="muted">Legacy ticket — no on-chain QR</p>
              )}
              <p className="ticket-transaction mono">
                {shortHash(ticket.transactionHash)}
              </p>
              <div className="ticket-action-row">
                <Button
                  variant="secondary"
                  icon={<QrCode size={17} />}
                  disabled={!ticket.isNftBacked || !ticket.qrValue}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setTicketIdCopied(false);
                    setCopyError("");
                  }}
                >
                  View QR
                </Button>
                {ticket.refundEligible &&
                ["active", "valid"].includes(ticket.status.toLowerCase()) ? (
                  <Button
                    variant="destructive"
                    icon={<ReceiptText size={17} />}
                    onClick={() => {
                      setRefundTicket(ticket);
                      setRefundError("");
                    }}
                  >
                    Claim refund
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  icon={<UserRoundPlus size={17} />}
                  disabled={
                    !ticket.isNftBacked ||
                    !ticket.transferAllowed ||
                    ticket.hasActiveListing ||
                    !["active", "valid"].includes(ticket.status.toLowerCase())
                  }
                  onClick={() => {
                    setTransferTarget(ticket);
                    setRecipientEmail("");
                    setTransferError("");
                    transferKey.current = null;
                  }}
                  title={
                    !ticket.isNftBacked
                      ? "Legacy tickets are not transferable"
                      : ticket.hasActiveListing
                        ? "Cancel the Marketplace listing first"
                        : ticket.transferAllowed
                          ? "Transfer to another registered customer"
                          : "This ticket type does not allow transfers"
                  }
                >
                  Transfer
                </Button>
                {canListTicket({
                  status: ticket.status,
                  transferAllowed: ticket.transferAllowed,
                  hasActiveListing: ticket.hasActiveListing,
                }) && ticket.isNftBacked ? (
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
      ) : (
        <section className="ticket-filter-empty" role="status">
          <TicketIcon aria-hidden="true" size={34} />
          <h2>No {activeFilterLabel.toLowerCase()} tickets</h2>
          <p>Choose another filter to view the rest of your collection.</p>
        </section>
      )}

      <Modal
        isOpen={selectedTicket !== null}
        onClose={() => {
          setSelectedTicket(null);
          setTicketIdCopied(false);
          setCopyError("");
        }}
        title={selectedTicket?.eventName ?? "Ticket QR"}
        className="ticket-view-modal"
        actions={
          <Button
            onClick={() => {
              setSelectedTicket(null);
              setTicketIdCopied(false);
              setCopyError("");
            }}
          >
            Close
          </Button>
        }
      >
        {selectedTicket ? (
          <div className="ticket-qr-modal">
            {selectedTicket.qrValue ? (
              <div className="ticket-qr-large">
                <QRCode value={selectedTicket.qrValue} size={210} />
              </div>
            ) : null}
            <strong>{selectedTicket.ticketType}</strong>
            <span>{selectedTicket.tokenId}</span>
            <p>Present this QR code at the venue entrance.</p>

            <div
              className="ticket-qr-identifiers"
              aria-label="Manual scanner values"
            >
              <div className="ticket-qr-identifier">
                <span>Ticket ID</span>
                <code>{selectedTicket.id}</code>
                <Button
                  variant="outline"
                  icon={
                    ticketIdCopied ? (
                      <Check size={15} />
                    ) : (
                      <Copy size={15} />
                    )
                  }
                  onClick={() => void copyTicketId(selectedTicket.id)}
                >
                  {ticketIdCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            {copyError ? (
              <p className="customer-account-error" role="alert">
                {copyError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={transferTarget !== null}
        onClose={() => setTransferTarget(null)}
        title="Transfer ticket"
        className="ticket-resale-modal ticket-transfer-modal"
        showCloseButton
        actions={
          <>
            <Button variant="outline" onClick={() => setTransferTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!recipientEmail.trim()}
              loading={isTransferring}
              onClick={submitTransfer}
            >
              Transfer ticket
            </Button>
          </>
        }
      >
        <div className="ticket-transfer-form" data-testid="ticket-transfer-form">
          <div className="resale-listing-ticket">
            <span className="resale-listing-eyebrow">Ticket</span>
            <strong>{transferTarget?.eventName}</strong>
            <p>
              {transferTarget?.ticketType}
              <span aria-hidden="true">•</span>
              {transferTarget?.tokenId}
            </p>
          </div>

          <label className="ticket-transfer-field" htmlFor="recipient-email">
            <span className="ticket-transfer-label">Recipient email</span>
            <div className="ticket-transfer-control">
              <span className="ticket-transfer-icon" aria-hidden="true">
                <Mail size={18} />
              </span>
              <input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="customer@example.com"
                autoComplete="email"
                aria-describedby="recipient-email-help"
              />
            </div>
            <small id="recipient-email-help">
              Use the email linked to the recipient&apos;s CornShirt account.
            </small>
          </label>

          <div className="ticket-transfer-note">
            <ShieldCheck aria-hidden="true" size={18} />
            <p>
              <strong>Direct NFT transfer</strong>
              <span>
                No payment is collected. If the event is cancelled, any refund
                goes to the latest Stripe payer.
              </span>
            </p>
          </div>

          {transferError ? (
            <p role="alert" className="customer-account-error">
              {transferError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={resaleTicket !== null}
        onClose={() => setResaleTicket(null)}
        title="List for resale"
        className="ticket-resale-modal"
        showCloseButton
        actions={
          <>
            <Button variant="outline" onClick={() => setResaleTicket(null)}>
              Cancel
            </Button>
            <Button loading={isListing} onClick={listForResale}>
              List ticket
            </Button>
          </>
        }
      >
        <div className="resale-listing-form" data-testid="resale-listing-form">
          <div className="resale-listing-ticket">
            <span className="resale-listing-eyebrow">Ticket</span>
            <strong>{resaleTicket?.eventName}</strong>
            <p>
              {resaleTicket?.ticketType}
              <span aria-hidden="true">•</span>
              {resaleTicket?.tokenId}
            </p>
          </div>

          <label className="resale-price-field" htmlFor="resale-price">
            <span className="resale-price-label">Resale price</span>
            <div className="resale-price-control">
              <span aria-hidden="true">RM</span>
              <input
                id="resale-price"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
                aria-describedby="resale-price-help"
              />
            </div>
            <small id="resale-price-help">
              Enter the amount the buyer will pay.
            </small>
          </label>

          <p className="resale-listing-note">
            You can cancel the listing until a buyer starts checkout.
          </p>

          {resaleError ? (
            <p role="alert" className="customer-account-error">
              {resaleError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={refundTicket !== null}
        onClose={() => setRefundTicket(null)}
        title="Claim refund"
        actions={
          <>
            <Button variant="outline" onClick={() => setRefundTicket(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isRefunding}
              onClick={claimRefund}
            >
              Confirm refund
            </Button>
          </>
        }
      >
        <div className="resale-form">
          <p>
            {refundTicket?.eventName} / {refundTicket?.ticketType}
          </p>
          <p className="muted">
            This event was cancelled. Confirming will refund the Stripe
            payment to the card of the latest person who paid for this
            ticket — which may not be you, if the ticket was ever
            transferred — and permanently burns the ticket NFT. This cannot
            be undone.
          </p>
          {refundError ? (
            <p role="alert" className="customer-account-error">
              {refundError}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
