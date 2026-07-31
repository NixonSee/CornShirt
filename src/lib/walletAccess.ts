import "server-only";

import type { Address, Hex } from "viem";

import {
  decryptPrivateKey,
  readWalletEncryptionKey,
} from "@/lib/walletEncryption";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ManagedWalletSigner = {
  address: Address;
  privateKey: Hex;
};

export async function loadManagedWalletSigner(
  userId: string,
): Promise<ManagedWalletSigner> {
  const [profileResult, walletResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("wallet_address, wallet_status")
      .eq("user_id", userId)
      .single(),
    supabaseAdmin
      .from("custodial_wallets")
      .select(
        "wallet_address, encrypted_private_key, encryption_iv, encryption_auth_tag, key_version",
      )
      .eq("user_id", userId)
      .single(),
  ]);

  if (
    profileResult.error ||
    walletResult.error ||
    !profileResult.data ||
    !walletResult.data ||
    profileResult.data.wallet_status !== "ready"
  ) {
    throw new Error("Managed wallet is unavailable.");
  }

  const profileAddress = String(profileResult.data.wallet_address ?? "");
  const storedAddress = String(walletResult.data.wallet_address ?? "");
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(profileAddress) ||
    profileAddress.toLowerCase() !== storedAddress.toLowerCase()
  ) {
    throw new Error("Managed wallet records are inconsistent.");
  }

  const privateKey = decryptPrivateKey(
    {
      ciphertext: String(walletResult.data.encrypted_private_key),
      iv: String(walletResult.data.encryption_iv),
      authTag: String(walletResult.data.encryption_auth_tag),
      keyVersion: Number(walletResult.data.key_version),
    },
    readWalletEncryptionKey(),
  );

  return { address: profileAddress as Address, privateKey };
}
