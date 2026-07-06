export type TransactionFilter =
  | "all"
  | "topup"
  | "purchase"
  | "refund"
  | "resale";

type DisplayType = Exclude<TransactionFilter, "all"> | "other";
type Row = Record<string, unknown>;

export interface CustomerTransaction {
  id: string;
  type: DisplayType;
  typeLabel: string;
  description: string;
  signedAmount: number;
  amountLabel: string;
  dateLabel: string;
  hash: string | null;
  hashLabel: string;
}

const labels: Record<DisplayType, string> = {
  topup: "Top up",
  purchase: "Purchase",
  refund: "Refund",
  resale: "Resale",
  other: "Other",
};

function normalizeType(value: unknown): DisplayType {
  const type = String(value ?? "").toLowerCase().replace(/[- ]/g, "_");
  if (type.includes("topup") || type.includes("top_up")) return "topup";
  if (type.includes("purchase")) return "purchase";
  if (type.includes("refund")) return "refund";
  if (type.includes("resale")) return "resale";
  return "other";
}

export function mapTransactionRows(rows: readonly Row[]): CustomerTransaction[] {
  return rows.map((row, index) => {
    const type = normalizeType(row.transaction_type);
    const rawAmount = Number(row.amount ?? 0);
    const signedAmount = type === "purchase" ? -Math.abs(rawAmount) : rawAmount;
    const hash =
      typeof row.transaction_hash === "string" && row.transaction_hash
        ? row.transaction_hash
        : null;
    const date = new Date(String(row.created_at ?? ""));

    return {
      id: String(row.transaction_id ?? `transaction-${index}`),
      type,
      typeLabel: labels[type],
      description: String(row.description ?? labels[type]),
      signedAmount,
      amountLabel: `${signedAmount > 0 ? "+" : ""}${signedAmount.toLocaleString("en-MY")} DICKEN`,
      dateLabel: Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat("en-MY", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(date),
      hash,
      hashLabel: hash
        ? hash.length > 18
          ? `${hash.slice(0, 8)}…${hash.slice(-6)}`
          : hash
        : "Transaction pending",
    };
  });
}

export function filterTransactions(
  items: readonly CustomerTransaction[],
  type: TransactionFilter,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (type === "all" || item.type === type) &&
      (!needle ||
        `${item.description} ${item.hash ?? ""}`.toLowerCase().includes(needle)),
  );
}
