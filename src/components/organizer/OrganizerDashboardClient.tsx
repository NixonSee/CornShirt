"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2 as CalendarStatusIcon,
  CalendarDays as EventDateIcon,
  LayoutGrid as GridIcon,
  List as ListIcon,
  MapPin as VenueIcon,
  Pencil as EditIcon,
  PlusCircle as AddIcon,
  Ticket as TicketIcon,
  WalletCards as RevenueIcon,
} from "lucide-react";

import { Pagination } from "@/components/common/Pagination";
import { formatMyr } from "@/lib/currency";
import { APP_TIME_ZONE } from "@/lib/eventDate";
import {
  getRevenueTrend,
  type DailyRevenuePoint,
  type OrganizerEventSummary,
} from "@/lib/organizerDashboard";
import {
  filterOrganizerEvents,
  ORGANIZER_EVENT_FILTERS,
  organizerEventFilterLabel,
  type OrganizerEventFilter,
} from "@/lib/organizerEventFilters";

export interface OrganizerDashboardTransaction {
  transaction_id: string;
  transaction_hash: string | null;
  transaction_type: string;
  amount: number | null;
  created_at: string | null;
  tickets: {
    wallet_address: string | null;
    events: { event_name: string | null } | null;
  } | null;
}

interface OrganizerDashboardClientProps {
  events: OrganizerEventSummary[];
  revenueSeries: DailyRevenuePoint[];
  transactions: OrganizerDashboardTransaction[];
  loadError?: string;
}

type EventView = "grid" | "list";

const NUMBER = new Intl.NumberFormat("en-MY");
const TRANSACTIONS_PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  active: "#36b56a",
  completed: "#64748b",
  pending: "#f6a730",
  draft: "#7b8490",
  rejected: "#d84a4a",
  cancelled: "#d84a4a",
  canceled: "#d84a4a",
};

const STATUS_ORDER = [
  "active",
  "completed",
  "pending",
  "draft",
  "rejected",
  "cancelled",
  "canceled",
  "unknown",
];

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  return hash.length > 14
    ? `${hash.slice(0, 7)}…${hash.slice(-5)}`
    : hash;
}

function formatEventDateTime(value: string | null): string {
  if (!value) return "Date TBC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBC";

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}

function formatTransactionTime(value: string | null): string {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: APP_TIME_ZONE,
  });
}

function normalizedStatus(status: string | null) {
  return (status ?? "unknown").toLowerCase();
}

function statusLabel(status: string | null) {
  const value = normalizedStatus(status);
  if (value === "canceled") return "Cancelled";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function eventProgress(event: OrganizerEventSummary) {
  if (event.supply <= 0) return 0;
  return Math.min(100, Math.round((event.sold / event.supply) * 100));
}

function transactionTone(type: string) {
  const normalized = type.toLowerCase();
  if (["purchase", "sale", "mint"].includes(normalized)) return "positive";
  if (normalized === "refund") return "negative";
  return "neutral";
}

export function OrganizerDashboardClient({
  events,
  revenueSeries,
  transactions,
  loadError,
}: OrganizerDashboardClientProps) {
  const [filter, setFilter] = useState<OrganizerEventFilter>("all");
  const [view, setView] = useState<EventView>("grid");
  const [txPage, setTxPage] = useState(1);

  const totalRevenue = useMemo(
    () => events.reduce((total, event) => total + event.revenue, 0),
    [events],
  );
  const totalSold = useMemo(
    () => events.reduce((total, event) => total + event.sold, 0),
    [events],
  );
  const totalSupply = useMemo(
    () => events.reduce((total, event) => total + event.supply, 0),
    [events],
  );
  const soldPercentage =
    totalSupply > 0 ? Math.min(100, Math.round((totalSold / totalSupply) * 100)) : 0;

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      const status = normalizedStatus(event.status);
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    return Array.from(counts, ([name, value]) => ({ name, value })).sort(
      (a, b) => {
        const aIndex = STATUS_ORDER.indexOf(a.name);
        const bIndex = STATUS_ORDER.indexOf(b.name);
        return (aIndex < 0 ? STATUS_ORDER.length : aIndex) -
          (bIndex < 0 ? STATUS_ORDER.length : bIndex);
      },
    );
  }, [events]);

  const filteredEvents = useMemo(
    () => filterOrganizerEvents(events, filter),
    [events, filter],
  );

  const revenueTrend = useMemo(
    () => getRevenueTrend(revenueSeries),
    [revenueSeries],
  );
  const transactionPages = Math.max(
    1,
    Math.ceil(transactions.length / TRANSACTIONS_PAGE_SIZE),
  );
  const pagedTransactions = useMemo(
    () =>
      transactions.slice(
        (txPage - 1) * TRANSACTIONS_PAGE_SIZE,
        txPage * TRANSACTIONS_PAGE_SIZE,
      ),
    [transactions, txPage],
  );

  return (
    <div className="organizer-dashboard">
      <header className="organizer-dashboard-heading">
        <div>
          <span className="organizer-eyebrow">Organizer workspace</span>
          <h1>Organizer Dashboard</h1>
          <p>
            Track events, ticket performance, and blockchain activity at a glance.
          </p>
        </div>
        <Link className="organizer-primary-action" href="/organizer/create-event">
          <AddIcon size={18} aria-hidden="true" />
          Create Event
        </Link>
      </header>

      {loadError ? (
        <p className="form-error organizer-dashboard-error" role="alert">
          Some dashboard data could not be loaded: {loadError}
        </p>
      ) : null}

      <section
        className="organizer-summary-grid"
        aria-label="Organizer performance summary"
      >
        <article className="organizer-summary-card">
          <div className="organizer-summary-head">
            <span>Tickets Sold</span>
            <TicketIcon size={23} aria-hidden="true" />
          </div>
          <div className="organizer-ticket-summary">
            <div>
              <strong>{NUMBER.format(totalSold)}</strong>
              <p>
                {totalSupply > 0
                  ? `${NUMBER.format(totalSupply)} total capacity`
                  : "No ticket capacity yet"}
              </p>
            </div>
            <div
              className="organizer-ticket-donut"
              style={{
                background: `conic-gradient(var(--primary) 0 ${soldPercentage}%, #21262d ${soldPercentage}% 100%)`,
              }}
              aria-label={`${soldPercentage}% of ticket capacity sold`}
            >
              <span>{soldPercentage}%</span>
            </div>
          </div>
        </article>

        <article className="organizer-summary-card organizer-revenue-card">
          <div className="organizer-summary-head">
            <span>Total Revenue</span>
            <RevenueIcon size={23} aria-hidden="true" />
          </div>
          <div className="organizer-revenue-content">
            <div className="organizer-revenue-total">
              <strong>{formatMyr(totalRevenue)}</strong>
              <p>Recorded primary ticket revenue</p>
              <span
                className={`organizer-revenue-trend ${revenueTrend.direction}`}
              >
                {revenueTrend.direction === "down" ? (
                  <ArrowDownRight size={14} aria-hidden="true" />
                ) : (
                  <ArrowUpRight size={14} aria-hidden="true" />
                )}
                {revenueTrend.label}
              </span>
            </div>
            <div
              className="organizer-revenue-chart"
              aria-label="Daily revenue for the last six months"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueSeries}
                  margin={{ top: 12, right: 8, bottom: 0, left: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="organizerRevenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#f6a730"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="100%"
                        stopColor="#f6a730"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#30363d"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={34}
                    tick={{ fill: "#7b8490", fontSize: 9, fontWeight: 700 }}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "#f6a730",
                      strokeDasharray: "3 4",
                      strokeWidth: 1,
                    }}
                    contentStyle={{
                      background: "#0d1117",
                      border: "1px solid rgba(246, 167, 48, 0.45)",
                      borderRadius: 8,
                      boxShadow: "0 12px 26px rgba(0, 0, 0, 0.38)",
                      fontSize: 11,
                    }}
                    labelStyle={{
                      color: "#f6a730",
                      fontSize: 10,
                      fontWeight: 800,
                      marginBottom: 3,
                      textTransform: "uppercase",
                    }}
                    formatter={(value) => [
                      formatMyr(Number(value)),
                      "Revenue for this day",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f6a730"
                    strokeWidth={2.5}
                    fill="url(#organizerRevenueFill)"
                    dot={false}
                    activeDot={{
                      fill: "#0d1117",
                      r: 5,
                      stroke: "#ffc869",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="organizer-summary-card">
          <div className="organizer-summary-head">
            <span>Events Overview</span>
            <CalendarStatusIcon size={23} aria-hidden="true" />
          </div>
          <div className="organizer-events-summary">
            <div>
              <strong>{NUMBER.format(events.length)}</strong>
              <p>
                {events.length === 1
                  ? "Managed event"
                  : "Managed events"}
              </p>
            </div>
            {statusBreakdown.length > 0 ? (
              <ul className="organizer-status-list">
                {statusBreakdown.map(({ name, value }) => (
                  <li key={name}>
                    <span>
                      <i
                        style={{
                          background: STATUS_COLORS[name] ?? "#7b8490",
                        }}
                      />
                      {statusLabel(name)}
                    </span>
                    <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="organizer-summary-empty">No events yet</span>
            )}
          </div>
        </article>
      </section>

      <section className="organizer-dashboard-section">
        <div className="organizer-section-head">
          <div>
            <span className="organizer-eyebrow">Event portfolio</span>
            <h2>Managed Events</h2>
            <p>
              {NUMBER.format(totalSold)} of {NUMBER.format(totalSupply)} tickets
              sold across your events.
            </p>
          </div>
          <div className="organizer-section-actions">
            <div
              className="organizer-filter-tabs"
              role="tablist"
              aria-label="Filter managed events"
            >
              {ORGANIZER_EVENT_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={filter === value ? "active" : undefined}
                  onClick={() => setFilter(value)}
                >
                  {organizerEventFilterLabel(value)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`organizer-view-button${view === "grid" ? " active" : ""}`}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <GridIcon size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`organizer-view-button${view === "list" ? " active" : ""}`}
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <ListIcon size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="organizer-empty-state">
            <h3>No events to show</h3>
            <p>
              {events.length === 0
                ? "Create your first event to start selling tickets and tracking revenue."
                : `No ${filter} events are available right now.`}
            </p>
          </div>
        ) : (
          <div
            className={`organizer-events-grid${view === "list" ? " is-list" : ""}`}
          >
            {filteredEvents.map((event) => {
              const progress = eventProgress(event);
              const status = normalizedStatus(event.status);

              return (
                <article className="organizer-event-card" key={event.event_id}>
                  <Link
                    className="organizer-event-image"
                    href={`/organizer/events/${event.event_id}`}
                    style={{
                      backgroundImage: `linear-gradient(145deg, rgba(13, 17, 23, 0.04), rgba(13, 17, 23, 0.52)), url("${
                        event.banner_image || "/Background Image.png"
                      }")`,
                    }}
                    aria-label={`Manage ${event.event_name}`}
                  />
                  <div className="organizer-event-content">
                    <div className="organizer-event-topline">
                      <span
                        className={`organizer-event-status status-${status}`}
                      >
                        {statusLabel(event.status)}
                      </span>
                      <Link
                        className="organizer-event-edit"
                        href={`/organizer/events/${event.event_id}/edit`}
                        aria-label={`Edit ${event.event_name}`}
                      >
                        <EditIcon size={16} aria-hidden="true" />
                      </Link>
                    </div>
                    <Link
                      className="organizer-event-title"
                      href={`/organizer/events/${event.event_id}`}
                    >
                      {event.event_name}
                    </Link>
                    {event.artist_name ? (
                      <p className="organizer-event-artist">{event.artist_name}</p>
                    ) : null}
                    <div className="organizer-event-meta">
                      <span>
                        <VenueIcon size={14} aria-hidden="true" />
                        {event.venue ?? "Venue TBC"}
                      </span>
                      <span>
                        <EventDateIcon size={14} aria-hidden="true" />
                        {formatEventDateTime(event.event_date)}
                      </span>
                    </div>
                    <div className="organizer-event-progress">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="organizer-event-foot">
                      <span>
                        {event.supply > 0
                          ? `${NUMBER.format(event.sold)} / ${NUMBER.format(event.supply)} tickets`
                          : "No ticket capacity"}
                      </span>
                      <strong>
                        {status === "active"
                          ? `${progress}% sold`
                          : status === "pending"
                            ? "Awaiting approval"
                            : event.minPrice != null
                              ? `From ${formatMyr(event.minPrice)}`
                              : statusLabel(event.status)}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="organizer-dashboard-section">
        <div className="organizer-section-head">
          <div>
            <span className="organizer-eyebrow">Blockchain activity</span>
            <h2>Live Transactions</h2>
            <p>Recent ticket purchases, transfers, resales, and refunds.</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="organizer-empty-state">
            <h3>No transactions yet</h3>
            <p>Activity will appear here after customers interact with your tickets.</p>
          </div>
        ) : (
          <div className="organizer-transactions-card">
            <div className="organizer-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Wallet Address</th>
                    <th>TX Hash</th>
                    <th>Event</th>
                    <th>Amount</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.map((transaction) => (
                    <tr key={transaction.transaction_id}>
                      <td>
                        <span
                          className={`organizer-transaction-type ${transactionTone(
                            transaction.transaction_type,
                          )}`}
                        >
                          {transaction.transaction_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="organizer-mono">
                        {shortHash(transaction.tickets?.wallet_address ?? null)}
                      </td>
                      <td className="organizer-mono">
                        {shortHash(transaction.transaction_hash)}
                      </td>
                      <td>
                        {transaction.tickets?.events?.event_name ??
                          "Event unavailable"}
                      </td>
                      <td className="organizer-transaction-amount">
                        {formatMyr(Number(transaction.amount ?? 0))}
                      </td>
                      <td>{formatTransactionTime(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={txPage}
              totalPages={transactionPages}
              onPageChange={setTxPage}
              totalItems={transactions.length}
              pageSize={TRANSACTIONS_PAGE_SIZE}
            />
          </div>
        )}
      </section>
    </div>
  );
}
