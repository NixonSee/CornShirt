export interface AdminTransactionRow {
  amount: number | null;
  created_at: string | null;
  transaction_type: string | null;
}

export interface AdminActivityPoint {
  date: string;
  label: string;
  transactions: number;
  volume: number;
}

export const ADMIN_ACTIVITY_WINDOW_DAYS = 120;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(date: Date) {
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function buildAdminActivitySeries(
  transactions: AdminTransactionRow[],
  now = new Date(),
  windowDays = ADMIN_ACTIVITY_WINDOW_DAYS,
): AdminActivityPoint[] {
  const safeWindowDays = Math.max(1, Math.floor(windowDays));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const points = Array.from({ length: safeWindowDays }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (safeWindowDays - 1 - index));
    return {
      date: dateKey(date),
      label: dateLabel(date),
      transactions: 0,
      volume: 0,
    };
  });
  const pointByDate = new Map(points.map((point) => [point.date, point]));

  for (const transaction of transactions) {
    if (!transaction.created_at) continue;

    const createdAt = new Date(transaction.created_at);
    if (Number.isNaN(createdAt.getTime())) continue;

    const point = pointByDate.get(dateKey(createdAt));
    if (!point) continue;

    point.transactions += 1;
    point.volume += Math.max(0, Number(transaction.amount ?? 0));
  }

  return points;
}

export function getAdminActivityTrend(points: AdminActivityPoint[]) {
  const current = points
    .slice(-30)
    .reduce((total, point) => total + point.transactions, 0);
  const previous = points
    .slice(-60, -30)
    .reduce((total, point) => total + point.transactions, 0);

  if (previous <= 0) {
    return current > 0
      ? {
          direction: "up" as const,
          label: "Activity started in the last 30 days",
        }
      : {
          direction: "flat" as const,
          label: "No activity in the last 30 days",
        };
  }

  const change = ((current - previous) / previous) * 100;
  return {
    direction: change >= 0 ? ("up" as const) : ("down" as const),
    label: `${Math.abs(change).toFixed(1)}% vs previous 30 days`,
  };
}
