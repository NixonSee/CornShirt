"use client";

import { Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Modal } from "@/components/common";
import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { EventDiscovery } from "@/components/visitor&customer";
import { supabase } from "@/lib/supabaseClient";

interface CustomerProfile {
  name: string | null;
  wallet_address: string | null;
  role: string | null;
}

type CustomerModal = "tickets" | "topup" | null;

export default function CustomerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeModal, setActiveModal] = useState<CustomerModal>(null);

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
    <div className="app-shell">
      <title>Customer Marketplace - CornShirt</title>
      <meta
        name="description"
        content="Browse active CornShirt events and access your customer ticket tools."
      />

      <RoleNav role="customer" /> {/* For stating that its customer role and show navbar */}

      {errorMessage ? (
        <p className="customer-account-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <main>
        <EventDiscovery />

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
            <Button
              variant="secondary"
              onClick={() => setActiveModal("tickets")}
            >
              View service status
            </Button>
          </div>
        </section>
      </main>

      <Footer />

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
    </div>
  );
}
