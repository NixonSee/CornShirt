const STATUS_PILL: Record<string, string> = {
  draft: "bg-[#f1f5f9] text-[#475569]",
  pending: "bg-[#fef9c3] text-[#a16207]",
  active: "bg-[#dcfce7] text-[#15803d]",
  completed: "bg-[#dbeafe] text-[#1d4ed8]",
  cancelled: "bg-[#fee2e2] text-[#b91c1c]",
};

type RecentEvent = {
  event_name: string;
  artist_name: string | null;
  venue: string | null;
  event_date: string | null;
  status: string | null;
};

export default function RecentEventsTable({
  events,
}: {
  events: RecentEvent[];
}) {
  if (events.length === 0) return null;

  return (
    <section className="card-dashboard">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748b]">
        Recent Events
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-[10px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8]">
              <th className="px-[14px] py-[10px] text-left">Event Name</th>
              <th className="px-[14px] py-[10px] text-left">Artist</th>
              <th className="px-[14px] py-[10px] text-left">Venue</th>
              <th className="px-[14px] py-[10px] text-left">Date</th>
              <th className="px-[14px] py-[10px] text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => {
              const pillClass =
                STATUS_PILL[event.status?.toLowerCase() ?? ""] ??
                "bg-[#f1f5f9] text-[#475569]";
              return (
                <tr
                  key={i}
                  className="border-b border-[#f1f5f9] transition hover:bg-[#f8fafc] last:border-0"
                >
                  <td className="px-[14px] py-3 font-semibold text-[#0f172a]">
                    {event.event_name}
                  </td>
                  <td className="px-[14px] py-3 text-[#334155]">
                    {event.artist_name}
                  </td>
                  <td className="px-[14px] py-3 text-[#334155]">
                    {event.venue}
                  </td>
                  <td className="px-[14px] py-3 text-[#334155]">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-[14px] py-3">
                    <span
                      className={`inline-block rounded-[6px] px-[10px] py-[4px] text-[10px] font-bold uppercase tracking-[0.04em] ${pillClass}`}
                    >
                      {event.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
