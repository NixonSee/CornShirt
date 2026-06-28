import type { ReactNode } from "react";

import { requireRole } from "@/lib/requireRole";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["customer", "user"]);
  return children;
}
