export type ActivityItem = {
  id: string;
  type: "event" | "purchase" | "topup" | "verification" | "admin";
  message: string;
  timestamp: string;
};

const DOT_COLORS: Record<string, string> = {
  event: "#3b82f6",
  purchase: "#22c55e",
  topup: "#a855f7",
  verification: "#f59e0b",
  admin: "#64748b",
};

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

const TYPE_LABELS: Record<string, string> = {
  event: "Event",
  purchase: "Purchase",
  topup: "Top-up",
  verification: "Verification",
  admin: "Admin",
};

export default function ActivityFeed({
  items,
}: {
  items: ActivityItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="card-dashboard mt-10">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        Activity Feed
      </p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            <span
              className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: DOT_COLORS[item.type] ?? "#94a3b8" }}
              title={TYPE_LABELS[item.type] ?? item.type}
            />
            <span className="flex-1 text-slate-700">{item.message}</span>
            <span className="shrink-0 text-xs text-slate-400">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
