import type { ReactNode } from "react";

import { requireRole } from "@/lib/requireRole";

export default async function OrganizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["organizer"]);
  return children;
}
