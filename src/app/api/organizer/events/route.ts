import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface TicketTypeInput {
  name: string;
  price: number;
  supply: number;
  purchaseLimit: number;
  transferable: boolean;
}

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
  const eventDate = (formData.get("eventDate") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const bannerFile = formData.get("banner") as File | null;
  const ticketTypesJson = formData.get("ticketTypes") as string | null;

  if (!eventName) {
    return Response.json({ error: "Event name is required." }, { status: 400 });
  }
  if (!eventDate) {
    return Response.json({ error: "Event date is required." }, { status: 400 });
  }
  if (!bannerFile || bannerFile.size === 0) {
    return Response.json({ error: "Banner image is required." }, { status: 400 });
  }
  if (bannerFile.size > 10 * 1024 * 1024) {
    return Response.json({ error: "Banner image must be under 10 MB." }, { status: 400 });
  }

  let ticketTypes: TicketTypeInput[];
  try {
    ticketTypes = JSON.parse(ticketTypesJson ?? "[]");
    if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) throw new Error();
  } catch {
    return Response.json({ error: "At least one ticket type is required." }, { status: 400 });
  }

  for (const tt of ticketTypes) {
    if (!tt.name?.trim()) {
      return Response.json({ error: "All ticket types must have a name." }, { status: 400 });
    }
    if (typeof tt.price !== "number" || tt.price < 0) {
      return Response.json({ error: "Ticket prices must be 0 or greater." }, { status: 400 });
    }
    if (typeof tt.supply !== "number" || tt.supply < 1) {
      return Response.json({ error: "Ticket supply must be at least 1." }, { status: 400 });
    }
    if (typeof tt.purchaseLimit !== "number" || tt.purchaseLimit < 1) {
      return Response.json({ error: "Purchase limit must be at least 1." }, { status: 400 });
    }
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

  // Insert event with status pending
  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from("events")
    .insert({
      organizer_id: organizerId,
      event_name: eventName,
      artist_name: artistName,
      venue,
      event_date: eventDate,
      category,
      description,
      banner_image: bannerUrl,
      status: "pending",
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

  // Insert ticket types
  const ticketTypeRows = ticketTypes.map((tt) => ({
    event_id: eventId,
    type_name: tt.name.trim(),
    price: tt.price,
    total_supply: tt.supply,
    remaining_supply: tt.supply,
    purchase_limit: tt.purchaseLimit,
    transfer_allowed: tt.transferable,
  }));

  const { error: ttError } = await supabaseAdmin
    .from("ticket_types")
    .insert(ticketTypeRows);

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
