import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarCog,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  PlusCircle,
  Ticket,
} from "lucide-react";
import type { Role } from "@/context/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItemsByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Event Approval", href: "/admin/approvals", icon: ClipboardCheck },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ],
  organizer: [
    { label: "Dashboard", href: "/organizer", icon: LayoutDashboard },
    { label: "Event Creation", href: "/organizer/events/create", icon: PlusCircle },
    { label: "Event Management", href: "/organizer/events", icon: CalendarCog },
    { label: "Analytics", href: "/organizer/analytics", icon: BarChart3 },
  ],
  user: [
    { label: "Dashboard", href: "/user/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/user", icon: CalendarDays },
    { label: "My Tickets", href: "/user/tickets", icon: Ticket },
  ],
};
