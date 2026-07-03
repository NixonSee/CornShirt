import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Returns every admin-curated venue with its fixed stage layout and zones.
// One payload serves both the create-event venue dropdown and the seat-map
// preview, so the client only needs a single fetch.
export async function GET() {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("venues")
    .select(
      "venue_id, name, venue_type, total_capacity, layout, " +
        "venue_zones(zone_id, code, label, capacity, category, shape)",
    )
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ venues: data ?? [] });
}
