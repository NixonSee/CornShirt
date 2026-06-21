"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendPoint = { date: string; count: number };
type RevenuePoint = { date: string; revenue: number };

export default function TrendCharts({
  eventsTrend,
  revenueTrend,
}: {
  eventsTrend: TrendPoint[];
  revenueTrend: RevenuePoint[];
}) {
  if (eventsTrend.length === 0 && revenueTrend.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {eventsTrend.length > 0 && (
        <div className="card-dashboard">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Events Created Over Time
          </p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={eventsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelStyle={{ color: "#000" }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Events"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {revenueTrend.length > 0 && (
        <div className="card-dashboard">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Revenue Over Time (RM)
          </p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`RM${v}`, "Revenue"]} labelStyle={{ color: "#000" }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
