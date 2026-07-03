import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/requireRole";
import { Card } from "@/components/common/Card";
import {
  EventForm,
  type EventFormInitialValues,
} from "@/components/organizer/EventForm";

// Normalise a stored timestamp to the "YYYY-MM-DDTHH:mm" shape a
// datetime-local input expects, preserving the wall-clock time as entered.
function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

interface LayoutPricing {
  price: number;
  capacity: number;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { user } = await requireRole(["organizer"]);
  const { eventId } = await params;

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("event_id", eventId)
    .eq("organizer_id", user.id)
    .single();

  if (error || !event) {
    notFound();
  }

  // Only pending events may be edited. Approved (active), rejected, and
  // cancelled events are locked.
  if (event.status !== "pending") {
    return (
      <>
        <div className="top-row">
          <div>
            <h1>Edit Event</h1>
            <p className="muted dashboard-subtitle">
              {event.event_name}
            </p>
          </div>
          <Link
            className="button-secondary"
            href={`/organizer/events/${eventId}`}
          >
            <ArrowLeft size={16} />
            Back to event
          </Link>
        </div>

        <Card variant="panel" title="This event can't be edited">
          <p className="muted dashboard-panel-text">
            <Lock
              size={15}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            Only <strong>pending</strong> events can be edited. This event is{" "}
            <strong>{(event.status ?? "unknown").toUpperCase()}</strong> —
            approved, rejected, and cancelled events are locked.
          </p>
        </Card>
      </>
    );
  }

  const layoutPricing =
    (event.layout?.pricing as Record<string, LayoutPricing> | undefined) ?? {};
  const pricing: Record<string, string> = Object.fromEntries(
    Object.entries(layoutPricing).map(([zoneId, entry]) => [
      zoneId,
      String(entry?.price ?? ""),
    ]),
  );

  const initialValues: EventFormInitialValues = {
    eventName: event.event_name ?? "",
    artistName: event.artist_name ?? "",
    venueId: event.venue_id ?? "",
    eventDate: toDatetimeLocal(event.event_date),
    category: event.category ?? "",
    description: event.description ?? "",
    bannerUrl: event.banner_image ?? null,
    pricing,
  };

  return (
    <EventForm mode="edit" eventId={eventId} initialValues={initialValues} />
  );
}
