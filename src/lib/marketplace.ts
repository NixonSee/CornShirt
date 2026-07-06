import "server-only";

import type { MarketplaceListing } from "@/app/customer/marketplace/marketplaceData";
import { canListTicket } from "@/app/customer/marketplace/marketplaceData";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Row = Record<string, unknown>;
export interface MarketplaceResult {
  status: number;
  body: { message?: string; error?: string };
}

function text(row: Row, key: string, fallback = ""): string {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function getManagedWallet(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", userId)
    .maybeSingle();
  return { wallet: data?.wallet_address ?? null, error };
}

export async function createResaleListing(
  userId: string,
  ticketId: string,
  price: number,
): Promise<MarketplaceResult> {
  const walletResult = await getManagedWallet(userId);
  if (walletResult.error || !walletResult.wallet) {
    return { status: 409, body: { error: "Your managed wallet is unavailable." } };
  }

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select("*")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (ticketError || !ticket) {
    return { status: 404, body: { error: "Ticket is unavailable." } };
  }
  if (
    String(ticket.wallet_address ?? "").toLowerCase() !==
    walletResult.wallet.toLowerCase()
  ) {
    return { status: 403, body: { error: "Ticket is unavailable." } };
  }

  const [{ data: ticketType }, { data: event }, { data: activeListing }] =
    await Promise.all([
      supabaseAdmin
        .from("ticket_types")
        .select("transfer_allowed")
        .eq("ticket_type_id", ticket.ticket_type_id)
        .maybeSingle(),
      supabaseAdmin
        .from("events")
        .select("status")
        .eq("event_id", ticket.event_id)
        .maybeSingle(),
      supabaseAdmin
        .from("resale_listings")
        .select("listing_id")
        .eq("ticket_id", ticketId)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  if (event?.status !== "active") {
    return { status: 409, body: { error: "This event is not eligible for resale." } };
  }
  if (ticketType?.transfer_allowed !== true) {
    return { status: 409, body: { error: "This ticket type does not allow resale." } };
  }
  if (
    !canListTicket({
      status: String(ticket.status ?? ""),
      transferAllowed: true,
      hasActiveListing: Boolean(activeListing),
    })
  ) {
    return {
      status: 409,
      body: {
        error: activeListing
          ? "This ticket is already listed."
          : "This ticket is not eligible for resale.",
      },
    };
  }

  const { error } = await supabaseAdmin.from("resale_listings").insert({
    ticket_id: ticketId,
    seller_wallet_address: walletResult.wallet,
    price,
    status: "active",
  });
  if (error?.code === "23505") {
    return { status: 409, body: { error: "This ticket is already listed." } };
  }
  if (error) {
    return { status: 500, body: { error: "Listing could not be created." } };
  }
  return { status: 201, body: { message: "Ticket listed for resale." } };
}

export async function cancelResaleListing(
  userId: string,
  listingId: string,
): Promise<MarketplaceResult> {
  const walletResult = await getManagedWallet(userId);
  if (walletResult.error || !walletResult.wallet) {
    return { status: 409, body: { error: "Your managed wallet is unavailable." } };
  }
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("resale_listings")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("listing_id", listingId)
    .eq("seller_wallet_address", walletResult.wallet)
    .eq("status", "active")
    .select("listing_id")
    .maybeSingle();
  if (error) {
    return { status: 500, body: { error: "Listing could not be cancelled." } };
  }
  if (!data) {
    return { status: 409, body: { error: "This listing is no longer available." } };
  }
  return { status: 200, body: { message: "Listing cancelled." } };
}

export async function getMarketplacePageData(userId: string): Promise<{
  listings: MarketplaceListing[];
  wallet: string | null;
  error: string;
}> {
  const walletResult = await getManagedWallet(userId);
  if (walletResult.error) return { listings: [], wallet: null, error: "Marketplace could not be loaded." };

  const { data: listingData, error } = await supabaseAdmin
    .from("resale_listings")
    .select("listing_id, ticket_id, seller_wallet_address, price, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return { listings: [], wallet: walletResult.wallet, error: "Marketplace could not be loaded." };

  const listingRows = (listingData ?? []) as Row[];
  const ticketIds = listingRows.map((row) => text(row, "ticket_id")).filter(Boolean);
  if (!ticketIds.length) return { listings: [], wallet: walletResult.wallet, error: "" };

  const { data: ticketData } = await supabaseAdmin.from("tickets").select("*").in("ticket_id", ticketIds);
  const tickets = (ticketData ?? []) as Row[];
  const eventIds = [...new Set(tickets.map((row) => text(row, "event_id")).filter(Boolean))];
  const typeIds = [...new Set(tickets.map((row) => text(row, "ticket_type_id")).filter(Boolean))];
  const [{ data: eventData }, { data: typeData }] = await Promise.all([
    supabaseAdmin.from("events").select("*").in("event_id", eventIds).eq("status", "active"),
    supabaseAdmin.from("ticket_types").select("*").in("ticket_type_id", typeIds),
  ]);
  const ticketMap = new Map(tickets.map((row) => [text(row, "ticket_id"), row]));
  const eventMap = new Map(((eventData ?? []) as Row[]).map((row) => [text(row, "event_id"), row]));
  const typeMap = new Map(((typeData ?? []) as Row[]).map((row) => [text(row, "ticket_type_id"), row]));

  const listings = listingRows.flatMap((listing): MarketplaceListing[] => {
    const ticket = ticketMap.get(text(listing, "ticket_id"));
    if (!ticket || !["active", "valid"].includes(text(ticket, "status").toLowerCase())) return [];
    const event = eventMap.get(text(ticket, "event_id"));
    const ticketType = typeMap.get(text(ticket, "ticket_type_id"));
    if (!event || !ticketType || ticketType.transfer_allowed !== true) return [];
    const sellerWallet = text(listing, "seller_wallet_address");
    const date = new Date(text(event, "event_date"));
    return [{
      id: text(listing, "listing_id"), ticketId: text(listing, "ticket_id"),
      eventName: text(event, "event_name", "Concert Ticket"), artist: text(event, "artist_name", "Artist TBC"),
      venue: text(event, "venue", "Venue TBC"), eventDate: Number.isNaN(date.getTime()) ? "Date TBC" : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(date),
      ticketType: text(ticketType, "type_name", text(ticketType, "name", "Admission")), image: text(event, "banner_image", "/Background Image.png"),
      sellerWallet, price: Number(listing.price ?? 0), isMine: Boolean(walletResult.wallet && sellerWallet.toLowerCase() === walletResult.wallet.toLowerCase()),
    }];
  });
  return { listings, wallet: walletResult.wallet, error: "" };
}
