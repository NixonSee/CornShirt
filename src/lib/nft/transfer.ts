import { type NftTransferResult } from "./types";
import {
  getPublicClient,
  getContract,
} from "./contract";
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { WEB3_CHAIN, getWeb3RpcUrl } from "@/utils/web3config";
import artifact from "@/abi/CornShirtTicket.json";

const abi = artifact.abi;

export class NftTransferRevertedError extends Error {
  constructor() {
    super("NFT transfer transaction reverted.");
    this.name = "NftTransferRevertedError";
  }
}

export type TransferDeps = {
  publicClient: {
    waitForTransactionReceipt: (...args: unknown[]) => Promise<{ status: string }>;
  };
  createCustomerWallet: (privateKey: Address) => {
    walletClient: { writeContract: (...args: unknown[]) => Promise<`0x${string}`> };
  };
  contractAddress: Address;
  contractAbi?: typeof abi;
};

export async function transferTicket(
  customerPrivateKey: Address,
  from: Address,
  to: Address,
  tokenId: bigint,
  deps?: TransferDeps,
  onSubmitted?: (hash: `0x${string}`) => Promise<void>,
): Promise<NftTransferResult> {
  const useDeps = deps?.publicClient && deps?.contractAddress;

  const publicClient: unknown = useDeps ? deps!.publicClient : getPublicClient();
  const contractAddress = useDeps ? deps!.contractAddress : getContract().address;
  const contractAbi = useDeps ? (deps!.contractAbi ?? abi) : abi;

  const pc = publicClient as TransferDeps["publicClient"];

  const { walletClient } = useDeps
    ? deps!.createCustomerWallet(customerPrivateKey)
    : (() => {
        const account = privateKeyToAccount(customerPrivateKey);
        return {
          walletClient: createWalletClient({
            account,
            chain: WEB3_CHAIN,
            transport: http(getWeb3RpcUrl()),
          }),
        };
      })();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "safeTransferFrom",
    args: [from, to, tokenId],
  });
  await onSubmitted?.(hash);

  const receipt = await pc.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new NftTransferRevertedError();
  }

  return { transactionHash: hash };
}
