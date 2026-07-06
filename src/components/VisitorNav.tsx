import Image from "next/image";
import Link from "next/link";

interface VisitorNavProps {
  active?: "about";
  loginHref?: string;
}

export default function VisitorNav({
  active,
  loginHref = "/login",
}: VisitorNavProps) {
  return (
    <header className="app-topbar visitor-nav">
      <Link className="app-topbar-brand visitor-nav-brand" href="/visitor">
        <Image
          src="/CornShirt Hub.png"
          alt="CornShirt Hub"
          width={190}
          height={50}
          priority
        />
      </Link>

      <nav
        className="app-topbar-actions visitor-nav-actions"
        aria-label="Visitor navigation"
      >
        <Link
          className={`visitor-nav-link${active === "about" ? " active" : ""}`}
          href="/visitor/about"
          aria-current={active === "about" ? "page" : undefined}
        >
          About Us
        </Link>
        <Link
          className="button-outline visitor-nav-action"
          href="/visitor/apply"
        >
          Become an Organizer
        </Link>
        <Link className="button visitor-nav-action" href={loginHref}>
          Log In
        </Link>
      </nav>
    </header>
  );
}
