"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common";
import Footer from "@/components/Footer";

export default function AboutPage() {
  const router = useRouter();
  return (
    <>
      <title>About Us — CornShirt</title>
      <meta
        name="description"
        content="Learn about CornShirt Hub and the team behind the platform."
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
              color: "var(--primary)",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            About Us
          </Link>
          <Button variant="outline" onClick={() => router.push("/visitor/apply")}>
            Become an Organizer
          </Button>
          <Button onClick={() => router.push("/login")}>
            Log In
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section
        className=""
        style={{
          textAlign: "center",
          padding: "72px 24px",
          background:
            "linear-gradient(160deg, #1a1a1af0, #1f1f1f)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: 36,
              color: "var(--primary)",
              margin: "0 0 16px",
            }}
          >
            About CornShirt Hub
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--foreground)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Empowering live events through blockchain-powered NFT ticketing.
            CornShirt Hub connects organizers, artists, and audiences with
            secure, transparent, and immersive event experiences.
          </p>
        </div>
      </section>

      {/* Mission */}
      <div className="main" style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
        <div
          style={{
            marginTop: 48,
            padding: 32,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--card)",
          }}
        >
          <h2
            style={{
              fontSize: 22,
              color: "var(--primary)",
              margin: "0 0 16px",
            }}
          >
            Our Mission
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--foreground)",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>

        {/* Team */}
        <h2
          style={{
            fontSize: 22,
            color: "var(--primary)",
            textAlign: "center",
            marginTop: 56,
            marginBottom: 32,
          }}
        >
          The Developers Behind CornShirt Hub
        </h2>

        <div
          className="grid-3"
          style={{ gap: 20, marginBottom: 56 }}
        >
          <TeamCard
            name="Nixon See"
            role="Team Leader"
            roleVariant="good"
            intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt."
          >
            <Image
              src="/Nixon pic.jpeg"
              alt="Nixon See"
              width={120}
              height={120}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid var(--primary)",
              }}
            />
          </TeamCard>

          <TeamCard
            name="Max"
            role="Team Member"
            roleVariant="warn"
            intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt."
          >
            <video
              src="/Max.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid var(--primary)",
              }}
            />
          </TeamCard>

          <TeamCard
            name="Jeng Siang"
            role="Team Member"
            roleVariant="warn"
            intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt."
          >
            <video
              src="/Js.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid var(--primary)",
              }}
            />
          </TeamCard>
        </div>
      </div>

      <Footer />
    </>
  );
}

function TeamCard({
  name,
  role,
  roleVariant,
  intro,
  children,
}: {
  name: string;
  role: string;
  roleVariant: "good" | "warn";
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="team-card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 32,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--card)",
        textAlign: "center",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {children}

      <div>
        <strong
          style={{
            fontSize: 16,
            color: "var(--primary)",
            display: "block",
          }}
        >
          {name}
        </strong>
        <span className={`status ${roleVariant}`}>{role.toUpperCase()}</span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {intro}
      </p>
    </div>
  );
}
