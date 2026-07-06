"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { EventDiscovery } from "@/components/visitor&customer";
import { supabase } from "@/lib/supabaseClient";

interface CustomerProfile {
  name: string | null;
  wallet_address: string | null;
  wallet_status: "pending" | "ready" | "failed" | null;
  role: string | null;
}

export default function CustomerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioningWallet, setIsProvisioningWallet] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function retryWalletSetup() {
    setIsProvisioningWallet(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/customer/wallet/provision", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        walletAddress?: string;
        walletStatus?: "ready";
        error?: string;
      };

      if (!response.ok || !body.walletAddress) {
        setErrorMessage(
          body.error ?? "Wallet setup could not be completed.",
        );
        return;
      }

      const walletAddress = body.walletAddress;
      setProfile((current) =>
        current
          ? {
              ...current,
              wallet_address: walletAddress,
              wallet_status: "ready",
            }
          : current,
      );
    } catch {
      setErrorMessage("Wallet setup could not be completed.");
    } finally {
      setIsProvisioningWallet(false);
    }
  }

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
          .select("name,wallet_address,wallet_status,role")
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

      {profile?.wallet_status !== "ready" ? (
        <section
          className="customer-wallet-setup state-card"
          aria-live="polite"
        >
          <h2>Finish wallet setup</h2>
          <p className="muted">
            Your customer account is ready, but its CornShirt-managed wallet
            still needs to be created before top-ups, purchases, or resale
            settlement.
          </p>
          <button
            className="button"
            type="button"
            disabled={isProvisioningWallet}
            onClick={retryWalletSetup}
          >
            {isProvisioningWallet
              ? "Creating wallet..."
              : "Retry wallet setup"}
          </button>
        </section>
      ) : null}

      {errorMessage ? (
        <p className="customer-account-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <main>
        <EventDiscovery detailBasePath="/customer/events" />
      </main>

      <Footer />
    </div>
  );
}
