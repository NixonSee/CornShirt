"use client";

import {
  BarChart,
  Bar,
  XAxis,
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
    <div className="grid gap-5 sm:grid-cols-2">
      {eventsTrend.length > 0 && (
        <div className="card-dashboard">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">
            Events Created Over Time
          </p>
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={eventsTrend} barCategoryGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip labelStyle={{ color: "#000" }} />
                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  minPointSize={2}
                  name="Events"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {revenueTrend.length > 0 && (
        <div className="card-dashboard">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#64748b]">
            Revenue Over Time (RM)
          </p>
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueTrend} barCategoryGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`RM${value}`, "Revenue"]}
                  labelStyle={{ color: "#000" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                  minPointSize={2}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
