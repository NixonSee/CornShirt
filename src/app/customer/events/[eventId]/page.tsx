import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EventDetailContent from "@/components/events/EventDetailContent";
import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { getActiveEventById } from "@/lib/publicEvents";
import { requireRole } from "@/lib/requireRole";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getActiveEventById(eventId);
  return event
    ? { title: `${event.title} | CornShirt`, description: event.description }
    : { title: "Event not found | CornShirt" };
}

export default async function CustomerEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireRole(["customer", "user"]);
  const { eventId } = await params;
  const event = await getActiveEventById(eventId);

  if (!event) notFound();

  return (
    <div className="app-shell">
      <RoleNav role="customer" />
      <EventDetailContent
        event={event}
        isCustomer
        loginHref={`/customer/events/${event.id}`}
        eventsHref="/customer#events"
      />
      <Footer />
    </div>
  );
}
