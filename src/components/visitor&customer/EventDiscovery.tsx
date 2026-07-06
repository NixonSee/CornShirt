"use client";

import { useEffect, useState } from "react";

import type { Event } from "@/app/visitor/data";
import { Button } from "@/components/common";

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
    <>
      <HeroCarousel events={events} detailBasePath={detailBasePath} />
      <EventBrowser events={events} detailBasePath={detailBasePath} />
    </>
  );
}
