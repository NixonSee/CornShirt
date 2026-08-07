"use client";

import { useEffect, useState } from "react";

import type { Event } from "@/app/visitor/data";
import { Button } from "@/components/common";
import { getEventEndTime } from "@/lib/eventLifecycle";

import EventBrowser from "./EventBrowser";
import HeroCarousel from "./HeroCarousel";

type PublicEventsResponse = {
  events?: Event[];
  error?: string;
};

interface EventDiscoveryProps {
  detailBasePath?: string;
}

export default function EventDiscovery({
  detailBasePath = "/events",
}: EventDiscoveryProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/public/events", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as PublicEventsResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load live events.");
        }

        setEvents(Array.isArray(payload.events) ? payload.events : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load live events.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadEvents();
    return () => controller.abort();
  }, [requestVersion]);

  useEffect(() => {
    const now = Date.now();
    const nextEnding = events
      .map((event) => getEventEndTime(event.dateTime)?.getTime() ?? 0)
      .filter((ending) => ending > now)
      .sort((left, right) => left - right)[0];

    if (!nextEnding) return;

    const maximumBrowserTimeout = 2_147_483_647;
    const timer = window.setTimeout(
      () => setRequestVersion((version) => version + 1),
      Math.min(nextEnding - now + 100, maximumBrowserTimeout),
    );

    return () => window.clearTimeout(timer);
  }, [events]);

  if (isLoading) {
    return (
      <section className="state-page" aria-live="polite">
        <div className="state-card">
          <p className="muted">Loading live events...</p>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="state-page" role="alert">
        <div className="state-card">
          <h2>Unable to load live events</h2>
          <p className="muted">{errorMessage}</p>
          <Button onClick={() => setRequestVersion((version) => version + 1)}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="event-discovery-surface">
      <HeroCarousel events={events} detailBasePath={detailBasePath} />
      <EventBrowser events={events} detailBasePath={detailBasePath} />
    </div>
  );
}
