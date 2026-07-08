import { parsePositiveMyrAmount } from "../../../lib/currency.ts";

export interface MarketplaceListing {
  id: string;
  ticketId: string;
  eventName: string;
  artist: string;
  venue: string;
  eventDate: string;
  ticketType: string;
  image: string;
  sellerWallet: string;
  price: number;
  isMine: boolean;
}

export function parseResaleMyrPrice(value: string): number | null {
  return parsePositiveMyrAmount(value);
}

export function canListTicket(input: {
  status: string;
  transferAllowed: boolean;
  hasActiveListing: boolean;
}) {
  return (
    ["active", "valid"].includes(input.status.toLowerCase()) &&
    input.transferAllowed &&
    !input.hasActiveListing
  );
}

export function shortWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}
