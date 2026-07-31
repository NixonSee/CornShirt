"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResaleStatus({
  operationId,
}: {
  operationId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState("checking");

  useEffect(() => {
    if (!operationId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      const response = await fetch(
        `/api/customer/resales/${encodeURIComponent(operationId!)}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        state?: string;
      };
      if (stopped) return;
      setState(response.ok && data.state ? data.state : "unavailable");
      if (data.state === "completed" || data.state === "refunded") {
        router.refresh();
      } else if (
        response.ok &&
        !["expired", "cancelled", "failed"].includes(String(data.state))
      ) {
        timer = setTimeout(check, 2000);
      }
    }
    void check();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [operationId, router]);

  if (!operationId) return null;
  if (state === "completed") {
    return (
      <section className="checkout-status checkout-status-good" role="status">
        <strong>Resale purchase completed.</strong>
        <span>The existing Ticket NFT is now in your managed wallet.</span>
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
  if (["unavailable", "expired", "cancelled", "failed"].includes(state)) {
    return (
      <section className="checkout-status checkout-status-error" role="alert">
        <strong>Resale purchase is unavailable.</strong>
        <span>No ticket ownership change was completed.</span>
      </section>
    );
  }
  return (
    <section className="checkout-status" role="status">
      <strong>Delivering your resale Ticket NFT…</strong>
      <span>Payment and blockchain ownership are being confirmed.</span>
    </section>
  );
}
