export const EVENT_DURATION_HOURS = 3;
export const EVENT_DURATION_MS = EVENT_DURATION_HOURS * 60 * 60 * 1000;

export type EventLifecycleRecord = {
  status?: string | null;
  event_date?: string | null;
};

export function getEventEndTime(
  eventDate: string | null | undefined,
): Date | null {
  if (!eventDate) return null;

  const start = new Date(eventDate);
  if (Number.isNaN(start.getTime())) return null;

  return new Date(start.getTime() + EVENT_DURATION_MS);
}

export function getLiveEventCutoff(now = new Date()): Date {
  return new Date(now.getTime() - EVENT_DURATION_MS);
}

export function isEventLive(
  event: EventLifecycleRecord,
  now = new Date(),
): boolean {
  if (String(event.status ?? "").toLowerCase() !== "active") return false;

  const end = getEventEndTime(event.event_date);
  return end !== null && now < end;
}

