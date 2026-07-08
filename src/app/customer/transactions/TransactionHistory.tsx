"use client";

import { useMemo, useState } from "react";

import { Pagination, SearchBar } from "@/components/common";

import {
  filterTransactions,
  type CustomerTransaction,
  type TransactionFilter,
} from "./transactionData";

const PAGE_SIZE = 10;
const filters: Array<{ value: TransactionFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "purchase", label: "Purchases" },
  { value: "refund", label: "Refunds" },
  { value: "resale", label: "Resale" },
];

export default function TransactionHistory({
  transactions,
}: {
  transactions: readonly CustomerTransaction[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () => filterTransactions(transactions, filter, query),
    [filter, query, transactions],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setQuery("");
    setFilter("all");
    setPage(1);
  }

  return (
    <section className="transactions-page">
      <header className="transactions-heading">
        <p className="section-kicker">Customer wallet</p>
        <h1>Transaction History</h1>
        <p>{transactions.length} wallet transactions</p>
      </header>

      {transactions.length === 0 ? (
        <div className="state-card">
          <h2>No transactions yet</h2>
          <p className="muted">
            Purchases, refunds, and resale activity will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="transaction-toolbar">
            <SearchBar
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search details or transaction hash"
              ariaLabel="Search transactions"
              fluid
            />
            <div className="transaction-filters" aria-label="Transaction type">
              {filters.map((item) => (
                <button
                  type="button"
                  className={filter === item.value ? "active" : ""}
                  aria-pressed={filter === item.value}
                  onClick={() => {
                    setFilter(item.value);
                    setPage(1);
                  }}
                  key={item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="state-card">
              <h2>No matching transactions</h2>
              <button className="button-outline" type="button" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="transaction-table">
              <div className="transaction-row transaction-header" aria-hidden="true">
                <span>Type</span><span>Details</span><span>Amount</span><span>Date</span><span>Transaction</span>
              </div>
              {visible.map((transaction) => (
                <article className="transaction-row" key={transaction.id}>
                  <span className="transaction-type">{transaction.typeLabel}</span>
                  <span>{transaction.description}</span>
                  <span className={`transaction-amount ${transaction.signedAmount >= 0 ? "positive" : "negative"}`}>
                    {transaction.amountLabel}
                  </span>
                  <span>{transaction.dateLabel}</span>
                  <span className="mono">{transaction.hashLabel}</span>
                </article>
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </section>
  );
}
