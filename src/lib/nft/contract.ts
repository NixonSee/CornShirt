import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import artifact from "@/abi/CornShirtTicket.json";
import {
  WEB3_CHAIN,
  getContractAddress,
  getPlatformPrivateKey,
  getWeb3RpcUrl,
} from "@/utils/web3config";

const abi = artifact.abi;
export type NftAbi = typeof abi;

function getAbi(): NftAbi {
  return abi;
}

export function getPublicClient() {
  return createPublicClient({
    chain: WEB3_CHAIN,
    transport: http(getWeb3RpcUrl()),
  });
}

export function getPlatformWalletClient() {
  const account = privateKeyToAccount(getPlatformPrivateKey());
  return createWalletClient({
    account,
    chain: WEB3_CHAIN,
    transport: http(getWeb3RpcUrl()),
  });
}

export function getContract() {
  return {
    address: getContractAddress(),
    abi: getAbi(),
  };
}
