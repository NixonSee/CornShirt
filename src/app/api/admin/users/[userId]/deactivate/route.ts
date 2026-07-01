import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authorizeApiRole(["admin"]);
  if (!auth.ok) return auth.response;

  const adminId = auth.identity.user.id;
  const { userId } = await params;

  if (adminId === userId) {
    return Response.json(
      { error: "You cannot deactivate your own account." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };
  const reason = body.reason ?? "";

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  if (profile.role === "organizer") {
    const { count } = await supabaseAdmin
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", userId)
      .in("status", ["active", "pending"])
      .gte("event_date", new Date().toISOString());

    if (count && count > 0) {
      return Response.json(
        {
          error: `Cannot deactivate this organizer. They have ${count} active or upcoming event${count === 1 ? "" : "s"}. Ask the organizer to cancel them first.`,
        },
        { status: 400 },
      );
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      status: "deactivated",
      deactivation_type: "admin",
      deactivated_at: new Date().toISOString(),
      deactivated_by: adminId,
      deactivation_reason: reason,
    })
    .eq("user_id", userId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const { error: logError } = await supabaseAdmin
    .from("admin_activity_logs")
    .insert({
      admin_id: adminId,
      action_type: "deactivate_user",
      target_type: "user",
      target_id: userId,
      description: reason
        ? `Deactivated user: ${reason}`
        : "Deactivated user",
    });

  if (logError) {
    console.error("Failed to log admin activity:", logError.message);
  }

  return Response.json({ success: true });
}
