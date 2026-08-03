import Link from "next/link";

export default function Footer() {
  return (
    <footer className="shell-footer">
      <div className="shell-footer-inner">
        <span className="shell-footer-copy">
          © {new Date().getFullYear()} CornShirt Hub. All rights reserved.
        </span>

        <nav className="shell-footer-nav" aria-label="Footer navigation">
          <Link href="/visitor#events">Events</Link>
          <Link href="/visitor/about">About Us</Link>
          <Link href="/visitor/contact">Contact Us</Link>
          <Link className="shell-footer-organizer-link" href="/visitor/apply">
            Become an Organizer
          </Link>
        </nav>
      </div>
    </footer>
  );
}
