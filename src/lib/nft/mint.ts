import { type NftMintResult } from "./types";
import {
  getPublicClient,
  getPlatformWalletClient,
  getContract,
} from "./contract";
import { decodeEventLog, zeroAddress, type Address } from "viem";
import artifact from "@/abi/CornShirtTicket.json";

const ZERO: Address = zeroAddress;
const abi = artifact.abi;

export type MintDeps = {
  publicClient: {
    simulateContract: (...args: unknown[]) => Promise<{ request: unknown; result: bigint }>;
    waitForTransactionReceipt: (...args: unknown[]) => Promise<{ status: string; logs: { address: string; data: `0x${string}`; topics: `0x${string}`[] }[] }>;
  };
  walletClient: {
    writeContract: (...args: unknown[]) => Promise<`0x${string}`>;
    account: { address: Address };
  };
  contractAddress: Address;
  contractAbi?: typeof abi;
};

export async function mintTicket(
  to: Address,
  deps?: MintDeps,
): Promise<NftMintResult> {
  const useDeps = deps?.publicClient && deps?.contractAddress;

  const publicClient: unknown = useDeps ? deps!.publicClient : getPublicClient();
  const walletClient: unknown = useDeps ? deps!.walletClient : getPlatformWalletClient();
  const contractAddress = useDeps ? deps!.contractAddress : getContract(getPublicClient()).address;
  const contractAbi = useDeps ? (deps!.contractAbi ?? abi) : abi;

  const pc = publicClient as MintDeps["publicClient"];
  const wc = walletClient as MintDeps["walletClient"];

  const { request } = await pc.simulateContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "mintTicket",
    args: [to],
    account: wc.account!,
  });

  const hash = await wc.writeContract(request);

  const receipt = await pc.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error("NFT mint transaction reverted.");
  }

  let tokenId: bigint | undefined;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;

    const decoded = decodeEventLog({
      abi: contractAbi,
      data: log.data,
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
    });

    if (!decoded.args) continue;

    if (
      decoded.eventName === "Transfer" &&
      "from" in decoded.args &&
      decoded.args.from === ZERO &&
      "to" in decoded.args &&
      decoded.args.to === to
    ) {
      tokenId = (decoded.args as unknown as { tokenId: bigint }).tokenId;
      break;
    }
  }

  if (tokenId === undefined) {
    throw new Error("Confirmed NFT mint event not found.");
  }

  return { tokenId, transactionHash: hash };
}
