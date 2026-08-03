import "server-only";

import {
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getPublicClient, getPlatformWalletClient } from "@/lib/nft/contract";
import {
  WEB3_CHAIN,
  getContractAddress,
  getMarketplaceContractAddress,
  getWeb3RpcUrl,
} from "@/utils/web3config";

const MARKETPLACE_ABI = parseAbi([
  "function createListing(bytes32 listingReference, uint256 tokenId, uint256 priceInSen, uint64 expiresAt)",
  "function cancelListing(bytes32 listingReference)",
  "function settlePaidListing(bytes32 listingReference, bytes32 paymentReference, address buyer)",
  "function reclaimExpiredListing(bytes32 listingReference)",
]);

const TICKET_APPROVAL_ABI = parseAbi([
  "function approve(address to, uint256 tokenId)",
]);

export class MarketplaceTransactionRevertedError extends Error {
  constructor(action: string) {
    super(`Marketplace ${action} transaction reverted.`);
    this.name = "MarketplaceTransactionRevertedError";
  }
}

export function marketplaceReference(value: string): Hex {
  return keccak256(stringToBytes(value));
}

function customerWallet(privateKey: Address) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: WEB3_CHAIN,
    transport: http(getWeb3RpcUrl()),
  });
}

async function confirmed(
  hash: Hex,
  action: string,
): Promise<Hex> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new MarketplaceTransactionRevertedError(action);
  }
  return hash;
}

export async function createContractListing(input: {
  sellerPrivateKey: Address;
  listingId: string;
  tokenId: bigint;
  priceInSen: bigint;
  expiresAt: Date;
}) {
  const marketplaceAddress = getMarketplaceContractAddress();
  const wallet = customerWallet(input.sellerPrivateKey);
  const listingReference = marketplaceReference(input.listingId);
  const expiresAt = BigInt(Math.floor(input.expiresAt.getTime() / 1000));

  const approvalHash = await wallet.writeContract({
    address: getContractAddress(),
    abi: TICKET_APPROVAL_ABI,
    functionName: "approve",
    args: [marketplaceAddress, input.tokenId],
  });
  await confirmed(approvalHash, "approval");

  const listingHash = await wallet.writeContract({
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: "createListing",
    args: [listingReference, input.tokenId, input.priceInSen, expiresAt],
  });
  await confirmed(listingHash, "listing");

  return { approvalHash, listingHash, listingReference };
}

export async function cancelContractListing(
  sellerPrivateKey: Address,
  listingReference: Hex,
) {
  const hash = await customerWallet(sellerPrivateKey).writeContract({
    address: getMarketplaceContractAddress(),
    abi: MARKETPLACE_ABI,
    functionName: "cancelListing",
    args: [listingReference],
  });
  return confirmed(hash, "cancellation");
}

export async function settleContractListing(input: {
  listingReference: Hex;
  paymentId: string;
  buyer: Address;
}, onSubmitted?: (hash: Hex) => Promise<void>) {
  const hash = await getPlatformWalletClient().writeContract({
    address: getMarketplaceContractAddress(),
    abi: MARKETPLACE_ABI,
    functionName: "settlePaidListing",
    args: [
      input.listingReference,
      marketplaceReference(input.paymentId),
      input.buyer,
    ],
  });
  await onSubmitted?.(hash);
  return confirmed(hash, "settlement");
}
