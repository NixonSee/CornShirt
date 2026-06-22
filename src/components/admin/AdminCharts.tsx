"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const ROLE_COLORS: Record<string, string> = {
  User: "#2563eb",
  Organizer: "#a855f7",
  Admin: "#64748b",
};

type ChartItem = { name: string; value: number };

export default function AdminCharts({
  roleData,
}: {
  roleData: ChartItem[];
}) {
  if (roleData.length === 0) return null;

  return (
    <div className="card-dashboard">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748b]">
        User Roles
      </p>
      <div className="mt-4 flex justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart margin={{ top: 24 }}>
            <Pie
              data={roleData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {roleData.map((item, i) => (
                <Cell key={i} fill={ROLE_COLORS[item.name] ?? "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
