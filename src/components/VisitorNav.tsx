import SiteNav from "./nav/SiteNav";

interface VisitorNavProps {
  active?: "about";
  loginHref?: string;
}

/**
 * Public navigation. Thin adapter over the shared {@link SiteNav} so the
 * visitor and public event pages keep their existing call shape; the links
 * themselves come from `VISITOR_NAV` in navConfig.ts.
 */
export default function VisitorNav({
  active,
  loginHref = "/login",
}: VisitorNavProps) {
  return <SiteNav role={null} active={active} loginHref={loginHref} />;
}
