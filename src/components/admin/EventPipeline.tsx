const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Pending: "#eab308",
  Active: "#22c55e",
  Completed: "#3b82f6",
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
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        Event Pipeline
      </p>
      <div className="mt-4 space-y-3">
        {statusData.map((item) => {
          const color = STATUS_COLORS[item.name] ?? "#94a3b8";
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const widthPct = total > 0 ? (item.value / maxCount) * 100 : 0;

          return (
            <div key={item.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {item.name}
                </span>
                <span className="text-slate-500">
                  {item.value} ({pct}%)
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
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
