import { type NftTransferResult } from "./types";
import {
  getPublicClient,
  getContract,
} from "./contract";
import { createWalletClient, http, type Address } from "viem";
import { hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { HARDHAT_RPC_URL } from "@/utils/web3config";
import artifact from "@/abi/CornShirtTicket.json";

const abi = artifact.abi;

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
): Promise<NftTransferResult> {
  const useDeps = deps?.publicClient && deps?.contractAddress;

  const publicClient: unknown = useDeps ? deps!.publicClient : getPublicClient();
  const contractAddress = useDeps ? deps!.contractAddress : getContract(getPublicClient()).address;
  const contractAbi = useDeps ? (deps!.contractAbi ?? abi) : abi;

  const pc = publicClient as TransferDeps["publicClient"];

  const { walletClient } = useDeps
    ? deps!.createCustomerWallet(customerPrivateKey)
    : (() => {
        const account = privateKeyToAccount(customerPrivateKey);
        return {
          walletClient: createWalletClient({ account, chain: hardhat, transport: http(HARDHAT_RPC_URL) }),
        };
      })();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "safeTransferFrom",
    args: [from, to, tokenId],
  });

  await pc.waitForTransactionReceipt({ hash });

  return { transactionHash: hash };
}
