export type EventStatus = "ACTIVE" | "SELLING FAST";

export type TicketType = {
  id: string;
  name: string;
  price: number;
  remaining: number;
  purchaseLimit: number;
  transferAllowed: boolean;
};

export type Event = {
  id: string;
  title: string;
  artist: string;
  venue: string;
  category: string;
  date: string;
  price: number;
  status: EventStatus;
  description: string;
  image: string;
  accent: string;
  ticketTypes: readonly TicketType[];
};

export type TicketTypeRow = {
  ticket_type_id: string;
  type_name: string | null;
  price: number | string | null;
  total_supply: number | null;
  remaining_supply: number | null;
  purchase_limit: number | null;
  transfer_allowed: boolean | null;
};

export type EventRow = {
  event_id: string;
  event_name: string;
  artist_name: string | null;
  venue: string | null;
  event_date: string | null;
  description: string | null;
  banner_image: string | null;
  status: string | null;
  ticket_types: readonly TicketTypeRow[] | null;
};

const ACCENTS = ["amber", "gold", "red", "violet", "teal"] as const;

function numericValue(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventAccent(eventId: string): string {
  const hash = [...eventId].reduce((total, character) => {
    return total + character.charCodeAt(0);
  }, 0);
  return ACCENTS[hash % ACCENTS.length];
}

function formatEventDate(value: string | null): string {
  if (!value) return "Date TBC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBC";

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function mapEventRow(row: EventRow): Event {
  const ticketTypes = (row.ticket_types ?? []).map((ticket): TicketType => ({
    id: ticket.ticket_type_id,
    name: ticket.type_name?.trim() || "General Admission",
    price: numericValue(ticket.price),
    remaining: ticket.remaining_supply ?? 0,
    purchaseLimit: ticket.purchase_limit ?? 1,
    transferAllowed: ticket.transfer_allowed ?? false,
  }));
  const availablePrices = ticketTypes
    .map((ticket) => ticket.price)
    .filter((price) => price > 0);
  const totalSupply = (row.ticket_types ?? []).reduce(
    (total, ticket) => total + (ticket.total_supply ?? 0),
    0,
  );
  const remainingSupply = ticketTypes.reduce(
    (total, ticket) => total + ticket.remaining,
    0,
  );
  const isSellingFast =
    totalSupply > 0 && remainingSupply / totalSupply <= 0.2;

  return {
    id: row.event_id,
    title: row.event_name,
    artist: row.artist_name?.trim() || "Artist TBC",
    venue: row.venue?.trim() || "Venue TBC",
    category: "Concert",
    date: formatEventDate(row.event_date),
    price: availablePrices.length ? Math.min(...availablePrices) : 0,
    status: isSellingFast ? "SELLING FAST" : "ACTIVE",
    description:
      row.description?.trim() || "More event details will be announced soon.",
    image: row.banner_image?.trim() || "/Background Image.png",
    accent: eventAccent(row.event_id),
    ticketTypes,
  };
}

export function getEventCategories(source: readonly Event[]): string[] {
  return ["All", ...new Set(source.map((event) => event.category))];
}

export function filterEvents(
  source: readonly Event[],
  query: string,
  category: string,
): Event[] {
  const normalizedQuery = query.trim().toLowerCase();

  return source.filter((event) => {
    const haystack = [
      event.title,
      event.artist,
      event.venue,
      event.category,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = haystack.includes(normalizedQuery);
    const matchesCategory =
      category === "All" || event.category === category;

    return matchesQuery && matchesCategory;
  });
}
