type TicketTypeRow = {
  type_name: string;
  price: number;
  total_supply: number;
  remaining_supply: number;
  event_id: string;
};

type EventGroup = {
  eventId: string;
  eventName: string;
  types: {
    typeName: string;
    price: number;
    totalSupply: number;
    remainingSupply: number;
    sold: number;
    utilizationPct: number;
  }[];
  totalSold: number;
};

const STATUS_COLORS: Record<string, string> = {
  GA: "#2563eb",
  VIP: "#a855f7",
  "Early Bird": "#22c55e",
};

export default function TicketAnalytics({
  ticketTypes,
  eventLookup,
}: {
  ticketTypes: TicketTypeRow[];
  eventLookup: Record<string, string>;
}) {
  if (ticketTypes.length === 0) return null;

  const groups: Record<string, EventGroup> = {};

  for (const tt of ticketTypes) {
    const eventName = eventLookup[tt.event_id] ?? `Event ${tt.event_id.slice(0, 8)}`;
    const sold = tt.total_supply - tt.remaining_supply;
    const utilizationPct =
      tt.total_supply > 0
        ? Math.round((sold / tt.total_supply) * 100)
        : 0;

    if (!groups[tt.event_id]) {
      groups[tt.event_id] = { eventId: tt.event_id, eventName, types: [], totalSold: 0 };
    }
    groups[tt.event_id].types.push({
      typeName: tt.type_name,
      price: tt.price,
      totalSupply: tt.total_supply,
      remainingSupply: tt.remaining_supply,
      sold,
      utilizationPct,
    });
    groups[tt.event_id].totalSold += sold;
  }

  const sorted = Object.values(groups)
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  for (const group of sorted) {
    group.types.sort((a, b) => b.utilizationPct - a.utilizationPct);
  }

  return (
    <div className="card-dashboard flex max-h-[360px] flex-col">
      <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748b]">
        Ticket Utilization
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto mt-4">
        {sorted.map((group) => (
          <div
            key={group.eventId}
            className="mb-6 border-b border-[#f1f5f9] pb-5 last:mb-0 last:border-0 last:pb-0"
          >
            <p className="text-[14px] font-bold text-[#0f172a]">
              {group.eventName}
            </p>
            <p className="mb-[14px] text-[11px] text-[#94a3b8]">
              {group.totalSold} tickets sold
            </p>
            <div className="space-y-2">
              {group.types.map((t) => {
                const color = STATUS_COLORS[t.typeName] ?? "#94a3b8";
                return (
                  <div key={t.typeName} className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="w-[72px] shrink-0 text-[12px] font-semibold text-[#475569]">
                      {t.typeName}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-[4px] bg-[#f1f5f9]">
                        <div
                          className="h-full rounded-[4px] transition-all"
                          style={{
                            width: `${t.utilizationPct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-[38px] shrink-0 text-right text-[11px] font-bold text-[#64748b]">
                      {t.utilizationPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
