const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Pending: "#eab308",
  Active: "#22c55e",
  Completed: "#2563eb",
  Cancelled: "#ef4444",
};

type StatusItem = { name: string; value: number };

export default function EventPipeline({
  statusData,
}: {
  statusData: StatusItem[];
}) {
  if (statusData.length === 0) return null;

  const maxCount = Math.max(...statusData.map((s) => s.value), 1);
  const total = statusData.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="card-dashboard">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748b]">
        Event Pipeline
      </p>
      <div className="mt-4">
        {statusData.map((item) => {
          const color = STATUS_COLORS[item.name] ?? "#94a3b8";
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const widthPct = total > 0 ? (item.value / maxCount) * 100 : 0;

          return (
            <div key={item.name} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#334155]">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {item.name}
                </span>
                <span className="text-[12px] font-bold text-[#64748b]">
                  {item.value} &middot; {pct}%
                </span>
              </div>
              <div className="h-[10px] w-full overflow-hidden rounded-[5px] bg-[#f1f5f9]">
                <div
                  className="h-full rounded-[5px] transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
