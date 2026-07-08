import { parseResaleMyrPrice } from "@/app/customer/marketplace/marketplaceData";
import { createResaleListing } from "@/lib/marketplace";
import { authorizeApiRole } from "@/lib/requireRole";

export async function POST(request: Request) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as {
    ticketId?: unknown;
    price?: unknown;
  } | null;
  const price = parseResaleMyrPrice(String(body?.price ?? ""));
  if (typeof body?.ticketId !== "string" || price === null) {
    return Response.json(
      { error: "Enter a valid ticket and positive MYR price (up to two decimal places)." },
      { status: 400 },
    );
  }
  const result = await createResaleListing(auth.identity.user.id, body.ticketId, price);
  return Response.json(result.body, { status: result.status });
}
