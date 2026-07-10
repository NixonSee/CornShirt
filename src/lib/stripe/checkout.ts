import { supabaseAdmin } from "@/lib/supabaseAdmin";

import { getStripe } from "./stripe";

type CheckoutInput = {
  eventId: string;
  ticketTypeId: string;
  userId: string;
  origin: string;
};

type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

type TicketTypeRow = {
  ticket_type_id: string;
  event_id: string;
  type_name: string | null;
  price: number | string | null;
  remaining_supply: number | null;
  purchase_limit: number | null;
};

type EventRow = {
  event_id: string;
  event_name: string;
  status: string | null;
  banner_image: string | null;
};

type ProfileRow = {
  wallet_address: string | null;
};

function moneyToSen(value: number | string | null): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function createTicketCheckoutSession({
  eventId,
  ticketTypeId,
  userId,
  origin,
}: CheckoutInput): Promise<CheckoutResult> {
  const [{ data: ticketType, error: ticketError }, { data: profile }] =
    await Promise.all([
      supabaseAdmin
        .from("ticket_types")
        .select(
          "ticket_type_id, event_id, type_name, price, remaining_supply, purchase_limit",
        )
        .eq("ticket_type_id", ticketTypeId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("wallet_address")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (ticketError || !ticketType) {
    return { ok: false, status: 404, error: "Ticket type not found." };
  }

  const typedTicket = ticketType as TicketTypeRow;
  if (typedTicket.event_id !== eventId) {
    return { ok: false, status: 400, error: "Ticket type does not match event." };
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("event_id, event_name, status, banner_image")
    .eq("event_id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { ok: false, status: 404, error: "Event not found." };
  }

  const typedEvent = event as EventRow;
  if (String(typedEvent.status ?? "").toLowerCase() !== "active") {
    return { ok: false, status: 409, error: "This event is not active." };
  }

  if ((typedTicket.remaining_supply ?? 0) <= 0) {
    return { ok: false, status: 409, error: "This ticket type is sold out." };
  }

  const walletAddress = (profile as ProfileRow | null)?.wallet_address ?? null;
  if (!walletAddress) {
    return {
      ok: false,
      status: 409,
      error: "Your managed wallet is unavailable.",
    };
  }

  const ownedCount = await supabaseAdmin
    .from("tickets")
    .select("ticket_id", { count: "exact", head: true })
    .eq("wallet_address", walletAddress)
    .eq("ticket_type_id", ticketTypeId);

  const purchaseLimit = typedTicket.purchase_limit ?? 1;
  if ((ownedCount.count ?? 0) >= purchaseLimit) {
    return {
      ok: false,
      status: 409,
      error: "You have reached the purchase limit for this ticket type.",
    };
  }

  const unitAmount = moneyToSen(typedTicket.price);
  if (unitAmount <= 0) {
    return { ok: false, status: 409, error: "Ticket price is unavailable." };
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "myr",
          unit_amount: unitAmount,
          product_data: {
            name: `${typedEvent.event_name} - ${typedTicket.type_name ?? "Admission"}`,
            images: typedEvent.banner_image ? [typedEvent.banner_image] : undefined,
          },
        },
      },
    ],
    success_url: `${origin}/customer/tickets?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${eventId}?checkout=cancelled`,
    client_reference_id: `${userId}:${ticketTypeId}`,
    metadata: {
      kind: "primary_ticket",
      eventId,
      ticketTypeId,
      userId,
      walletAddress,
    },
  });

  if (!session.url) {
    return { ok: false, status: 502, error: "Stripe did not return a checkout URL." };
  }

  return { ok: true, url: session.url };
}

export function parseTicketCheckoutBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const eventId = text(record.eventId).trim();
  const ticketTypeId = text(record.ticketTypeId).trim();

  return eventId && ticketTypeId ? { eventId, ticketTypeId } : null;
}
