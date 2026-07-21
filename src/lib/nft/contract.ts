import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import artifact from "@/abi/CornShirtTicket.json";
import {
  HARDHAT_RPC_URL,
  getContractAddress,
  getPlatformPrivateKey,
} from "@/utils/web3config";

const abi = artifact.abi;
export type NftAbi = typeof abi;

function getAbi(): NftAbi {
  return abi;
}

export function getPublicClient() {
  return createPublicClient({
    chain: hardhat,
    transport: http(HARDHAT_RPC_URL),
  });
}

export function getPlatformWalletClient() {
  const account = privateKeyToAccount(getPlatformPrivateKey());
  return createWalletClient({
    account,
    chain: hardhat,
    transport: http(HARDHAT_RPC_URL),
  });
}

export function getContract(publicClient: ReturnType<typeof getPublicClient>) {
  return {
    address: getContractAddress(),
    abi: getAbi(),
  };
}

export function getContractWithWallet(
  walletClient: ReturnType<typeof getPlatformWalletClient>
) {
  return {
    address: getContractAddress(),
    abi: getAbi(),
    functionName: "" as string,
  };
}
