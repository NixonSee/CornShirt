"use client";

import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "oklch(0.7 0.17 150)",
  "oklch(0.8 0.16 80)",
  "oklch(0.58 0.22 27)",
  "oklch(0.76 0.18 60)",
  "oklch(0.68 0 0)",
];

const STATUS_COLORS: Record<string, string> = {
  active: COLORS[0],
  pending: COLORS[1],
  cancelled: COLORS[2],
  completed: COLORS[3],
  rejected: COLORS[4],
};

const tooltipStyle = {
  background: "oklch(0.2 0 0)",
  border: "1px solid oklch(0.3 0 0)",
  borderRadius: 8,
  color: "oklch(0.97 0 0)",
  fontSize: 13,
};

export function BarChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    fill: STATUS_COLORS[status] || COLORS[4],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBar data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
        <XAxis dataKey="status" stroke="oklch(0.68 0 0)" tick={{ fontSize: 12 }} />
        <YAxis stroke="oklch(0.68 0 0)" tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}

export function PieChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status] || COLORS[4],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPie>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </RechartsPie>
    </ResponsiveContainer>
  );
}

export function LineChart({
  data,
}: {
  data: { month: string; count: number; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
        <XAxis dataKey="month" stroke="oklch(0.68 0 0)" tick={{ fontSize: 12 }} />
        <YAxis stroke="oklch(0.68 0 0)" tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="Transactions"
          stroke="oklch(0.76 0.18 60)"
          fill="oklch(0.76 0.18 60 / 0.2)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue (DICKEN)"
          stroke="oklch(0.7 0.17 150)"
          fill="oklch(0.7 0.17 150 / 0.2)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
