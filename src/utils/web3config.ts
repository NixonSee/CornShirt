import { sepolia } from "viem/chains";

export const WEB3_CHAIN = sepolia;
export const WEB3_CHAIN_ID = sepolia.id;

export function getWeb3RpcUrl(): string {
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim();

  if (!rpcUrl) {
    throw new Error(
      "SEPOLIA_RPC_URL is not set. Add a Sepolia HTTP RPC endpoint.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rpcUrl);
  } catch {
    throw new Error("SEPOLIA_RPC_URL must be a valid URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("SEPOLIA_RPC_URL must use HTTP or HTTPS.");
  }

  return rpcUrl;
}

export function getContractAddress(): `0x${string}` {
  const addr = process.env.TICKET_NFT_CONTRACT_ADDRESS?.trim();
  if (!addr) {
    throw new Error(
      "TICKET_NFT_CONTRACT_ADDRESS is not set. Deploy the contract first.",
    );
  }
  return addr as `0x${string}`;
}

export function getPlatformPrivateKey(): `0x${string}` {
  const key = process.env.PLATFORM_CONTRACT_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error(
      "PLATFORM_CONTRACT_PRIVATE_KEY is not set. Add it to the server environment.",
    );
  }
  return key as `0x${string}`;
}
