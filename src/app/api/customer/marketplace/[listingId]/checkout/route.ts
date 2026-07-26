import { authorizeApiRole } from "@/lib/requireRole";
import { getPublicRequestOrigin } from "@/lib/requestOrigin";
import { createResaleCheckoutSession } from "@/lib/stripe/resale";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    idempotencyKey?: unknown;
  } | null;
  const idempotencyKey =
    typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!/^[a-zA-Z0-9_-]{16,120}$/.test(idempotencyKey)) {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const { listingId } = await params;
  const result = await createResaleCheckoutSession({
    listingId,
    buyerId: auth.identity.user.id,
    idempotencyKey,
    origin: getPublicRequestOrigin(request),
  });

  return Response.json(
    result.ok
      ? { url: result.url, operationId: result.operationId }
      : { error: result.error },
    { status: result.ok ? 200 : result.status },
  );
}
