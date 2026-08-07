import { formatMyr } from "../../../lib/currency.ts";
import { APP_TIME_ZONE } from "@/lib/eventDate";

export type TransactionFilter =
  | "all"
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
  purchase: "Purchase",
  refund: "Refund",
  resale: "Resale",
  other: "Other",
};

function normalizeType(value: unknown): DisplayType {
  const type = String(value ?? "").toLowerCase().replace(/[- ]/g, "_");
  if (type.includes("purchase")) return "purchase";
  if (type.includes("refund")) return "refund";
  if (type.includes("resale")) return "resale";
  return "other";
}

function amountFromCustomerPerspective(
  row: Row,
  type: DisplayType,
  customerUserId: string,
) {
  const rawAmount = Number(row.amount ?? 0);
  const amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0;

  if (type === "purchase") return -amount;
  if (type === "refund") return amount;

  if (type === "resale") {
    const buyerId = String(row.buyer_id ?? "");
    const sellerId = String(row.seller_id ?? "");

    if (sellerId === customerUserId) return amount;
    if (buyerId === customerUserId) return -amount;
  }

  return rawAmount;
}

export function mapTransactionRows(
  rows: readonly Row[],
  customerUserId: string,
): CustomerTransaction[] {
  return rows.map((row, index) => {
    const type = normalizeType(row.transaction_type);
    const signedAmount = amountFromCustomerPerspective(
      row,
      type,
      customerUserId,
    );
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
      amountLabel: `${signedAmount > 0 ? "+" : ""}${formatMyr(signedAmount)}`,
      dateLabel: Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat("en-MY", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: APP_TIME_ZONE,
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
