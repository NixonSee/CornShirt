import { authorizeApiRole } from "@/lib/requireRole";
import {
  provisionCustomerWallet,
  WalletProvisioningError,
} from "@/lib/walletProvisioning";

export async function POST() {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await provisionCustomerWallet(auth.identity.user.id);

    return Response.json(
      {
        walletAddress: result.walletAddress,
        walletStatus: result.walletStatus,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof WalletProvisioningError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      { error: "Managed wallet could not be provisioned. Please retry." },
      { status: 500 },
    );
  }
}
