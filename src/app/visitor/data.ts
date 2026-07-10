import type {
  MapStage,
  SeatZone,
  ZoneShape,
} from "@/components/seatmap/types";

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
  dateTime: string | null;
  price: number;
  status: EventStatus;
  description: string;
  image: string;
  accent: string;
  ticketTypes: readonly TicketType[];
  /** Fixed stage from the picked venue, or null for legacy free-text venues. */
  stage: MapStage | null;
  /** The venue's fixed zones (read-only in Phase 2; unpriced until wired). */
  zones: readonly SeatZone[];
};

export type TicketTypeRow = {
  ticket_type_id: string;
  type_name: string | null;
  price: number | string | null;
  total_supply: number | null;
  remaining_supply: number | null;
  purchase_limit: number | null;
  transfer_allowed: boolean | null;
  venue_zone_id?: string | null;
  zone_ref?: string | null;
};

export type LayoutCustomZone = {
  id: string;
  shape: ZoneShape;
  label: string;
  category: string;
};

export type EventLayout = {
  version?: number;
  customZones?: LayoutCustomZone[];
  pricing?: Record<string, { price: number; capacity: number }>;
};

export type VenueZoneRow = {
  zone_id: string;
  code: string | null;
  label: string | null;
  capacity: number | null;
  category: string | null;
  shape: ZoneShape | null;
};

export type VenueEmbed = {
  name: string | null;
  venue_type: string | null;
  layout: { stage?: MapStage } | null;
  venue_zones: readonly VenueZoneRow[] | null;
};

export type EventRow = {
  event_id: string;
  event_name: string;
  artist_name: string | null;
  venue: string | null;
  venue_id?: string | null;
  event_date: string | null;
  description: string | null;
  banner_image: string | null;
  status: string | null;
  layout?: EventLayout | null;
  venue_data?: VenueEmbed | null;
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

  const venueData = row.venue_data ?? null;
  const stage = venueData?.layout?.stage ?? null;

  // Map each priced ticket type back to its zone via zone_ref so a zone click
  // on the buyer map can select the matching ticket type.
  const ticketByZoneRef = new Map(
    (row.ticket_types ?? [])
      .filter((t) => t.zone_ref)
      .map((t) => [
        t.zone_ref as string,
        {
          id: t.ticket_type_id,
          price: numericValue(t.price),
          total: t.total_supply ?? 0,
          remaining: t.remaining_supply ?? 0,
        },
      ]),
  );

  const fixedZones = (venueData?.venue_zones ?? [])
    .filter((z) => z.shape != null)
    .map((z) => ({
      id: z.zone_id,
      kind: "fixed" as const,
      shape: z.shape as ZoneShape,
      label: z.label?.trim() || z.code?.trim() || "Zone",
      category: (z.category === "standing" ? "standing" : "seated") as
        | "seated"
        | "standing",
      capacity: z.capacity ?? 0,
    }));

  const customZonesRaw = row.layout?.customZones ?? [];
  const customZones = customZonesRaw
    .filter((z) => z.shape != null)
    .map((z) => ({
      id: z.id,
      kind: "custom" as const,
      shape: z.shape,
      label: z.label?.trim() || "Zone",
      category: (z.category === "seated" ? "seated" : "standing") as
        | "seated"
        | "standing",
      capacity: 0,
    }));

  const zones: SeatZone[] = [...fixedZones, ...customZones].map((z) => {
    const ticket = ticketByZoneRef.get(z.id);
    return {
      ...z,
      price: ticket ? ticket.price : null,
      capacity: ticket ? ticket.total : z.capacity,
      ticketTypeId: ticket?.id,
      soldOut: ticket ? ticket.remaining <= 0 : false,
    };
  });

  return {
    id: row.event_id,
    title: row.event_name,
    artist: row.artist_name?.trim() || "Artist TBC",
    venue: venueData?.name?.trim() || row.venue?.trim() || "Venue TBC",
    category: "Concert",
    date: formatEventDate(row.event_date),
    dateTime: row.event_date,
    price: availablePrices.length ? Math.min(...availablePrices) : 0,
    status: isSellingFast ? "SELLING FAST" : "ACTIVE",
    description:
      row.description?.trim() || "More event details will be announced soon.",
    image: row.banner_image?.trim() || "/Background Image.png",
    accent: eventAccent(row.event_id),
    ticketTypes,
    stage,
    zones,
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
