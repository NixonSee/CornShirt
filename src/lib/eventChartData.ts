export interface EventTransactionRow {
  amount: number | null;
  created_at: string | null;
}

export interface EventChartPoint {
  label: string;
  sales: number;
  revenue: number;
  remaining: number;
}

export function buildEventChartPoints(
  transactions: EventTransactionRow[],
  totalSupply: number,
): EventChartPoint[] {
  const dailyTotals: Record<string, { sales: number; revenue: number }> = {};

  for (const transaction of transactions) {
    if (!transaction.created_at) continue;

    const createdAt = new Date(transaction.created_at);
    if (Number.isNaN(createdAt.getTime())) continue;

    const day = createdAt.toISOString().slice(0, 10);
    if (!dailyTotals[day]) dailyTotals[day] = { sales: 0, revenue: 0 };
    dailyTotals[day].sales += 1;
    dailyTotals[day].revenue += Math.max(0, Number(transaction.amount ?? 0));
  }

  const days = Object.keys(dailyTotals).sort();
  let cumulativeSales = 0;
  let cumulativeRevenue = 0;

  return days.map((day) => {
    cumulativeSales += dailyTotals[day].sales;
    cumulativeRevenue += dailyTotals[day].revenue;

    const date = new Date(`${day}T00:00:00Z`);
    const label = Number.isNaN(date.getTime())
      ? day
      : date.toLocaleDateString("en-MY", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        });

    return {
      label,
      sales: cumulativeSales,
      revenue: cumulativeRevenue,
      remaining: Math.max(0, totalSupply - cumulativeSales),
    };
  });
}
