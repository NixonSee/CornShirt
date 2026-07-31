import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import { getStripe } from "./stripe";

type CheckoutInput = {
  eventId: string;
  ticketTypeId: string;
  userId: string;
  origin: string;
  idempotencyKey: string;
};

type CheckoutResult =
  | { ok: true; url: string; operationId: string }
  | { ok: false; status: number; error: string };

type ReservedPurchase = {
  operation_id: string;
  amount_sen: number;
  currency: string;
  event_name: string;
  ticket_type_name: string;
  wallet_address: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function checkoutError(message: string): CheckoutResult {
  const known: Record<string, { status: number; error: string }> = {
    wallet_unavailable: {
      status: 409,
      error: "Your managed wallet is unavailable.",
    },
    event_unavailable: {
      status: 409,
      error: "This event is not available for purchase.",
    },
    ticket_type_unavailable: {
      status: 404,
      error: "Ticket type not found.",
    },
    sold_out: { status: 409, error: "This ticket type is sold out." },
    purchase_limit: {
      status: 409,
      error: "You have reached the purchase limit for this ticket type.",
    },
  };

  const match = Object.entries(known).find(([key]) => message.includes(key));
  return match
    ? { ok: false, ...match[1] }
    : {
        ok: false,
        status: 500,
        error: "Checkout could not be reserved.",
      };
}

export async function createTicketCheckoutSession({
  eventId,
  ticketTypeId,
  userId,
  origin,
  idempotencyKey,
}: CheckoutInput): Promise<CheckoutResult> {
  const reservation = await supabaseAdmin
    .rpc("reserve_primary_ticket", {
      p_buyer_id: userId,
      p_event_id: eventId,
      p_ticket_type_id: ticketTypeId,
      p_idempotency_key: idempotencyKey,
    })
    .single();

  if (reservation.error || !reservation.data) {
    return checkoutError(reservation.error?.message ?? "");
  }

  const purchase = reservation.data as ReservedPurchase;
  const existing = await supabaseAdmin
    .from("ticket_operations")
    .select("stripe_checkout_session_id")
    .eq("operation_id", purchase.operation_id)
    .eq("actor_user_id", userId)
    .single();

  const existingSessionId = existing.data?.stripe_checkout_session_id as
    | string
    | null
    | undefined;

  if (existingSessionId) {
    const session = await getStripe().checkout.sessions.retrieve(
      existingSessionId,
    );
    if (session.url && session.status === "open") {
      return {
        ok: true,
        url: session.url,
        operationId: purchase.operation_id,
      };
    }
  }

  const currency = purchase.currency.toLowerCase();
  if (
    currency !== "myr" ||
    !Number.isSafeInteger(purchase.amount_sen) ||
    purchase.amount_sen <= 0
  ) {
    return {
      ok: false,
      status: 409,
      error: "Ticket price is not configured for MYR checkout.",
    };
  }

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: purchase.amount_sen,
            product_data: {
              name: `${purchase.event_name} - ${purchase.ticket_type_name}`,
            },
          },
        },
      ],
      success_url: `${origin}/customer/tickets?purchase=${purchase.operation_id}`,
      cancel_url: `${origin}/customer/events/${eventId}?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
      client_reference_id: userId,
      metadata: {
        kind: "primary_ticket",
        operationId: purchase.operation_id,
        userId,
      },
    },
    { idempotencyKey: `primary_checkout_${purchase.operation_id}` },
  );

  if (!session.url) {
    return {
      ok: false,
      status: 502,
      error: "Stripe did not return a checkout URL.",
    };
  }

  const attached = await supabaseAdmin
    .from("ticket_operations")
    .update({
      stripe_checkout_session_id: session.id,
      state: "checkout_created",
      updated_at: new Date().toISOString(),
    })
    .eq("operation_id", purchase.operation_id)
    .eq("actor_user_id", userId)
    .in("state", ["pending", "checkout_created"]);

  if (attached.error) {
    return {
      ok: false,
      status: 500,
      error: "Checkout was created but could not be recorded.",
    };
  }

  return {
    ok: true,
    url: session.url,
    operationId: purchase.operation_id,
  };
}

export function parseTicketCheckoutBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const eventId = text(record.eventId);
  const ticketTypeId = text(record.ticketTypeId);
  const idempotencyKey = text(record.idempotencyKey);

  return eventId && ticketTypeId && /^[a-zA-Z0-9_-]{16,120}$/.test(idempotencyKey)
    ? { eventId, ticketTypeId, idempotencyKey }
    : null;
}
