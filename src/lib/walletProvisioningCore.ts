import type { EncryptedPrivateKey } from "./walletEncryption";

export type WalletState =
  | { kind: "pending" | "failed"; walletAddress: null }
  | { kind: "ready" | "inconsistent"; walletAddress: string };

export interface PersistWalletInput {
  userId: string;
  walletAddress: string;
  encrypted: EncryptedPrivateKey;
}

export interface PersistedWallet {
  walletAddress: string;
  walletStatus: "ready";
  created: boolean;
}

export interface WalletProvisioningDependencies {
  loadWalletState(userId: string): Promise<WalletState>;
  generateWallet(): { address: string; privateKey: `0x${string}` };
  encryptWallet(privateKey: `0x${string}`): EncryptedPrivateKey;
  persistWallet(input: PersistWalletInput): Promise<PersistedWallet>;
  markFailed(
    userId: string,
    category: "configuration_error" | "storage_error",
  ): Promise<void>;
}

export class WalletProvisioningError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WalletProvisioningError";
    this.status = status;
  }
}

export function parseProvisioningRpcResult(value: unknown): PersistedWallet {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid wallet provisioning RPC result.");
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.wallet_address !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(record.wallet_address) ||
    record.wallet_status !== "ready" ||
    typeof record.created !== "boolean"
  ) {
    throw new Error("Invalid wallet provisioning RPC result.");
  }

  return {
    walletAddress: record.wallet_address,
    walletStatus: "ready",
    created: record.created,
  };
}

export async function provisionCustomerWallet(
  userId: string,
  dependencies: WalletProvisioningDependencies,
): Promise<PersistedWallet> {
  const state = await dependencies.loadWalletState(userId);

  if (state.kind === "ready") {
    return {
      walletAddress: state.walletAddress,
      walletStatus: "ready",
      created: false,
    };
  }

  if (state.kind === "inconsistent") {
    throw new WalletProvisioningError(
      "Managed wallet records are inconsistent and require inspection.",
      409,
    );
  }

  try {
    const generated = dependencies.generateWallet();
    const encrypted = dependencies.encryptWallet(generated.privateKey);

    return await dependencies.persistWallet({
      userId,
      walletAddress: generated.address,
      encrypted,
    });
  } catch (error) {
    const category =
      error instanceof Error && error.message.includes("WALLET_ENCRYPTION_KEY")
        ? "configuration_error"
        : "storage_error";

    try {
      await dependencies.markFailed(userId, category);
    } catch {
      // Preserve the stable provisioning error even if failure-state storage fails.
    }

    throw new WalletProvisioningError(
      "Managed wallet could not be provisioned. Please retry.",
      500,
    );
  }
}
