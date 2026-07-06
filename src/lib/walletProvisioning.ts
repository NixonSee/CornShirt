import "server-only";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  encryptPrivateKey,
  readWalletEncryptionKey,
  type EncryptedPrivateKey,
} from "@/lib/walletEncryption";
import {
  parseProvisioningRpcResult,
  provisionCustomerWallet as runProvisioning,
  WalletProvisioningError,
  type PersistWalletInput,
  type WalletProvisioningDependencies,
  type WalletState,
} from "@/lib/walletProvisioningCore";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export { WalletProvisioningError };

async function loadWalletState(userId: string): Promise<WalletState> {
  const [profileResult, walletResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("wallet_address, wallet_status")
      .eq("user_id", userId)
      .single(),
    supabaseAdmin
      .from("custodial_wallets")
      .select("wallet_address")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new WalletProvisioningError(
      "Customer profile is unavailable.",
      409,
    );
  }
  if (walletResult.error) {
    throw new WalletProvisioningError(
      "Wallet state could not be loaded.",
      500,
    );
  }

  const profile = profileResult.data;
  const profileAddress = profile.wallet_address as string | null;
  const storedAddress =
    (walletResult.data?.wallet_address as string | undefined) ?? null;

  if (profile.wallet_status === "ready" && profileAddress && storedAddress) {
    return profileAddress.toLowerCase() === storedAddress.toLowerCase()
      ? { kind: "ready", walletAddress: profileAddress }
      : { kind: "inconsistent", walletAddress: profileAddress };
  }

  if (profileAddress || storedAddress || profile.wallet_status === "ready") {
    return {
      kind: "inconsistent",
      walletAddress: profileAddress ?? storedAddress ?? "unavailable",
    };
  }

  return {
    kind: profile.wallet_status === "failed" ? "failed" : "pending",
    walletAddress: null,
  };
}

// Server calls the PostgreSQL RPC function to persist the wallet and encrypted private key. The RPC function is responsible for storing the wallet in the database and ensuring that the wallet is only stored if the profile is in a pending state.
// And it runs in Supabase
async function persistWallet(input: PersistWalletInput) {
  const { data, error } = await supabaseAdmin
    .rpc("provision_customer_wallet", {
      p_user_id: input.userId,
      p_wallet_address: input.walletAddress,
      p_encrypted_private_key: input.encrypted.ciphertext,
      p_encryption_iv: input.encrypted.iv,
      p_encryption_auth_tag: input.encrypted.authTag,
      p_key_version: input.encrypted.keyVersion,
    })
    .single();

  if (error || !data) {
    throw new Error("wallet_rpc_failed");
  }

  return parseProvisioningRpcResult(data);
}

async function markFailed(
  userId: string,
  category: "configuration_error" | "storage_error",
) {
  await supabaseAdmin
    .from("profiles")
    .update({ wallet_status: "failed", wallet_error: category })
    .eq("user_id", userId)
    .in("role", ["customer", "user"])
    .is("wallet_address", null);
}

// Creates and configure a wallet for a customer, returning the wallet address and private key. The wallet is encrypted and stored in the database.
const dependencies: WalletProvisioningDependencies = {
  loadWalletState,
  generateWallet: () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { address: account.address, privateKey };
  },
  encryptWallet: (privateKey): EncryptedPrivateKey =>
    encryptPrivateKey(privateKey, readWalletEncryptionKey()),
  persistWallet,
  markFailed,
};

export function provisionCustomerWallet(userId: string) {
  return runProvisioning(userId, dependencies);
}
