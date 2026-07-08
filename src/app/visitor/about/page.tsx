import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TicketCheck,
} from "lucide-react";

import Footer from "@/components/Footer";
import VisitorNav from "@/components/VisitorNav";

export const metadata: Metadata = {
  title: "About Us | CornShirt",
  description:
    "Meet the CornShirt team and learn how we make live-event ticketing more transparent, secure, and accessible.",
};

const promises = [
  {
    icon: BadgeCheck,
    title: "Verified ownership",
    copy: "Every ticket carries a clear digital record, helping fans know what they own.",
  },
  {
    icon: RefreshCcw,
    title: "Transparent transfers",
    copy: "Ticket movement stays traceable, reducing uncertainty across the event journey.",
  },
  {
    icon: CreditCard,
    title: "Secure MYR checkout",
    copy: "Stripe Test Mode connects ticket selection and payment in Malaysian Ringgit without exposing payment secrets.",
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Trust by design",
    copy: "Security and clarity are foundations, not optional extras.",
  },
  {
    icon: TicketCheck,
    title: "Access made simple",
    copy: "The technology works behind the scenes so ticketing feels natural.",
  },
  {
    icon: RadioTower,
    title: "Built for live culture",
    copy: "Every decision starts with the people who make events worth attending.",
  },
];

export default function AboutPage() {
  return (
    <>
      <VisitorNav active="about" />

      <main className="about-page">
        <section className="about-hero">
          <div className="about-shell about-hero-grid">
            <div className="about-hero-copy">
              <span className="about-eyebrow">
                <Sparkles size={15} aria-hidden="true" /> Built for the live
                moment
              </span>
              <h1>
                Tickets people can <span>actually trust.</span>
              </h1>
              <p>
                CornShirt turns blockchain-powered ownership into a clear,
                confident ticketing experience for fans and organizers.
              </p>
              <div className="about-hero-actions">
                <Link className="button" href="/visitor#events">
                  Browse events <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link className="button-outline" href="/visitor/apply">
                  Become an Organizer
                </Link>
              </div>
            </div>

            <div className="about-ticket-visual" aria-hidden="true">
              <div className="about-ticket-card about-ticket-card-back" />
              <div className="about-ticket-card about-ticket-card-front">
                <span>CORNSHIRT VERIFIED</span>
                <strong>LIVE / OWNED / YOURS</strong>
                <i>01</i>
              </div>
            </div>
          </div>
        </section>

        <section
          className="about-promise-strip"
          aria-label="CornShirt product promises"
        >
          <div className="about-shell about-promise-grid">
            {promises.map(({ icon: Icon, title, copy }) => (
              <article className="about-promise" key={title}>
                <Icon size={22} aria-hidden="true" />
                <div>
                  <h2>{title}</h2>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-shell about-mission-grid">
          <div>
            <p className="about-section-label">Our mission</p>
            <h2>Make every entry feel certain.</h2>
          </div>
          <div>
            <p>
              Live events should begin with anticipation, not doubt. CornShirt
              makes ticket ownership verifiable while keeping the customer
              journey simple.
            </p>
            <p>
              We give organizers clearer control and fans a more confident path
              from discovery to the door.
            </p>
          </div>
        </section>

        <section className="about-section about-shell">
          <div className="about-section-heading">
            <p className="about-section-label">What guides us</p>
            <h2>Built around the people in the crowd.</h2>
          </div>
          <div className="about-values-grid">
            {values.map(({ icon: Icon, title, copy }, index) => (
              <article className="about-value-card" key={title}>
                <span>0{index + 1}</span>
                <Icon size={24} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section about-shell">
          <div className="about-section-heading">
            <p className="about-section-label">The builders</p>
            <h2>Meet the team</h2>
            <p>
              Three collaborators building a more trustworthy live-event
              experience.
            </p>
          </div>

          <div className="about-team-grid">
            <article className="about-team-card about-team-card-lead">
              <div className="about-team-media">
                <Image
                  src="/Nixon pic.jpeg"
                  alt="Nixon See"
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
              </div>
              <div className="about-team-copy">
                <span>Team Leader</span>
                <h3>Nixon See</h3>
                <p>
                  Guides the product vision and brings the platform&apos;s
                  technical and event experience together.
                </p>
              </div>
            </article>

            <article className="about-team-card">
              <div className="about-team-media">
                <video
                  src="/Max.mp4"
                  aria-label="Max"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              <div className="about-team-copy">
                <span>Team Member</span>
                <h3>Max</h3>
                <p>
                  Shapes reliable product flows that make complex ticketing
                  interactions feel straightforward.
                </p>
              </div>
            </article>

            <article className="about-team-card">
              <div className="about-team-media">
                <video
                  src="/Js.mp4"
                  aria-label="Jeng Siang"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              <div className="about-team-copy">
                <span>Team Member</span>
                <h3>Jeng Siang</h3>
                <p>
                  Builds the connected experiences that help fans and organizers
                  move confidently through CornShirt.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="about-cta">
          <div className="about-shell about-cta-inner">
            <div>
              <p className="about-section-label">The next event starts here</p>
              <h2>Find your place in the crowd.</h2>
            </div>
            <div className="about-hero-actions">
              <Link className="button" href="/visitor#events">
                Explore events <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button-outline" href="/visitor/apply">
                Partner with us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
