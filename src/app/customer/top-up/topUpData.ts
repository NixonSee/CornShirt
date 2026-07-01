export const DICKEN_PRESETS = [200, 500, 1000, 2000] as const;
export const RINGGIT_PER_DICKEN = 1;

export function parseDickenAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  return amount;
}

export function formatRinggit(dickenAmount: number): string {
  const ringgit = dickenAmount * RINGGIT_PER_DICKEN;
  return `RM ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ringgit)}`;
}
