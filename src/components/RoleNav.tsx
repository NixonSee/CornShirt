import SiteNav from "./nav/SiteNav";
import type { Role } from "./navConfig";

interface RoleNavProps {
  role: Role;
}

/**
 * Authenticated navigation. Thin adapter over the shared {@link SiteNav} so the
 * dashboard layouts and pages keep their existing `<RoleNav role="..." />` call
 * shape; all markup and behaviour live in SiteNav.
 */
export default function RoleNav({ role }: RoleNavProps) {
  return <SiteNav role={role} />;
}
