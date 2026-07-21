import { type NftBurnResult } from "./types";
import {
  getPublicClient,
  getPlatformWalletClient,
  getContract,
} from "./contract";
import type { Address } from "viem";
import artifact from "@/abi/CornShirtTicket.json";

const abi = artifact.abi;

export type BurnDeps = {
  publicClient: {
    waitForTransactionReceipt: (...args: unknown[]) => Promise<{ status: string }>;
  };
  walletClient: {
    writeContract: (...args: unknown[]) => Promise<`0x${string}`>;
  };
  contractAddress: Address;
  contractAbi?: typeof abi;
};

export async function burnRefundedTicket(
  tokenId: bigint,
  deps?: BurnDeps,
): Promise<NftBurnResult> {
  const useDeps = deps?.publicClient && deps?.contractAddress;

  const publicClient: unknown = useDeps ? deps!.publicClient : getPublicClient();
  const walletClient: unknown = useDeps ? deps!.walletClient : getPlatformWalletClient();
  const contractAddress = useDeps ? deps!.contractAddress : getContract(getPublicClient()).address;
  const contractAbi = useDeps ? (deps!.contractAbi ?? abi) : abi;

  const pc = publicClient as BurnDeps["publicClient"];
  const wc = walletClient as BurnDeps["walletClient"];

  const hash = await wc.writeContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "burnRefundedTicket",
    args: [tokenId],
  });

  await pc.waitForTransactionReceipt({ hash });

  return { transactionHash: hash };
}
