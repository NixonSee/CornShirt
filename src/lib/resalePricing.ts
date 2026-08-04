export const MAX_RESALE_MARKUP_PERCENT = 15;

function positiveSen(value: unknown): number | null {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

/** Resolve the ticket's face value from the canonical sen column, with a
 * compatibility fallback for ticket types created before price_sen existed. */
export function getOriginalTicketPriceSen(input: {
  priceSen?: unknown;
  price?: unknown;
}): number | null {
  const storedSen = positiveSen(input.priceSen);
  if (storedSen !== null) return storedSen;

  const legacyPrice = Number(input.price);
  if (!Number.isFinite(legacyPrice) || legacyPrice <= 0) return null;

  return positiveSen(Math.round(legacyPrice * 100));
}

export function getMaximumResalePriceSen(
  originalPriceSen: number,
): number | null {
  const original = positiveSen(originalPriceSen);
  if (original === null) return null;

  return Math.floor(
    (original * (100 + MAX_RESALE_MARKUP_PERCENT)) / 100,
  );
}
