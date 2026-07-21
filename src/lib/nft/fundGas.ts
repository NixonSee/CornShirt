import { type GasFundingResult } from "./types";
import {
  getPublicClient,
  getPlatformWalletClient,
} from "./contract";
import { parseEther, type Address } from "viem";

const GAS_FUND_THRESHOLD = parseEther("0.01");
const GAS_FUND_AMOUNT = parseEther("0.1");

export type FundGasDeps = {
  publicClient: {
    getBalance: (...args: unknown[]) => Promise<bigint>;
    waitForTransactionReceipt: (...args: unknown[]) => Promise<{ status: string }>;
  };
  walletClient?: {
    sendTransaction: (...args: unknown[]) => Promise<`0x${string}`>;
    account?: { address: Address };
  };
  platformAddress?: Address;
};

export async function fundCustomerGas(
  walletAddress: Address,
  deps?: FundGasDeps,
): Promise<GasFundingResult> {
  if (!walletAddress || walletAddress === "0x0" || walletAddress.length !== 42) {
    throw new Error("Invalid customer wallet address.");
  }

  const publicClient = deps?.publicClient ?? getPublicClient() as never;

  const balance = await publicClient.getBalance({ address: walletAddress });

  if (balance >= GAS_FUND_THRESHOLD) {
    return { funded: false, balance };
  }

  const walletClient = deps?.walletClient ?? getPlatformWalletClient() as never;
  const platformAddress = deps?.platformAddress ?? walletClient.account?.address;

  if (!platformAddress) {
    throw new Error("Platform wallet address is unavailable.");
  }

  const hash = await walletClient.sendTransaction({
    to: walletAddress,
    value: GAS_FUND_AMOUNT,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error("Gas funding transaction reverted.");
  }

  const updatedBalance = await publicClient.getBalance({
    address: walletAddress,
  });

  return {
    funded: true,
    balance: updatedBalance,
    transactionHash: hash,
  };
}
