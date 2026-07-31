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
    .select("operation_id, state, ticket_id, listing_id, updated_at")
    .eq("operation_id", operationId)
    .eq("actor_user_id", auth.identity.user.id)
    .eq("operation_kind", "resale_purchase")
    .maybeSingle();
  if (result.error || !result.data) {
    return Response.json({ error: "Resale purchase not found." }, { status: 404 });
  }

  return Response.json(result.data);
}
