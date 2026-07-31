"use client";

import { useSyncExternalStore } from "react";

export interface ScrollDirectionState {
  /** True while scrolling down past the threshold, so the bar should hide. */
  hidden: boolean;
  /** True while the page is within `THRESHOLD` px of the top. */
  atTop: boolean;
}

/** Ignore sub-pixel and rubber-band jitter so the bar does not flicker. */
const JITTER = 6;

/** Above this offset the bar always stays put. */
const THRESHOLD = 80;

type NavScroll = "top" | "up" | "down";

// Window scroll is a single external source, and there is only ever one navbar
// mounted, so the subscription is a module-level singleton. Keeping the
// snapshot a primitive is what makes useSyncExternalStore safe here: returning
// a fresh object from getSnapshot would re-render forever.
let snapshot: NavScroll = "top";
let lastY = 0;
let frame = 0;
const listeners = new Set<() => void>();

function read() {
  frame = 0;
  const y = window.scrollY;
  const delta = y - lastY;

  if (Math.abs(delta) < JITTER) return;

  const next: NavScroll = y <= THRESHOLD ? "top" : delta > 0 ? "down" : "up";
  lastY = y;

  if (next !== snapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(read);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // Browsers restore scroll position before hydration, so seed from the
    // real offset rather than assuming the page starts at the top.
    lastY = window.scrollY;
    snapshot = lastY <= THRESHOLD ? "top" : "up";
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("scroll", onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }
  };
}

function getSnapshot(): NavScroll {
  return snapshot;
}

function getServerSnapshot(): NavScroll {
  return "top";
}

/**
 * Tracks scroll direction so the fixed navbar can hide on the way down and
 * come back on the way up. The listener is passive and rAF-throttled; this is
 * the only scroll listener in the app, so keep it cheap.
 *
 * Reduced motion is handled in CSS (the bar is pinned open there) rather than
 * here, which keeps this free of matchMedia and safe to render on the server.
 */
export function useScrollDirection(): ScrollDirectionState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { hidden: state === "down", atTop: state === "top" };
}
