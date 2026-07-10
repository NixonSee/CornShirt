"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/common";

interface PurchaseButtonProps {
  eventId: string;
  isCustomer: boolean;
  loginHref: string;
  ticketTypeId: string;
  ticketTypeName: string;
}

export default function PurchaseButton({
  eventId,
  isCustomer,
  loginHref,
  ticketTypeId,
  ticketTypeName,
}: PurchaseButtonProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/customer/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketTypeId }),
      });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.url) {
        setError(data?.error ?? "Checkout could not be started.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Checkout could not be started. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isCustomer) {
    return (
      <Link className="button full" href={loginHref}>
        Buy ticket
      </Link>
    );
  }

  return (
    <div className="purchase-button-stack">
      <Button fullWidth loading={isLoading} onClick={startCheckout}>
        {isLoading ? "Opening Stripe..." : "Buy ticket"}
      </Button>
      {error ? (
        <p className="purchase-button-error" role="alert">
          {ticketTypeName}: {error}
        </p>
      ) : null}
    </div>
  );
}
