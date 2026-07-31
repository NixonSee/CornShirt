import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  QrCode,
  Ticket,
  Receipt,
  ClipboardCheck,
  Users,
  ListChecks,
  Contact,
  Inbox,
  Info,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * The three authenticated dashboard roles. The `profiles.role` column also
 * uses the legacy value "user"; treat that as "customer" when resolving nav.
 */
export type Role = "admin" | "organizer" | "customer";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface RoleNavConfig {
  /** Short label shown in the role badge. */
  badge: string;
  items: NavItem[];
}

/**
 * Single source of truth for role-based navigation. Each role gets its own set
 * of function pages (see docs/API_AND_ROUTES.md). The hamburger drawer renders
 * whichever list matches the logged-in role, so "each role has different pages"
 * is data here, not duplicated components.
 */
export const NAV_BY_ROLE: Record<Role, RoleNavConfig> = {
  organizer: {
    badge: "Organizer",
    items: [
      { href: "/organizer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/organizer/create-event", label: "Create Event", icon: PlusCircle },
      { href: "/organizer/events", label: "My Events", icon: CalendarDays },
      { href: "/organizer/verify-ticket", label: "Verify Ticket", icon: QrCode },
      { href: "/organizer/profile", label: "Profile", icon: UserRound },
    ],
  },
  admin: {
    badge: "Admin",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/pending-events", label: "Pending Events", icon: ClipboardCheck },
      { href: "/admin/organizers", label: "Organizers", icon: Users },
      { href: "/admin/users", label: "Users", icon: Contact },
      { href: "/admin/partner-applications", label: "Applications", icon: Inbox },
      { href: "/admin/events", label: "All Events", icon: ListChecks },
      { href: "/admin/profile", label: "Profile", icon: UserRound },
    ],
  },
  customer: {
    badge: "Customer",
    items: [
      { href: "/customer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/customer/tickets", label: "My Tickets", icon: Ticket },
      { href: "/customer/marketplace", label: "Marketplace", icon: Store },
      { href: "/customer/transactions", label: "Transactions", icon: Receipt },
      { href: "/customer/profile", label: "Profile", icon: UserRound },
    ],
  },
};

/**
 * The public surface plus the three dashboard roles. Deliberately a separate
 * type from `Role`: `Role` feeds authorization (normalizeRole, requireRole),
 * and "visitor" must never be able to leak into those code paths.
 */
export type NavAudience = Role | "visitor";

/**
 * Public navigation. These hrefs are not referenced by the route-scoping
 * selectors in globals.css (those only key off /admin/*, /customer/tickets and
 * /organizer/verify-ticket), so they are safe to edit.
 */
export const VISITOR_NAV: RoleNavConfig = {
  badge: "Visitor",
  items: [
    { href: "/visitor", label: "Events", icon: CalendarDays },
    { href: "/visitor/about", label: "About Us", icon: Info },
    { href: "/visitor/apply", label: "Become an Organizer", icon: Store },
  ],
};

/**
 * Superset consumed by SiteNav. NAV_BY_ROLE keeps its Record<Role, ...> type so
 * adding a fourth role still fails the build until its links are defined.
 */
export const NAV_BY_AUDIENCE: Record<NavAudience, RoleNavConfig> = {
  ...NAV_BY_ROLE,
  visitor: VISITOR_NAV,
};

/**
 * Normalize the raw `profiles.role` value (which may be "user") into a Role.
 * Returns null for unknown roles so callers can treat it as unauthorized.
 */
export function normalizeRole(role: string | null | undefined): Role | null {
  switch (role) {
    case "admin":
      return "admin";
    case "organizer":
      return "organizer";
    case "customer":
    case "user":
      return "customer";
    default:
      return null;
  }
}
