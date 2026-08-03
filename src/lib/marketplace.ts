import "server-only";

import type { MarketplaceListing } from "@/app/customer/marketplace/marketplaceData";
import { canListTicket } from "@/app/customer/marketplace/marketplaceData";
import {
  getEventEndTime,
  getLiveEventCutoff,
  isEventLive,
} from "@/lib/eventLifecycle";
import { synchronizeFinishedEvents } from "@/lib/eventLifecycle.server";
import { fundCustomerGas } from "@/lib/nft/fundGas";
import {
  cancelContractListing,
  createContractListing,
} from "@/lib/nft/marketplaceContract";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadManagedWalletSigner } from "@/lib/walletAccess";
import { hasMarketplaceContract } from "@/utils/web3config";

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
  await synchronizeFinishedEvents();

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
  if (ticket.record_source !== "stripe_nft" || ticket.token_id == null) {
    return {
      status: 409,
      body: { error: "Only confirmed Ticket NFTs can be listed for resale." },
    };
  }

  const [
    { data: ticketType },
    { data: event },
    { data: activeListing },
    { data: activeOperation },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("ticket_types")
        .select("transfer_allowed")
        .eq("ticket_type_id", ticket.ticket_type_id)
        .maybeSingle(),
      supabaseAdmin
        .from("events")
        .select("status, event_date")
        .eq("event_id", ticket.event_id)
        .maybeSingle(),
      supabaseAdmin
        .from("resale_listings")
        .select("listing_id")
        .eq("ticket_id", ticketId)
        .eq("status", "active")
        .maybeSingle(),
      supabaseAdmin
        .from("ticket_operations")
        .select("operation_id")
        .eq("ticket_id", ticketId)
        .in("state", [
          "pending",
          "checkout_created",
          "payment_confirmed",
          "asset_submitted",
          "asset_confirmed",
          "delivery_failed",
          "refund_pending",
        ])
        .maybeSingle(),
    ]);

  if (!event || !isEventLive(event)) {
    return { status: 409, body: { error: "This event is not eligible for resale." } };
  }
  if (ticketType?.transfer_allowed !== true) {
    return { status: 409, body: { error: "This ticket type does not allow resale." } };
  }
  if (activeOperation) {
    return {
      status: 409,
      body: { error: "A transfer or refund is already in progress." },
    };
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

  const listingId = crypto.randomUUID();
  const usesContract = hasMarketplaceContract();
  const { error } = await supabaseAdmin.from("resale_listings").insert({
    listing_id: listingId,
    ticket_id: ticketId,
    seller_user_id: userId,
    seller_wallet_address: walletResult.wallet,
    price,
    price_sen: Math.round(price * 100),
    currency: "MYR",
    status: usesContract ? "contract_pending" : "active",
  });
  if (error?.code === "23505") {
    return { status: 409, body: { error: "This ticket is already listed." } };
  }
  if (error) {
    return { status: 500, body: { error: "Listing could not be created." } };
  }

  if (usesContract) {
    const eventEndsAt = getEventEndTime(event.event_date);
    if (!eventEndsAt) {
      await supabaseAdmin
        .from("resale_listings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("listing_id", listingId);
      return { status: 409, body: { error: "This event has no valid ending time." } };
    }

    try {
      const signer = await loadManagedWalletSigner(userId);
      await fundCustomerGas(signer.address);
      const contractListing = await createContractListing({
        sellerPrivateKey: signer.privateKey,
        listingId,
        tokenId: BigInt(ticket.token_id),
        priceInSen: BigInt(Math.round(price * 100)),
        expiresAt: eventEndsAt,
      });
      const activated = await supabaseAdmin
        .from("resale_listings")
        .update({
          status: "active",
          contract_listing_reference: contractListing.listingReference,
          marketplace_approval_hash: contractListing.approvalHash,
          marketplace_listing_hash: contractListing.listingHash,
          updated_at: new Date().toISOString(),
        })
        .eq("listing_id", listingId)
        .eq("status", "contract_pending");
      if (activated.error) {
        await cancelContractListing(
          signer.privateKey,
          contractListing.listingReference,
        ).catch(() => undefined);
        throw new Error("Contract listing could not be recorded.");
      }
    } catch (contractError) {
      console.error("Marketplace contract listing failed", {
        listingId,
        message:
          contractError instanceof Error ? contractError.message : "unknown",
      });
      await supabaseAdmin
        .from("resale_listings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("listing_id", listingId)
        .eq("status", "contract_pending");
      return {
        status: 502,
        body: { error: "The Ticket NFT could not be listed on-chain." },
      };
    }
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

  const listing = await supabaseAdmin
    .from("resale_listings")
    .select("listing_id, seller_user_id, contract_listing_reference, reserved_operation_id")
    .eq("listing_id", listingId)
    .eq("seller_wallet_address", walletResult.wallet)
    .eq("status", "active")
    .maybeSingle();
  if (listing.error || !listing.data || listing.data.reserved_operation_id) {
    return { status: 409, body: { error: "This listing is no longer available." } };
  }

  if (listing.data.contract_listing_reference) {
    if (!hasMarketplaceContract()) {
      return {
        status: 503,
        body: { error: "The Marketplace contract is unavailable." },
      };
    }
    try {
      const signer = await loadManagedWalletSigner(userId);
      await fundCustomerGas(signer.address);
      await cancelContractListing(
        signer.privateKey,
        listing.data.contract_listing_reference as `0x${string}`,
      );
    } catch (contractError) {
      console.error("Marketplace contract cancellation failed", {
        listingId,
        message:
          contractError instanceof Error ? contractError.message : "unknown",
      });
      return {
        status: 502,
        body: { error: "The on-chain listing could not be cancelled." },
      };
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("resale_listings")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("listing_id", listingId)
    .eq("seller_wallet_address", walletResult.wallet)
    .eq("status", "active")
    .is("reserved_operation_id", null)
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
  await synchronizeFinishedEvents();

  const walletResult = await getManagedWallet(userId);
  if (walletResult.error) return { listings: [], wallet: null, error: "Marketplace could not be loaded." };

  const { data: listingData, error } = await supabaseAdmin
    .from("resale_listings")
    .select("listing_id, ticket_id, seller_wallet_address, price, price_sen, created_at, reserved_until")
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
    supabaseAdmin
      .from("events")
      .select("*")
      .in("event_id", eventIds)
      .eq("status", "active")
      .gt("event_date", getLiveEventCutoff().toISOString()),
    supabaseAdmin.from("ticket_types").select("*").in("ticket_type_id", typeIds),
  ]);
  const ticketMap = new Map(tickets.map((row) => [text(row, "ticket_id"), row]));
  const eventMap = new Map(((eventData ?? []) as Row[]).map((row) => [text(row, "event_id"), row]));
  const typeMap = new Map(((typeData ?? []) as Row[]).map((row) => [text(row, "ticket_type_id"), row]));

  const listings = listingRows.flatMap((listing): MarketplaceListing[] => {
    const reservedUntil = new Date(text(listing, "reserved_until"));
    if (!Number.isNaN(reservedUntil.getTime()) && reservedUntil > new Date()) {
      return [];
    }
    const ticket = ticketMap.get(text(listing, "ticket_id"));
    if (
      !ticket ||
      ticket.record_source !== "stripe_nft" ||
      ticket.token_id == null ||
      !["active", "valid"].includes(text(ticket, "status").toLowerCase())
    ) return [];
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
