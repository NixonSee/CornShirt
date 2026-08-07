import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  keccak256,
  stringToBytes,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC_URL = "http://127.0.0.1:8545";
const ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
] as const;

function artifact(contract: string) {
  return JSON.parse(
    readFileSync(
      path.resolve(
        __dirname,
        "..",
        "artifacts",
        "contracts",
        `${contract}.sol`,
        `${contract}.json`,
      ),
      "utf8",
    ),
  );
}

function reference(value: string): Hex {
  return keccak256(stringToBytes(value));
}

const failures: string[] = [];

async function scenario(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}`, error);
  }
}

async function main() {
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
  });
  const deployer = privateKeyToAccount(ACCOUNTS[0]);
  const seller = privateKeyToAccount(ACCOUNTS[1]);
  const buyer = privateKeyToAccount(ACCOUNTS[2]);
  const outsider = privateKeyToAccount(ACCOUNTS[3]);
  const deployerWallet = createWalletClient({
    account: deployer,
    chain: hardhat,
    transport: http(RPC_URL),
  });
  const sellerWallet = createWalletClient({
    account: seller,
    chain: hardhat,
    transport: http(RPC_URL),
  });
  const outsiderWallet = createWalletClient({
    account: outsider,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const ticketArtifact = artifact("CornShirtTicket");
  const ticketDeploy = await deployerWallet.deployContract({
    abi: ticketArtifact.abi,
    bytecode: ticketArtifact.bytecode,
  });
  const ticketReceipt = await publicClient.waitForTransactionReceipt({
    hash: ticketDeploy,
  });
  assert.ok(ticketReceipt.contractAddress);
  const ticketAddress = ticketReceipt.contractAddress;

  const marketplaceArtifact = artifact("CornShirtMarketplace");
  const marketplaceDeploy = await deployerWallet.deployContract({
    abi: marketplaceArtifact.abi,
    bytecode: marketplaceArtifact.bytecode,
    args: [ticketAddress],
  });
  const marketplaceReceipt = await publicClient.waitForTransactionReceipt({
    hash: marketplaceDeploy,
  });
  assert.ok(marketplaceReceipt.contractAddress);
  const marketplaceAddress = marketplaceReceipt.contractAddress;

  const ticket = getContract({
    address: ticketAddress,
    abi: ticketArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });
  const marketplace = getContract({
    address: marketplaceAddress,
    abi: marketplaceArtifact.abi,
    client: { public: publicClient, wallet: deployerWallet },
  });

  for (let index = 0; index < 4; index += 1) {
    const hash = await ticket.write.mintTicket([seller.address]);
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function approveAndList(
    tokenId: bigint,
    listingReference: Hex,
    expiresAt: bigint,
  ) {
    const approval = await sellerWallet.writeContract({
      address: ticketAddress,
      abi: ticketArtifact.abi,
      functionName: "approve",
      args: [marketplaceAddress, tokenId],
    });
    await publicClient.waitForTransactionReceipt({ hash: approval });

    const listing = await sellerWallet.writeContract({
      address: marketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "createListing",
      args: [listingReference, tokenId, 12_500n, expiresAt],
    });
    await publicClient.waitForTransactionReceipt({ hash: listing });
  }

  const block = await publicClient.getBlock();
  const eventEndsAt = block.timestamp + 3n * 60n * 60n;

  await scenario("listing keeps the collectible in the seller wallet", async () => {
    await approveAndList(0n, reference("listing-0"), eventEndsAt);
    assert.equal(
      String(await ticket.read.ownerOf([0n])).toLowerCase(),
      seller.address.toLowerCase(),
    );
  });

  await scenario("only the settlement role can deliver a paid listing", async () => {
    await assert.rejects(() =>
      outsiderWallet.writeContract({
        address: marketplaceAddress,
        abi: marketplaceArtifact.abi,
        functionName: "settlePaidListing",
        args: [reference("listing-0"), reference("payment-0"), buyer.address],
      }),
    );

    const settled = await marketplace.write.settlePaidListing([
      reference("listing-0"),
      reference("payment-0"),
      buyer.address,
    ]);
    await publicClient.waitForTransactionReceipt({ hash: settled });
    assert.equal(
      String(await ticket.read.ownerOf([0n])).toLowerCase(),
      buyer.address.toLowerCase(),
    );
  });

  await scenario("a Stripe payment reference cannot be processed twice", async () => {
    await approveAndList(1n, reference("listing-1"), eventEndsAt);
    await assert.rejects(() =>
      marketplace.write.settlePaidListing([
        reference("listing-1"),
        reference("payment-0"),
        buyer.address,
      ]),
    );
  });

  await scenario("seller cancellation leaves the NFT with its owner", async () => {
    const cancelled = await sellerWallet.writeContract({
      address: marketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "cancelListing",
      args: [reference("listing-1")],
    });
    await publicClient.waitForTransactionReceipt({ hash: cancelled });
    assert.equal(
      String(await ticket.read.ownerOf([1n])).toLowerCase(),
      seller.address.toLowerCase(),
    );
  });

  await scenario("direct NFT transfers into the marketplace are rejected", async () => {
    await assert.rejects(() =>
      sellerWallet.writeContract({
        address: ticketAddress,
        abi: ticketArtifact.abi,
        functionName: "safeTransferFrom",
        args: [seller.address, marketplaceAddress, 2n],
      }),
    );
  });

  await scenario("expired events cannot settle and anyone can close the listing", async () => {
    await approveAndList(3n, reference("listing-3"), eventEndsAt);

    const rpc = publicClient as typeof publicClient & {
      request: (request: { method: string; params: unknown[] }) => Promise<unknown>;
    };
    await rpc.request({ method: "evm_setNextBlockTimestamp", params: [Number(eventEndsAt)] });
    await rpc.request({ method: "evm_mine", params: [] });

    await assert.rejects(() =>
      marketplace.write.settlePaidListing([
        reference("listing-3"),
        reference("payment-3"),
        buyer.address,
      ]),
    );

    const reclaimed = await outsiderWallet.writeContract({
      address: marketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "reclaimExpiredListing",
      args: [reference("listing-3")],
    });
    await publicClient.waitForTransactionReceipt({ hash: reclaimed });
    assert.equal(
      String(await ticket.read.ownerOf([3n])).toLowerCase(),
      seller.address.toLowerCase(),
    );
  });

  if (failures.length > 0) {
    throw new Error(`${failures.length} marketplace scenario(s) failed`);
  }

  console.log("All marketplace scenarios passed.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
