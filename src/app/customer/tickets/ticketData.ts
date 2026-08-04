import {
  getMaximumResalePriceSen,
  getOriginalTicketPriceSen,
} from "@/lib/resalePricing";

export type DatabaseRecord = Record<string, unknown>;

export interface CustomerTicket {
  id: string;
  eventName: string;
  artist: string;
  venue: string;
  eventDate: string;
  ticketType: string;
  status: string;
  tokenId: string;
  transactionHash: string | null;
  qrValue: string | null;
  isNftBacked: boolean;
  transferAllowed: boolean;
  hasActiveListing: boolean;
  originalPriceSen: number | null;
  maxResalePriceSen: number | null;
  refundEligible: boolean;
  accent: string;
}

const TICKET_STATE_ACCENTS = {
  valid: "#36b56a",
  used: "#d84a4a",
  listed: "#f6a730",
  fallback: "#64748b",
} as const;

export function recordString(
  record: DatabaseRecord,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function recordBoolean(record: DatabaseRecord, key: string): boolean {
  return record[key] === true;
}

function formatDate(value: string | null): string {
  if (!value) return "Date TBC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBC";

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function accentFor(status: string, hasActiveListing: boolean): string {
  const normalizedStatus = status.toLowerCase();

  if (
    ["used", "refunded", "cancelled", "canceled"].includes(normalizedStatus)
  ) {
    return TICKET_STATE_ACCENTS.used;
  }

  if (
    hasActiveListing &&
    ["active", "valid"].includes(normalizedStatus)
  ) {
    return TICKET_STATE_ACCENTS.listed;
  }

  if (["active", "valid"].includes(normalizedStatus)) {
    return TICKET_STATE_ACCENTS.valid;
  }

  return TICKET_STATE_ACCENTS.fallback;
}

export function mapCustomerTickets(
  ticketRows: readonly DatabaseRecord[],
  eventRows: readonly DatabaseRecord[],
  ticketTypeRows: readonly DatabaseRecord[],
  activeListingTicketIds: ReadonlySet<string> = new Set(),
): CustomerTicket[] {
  const events = new Map(
    eventRows.map((event) => [recordString(event, "event_id"), event]),
  );
  const ticketTypes = new Map(
    ticketTypeRows.map((ticketType) => [
      recordString(ticketType, "ticket_type_id"),
      ticketType,
    ]),
  );

  return ticketRows.map((ticket, index) => {
    const id = recordString(ticket, "ticket_id", "id") ?? `ticket-${index}`;
    const event = events.get(recordString(ticket, "event_id")) ?? {};
    const ticketType =
      ticketTypes.get(recordString(ticket, "ticket_type_id")) ?? {};
    const rawTokenId = recordString(
      ticket,
      "token_id",
      "nft_token_id",
      "contract_token_id",
    );
    const qrValue = recordString(
      ticket,
      "qr_code",
      "qr_code_data",
      "qr_value",
    );
    const status = (
      recordString(ticket, "status") ?? "active"
    ).toUpperCase();
    const hasActiveListing = activeListingTicketIds.has(id);
    const isNftBacked =
      recordString(ticket, "record_source") === "stripe_nft" &&
      Boolean(rawTokenId) &&
      Boolean(qrValue);
    const originalPriceSen = getOriginalTicketPriceSen({
      priceSen: ticketType.price_sen,
      price: ticketType.price,
    });

    return {
      id,
      eventName: recordString(event, "event_name") ?? "Concert Ticket",
      artist: recordString(event, "artist_name") ?? "Artist TBC",
      venue: recordString(event, "venue") ?? "Venue TBC",
      eventDate: formatDate(recordString(event, "event_date")),
      ticketType:
        recordString(ticketType, "type_name", "name") ?? "Admission",
      status,
      tokenId: rawTokenId ? `#${rawTokenId.replace(/^#/, "")}` : "Pending",
      transactionHash: recordString(
        ticket,
        "transaction_hash",
        "mint_transaction_hash",
        "tx_hash",
      ),
      qrValue,
      isNftBacked,
      transferAllowed: recordBoolean(ticketType, "transfer_allowed"),
      hasActiveListing,
      originalPriceSen,
      maxResalePriceSen:
        originalPriceSen === null
          ? null
          : getMaximumResalePriceSen(originalPriceSen),
      refundEligible: recordBoolean(ticket, "refund_eligible"),
      accent: accentFor(status, hasActiveListing),
    };
  });
}
