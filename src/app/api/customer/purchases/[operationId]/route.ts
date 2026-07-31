import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;

  const { operationId } = await params;
  const result = await supabaseAdmin
    .from("ticket_operations")
    .select("operation_id, state, ticket_id, safe_error_category, updated_at")
    .eq("operation_id", operationId)
    .eq("actor_user_id", auth.identity.user.id)
    .eq("operation_kind", "primary_purchase")
    .maybeSingle();

  if (result.error || !result.data) {
    return Response.json({ error: "Purchase not found." }, { status: 404 });
  }

  return Response.json({
    operationId: result.data.operation_id,
    state: result.data.state,
    ticketId: result.data.ticket_id,
    recoverable: ["payment_confirmed", "asset_submitted", "delivery_failed"].includes(
      String(result.data.state),
    ),
    updatedAt: result.data.updated_at,
  });
}
