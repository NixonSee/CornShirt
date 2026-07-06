import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import TicketList from "./TicketList";
import {
  mapCustomerTickets,
  recordString,
  type CustomerTicket,
  type DatabaseRecord,
} from "./ticketData";

export const dynamic = "force-dynamic";

export default async function CustomerTicketsPage() {
  const { user } = await requireRole(["customer", "user"]);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", user.id)
    .single();
  const walletAddress = profile?.wallet_address ?? null;

  let tickets: CustomerTicket[] = [];
  let errorMessage = "";

  if (profileError) {
    errorMessage = "Your managed wallet could not be loaded.";
  } else if (!walletAddress) {
    errorMessage = "Your managed wallet has not been assigned yet.";
  } else {
    const { data: ticketData, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("*")
      .eq("wallet_address", walletAddress);

    if (ticketError) {
      errorMessage = "Your tickets could not be loaded right now.";
    } else {
      const ticketRows = (ticketData ?? []) as DatabaseRecord[];
      const eventIds = [
        ...new Set(
          ticketRows
            .map((ticket) => recordString(ticket, "event_id"))
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const ticketTypeIds = [
        ...new Set(
          ticketRows
            .map((ticket) => recordString(ticket, "ticket_type_id"))
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const ticketIds = ticketRows
        .map((ticket) => recordString(ticket, "ticket_id"))
        .filter((id): id is string => Boolean(id));
      const [eventsResult, ticketTypesResult, listingsResult] = await Promise.all([
        eventIds.length
          ? supabaseAdmin.from("events").select("*").in("event_id", eventIds)
          : Promise.resolve({ data: [], error: null }),
        ticketTypeIds.length
          ? supabaseAdmin
              .from("ticket_types")
              .select("*")
              .in("ticket_type_id", ticketTypeIds)
          : Promise.resolve({ data: [], error: null }),
        ticketIds.length
          ? supabaseAdmin
              .from("resale_listings")
              .select("ticket_id")
              .in("ticket_id", ticketIds)
              .eq("status", "active")
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (eventsResult.error || ticketTypesResult.error || listingsResult.error) {
        errorMessage = "Ticket event details could not be loaded right now.";
      } else {
        tickets = mapCustomerTickets(
          ticketRows,
          (eventsResult.data ?? []) as DatabaseRecord[],
          (ticketTypesResult.data ?? []) as DatabaseRecord[],
          new Set(
            ((listingsResult.data ?? []) as DatabaseRecord[])
              .map((listing) => recordString(listing, "ticket_id"))
              .filter((id): id is string => Boolean(id)),
          ),
        );
      }
    }
  }

  return (
    <div className="app-shell">
      <title>My Tickets - CornShirt</title>
      <meta
        name="description"
        content="View your CornShirt NFT-backed concert tickets and QR codes."
      />

      <RoleNav role="customer" />

      <main className="shell-main my-tickets-page">
        <header className="ticket-page-heading">
          <div>
            <p className="section-kicker">Your collection</p>
            <h1>My Tickets</h1>
          </div>
          <span className="ticket-count">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </header>

        <TicketList tickets={tickets} errorMessage={errorMessage} />
      </main>

      <Footer />
    </div>
  );
}
