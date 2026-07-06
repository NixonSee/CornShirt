"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Event } from "@/app/visitor/data";
import { Button } from "@/components/common";

interface HeroCarouselProps {
  events: readonly Event[];
  detailBasePath?: string;
}

export default function HeroCarousel({
  events,
  detailBasePath = "/events",
}: HeroCarouselProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeEvent = events[activeIndex];

  useEffect(() => {
    if (isPaused || events.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [events.length, isPaused]);

  if (!activeEvent) return null;

  function changeSlide(direction: number) {
    setActiveIndex(
      (current) => (current + direction + events.length) % events.length,
    );
  }

  return (
    <section
      className="home-hero hero-carousel"
      aria-label="Featured events"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") changeSlide(-1);
        if (event.key === "ArrowRight") changeSlide(1);
      }}
      tabIndex={0}
    >
      {events.map((event, index) => (
        <div
          className={`hero-slide hero-slide-${event.accent}${index === activeIndex ? " active" : ""}`}
          style={{ backgroundImage: `url("${event.image}")` }}
          aria-hidden={index !== activeIndex}
          key={event.id}
        />
      ))}

      <div className="home-hero-inner" aria-live="polite">
        <div className="home-hero-copy" key={activeEvent.id}>
          <h1>{activeEvent.title}</h1>
          <div className="button-row">
            <Button
              onClick={() =>
                router.push(`${detailBasePath}/${activeEvent.id}`)
              }
            >
              Details
            </Button>
          </div>
        </div>
      </div>

      <button
        className="carousel-arrow carousel-arrow-left"
        type="button"
        aria-label="Show previous featured event"
        onClick={() => changeSlide(-1)}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <button
        className="carousel-arrow carousel-arrow-right"
        type="button"
        aria-label="Show next featured event"
        onClick={() => changeSlide(1)}
      >
        <ChevronRight aria-hidden="true" />
      </button>

      <div className="carousel-dots" aria-label="Choose featured event">
        {events.map((event, index) => (
          <button
            className={`carousel-dot${index === activeIndex ? " active" : ""}`}
            type="button"
            aria-label={`Show ${event.title}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => setActiveIndex(index)}
            key={event.id}
          />
        ))}
      </div>
    </section>
  );
}
