export type ActivityItem = {
  id: string;
  type: "event" | "purchase" | "topup" | "verification" | "admin";
  message: string;
  timestamp: string;
};

const BADGE_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  event: { bg: "#eff6ff", text: "#2563eb" },
  purchase: { bg: "#dcfce7", text: "#16a34a" },
  topup: { bg: "#f5f3ff", text: "#a855f7" },
  verification: { bg: "#fef9c3", text: "#a16207" },
  admin: { bg: "#f1f5f9", text: "#64748b" },
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
  verification: "Verif",
  admin: "Admin",
};

export default function ActivityFeed({
  items,
}: {
  items: ActivityItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="card-dashboard">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748b]">
        Activity Feed
      </p>
      <div className="mt-4 space-y-1">
        {items.map((item) => {
          const badge = BADGE_STYLES[item.type] ?? { bg: "#f1f5f9", text: "#64748b" };
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-[10px] p-[10px_12px] text-sm transition hover:bg-[#f8fafc]"
            >
              <span
                className="mt-[1px] shrink-0 rounded-[5px] px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-[0.06em]"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
              <span className="flex-1 text-[12px] text-[#334155]">{item.message}</span>
              <span className="shrink-0 text-[11px] text-[#94a3b8]">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
