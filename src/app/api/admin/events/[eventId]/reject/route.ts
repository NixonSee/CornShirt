import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  let body: { admin_id?: string };
  try {
    body = await _request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { admin_id } = body;

  if (!admin_id) {
    return Response.json({ error: "admin_id is required" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", admin_id)
    .single();

  if (!profile || profile.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("events")
    .update({ status: "draft" })
    .eq("event_id", eventId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const { error: logError } = await supabaseAdmin
    .from("admin_activity_logs")
    .insert({
      admin_id,
      action_type: "reject_event",
      target_type: "event",
      target_id: eventId,
      description: "Rejected event",
    });

  if (logError) {
    console.error("Failed to log admin activity:", logError.message);
  }

  return Response.json({ success: true });
}
