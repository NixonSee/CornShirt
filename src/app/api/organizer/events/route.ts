import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildTicketTypeRows, parseLayout } from "@/lib/eventTicketTypes";

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const organizerId = auth.identity.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const eventName = (formData.get("eventName") as string | null)?.trim();
  const artistName = (formData.get("artistName") as string | null)?.trim() || null;
  const venue = (formData.get("venue") as string | null)?.trim() || null;
  const venueId = (formData.get("venueId") as string | null)?.trim() || null;
  const eventDate = (formData.get("eventDate") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const bannerFile = formData.get("banner") as File | null;
  const layoutJson = formData.get("layout") as string | null;

  if (!eventName) {
    return Response.json({ error: "Event name is required." }, { status: 400 });
  }
  if (!eventDate) {
    return Response.json({ error: "Event date is required." }, { status: 400 });
  }
  if (!venueId) {
    return Response.json({ error: "A venue is required." }, { status: 400 });
  }
  if (!bannerFile || bannerFile.size === 0) {
    return Response.json({ error: "Banner image is required." }, { status: 400 });
  }
  if (bannerFile.size > 10 * 1024 * 1024) {
    return Response.json({ error: "Banner image must be under 10 MB." }, { status: 400 });
  }

  const layout = parseLayout(layoutJson);
  if (!layout) {
    return Response.json({ error: "Invalid seat-map layout." }, { status: 400 });
  }

  // Build one ticket_types row per priced zone (cross-checked against the venue).
  const built = await buildTicketTypeRows(venueId, layout);
  if (!built.ok) {
    return Response.json({ error: built.error }, { status: built.status });
  }

  // Upload banner to Supabase Storage
  const ext = bannerFile.name.split(".").pop() ?? "jpg";
  const bannerPath = `${organizerId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("event-banners")
    .upload(bannerPath, bannerFile, { contentType: bannerFile.type, upsert: false });

  if (uploadError) {
    return Response.json(
      { error: "Banner upload failed: " + uploadError.message },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl: bannerUrl },
  } = supabaseAdmin.storage.from("event-banners").getPublicUrl(bannerPath);

  // Insert event with status pending and the re-editable layout blob
  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from("events")
    .insert({
      organizer_id: organizerId,
      event_name: eventName,
      artist_name: artistName,
      venue,
      venue_id: venueId,
      event_date: eventDate,
      category,
      description,
      banner_image: bannerUrl,
      status: "pending",
      layout,
    })
    .select("event_id")
    .single();

  if (eventError || !eventRow) {
    await supabaseAdmin.storage.from("event-banners").remove([bannerPath]);
    return Response.json(
      { error: "Failed to create event: " + (eventError?.message ?? "unknown error") },
      { status: 500 },
    );
  }

  const eventId = eventRow.event_id as string;

  const rowsToInsert = built.rows.map((row) => ({ ...row, event_id: eventId }));

  const { error: ttError } = await supabaseAdmin
    .from("ticket_types")
    .insert(rowsToInsert);

  if (ttError) {
    // Roll back — delete the event and the uploaded banner
    await supabaseAdmin.from("events").delete().eq("event_id", eventId);
    await supabaseAdmin.storage.from("event-banners").remove([bannerPath]);
    return Response.json(
      { error: "Failed to save ticket types: " + ttError.message },
      { status: 500 },
    );
  }

  return Response.json({ eventId });
}
