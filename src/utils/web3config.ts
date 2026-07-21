export const HARDHAT_RPC_URL = process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";
export const HARDHAT_CHAIN_ID = 31337;

export function getContractAddress(): `0x${string}` {
  const addr = process.env.TICKET_NFT_CONTRACT_ADDRESS;
  if (!addr) {
    throw new Error(
      "TICKET_NFT_CONTRACT_ADDRESS is not set. Deploy the contract first."
    );
  }
  return addr as `0x${string}`;
}

export function getPlatformPrivateKey(): `0x${string}` {
  const key = process.env.PLATFORM_CONTRACT_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "PLATFORM_CONTRACT_PRIVATE_KEY is not set. Add it to .env.local."
    );
  }
  return key as `0x${string}`;
}
