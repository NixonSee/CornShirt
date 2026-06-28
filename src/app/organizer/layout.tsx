import type { ReactNode } from "react";

import { requireRole } from "@/lib/requireRole";
import RoleNav from "@/components/RoleNav";
import Footer from "@/components/Footer";

export default async function OrganizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["organizer"]);
  return (
    <div className="app-shell">
      <RoleNav role="organizer" />
      <main className="shell-main">{children}</main>
      <Footer />
    </div>
  );
}
