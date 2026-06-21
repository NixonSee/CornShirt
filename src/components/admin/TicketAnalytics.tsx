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
  GA: "#3b82f6",
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
    <div className="card-dashboard">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        Ticket Utilization
      </p>
      <div className="mt-4 max-h-[500px] space-y-5 overflow-y-auto">
        {sorted.map((group) => (
          <div key={group.eventId}>
            <p className="text-sm font-bold text-slate-900">
              {group.eventName}
            </p>
            <p className="text-xs text-slate-500">
              {group.totalSold} tickets sold
            </p>
            <div className="mt-2 space-y-2">
              {group.types.map((t) => {
                const color = STATUS_COLORS[t.typeName] ?? "#94a3b8";
                return (
                  <div key={t.typeName}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {t.typeName}
                      </span>
                      <span className="text-slate-500">
                        {t.sold} / {t.totalSupply} sold
                      </span>
                    </div>
                    <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${t.utilizationPct}%`, backgroundColor: color }}
                      />
                    </div>
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
