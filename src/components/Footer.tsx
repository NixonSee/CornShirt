"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAV_BY_ROLE,
  VISITOR_NAV,
  type NavAudience,
  type Role,
} from "@/components/navConfig";

function audienceFromPathname(pathname: string): NavAudience {
  const role = pathname.split("/").filter(Boolean)[0];

  if (role === "admin" || role === "organizer" || role === "customer") {
    return role as Role;
  }

  return "visitor";
}

export default function Footer() {
  const pathname = usePathname();
  const audience = audienceFromPathname(pathname);
  const showPublicNavigation =
    audience === "visitor" || audience === "customer";

  const navigation = showPublicNavigation
    ? VISITOR_NAV.items.map((item) =>
        item.label === "Events"
          ? {
              ...item,
              href:
                audience === "customer"
                  ? "/customer#events"
                  : "/visitor#events",
            }
          : item,
      )
    : NAV_BY_ROLE[audience].items;

  return (
    <footer className="shell-footer" data-audience={audience}>
      <div className="shell-footer-inner">
        <span className="shell-footer-copy">
          &copy; {new Date().getFullYear()} CornShirt Hub. All rights reserved.
        </span>

        <nav
          className="shell-footer-nav"
          aria-label={`${audience} footer navigation`}
        >
          {navigation.map((item) => (
            <Link
              className={
                item.label === "Become an Organizer"
                  ? "shell-footer-organizer-link"
                  : undefined
              }
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
