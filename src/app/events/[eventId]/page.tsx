import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EventDetailContent from "@/components/events/EventDetailContent";
import VisitorNav from "@/components/VisitorNav";
import { withEventReturnTo } from "@/lib/eventReturnTo";
import { getActiveEventById } from "@/lib/publicEvents";

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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getActiveEventById(eventId);

  if (!event) notFound();

  const returnPath = `/events/${event.id}`;
  const loginHref = withEventReturnTo("/login", returnPath);

  return (
    <>
      <VisitorNav loginHref={loginHref} />

      <EventDetailContent
        event={event}
        isCustomer={false}
        loginHref={loginHref}
        eventsHref="/visitor#events"
      />

      <footer className="site-footer">
        CornShirt / NFT concert tickets with DICKEN token checkout.
      </footer>
    </>
  );
}
