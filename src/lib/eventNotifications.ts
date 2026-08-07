import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  sendTransactionalEmail,
  type TransactionalEmailResult,
} from "@/lib/transactionalEmail";

export type OrganizerNotificationSummary = {
  recipients: number;
  sent: number;
  failed: number;
};

type OrganizerEventContext = {
  eventName: string;
  eventDate: string;
  venue: string;
  category: string;
  organizerName: string;
  organizerEmail: string;
};

function delivered(result: TransactionalEmailResult): boolean {
  return result.sent || result.skipped === true;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatEventDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "To be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function loadOrganizerEventContext(
  eventId: string,
): Promise<OrganizerEventContext | null> {
  const eventResult = await supabaseAdmin
    .from("events")
    .select("event_name, event_date, venue, category, organizer_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (eventResult.error || !eventResult.data?.organizer_id) {
    console.error("Organizer notification event could not be loaded", {
      eventId,
    });
    return null;
  }

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("name, email")
    .eq("user_id", eventResult.data.organizer_id)
    .maybeSingle();

  const email = text(profileResult.data?.email, "").toLowerCase();
  if (profileResult.error || !email) {
    console.error("Organizer notification contact could not be loaded", {
      eventId,
    });
    return null;
  }

  return {
    eventName: text(eventResult.data.event_name, "CornShirt live event"),
    eventDate: formatEventDate(eventResult.data.event_date),
    venue: text(eventResult.data.venue, "See your event listing for details"),
    category: text(eventResult.data.category, "Live event"),
    organizerName: text(profileResult.data?.name, "CornShirt organizer"),
    organizerEmail: email,
  };
}

function summarize(sent: boolean): OrganizerNotificationSummary {
  return {
    recipients: 1,
    sent: sent ? 1 : 0,
    failed: sent ? 0 : 1,
  };
}

export async function notifyEventApproved(input: {
  eventId: string;
}): Promise<OrganizerNotificationSummary> {
  const context = await loadOrganizerEventContext(input.eventId);
  if (!context) return { recipients: 0, sent: 0, failed: 0 };

  const result = await sendTransactionalEmail({
    notificationKey: `event-approved:${input.eventId}`,
    notificationType: "event_approved",
    operationId: null,
    to: context.organizerEmail,
    subject: `Event approved — ${context.eventName}`,
    eyebrow: "Event approved",
    title: `${context.eventName} is now live!`,
    intro: `${context.organizerName}, your event submission has been approved and is now visible to all users on CornShirt Hub.`,
    details: [
      { label: "Event", value: context.eventName },
      { label: "Date", value: context.eventDate },
      { label: "Venue", value: context.venue },
      { label: "Category", value: context.category },
    ],
    note: "Ticket sales are open. You can track sales and ticket activity from your organizer dashboard.",
    actionLabel: "View your live event",
    actionUrl: `${appBaseUrl()}/events/${input.eventId}`,
  });

  return summarize(delivered(result));
}

export async function notifyEventRejected(input: {
  eventId: string;
  reason: string | null;
}): Promise<OrganizerNotificationSummary> {
  const context = await loadOrganizerEventContext(input.eventId);
  if (!context) return { recipients: 0, sent: 0, failed: 0 };

  const result = await sendTransactionalEmail({
    notificationKey: `event-rejected:${input.eventId}`,
    notificationType: "event_rejected",
    operationId: null,
    to: context.organizerEmail,
    subject: `Event submission rejected — ${context.eventName}`,
    eyebrow: "Event submission update",
    title: `${context.eventName} was not approved.`,
    intro: `${context.organizerName}, after review, your event submission was not approved for listing on CornShirt Hub.`,
    details: [
      { label: "Event", value: context.eventName },
      { label: "Date", value: context.eventDate },
      { label: "Venue", value: context.venue },
      { label: "Category", value: context.category },
      ...(input.reason
        ? [{ label: "Rejection reason", value: input.reason }]
        : []),
    ],
    note: "If you have questions about this decision, contact the CornShirt team.",
    actionLabel: "Open My Events",
    actionUrl: `${appBaseUrl()}/organizer/events`,
  });

  return summarize(delivered(result));
}

export async function notifyOrganizerEventCancelled(input: {
  eventId: string;
  reason: string | null;
}): Promise<OrganizerNotificationSummary> {
  const context = await loadOrganizerEventContext(input.eventId);
  if (!context) return { recipients: 0, sent: 0, failed: 0 };

  const result = await sendTransactionalEmail({
    notificationKey: `event-cancelled:organizer:${input.eventId}`,
    notificationType: "event_cancelled",
    operationId: null,
    to: context.organizerEmail,
    subject: `Event cancelled — ${context.eventName}`,
    eyebrow: "Important event update",
    title: `${context.eventName} has been cancelled.`,
    intro: `${context.organizerName}, your event has been cancelled by CornShirt administration. Ticket sales have stopped and all active tickets are now eligible for a refund.`,
    details: [
      { label: "Event", value: context.eventName },
      { label: "Date", value: context.eventDate },
      { label: "Venue", value: context.venue },
      ...(input.reason
        ? [{ label: "Cancellation reason", value: input.reason }]
        : []),
    ],
    note: "Refunds are processed through the original Stripe payment method once ticket holders claim them.",
    actionLabel: "Open My Events",
    actionUrl: `${appBaseUrl()}/organizer/events`,
  });

  return summarize(delivered(result));
}
