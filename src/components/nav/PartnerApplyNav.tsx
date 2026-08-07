"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useScrollDirection } from "./useScrollDirection";

/**
 * The application keeps its focused "Back to events" action while sharing the
 * same fixed, scroll-direction-aware behaviour as the main site navigation.
 */
export default function PartnerApplyNav() {
  const { hidden, atTop } = useScrollDirection();
  const headerClass = [
    "app-topbar",
    "sitenav",
    "partner-apply-nav",
    hidden ? "is-hidden" : "",
    atTop ? "is-top" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={headerClass} data-audience="apply">
        <Link className="app-topbar-brand sitenav-brand" href="/visitor">
          <Image
            src="/CornShirt_Hub-removedbg.png"
            alt="CornShirt logo"
            width={140}
            height={44}
            priority
          />
        </Link>

        <nav
          className="app-topbar-actions sitenav-actions"
          aria-label="Application actions"
        >
          <Link className="partner-apply-back" href="/visitor">
            <ArrowLeft size={17} aria-hidden="true" />
            <span>Back to events</span>
          </Link>
        </nav>
      </header>
      <div className="sitenav-spacer partner-apply-nav-spacer" aria-hidden="true" />
    </>
  );
}
