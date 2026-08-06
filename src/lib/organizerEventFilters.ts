export type OrganizerEventFilter =
  | "all"
  | "live"
  | "pending"
  | "completed"
  | "rejected"
  | "cancelled";

export const ORGANIZER_EVENT_FILTERS: readonly OrganizerEventFilter[] = [
  "all",
  "live",
  "pending",
  "completed",
  "rejected",
  "cancelled",
];

export function filterOrganizerEvents<T extends { status: string | null }>(
  events: readonly T[],
  filter: OrganizerEventFilter,
): T[] {
  if (filter === "all") return [...events];

  const targetStatus = filter === "live" ? "active" : filter;
  return events.filter(
    (event) => {
      const status = (event.status ?? "").toLowerCase();
      return filter === "cancelled"
        ? status === "cancelled" || status === "canceled"
        : status === targetStatus;
    },
  );
}

export function organizerEventFilterLabel(
  filter: OrganizerEventFilter,
): string {
  return filter.charAt(0).toUpperCase() + filter.slice(1);
}
