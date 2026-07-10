import { NextResponse } from "next/server";

import {
  createTicketCheckoutSession,
  parseTicketCheckoutBody,
} from "@/lib/stripe/checkout";
import { authorizeApiRole } from "@/lib/requireRole";

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;

  const body = parseTicketCheckoutBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { error: "Enter a valid event and ticket type." },
      { status: 400 },
    );
  }

  const result = await createTicketCheckoutSession({
    eventId: body.eventId,
    ticketTypeId: body.ticketTypeId,
    userId: auth.identity.user.id,
    origin: new URL(request.url).origin,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url });
}
