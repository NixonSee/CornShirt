"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX, Ticket, Users } from "lucide-react";

import type { Event } from "@/app/visitor/data";
import { SeatMap } from "@/components/seatmap/SeatMap";
import { formatMyr } from "@/lib/currency";

import PurchaseButton from "./PurchaseButton";

interface Props {
  event: Event;
  isCustomer: boolean;
  loginHref: string;
}

export default function EventTicketing({ event, isCustomer, loginHref }: Props) {
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(
    null,
  );

  const hasMap = Boolean(event.stage) && event.zones.length > 0;

  // Selection flows both ways: click a zone → highlight its ticket; the map
  // reads the selected zone from the chosen ticket type.
  const selectedZoneId =
    event.zones.find((z) => z.ticketTypeId === selectedTicketTypeId)?.id ?? null;

  function handleSelectZone(zoneId: string | null) {
    const zone = event.zones.find((z) => z.id === zoneId);
    setSelectedTicketTypeId(zone?.ticketTypeId ?? null);
  }

  return (
    <section
      className={`event-ticketing-grid ${
        hasMap ? "" : "event-ticketing-grid-no-map"
      }`.trim()}
      aria-label="Ticket selection"
    >
      {hasMap && event.stage && (
        <article
          className="event-detail-panel event-seatmap-panel"
          aria-labelledby="venue-layout-title"
        >
          <div className="event-panel-heading">
            <div>
              <p className="section-kicker">Pick your zone</p>
              <h2 id="venue-layout-title">{event.venue}</h2>
            </div>
            <span>{event.zones.length} zones</span>
          </div>
          <SeatMap
            stage={event.stage}
            zones={event.zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={handleSelectZone}
            ariaLabel={`${event.venue} seat map`}
          />
        </article>
      )}

      <aside
        className="event-detail-panel ticket-options-panel"
        aria-labelledby="ticket-options-title"
      >
        <div className="event-panel-heading">
          <div>
            <p className="section-kicker">Choose your entry</p>
            <h2 id="ticket-options-title">Available ticket types</h2>
          </div>
          <span>{event.ticketTypes.length} types</span>
        </div>

        <div className="ticket-option-list">
          {event.ticketTypes.map((ticketType) => (
            <article
              className={`ticket-option-card ${
                ticketType.id === selectedTicketTypeId
                  ? "ticket-option-card-selected"
                  : ""
              }`.trim()}
              key={ticketType.id}
              onClick={() => setSelectedTicketTypeId(ticketType.id)}
            >
              <div className="ticket-option-heading">
                <div>
                  <Ticket aria-hidden="true" size={20} />
                  <h3>{ticketType.name}</h3>
                </div>
                <strong>{formatMyr(ticketType.price)}</strong>
              </div>

              <div className="ticket-option-meta">
                <span>
                  <Users aria-hidden="true" size={17} />
                  {ticketType.remaining} remaining
                </span>
                <span>Limit {ticketType.purchaseLimit} per customer</span>
                <span>
                  {ticketType.transferAllowed ? (
                    <ShieldCheck aria-hidden="true" size={17} />
                  ) : (
                    <ShieldX aria-hidden="true" size={17} />
                  )}
                  {ticketType.transferAllowed
                    ? "Transfer allowed"
                    : "Transfer disabled"}
                </span>
              </div>

              <PurchaseButton
                eventId={event.id}
                isCustomer={isCustomer}
                loginHref={loginHref}
                ticketTypeId={ticketType.id}
                ticketTypeName={ticketType.name}
              />
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}
