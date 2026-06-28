"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  MapPin,
  Ticket,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { categories, events, filterEvents } from "@/app/visitor/data";
import { Button, Modal, SearchBar } from "@/components/common";
import { supabase } from "@/lib/supabaseClient";

interface CustomerProfile {
  name: string | null;
  wallet_address: string | null;
  role: string | null;
}

type CustomerModal = "tickets" | "topup" | null;

function shortenWallet(walletAddress: string | null | undefined) {
  if (!walletAddress) return "Wallet pending";
  if (walletAddress.length <= 14) return walletAddress;
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export default function CustomerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeModal, setActiveModal] = useState<CustomerModal>(null);
  const activeEvent = events[activeIndex];
  const visibleEvents = useMemo(
    () => filterEvents(events, query, activeCategory),
    [activeCategory, query],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCustomer() {
      let shouldFinishLoading = true;

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          shouldFinishLoading = false;
          router.replace("/login");
          return;
        }

        const { data: customerProfile, error: profileError } = await supabase
          .from("profiles")
          .select("name,wallet_address,role")
          .eq("user_id", data.user.id)
          .single();

        if (profileError || !customerProfile) {
          if (isMounted) {
            setErrorMessage("Your customer profile could not be loaded.");
          }
          return;
        }

        if (customerProfile.role === "admin") {
          shouldFinishLoading = false;
          router.replace("/admin");
          return;
        }

        if (customerProfile.role === "organizer") {
          shouldFinishLoading = false;
          router.replace("/organizer");
          return;
        }

        if (!["customer", "user"].includes(customerProfile.role ?? "")) {
          if (isMounted) {
            setErrorMessage("This account does not have customer access.");
          }
          return;
        }

        if (isMounted) setProfile(customerProfile);
      } catch {
        if (isMounted) {
          setErrorMessage("Something went wrong while loading your account.");
        }
      } finally {
        if (isMounted && shouldFinishLoading) setIsLoading(false);
      }
    }

    void loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (isPaused || events.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  function changeSlide(direction: number) {
    setActiveIndex(
      (current) => (current + direction + events.length) % events.length,
    );
  }

  async function handleLogout() {
    setErrorMessage("");
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage("We could not log you out. Please try again.");
      setIsLoggingOut(false);
      return;
    }

    router.replace("/visitor");
  }

  if (isLoading) {
    return (
      <main className="state-page">
        <section className="state-card" aria-live="polite">
          <p className="muted">Loading your customer marketplace...</p>
        </section>
      </main>
    );
  }

  if (errorMessage && !profile) {
    return (
      <main className="state-page">
        <section className="state-card">
          <h1>Account unavailable</h1>
          <p className="muted">{errorMessage}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <title>Customer Marketplace - CornShirt</title>
      <meta
        name="description"
        content="Browse active CornShirt events and access your customer ticket tools."
      />

      <header className="site-header customer-header">
        <Link className="auth-logo" href="/customer">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt logo"
            width={190}
            height={50}
            priority
          />
        </Link>

        <nav
          className="site-nav customer-site-nav"
          aria-label="Customer navigation"
        >
          <div className="customer-identity">
            <span className="customer-name">
              {profile?.name ?? "Customer"}
            </span>
            <span className="customer-wallet" title={profile?.wallet_address ?? undefined}>
              <WalletCards aria-hidden="true" size={16} />
              {shortenWallet(profile?.wallet_address)}
            </span>
          </div>

          <Link className="button-secondary" href="#my-tickets">
            My Tickets
          </Link>
          <Button icon={<Coins size={17} />} onClick={() => setActiveModal("topup")}>
            Top Up
          </Button>
          <Button
            variant="outline"
            loading={isLoggingOut}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </nav>
      </header>

      {errorMessage ? (
        <p className="customer-account-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <main>
        <section
          className="home-hero hero-carousel"
          aria-label="Featured events"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPaused(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") changeSlide(-1);
            if (event.key === "ArrowRight") changeSlide(1);
          }}
          tabIndex={0}
        >
          {events.map((event, index) => (
            <div
              className={`hero-slide hero-slide-${event.accent}${index === activeIndex ? " active" : ""}`}
              style={{ backgroundImage: `url("${event.image}")` }}
              aria-hidden={index !== activeIndex}
              key={event.id}
            />
          ))}

          <div className="home-hero-inner" aria-live="polite">
            <div className="home-hero-copy" key={activeEvent.id}>
              <h1>{activeEvent.title}</h1>
              <div className="button-row">
                <Link className="button" href={`/events/${activeEvent.id}`}>
                  Details
                </Link>
              </div>
            </div>
          </div>

          <button
            className="carousel-arrow carousel-arrow-left"
            type="button"
            aria-label="Show previous featured event"
            onClick={() => changeSlide(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            type="button"
            aria-label="Show next featured event"
            onClick={() => changeSlide(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>

          <div className="carousel-dots" aria-label="Choose featured event">
            {events.map((event, index) => (
              <button
                className={`carousel-dot${index === activeIndex ? " active" : ""}`}
                type="button"
                aria-label={`Show ${event.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                key={event.id}
              />
            ))}
          </div>
        </section>

        <section id="events" className="events-section">
          <div className="events-toolbar">
            <h2>Live events</h2>

            <div className="event-controls">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search artists, cities..."
                inputId="customerEventSearch"
                ariaLabel="Search events"
                fluid
              />

              <label className="filter-box">
                <span>Filter</span>
                <select
                  aria-label="Filter events"
                  value={activeCategory}
                  onChange={(event) => setActiveCategory(event.target.value)}
                >
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {visibleEvents.length > 0 ? (
            <div className="event-grid" id="customerEventGrid">
              {visibleEvents.map((event) => (
                <article className="event-card" key={event.id}>
                  <Link
                    className="event-card-link"
                    href={`/events/${event.id}`}
                    aria-label={`View details for ${event.title}`}
                  >
                    <div
                      className={`event-media event-media-${event.accent}`}
                      style={{ backgroundImage: `url("${event.image}")` }}
                    >
                      <span
                        className={`status ${event.status === "SELLING FAST" ? "warn" : "good"}`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </Link>

                  <div className="event-body">
                    <h3>
                      <Link href={`/events/${event.id}`}>{event.title}</Link>
                    </h3>
                    <p className="event-place">
                      <MapPin aria-hidden="true" size={18} />
                      {event.city}
                    </p>
                    <p className="event-date">
                      <CalendarDays aria-hidden="true" size={18} />
                      {event.date}
                    </p>

                    <Link
                      className="button full event-buy-button"
                      href={`/events/${event.id}`}
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state visible" role="status">
              <p>No events found</p>
              <span>Try a different search or category.</span>
            </div>
          )}
        </section>

        <section id="my-tickets" className="customer-tools-section">
          <div className="customer-tools-heading">
            <div>
              <p className="section-kicker">Customer tools</p>
              <h2>My Tickets</h2>
            </div>
            <Ticket aria-hidden="true" size={34} />
          </div>

          <div className="customer-ticket-state">
            <Ticket aria-hidden="true" size={42} />
            <h3>Your ticket collection will appear here</h3>
            <p>
              Ticket services are not connected yet. No ticket ownership or NFT
              information has been created for this preview.
            </p>
            <Button variant="secondary" onClick={() => setActiveModal("tickets")}>
              View service status
            </Button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        CornShirt / Customer marketplace and account tools.
      </footer>

      <Modal
        isOpen={activeModal === "topup"}
        onClose={() => setActiveModal(null)}
        title="DICKEN Top Up"
        actions={<Button onClick={() => setActiveModal(null)}>Got it</Button>}
      >
        DICKEN top-up is not connected yet. Stripe Test Mode and transaction
        recording must be implemented before funds can be added safely.
      </Modal>

      <Modal
        isOpen={activeModal === "tickets"}
        onClose={() => setActiveModal(null)}
        title="My Tickets"
        actions={<Button onClick={() => setActiveModal(null)}>Got it</Button>}
      >
        Ticket services are not connected yet. Purchased Ticket NFTs, QR codes,
        transfers, resale, and refunds will appear only after their backend is
        available.
      </Modal>
    </>
  );
}
