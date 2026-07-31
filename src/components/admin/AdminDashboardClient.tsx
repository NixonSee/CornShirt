"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  type TooltipContentProps,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CircleMinus,
  Clock3,
  ListChecks,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PendingEventsTable } from "@/components/admin/PendingEventsTable";
import { formatMyr } from "@/lib/currency";
import {
  getAdminActivityTrend,
  type AdminActivityPoint,
} from "@/lib/adminDashboard";

interface PendingEvent {
  event_id: string;
  event_name: string;
  organizer_name?: string;
  ticket_type_count: number;
  total_supply: number;
  created_at: string;
}

interface AdminDashboardClientProps {
  totalUsers: number;
  totalCustomers: number;
  totalOrganizers: number;
  totalEvents: number;
  totalTransactions: number;
  statusCounts: Record<string, number>;
  activitySeries: AdminActivityPoint[];
  pendingEvents: PendingEvent[];
  loadError?: string;
}

const NUMBER = new Intl.NumberFormat("en-MY");

const STATUS_COLORS: Record<string, string> = {
  active: "#36b56a",
  pending: "#f6a730",
  draft: "#7b8490",
  rejected: "#d84a4a",
  cancelled: "#d84a4a",
  canceled: "#d84a4a",
  completed: "#58a6ff",
};

const STATUS_ORDER = [
  "active",
  "pending",
  "draft",
  "completed",
  "rejected",
  "cancelled",
  "canceled",
  "unknown",
];

function statusLabel(status: string) {
  if (status === "canceled") return "Cancelled";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function ActivityTooltip({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || payload.length === 0) return null;

  const point = payload[0]?.payload as AdminActivityPoint | undefined;
  if (!point) return null;

  return (
    <div className="admin-chart-tooltip">
      <strong>{label}</strong>
      <span>{NUMBER.format(point.transactions)} transactions</span>
      <span>{formatMyr(point.volume)} recorded value</span>
    </div>
  );
}

export function AdminDashboardClient({
  totalUsers,
  totalCustomers,
  totalOrganizers,
  totalEvents,
  totalTransactions,
  statusCounts,
  activitySeries,
  pendingEvents,
  loadError,
}: AdminDashboardClientProps) {
  const statusBreakdown = useMemo(
    () =>
      Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
          const aIndex = STATUS_ORDER.indexOf(a.name);
          const bIndex = STATUS_ORDER.indexOf(b.name);
          return (
            (aIndex < 0 ? STATUS_ORDER.length : aIndex) -
            (bIndex < 0 ? STATUS_ORDER.length : bIndex)
          );
        }),
    [statusCounts],
  );
  const activeEvents = statusCounts.active ?? 0;
  const pendingEventsCount = statusCounts.pending ?? 0;
  const grossVolume = activitySeries.reduce(
    (total, point) => total + point.volume,
    0,
  );
  const activityTrend = getAdminActivityTrend(activitySeries);
  const maxStatusCount = Math.max(
    1,
    ...statusBreakdown.map((status) => status.value),
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-heading">
        <div>
          <span className="admin-eyebrow">Platform control center</span>
          <h1>Admin Dashboard</h1>
          <p>
            Review submissions, monitor platform activity, and keep every event
            moving safely.
          </p>
        </div>
        <Link className="admin-primary-action" href="/admin/pending-events">
          <ShieldCheck size={18} aria-hidden="true" />
          Review Queue
          {pendingEventsCount > 0 ? (
            <span>{NUMBER.format(pendingEventsCount)}</span>
          ) : null}
        </Link>
      </header>

      {loadError ? (
        <p className="form-error admin-dashboard-error" role="alert">
          Some dashboard data could not be loaded: {loadError}
        </p>
      ) : null}

      <section
        className="admin-summary-grid"
        aria-label="Platform performance summary"
      >
        <article className="admin-summary-card">
          <div className="admin-summary-head">
            <span>Platform Users</span>
            <Users size={23} aria-hidden="true" />
          </div>
          <div className="admin-user-summary">
            <strong>{NUMBER.format(totalUsers)}</strong>
            <p>Registered platform accounts</p>
            <div className="admin-user-split">
              <span>
                <i />
                Customers
                <strong>{NUMBER.format(totalCustomers)}</strong>
              </span>
              <span>
                <i />
                Organizers
                <strong>{NUMBER.format(totalOrganizers)}</strong>
              </span>
            </div>
          </div>
        </article>

        <article className="admin-summary-card admin-activity-card">
          <div className="admin-summary-head">
            <span>Platform Activity</span>
            <Activity size={23} aria-hidden="true" />
          </div>
          <div className="admin-activity-content">
            <div className="admin-activity-total">
              <strong>{NUMBER.format(totalTransactions)}</strong>
              <p>Recorded platform transactions</p>
              <span className={`admin-activity-trend ${activityTrend.direction}`}>
                {activityTrend.direction === "down" ? (
                  <ArrowDownRight size={14} aria-hidden="true" />
                ) : activityTrend.direction === "flat" ? (
                  <CircleMinus size={14} aria-hidden="true" />
                ) : (
                  <ArrowUpRight size={14} aria-hidden="true" />
                )}
                {activityTrend.label}
              </span>
              <small>{formatMyr(grossVolume)} in the chart period</small>
            </div>
            <div
              className="admin-activity-chart"
              aria-label="Daily platform transactions for the last 120 days"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activitySeries}
                  margin={{ top: 12, right: 8, bottom: 0, left: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="adminActivityFill"
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
                    content={ActivityTooltip}
                    cursor={{
                      stroke: "#f6a730",
                      strokeDasharray: "3 4",
                      strokeWidth: 1,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke="#f6a730"
                    strokeWidth={2.5}
                    fill="url(#adminActivityFill)"
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

        <article className="admin-summary-card">
          <div className="admin-summary-head">
            <span>Events Overview</span>
            <CalendarCheck2 size={23} aria-hidden="true" />
          </div>
          <div className="admin-events-summary">
            <div>
              <strong>{NUMBER.format(totalEvents)}</strong>
              <p>Events across the platform</p>
            </div>
            {statusBreakdown.length > 0 ? (
              <ul className="admin-status-list">
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
                    <strong>{NUMBER.format(value)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="admin-summary-empty">No events yet</span>
            )}
          </div>
        </article>
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-section-head">
          <div>
            <span className="admin-eyebrow">Approval workflow</span>
            <h2>Pending Review</h2>
            <p>
              Verify event details and make a decision on the latest organizer
              submissions.
            </p>
          </div>
          <Link className="admin-secondary-action" href="/admin/pending-events">
            View all pending
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="admin-review-card">
          <PendingEventsTable events={pendingEvents} limit={5} />
        </div>
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-section-head">
          <div>
            <span className="admin-eyebrow">Platform monitoring</span>
            <h2>Operational Snapshot</h2>
            <p>Live event distribution and direct access to admin workflows.</p>
          </div>
        </div>
        <div className="admin-monitor-grid">
          <article className="admin-monitor-card">
            <div className="admin-monitor-card-head">
              <div>
                <span>Event Status</span>
                <strong>{NUMBER.format(activeEvents)} active</strong>
              </div>
              <ListChecks size={22} aria-hidden="true" />
            </div>
            {statusBreakdown.length > 0 ? (
              <ul className="admin-status-bars">
                {statusBreakdown.map(({ name, value }) => (
                  <li key={name}>
                    <div>
                      <span>{statusLabel(name)}</span>
                      <strong>{NUMBER.format(value)}</strong>
                    </div>
                    <i>
                      <span
                        style={{
                          width: `${(value / maxStatusCount) * 100}%`,
                          background: STATUS_COLORS[name] ?? "#7b8490",
                        }}
                      />
                    </i>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-monitor-empty">No event records available.</p>
            )}
          </article>

          <article className="admin-monitor-card">
            <div className="admin-monitor-card-head">
              <div>
                <span>Admin Workflows</span>
                <strong>Quick access</strong>
              </div>
              <Clock3 size={22} aria-hidden="true" />
            </div>
            <nav className="admin-workflow-links" aria-label="Admin workflows">
              <Link href="/admin/pending-events">
                <span>
                  Pending events
                  <small>{NUMBER.format(pendingEventsCount)} awaiting review</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/admin/organizers">
                <span>
                  Organizer accounts
                  <small>{NUMBER.format(totalOrganizers)} registered</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/admin/users">
                <span>
                  Platform users
                  <small>{NUMBER.format(totalUsers)} accounts</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/admin/events">
                <span>
                  All events
                  <small>{NUMBER.format(totalEvents)} records</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </nav>
          </article>
        </div>
      </section>
    </div>
  );
}
