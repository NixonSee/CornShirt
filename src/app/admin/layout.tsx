import type { ReactNode } from "react";

import { requireRole } from "@/lib/requireRole";
import RoleNav from "@/components/RoleNav";
import Footer from "@/components/Footer";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"]);
  return (
    <div className="app-shell admin-shell">
      <RoleNav role="admin" />
      <main className="shell-main admin-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}
