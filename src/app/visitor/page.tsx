"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/common";
import Footer from "@/components/Footer";
import { EventDiscovery } from "@/components/visitor&customer";

export default function VisitorPage() {
  const router = useRouter();

  return (
    <>
      <title>CornShirt - NFT Concert Tickets with DICKEN</title>
      <meta
        name="description"
        content="Browse live concerts and buy NFT tickets with DICKEN tokens on CornShirt."
      />

      <header className="app-topbar">
        <Link className="app-topbar-brand" href="/visitor">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt logo"
            width={140}
            height={40}
            priority
          />
        </Link>

        <nav className="app-topbar-actions" aria-label="Main navigation">
          <Link
            href="/visitor/about"
            style={{
              color: "var(--muted-foreground)",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            About Us
          </Link>
          <Button variant="outline" onClick={() => router.push("/visitor/apply")}>
            Become an Organizer
          </Button>
          <Button onClick={() => router.push("/login")}>Log In</Button>
        </nav>
      </header>

      <main>
        <EventDiscovery />
      </main>

      <Footer />
    </>
  );
}
