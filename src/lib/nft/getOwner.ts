import { getPublicClient, getContract } from "./contract";
import type { Address } from "viem";
import artifact from "@/abi/CornShirtTicket.json";

const abi = artifact.abi;

export type OwnerDeps = {
  publicClient: {
    readContract: (...args: unknown[]) => Promise<unknown>;
  };
  contractAddress: Address;
  contractAbi?: typeof abi;
};

export async function getTicketOwner(
  tokenId: bigint,
  deps?: OwnerDeps,
): Promise<Address> {
  const useDeps = deps?.publicClient && deps?.contractAddress;

  const publicClient: unknown = useDeps ? deps!.publicClient : getPublicClient();
  const contractAddress = useDeps ? deps!.contractAddress : getContract(getPublicClient()).address;
  const contractAbi = useDeps ? (deps!.contractAbi ?? abi) : abi;

  const pc = publicClient as OwnerDeps["publicClient"];

  const owner = await pc.readContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "ownerOf",
    args: [tokenId],
  });

  return owner as Address;
}
