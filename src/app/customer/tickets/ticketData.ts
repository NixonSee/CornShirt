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
  qrValue: string;
  transferAllowed: boolean;
  hasActiveListing: boolean;
  accent: string;
}

const TICKET_ACCENTS = [
  "#f6a730",
  "#2563eb",
  "#36b56a",
  "#d84a4a",
  "#a855f7",
] as const;

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

function accentFor(ticketId: string): string {
  const hash = [...ticketId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return TICKET_ACCENTS[hash % TICKET_ACCENTS.length];
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

    return {
      id,
      eventName: recordString(event, "event_name") ?? "Concert Ticket",
      artist: recordString(event, "artist_name") ?? "Artist TBC",
      venue: recordString(event, "venue") ?? "Venue TBC",
      eventDate: formatDate(recordString(event, "event_date")),
      ticketType:
        recordString(ticketType, "type_name", "name") ?? "Admission",
      status: (recordString(ticket, "status") ?? "active").toUpperCase(),
      tokenId: rawTokenId ? `#${rawTokenId.replace(/^#/, "")}` : "Pending",
      transactionHash: recordString(
        ticket,
        "transaction_hash",
        "mint_transaction_hash",
        "tx_hash",
      ),
      qrValue:
        recordString(ticket, "qr_code", "qr_code_data", "qr_value") ?? id,
      transferAllowed: recordBoolean(ticketType, "transfer_allowed"),
      hasActiveListing: activeListingTicketIds.has(id),
      accent: accentFor(id),
    };
  });
}
