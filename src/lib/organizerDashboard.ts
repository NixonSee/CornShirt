export interface OrganizerEventRow {
  event_id: string;
  event_name: string;
  artist_name: string | null;
  venue: string | null;
  status: string | null;
  event_date: string | null;
  banner_image: string | null;
}

export interface OrganizerTicketTypeRow {
  ticket_type_id: string;
  event_id: string | null;
  price: number | null;
  total_supply: number | null;
}

export interface OrganizerTicketRow {
  event_id: string | null;
  ticket_type_id: string | null;
  created_at: string | null;
  status: string | null;
}

export interface OrganizerEventSummary extends OrganizerEventRow {
  sold: number;
  supply: number;
  revenue: number;
  minPrice: number | null;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
}

export const REVENUE_WINDOW_DAYS = 180;

const REVENUE_TICKET_STATUSES = new Set(["active", "valid", "used"]);

function isRevenueTicket(status: string | null) {
  return REVENUE_TICKET_STATUSES.has((status ?? "").toLowerCase());
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(date: Date) {
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function buildOrganizerEventSummaries(
  events: OrganizerEventRow[],
  ticketTypes: OrganizerTicketTypeRow[],
  tickets: OrganizerTicketRow[],
): OrganizerEventSummary[] {
  const typesByEvent = new Map<string, OrganizerTicketTypeRow[]>();
  const priceByType = new Map<string, number>();

  for (const type of ticketTypes) {
    if (type.event_id) {
      const existing = typesByEvent.get(type.event_id) ?? [];
      existing.push(type);
      typesByEvent.set(type.event_id, existing);
    }
    priceByType.set(type.ticket_type_id, Number(type.price ?? 0));
  }

  const soldByEvent = new Map<string, number>();
  const revenueByEvent = new Map<string, number>();

  for (const ticket of tickets) {
    if (!ticket.event_id || !isRevenueTicket(ticket.status)) continue;

    soldByEvent.set(
      ticket.event_id,
      (soldByEvent.get(ticket.event_id) ?? 0) + 1,
    );
    revenueByEvent.set(
      ticket.event_id,
      (revenueByEvent.get(ticket.event_id) ?? 0) +
        (ticket.ticket_type_id
          ? (priceByType.get(ticket.ticket_type_id) ?? 0)
          : 0),
    );
  }

  return events.map((event) => {
    const types = typesByEvent.get(event.event_id) ?? [];
    const prices = types
      .map((type) => type.price)
      .filter((price): price is number => price != null);

    return {
      ...event,
      sold: soldByEvent.get(event.event_id) ?? 0,
      supply: types.reduce(
        (total, type) => total + Number(type.total_supply ?? 0),
        0,
      ),
      revenue: revenueByEvent.get(event.event_id) ?? 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
    };
  });
}

export function buildDailyRevenueSeries(
  tickets: OrganizerTicketRow[],
  ticketTypes: OrganizerTicketTypeRow[],
  now = new Date(),
  windowDays = REVENUE_WINDOW_DAYS,
): DailyRevenuePoint[] {
  const safeWindowDays = Math.max(1, Math.floor(windowDays));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const priceByType = new Map(
    ticketTypes.map((type) => [
      type.ticket_type_id,
      Number(type.price ?? 0),
    ]),
  );

  const points = Array.from({ length: safeWindowDays }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (safeWindowDays - 1 - index));
    return {
      date: dateKey(date),
      label: dateLabel(date),
      revenue: 0,
    };
  });
  const pointByDate = new Map(points.map((point) => [point.date, point]));

  for (const ticket of tickets) {
    if (
      !ticket.created_at ||
      !ticket.ticket_type_id ||
      !isRevenueTicket(ticket.status)
    ) {
      continue;
    }

    const createdAt = new Date(ticket.created_at);
    if (Number.isNaN(createdAt.getTime())) continue;

    const point = pointByDate.get(dateKey(createdAt));
    if (!point) continue;
    point.revenue += priceByType.get(ticket.ticket_type_id) ?? 0;
  }

  return points;
}

export function getRevenueTrend(points: DailyRevenuePoint[]) {
  const current = points
    .slice(-30)
    .reduce((total, point) => total + point.revenue, 0);
  const previous = points
    .slice(-60, -30)
    .reduce((total, point) => total + point.revenue, 0);

  if (previous <= 0) {
    return current > 0
      ? { direction: "up" as const, label: "Revenue started in the last 30 days" }
      : { direction: "flat" as const, label: "No revenue in the last 30 days" };
  }

  const change = ((current - previous) / previous) * 100;
  return {
    direction: change >= 0 ? ("up" as const) : ("down" as const),
    label: `${Math.abs(change).toFixed(1)}% vs previous 30 days`,
  };
}
