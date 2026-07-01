"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  PlusCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/common/Card";
import { Pagination } from "@/components/common/Pagination";

interface EventRow {
  event_id: string;
  event_name: string;
  artist_name: string | null;
  venue: string | null;
  status: string | null;
  event_date: string | null;
  banner_image: string | null;
}

interface TicketTypeRow {
  event_id: string | null;
  price: number | null;
  total_supply: number | null;
  remaining_supply: number | null;
}

interface TicketRow {
  created_at: string | null;
  status: string | null;
  ticket_types: { price: number | null } | null;
}

interface TransactionRow {
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

interface EventSummary extends EventRow {
  sold: number;
  supply: number;
  revenue: number;
  minPrice: number | null;
}

type EventFilter = "all" | "live" | "draft";

const DICKEN = new Intl.NumberFormat("en-US");
const TRANSACTIONS_PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  active: "#36b56a",
  pending: "#f2be3e",
  draft: "#a3a3a3",
  rejected: "#d84a4a",
  cancelled: "#d84a4a",
};

function statusVariant(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "active":
      return "good";
    case "pending":
      return "warn";
    case "draft":
    case "rejected":
    case "cancelled":
    case "canceled":
      return "bad";
    default:
      return "";
  }
}

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

function formatDate(value: string | null): string {
  if (!value) return "Date TBC";
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Bucket sold tickets into the last 6 months for the revenue area chart. */
function buildRevenueSeries(tickets: TicketRow[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
    };
  });
  const indexByKey = new Map(months.map((m, i) => [m.key, i]));

  for (const ticket of tickets) {
    if (!ticket.created_at) continue;
    const d = new Date(ticket.created_at);
    const idx = indexByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx == null) continue;
    const sold = ["valid", "used"].includes((ticket.status ?? "").toLowerCase());
    if (sold) months[idx].revenue += Number(ticket.ticket_types?.price ?? 0);
  }
  return months;
}

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<
    { label: string; revenue: number }[]
  >([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const [filter, setFilter] = useState<EventFilter>("all");
  const [carousel, setCarousel] = useState(0);
  const [txPage, setTxPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return; // shell guard handles redirect

        const { data: eventRows, error: eventError } = await supabase
          .from("events")
          .select(
            "event_id, event_name, artist_name, venue, status, event_date, banner_image"
          )
          .eq("organizer_id", user.id)
          .order("created_at", { ascending: false });
        if (eventError) throw eventError;

        const eventList = (eventRows ?? []) as EventRow[];
        const eventIds = eventList.map((e) => e.event_id);

        let ticketTypes: TicketTypeRow[] = [];
        if (eventIds.length > 0) {
          const { data, error: ttError } = await supabase
            .from("ticket_types")
            .select("event_id, price, total_supply, remaining_supply")
            .in("event_id", eventIds);
          if (ttError) throw ttError;
          ticketTypes = (data ?? []) as TicketTypeRow[];
        }

        const summaries: EventSummary[] = eventList.map((event) => {
          const types = ticketTypes.filter((tt) => tt.event_id === event.event_id);
          const supply = types.reduce((s, tt) => s + (tt.total_supply ?? 0), 0);
          const sold = types.reduce(
            (s, tt) => s + ((tt.total_supply ?? 0) - (tt.remaining_supply ?? 0)),
            0
          );
          const revenue = types.reduce(
            (s, tt) =>
              s + (tt.price ?? 0) * ((tt.total_supply ?? 0) - (tt.remaining_supply ?? 0)),
            0
          );
          const prices = types
            .map((tt) => tt.price)
            .filter((p): p is number => p != null);
          return {
            ...event,
            sold,
            supply,
            revenue,
            minPrice: prices.length ? Math.min(...prices) : null,
          };
        });

        // Optional: revenue time-series from individual sold tickets.
        let revSeries = buildRevenueSeries([]);
        if (eventIds.length > 0) {
          const { data: ticketRows } = await supabase
            .from("tickets")
            .select("created_at, status, ticket_types(price)")
            .in("event_id", eventIds);
          revSeries = buildRevenueSeries(
            (ticketRows ?? []) as unknown as TicketRow[]
          );
        }

        // Optional: live transactions for this organizer's events.
        let txRows: TransactionRow[] = [];
        if (eventIds.length > 0) {
          const { data: tx } = await supabase
            .from("transactions")
            .select(
              "transaction_id, transaction_hash, transaction_type, amount, created_at, tickets!inner(wallet_address, events!inner(event_name, organizer_id))"
            )
            .eq("tickets.events.organizer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);
          txRows = (tx ?? []) as unknown as TransactionRow[];
        }

        if (active) {
          setEvents(summaries);
          setRevenueSeries(revSeries);
          setTransactions(txRows);
          setTxPage(1);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your dashboard. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const totalRevenue = useMemo(
    () => events.reduce((s, e) => s + e.revenue, 0),
    [events]
  );
  const totalSold = useMemo(() => events.reduce((s, e) => s + e.sold, 0), [events]);
  const totalSupply = useMemo(
    () => events.reduce((s, e) => s + e.supply, 0),
    [events]
  );

  // Carousel only over events that actually have ticket capacity.
  const carouselEvents = useMemo(
    () => events.filter((e) => e.supply > 0),
    [events]
  );
  const current = carouselEvents[carousel] ?? null;
  const currentPct = current && current.supply > 0
    ? Math.round((current.sold / current.supply) * 100)
    : 0;

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const key = (e.status ?? "unknown").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filter === "live") {
      return events.filter((e) => (e.status ?? "").toLowerCase() === "active");
    }
    if (filter === "draft") {
      return events.filter((e) => (e.status ?? "").toLowerCase() === "draft");
    }
    return events;
  }, [events, filter]);

  const txTotalPages = Math.max(
    1,
    Math.ceil(transactions.length / TRANSACTIONS_PAGE_SIZE)
  );
  const pagedTransactions = useMemo(
    () =>
      transactions.slice(
        (txPage - 1) * TRANSACTIONS_PAGE_SIZE,
        txPage * TRANSACTIONS_PAGE_SIZE
      ),
    [transactions, txPage]
  );

  function cycle(direction: 1 | -1) {
    if (carouselEvents.length === 0) return;
    setCarousel(
      (prev) => (prev + direction + carouselEvents.length) % carouselEvents.length
    );
  }

  if (loading) {
    return (
      <div className="shell-loading">
        <Loader2 className="button-spinner" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="top-row">
          <div>
            <h1>Organizer Dashboard</h1>
            <p className="muted dashboard-subtitle">
              Track and manage your blockchain-secured ticket inventory.
            </p>
          </div>
        </div>
        <p className="form-error dashboard-error" role="alert">
          {error}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Organizer Dashboard</h1>
          <p className="muted dashboard-subtitle">
            Track and manage your blockchain-secured ticket inventory.
          </p>
        </div>
      </div>

      {/* Top metric row: three equal cards */}
      <section className="stat-grid">
        {/* 1. Tickets sold — swipeable per-event gauge */}
        <Card
          variant="panel"
          className="stat-card"
          title="Tickets Sold"
          titleClassName="stat-label"
          headerAction={
            carouselEvents.length > 1 ? (
              <div className="stat-nav">
                <button
                  type="button"
                  aria-label="Previous event"
                  onClick={() => cycle(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Next event"
                  onClick={() => cycle(1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : undefined
          }
        >
          {current ? (
            <div className="gauge-row">
              <div className="gauge-figure">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={[{ value: currentPct, fill: "#f6a730" }]}
                    startAngle={90}
                    endAngle={90 - (currentPct / 100) * 360}
                  >
                    <RadialBar dataKey="value" background={{ fill: "#333333" }} cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <span className="gauge-center">{currentPct}%</span>
              </div>
              <div className="gauge-detail">
                <strong>{DICKEN.format(current.sold)}</strong>
                <span className="muted">/ {DICKEN.format(current.supply)} capacity</span>
                <p className="gauge-event">{current.event_name}</p>
              </div>
            </div>
          ) : (
            <p className="muted stat-empty">No ticket capacity yet.</p>
          )}
        </Card>

        {/* 2. Total revenue — area/line chart */}
        <Card
          variant="panel"
          className="stat-card"
          title="Total Revenue"
          titleClassName="stat-label"
        >
          <strong className="stat-figure">{DICKEN.format(totalRevenue)} DICKEN</strong>
          <div className="spark-figure">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f6a730" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f6a730" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    background: "#1f1f1f",
                    border: "1px solid #4d4d4d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a3a3a3" }}
                  formatter={(value) => [
                    `${DICKEN.format(Number(value))} DICKEN`,
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f6a730"
                  strokeWidth={2}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 3. Events overview — status donut (my idea) */}
        <Card
          variant="panel"
          className="stat-card"
          title="Events Overview"
          titleClassName="stat-label"
        >
          {events.length > 0 ? (
            <div className="gauge-row">
              <div className="gauge-figure">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      innerRadius="62%"
                      outerRadius="100%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name] ?? "#6b6b6b"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <span className="gauge-center">{events.length}</span>
              </div>
              <ul className="legend">
                {statusBreakdown.map((entry) => (
                  <li key={entry.name}>
                    <span
                      className="legend-dot"
                      style={{ background: STATUS_COLORS[entry.name] ?? "#6b6b6b" }}
                    />
                    <span className="legend-label">{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted stat-empty">No events yet.</p>
          )}
        </Card>
      </section>

      {/* Managed events */}
      <section className="section-head">
        <div>
          <h2>Managed Events</h2>
          <p className="muted dashboard-panel-text">
            {DICKEN.format(totalSold)} of {DICKEN.format(totalSupply)} tickets sold
            across your events.
          </p>
        </div>
        <div className="section-actions">
          <div className="filter-tabs" role="tablist" aria-label="Filter events">
            {(["all", "live", "draft"] as EventFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? "active" : undefined}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "All" : key === "live" ? "Live" : "Draft"}
              </button>
            ))}
          </div>
          <Link className="button" href="/organizer/create-event">
            <PlusCircle size={18} />
            Create Event
          </Link>
        </div>
      </section>

      {filteredEvents.length === 0 ? (
        <div className="empty-state dashboard-empty">
          <h3>No events to show</h3>
          <p className="muted">
            {events.length === 0
              ? "Create your first event to start selling tickets and tracking revenue."
              : "No events match this filter."}
          </p>
        </div>
      ) : (
        <section className="event-manage-grid">
          {filteredEvents.map((event) => (
            <Link
              key={event.event_id}
              href={`/organizer/events/${event.event_id}`}
              className="event-manage-card"
            >
              <div
                className="event-card-media"
                style={{
                  backgroundImage: `linear-gradient(160deg, #1a1a1ad9, #1a1a1a2e), url(${
                    event.banner_image || "/Background Image.png"
                  })`,
                }}
              >
                <span className={`status ${statusVariant(event.status)}`.trim()}>
                  {(event.status ?? "unknown").toUpperCase()}
                </span>
              </div>
              <div className="event-card-body">
                <h3>{event.event_name}</h3>
                <div className="event-card-meta">
                  <span>
                    <CalendarDays size={14} /> {formatDate(event.event_date)}
                  </span>
                  <span>
                    <MapPin size={14} /> {event.venue ?? "Venue TBC"}
                  </span>
                </div>
                <div className="event-card-foot">
                  <span className="event-price">
                    {event.minPrice != null
                      ? `${DICKEN.format(event.minPrice)} DICKEN`
                      : "No tickets"}
                  </span>
                  <button
                    type="button"
                    className="event-edit"
                    aria-label={`Edit ${event.event_name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/organizer/events/${event.event_id}/edit`);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Live transactions */}
      <section className="section-head">
        <div>
          <h2>Live Transactions</h2>
          <p className="muted dashboard-panel-text">
            Real-time secondary market and minting activity.
          </p>
        </div>
      </section>

      {transactions.length === 0 ? (
        <div className="empty-state dashboard-empty">
          <p className="muted">
            No transactions yet. Activity appears here once customers buy tickets.
          </p>
        </div>
      ) : (
        <Card variant="table">
          <table>
            <thead>
              <tr>
                <th>TX Hash</th>
                <th>Event</th>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {pagedTransactions.map((tx) => (
                <tr key={tx.transaction_id}>
                  <td className="mono">{shortHash(tx.transaction_hash)}</td>
                  <td>{tx.tickets?.events?.event_name ?? "—"}</td>
                  <td className="mono">{shortHash(tx.tickets?.wallet_address ?? null)}</td>
                  <td>{DICKEN.format(Number(tx.amount ?? 0))} DICKEN</td>
                  <td>
                    <span className="status">{tx.transaction_type.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={txPage}
            totalPages={txTotalPages}
            onPageChange={setTxPage}
            totalItems={transactions.length}
            pageSize={TRANSACTIONS_PAGE_SIZE}
          />
        </Card>
      )}
    </>
  );
}
