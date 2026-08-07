import "server-only";

import type Stripe from "stripe";

import { getStripe } from "./stripe";

function email(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.includes("@") ? normalized : null;
}

export function checkoutCustomerEmail(
  session: Stripe.Checkout.Session,
): string | null {
  return email(session.customer_details?.email) ?? email(session.customer_email);
}

export async function resolveStripePaymentEmail(
  paymentIntentId: string,
): Promise<string | null> {
  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] },
    );
    const latestCharge = paymentIntent.latest_charge;
    const charge =
      latestCharge && typeof latestCharge !== "string" ? latestCharge : null;

    return (
      email(paymentIntent.receipt_email) ??
      email(charge?.billing_details.email) ??
      email(charge?.receipt_email)
    );
  } catch (error) {
    console.error("Stripe payer email lookup failed", {
      paymentIntentId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
