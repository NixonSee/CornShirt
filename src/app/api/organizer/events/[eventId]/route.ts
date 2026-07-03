import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildTicketTypeRows, parseLayout } from "@/lib/eventTicketTypes";

// Derive the storage object path from a public banner URL so we can delete the
// old file when it's replaced. Public URLs look like
// ".../storage/v1/object/public/event-banners/<organizerId>/<uuid>.<ext>".
function bannerPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = "/event-banners/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const auth = await authorizeApiRole(["organizer"]);
  if (!auth.ok) return auth.response;

  const organizerId = auth.identity.user.id;
  const { eventId } = await params;

  // Load the existing event and enforce ownership + editability server-side.
  const { data: existing, error: loadError } = await supabaseAdmin
    .from("events")
    .select("event_id, organizer_id, status, banner_image")
    .eq("event_id", eventId)
    .single();

  if (loadError || !existing || existing.organizer_id !== organizerId) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return Response.json(
      { error: "Only pending events can be edited." },
      { status: 403 },
    );
  }

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

  // The banner is optional on edit — a new file replaces it, otherwise the
  // existing one is kept. Only validate when a new file was actually sent.
  const hasNewBanner = !!bannerFile && bannerFile.size > 0;
  if (hasNewBanner && bannerFile.size > 10 * 1024 * 1024) {
    return Response.json({ error: "Banner image must be under 10 MB." }, { status: 400 });
  }

  const layout = parseLayout(layoutJson);
  if (!layout) {
    return Response.json({ error: "Invalid seat-map layout." }, { status: 400 });
  }

  const built = await buildTicketTypeRows(venueId, layout);
  if (!built.ok) {
    return Response.json({ error: built.error }, { status: built.status });
  }

  // Upload a replacement banner if one was provided.
  let bannerUrl = existing.banner_image as string | null;
  let newBannerPath: string | null = null;
  if (hasNewBanner) {
    const ext = bannerFile.name.split(".").pop() ?? "jpg";
    newBannerPath = `${organizerId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("event-banners")
      .upload(newBannerPath, bannerFile, {
        contentType: bannerFile.type,
        upsert: false,
      });
    if (uploadError) {
      return Response.json(
        { error: "Banner upload failed: " + uploadError.message },
        { status: 500 },
      );
    }
    bannerUrl = supabaseAdmin.storage
      .from("event-banners")
      .getPublicUrl(newBannerPath).data.publicUrl;
  }

  // Update the event row (status stays "pending").
  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({
      event_name: eventName,
      artist_name: artistName,
      venue,
      venue_id: venueId,
      event_date: eventDate,
      category,
      description,
      banner_image: bannerUrl,
      layout,
    })
    .eq("event_id", eventId)
    .eq("organizer_id", organizerId);

  if (updateError) {
    // Roll back a freshly-uploaded banner so we don't orphan it.
    if (newBannerPath) {
      await supabaseAdmin.storage.from("event-banners").remove([newBannerPath]);
    }
    return Response.json(
      { error: "Failed to update event: " + updateError.message },
      { status: 500 },
    );
  }

  // Rebuild ticket types. Safe to delete + re-insert: pending events have no
  // sold tickets referencing these rows.
  const { error: deleteError } = await supabaseAdmin
    .from("ticket_types")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    return Response.json(
      { error: "Failed to update ticket types: " + deleteError.message },
      { status: 500 },
    );
  }

  const rowsToInsert = built.rows.map((row) => ({ ...row, event_id: eventId }));
  const { error: insertError } = await supabaseAdmin
    .from("ticket_types")
    .insert(rowsToInsert);

  if (insertError) {
    return Response.json(
      { error: "Failed to save ticket types: " + insertError.message },
      { status: 500 },
    );
  }

  // Best-effort cleanup of the replaced banner once everything else succeeded.
  if (hasNewBanner) {
    const oldPath = bannerPathFromUrl(existing.banner_image as string | null);
    if (oldPath && oldPath !== newBannerPath) {
      await supabaseAdmin.storage.from("event-banners").remove([oldPath]);
    }
  }

  return Response.json({ eventId });
}
