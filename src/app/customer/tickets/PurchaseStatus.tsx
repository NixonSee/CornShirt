"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PurchaseState = {
  state?: string;
  error?: string;
};

const PENDING_STATES = new Set([
  "pending",
  "checkout_created",
  "payment_confirmed",
  "asset_submitted",
  "asset_confirmed",
  "delivery_failed",
]);

export default function PurchaseStatus({
  operationId,
}: {
  operationId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!operationId) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      const response = await fetch(
        `/api/customer/purchases/${encodeURIComponent(operationId!)}`,
        { cache: "no-store" },
      );
      const body = (await response.json().catch(() => ({}))) as PurchaseState;
      if (cancelled) return;

      if (!response.ok || !body.state) {
        setError(body.error ?? "Purchase status could not be loaded.");
        return;
      }

      setState(body.state);
      if (body.state === "completed") {
        router.refresh();
        return;
      }
      if (PENDING_STATES.has(body.state)) {
        timeout = setTimeout(check, 2000);
      }
    }

    void check();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [operationId, router]);

  if (!operationId) return null;
  if (error) {
    return (
      <section className="checkout-status checkout-status-error" role="alert">
        <strong>Purchase status unavailable</strong>
        <span>{error}</span>
      </section>
    );
  }
  if (state === "completed") {
    return (
      <section className="checkout-status checkout-status-good" role="status">
        <strong>Your Ticket NFT is ready.</strong>
        <span>The confirmed ticket appears below.</span>
      </section>
    );
  }
  if (state === "refunded") {
    return (
      <section className="checkout-status checkout-status-error" role="status">
        <strong>Ticket delivery could not be completed.</strong>
        <span>Your Stripe test payment was refunded once.</span>
      </section>
    );
  }
  if (state === "expired" || state === "cancelled" || state === "failed") {
    return (
      <section className="checkout-status checkout-status-error" role="alert">
        <strong>Purchase was not completed.</strong>
        <span>No Ticket NFT was delivered.</span>
      </section>
    );
  }

  return (
    <section className="checkout-status" role="status">
      <strong>Confirming your purchase…</strong>
      <span>
        Stripe payment and Ticket NFT delivery are being verified. You can
        safely leave this page and return later.
      </span>
    </section>
  );
}
