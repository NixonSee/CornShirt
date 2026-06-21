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
    <section className="card-dashboard mt-10">
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
        Recent Events
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500">
              <th className="py-3 pr-4">Event Name</th>
              <th className="py-3 pr-4">Artist</th>
              <th className="py-3 pr-4">Venue</th>
              <th className="py-3 pr-4">Date</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="py-3 pr-4 font-semibold text-slate-950">
                  {event.event_name}
                </td>
                <td className="py-3 pr-4 text-slate-700">
                  {event.artist_name}
                </td>
                <td className="py-3 pr-4 text-slate-700">{event.venue}</td>
                <td className="py-3 pr-4 text-slate-700">
                  {event.event_date
                    ? new Date(event.event_date).toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-3">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {event.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
