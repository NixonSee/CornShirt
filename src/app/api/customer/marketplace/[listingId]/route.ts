import { cancelResaleListing } from "@/lib/marketplace";
import { authorizeApiRole } from "@/lib/requireRole";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;
  const { listingId } = await params;
  const result = await cancelResaleListing(auth.identity.user.id, listingId);
  return Response.json(result.body, { status: result.status });
}
