"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Expand, X } from "lucide-react";

interface EventBannerProps {
  src: string;
  alt: string;
  className?: string;
}

export function EventBanner({ src, alt, className = "" }: EventBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsExpanded(false);
    }

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  return (
    <>
      <button
        type="button"
        className={`event-banner ${className}`}
        onClick={() => setIsExpanded(true)}
        aria-label={`Enlarge ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
        <span className="event-banner-expand-hint">
          <Expand aria-hidden="true" size={16} />
          Click to enlarge
        </span>
      </button>

      {isExpanded &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="event-banner-lightbox"
            onClick={() => setIsExpanded(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} (expanded)`}
          >
            <button
              type="button"
              className="event-banner-lightbox-close"
              aria-label="Close enlarged image"
              onClick={() => setIsExpanded(false)}
            >
              <X aria-hidden="true" size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body,
        )}
    </>
  );
}
