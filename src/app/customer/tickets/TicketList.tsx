"use client";

import {
  CalendarDays,
  Check,
  Copy,
  Hash,
  MapPin,
  QrCode,
  ReceiptText,
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
        title="Transfer Ticket NFT"
        actions={
          <>
            <Button variant="outline" onClick={() => setTransferTarget(null)}>
              Cancel
            </Button>
            <Button loading={isTransferring} onClick={submitTransfer}>
              Confirm transfer
            </Button>
          </>
        }
      >
        <div className="resale-form">
          <p>
            {transferTarget?.eventName} / {transferTarget?.ticketType}
          </p>
          <label>
            <span>Recipient&apos;s registered email</span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="customer@example.com"
              autoComplete="email"
            />
          </label>
          <p className="muted">
            This transfers the existing NFT without payment. If the event is
            later cancelled, its refund returns to the latest Stripe payer,
            who may be different from the recipient.
          </p>
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
