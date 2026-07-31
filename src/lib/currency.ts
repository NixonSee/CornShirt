const MYR = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMyr(value: number): string {
  return MYR.format(Number.isFinite(value) ? value : 0).replace(/\s/g, "");
}

export function parsePositiveMyrAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function myrToSen(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;

  const sen = Math.round(value * 100);
  if (!Number.isSafeInteger(sen)) return null;

  return Math.abs(value - sen / 100) < Number.EPSILON * 100
    ? sen
    : null;
}
