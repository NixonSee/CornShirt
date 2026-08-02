"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  type TooltipContentProps,
} from "recharts";

import { formatMyr } from "@/lib/currency";
import type { EventChartPoint } from "@/lib/eventChartData";

interface EventMetricCardProps {
  value: string;
  title: string;
  data: EventChartPoint[];
  dataKey: "sales" | "revenue" | "remaining";
  color: string;
  className?: string;
}

const NUMBER = new Intl.NumberFormat("en-US");

function EventMetricTooltip({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || payload.length === 0) return null;

  const point = payload[0]?.payload as EventChartPoint | undefined;
  if (!point) return null;

  return (
    <div className="admin-chart-tooltip">
      <strong>{label}</strong>
      <span>{NUMBER.format(point.sales)} sold</span>
      <span>{formatMyr(point.revenue)} revenue</span>
      <span>{NUMBER.format(point.remaining)} remaining</span>
    </div>
  );
}

export function EventMetricCard({
  value,
  title,
  data,
  dataKey,
  color,
  className = "",
}: EventMetricCardProps) {
  return (
    <div className={`event-metric-card ${className}`.trim()}>
      <strong>{value}</strong>
      <span>{title}</span>
      {data.length > 0 ? (
        <div className="event-metric-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient
                  id={`eventMetric-${dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
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
                minTickGap={24}
                tick={{ fill: "#7b8490", fontSize: 9, fontWeight: 700 }}
              />
              <Tooltip
                content={EventMetricTooltip}
                cursor={{
                  stroke: color,
                  strokeDasharray: "3 4",
                  strokeWidth: 1,
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#eventMetric-${dataKey})`}
                dot={false}
                activeDot={{
                  fill: "#0d1117",
                  r: 4,
                  stroke: color,
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="event-metric-empty">No recorded sales activity yet</p>
      )}
    </div>
  );
}
