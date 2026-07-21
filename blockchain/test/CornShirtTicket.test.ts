import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, getContract, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC_URL = "http://127.0.0.1:8545";

// Hardhat deterministic accounts
const ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // #0 deployer
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // #1 customer
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // #2 recipient
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // #3 unauthorized
];

async function deployContract(
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>,
) {
  const artifactPath = path.resolve(
    __dirname, "..", "artifacts", "contracts",
    "CornShirtTicket.sol", "CornShirtTicket.json",
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("Deployment failed");
  return {
    address: receipt.contractAddress,
    abi: artifact.abi,
    read: (fn: string, args: unknown[] = []) =>
      (getContract({
        address: receipt.contractAddress!,
        abi: artifact.abi,
        client: { public: publicClient, wallet: walletClient },
      }).read as Record<string, (...a: unknown[]) => unknown>)[fn](args),
    write: (fn: string, args: unknown[] = []) =>
      (getContract({
        address: receipt.contractAddress!,
        abi: artifact.abi,
        client: { public: publicClient, wallet: walletClient },
      }).write as Record<string, (...a: unknown[]) => unknown>)[fn](args),
    getContract: () =>
      getContract({
        address: receipt.contractAddress!,
        abi: artifact.abi,
        client: { public: publicClient, wallet: walletClient },
      }),
  };
}

const failures: string[] = [];

async function runScenario(
  name: string,
  test: () => Promise<void>,
): Promise<void> {
  try {
    await test();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`✗ ${name}`, error);
  }
}

async function main() {
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const deployerAccount = privateKeyToAccount(ACCOUNTS[0] as Address);
  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const customerAccount = privateKeyToAccount(ACCOUNTS[1] as Address);
  const customerWallet = createWalletClient({
    account: customerAccount,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const recipientAccount = privateKeyToAccount(ACCOUNTS[2] as Address);
  const recipientWallet = createWalletClient({
    account: recipientAccount,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const unauthorizedAccount = privateKeyToAccount(ACCOUNTS[3] as Address);
  const unauthorizedWallet = createWalletClient({
    account: unauthorizedAccount,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const deployerAddress = deployerAccount.address;
  const customerAddress = customerAccount.address;
  const recipientAddress = recipientAccount.address;
  const unauthorizedAddress = unauthorizedAccount.address;

  const contract = await deployContract(publicClient, walletClient);
  const contractAddress = contract.address;

  const MINTER_ROLE = await contract.read("MINTER_ROLE");
  const BURNER_ROLE = await contract.read("BURNER_ROLE");
  const ERC721_ID = "0x80ac58cd" as Address;
  const ACCESS_CONTROL_ID = "0x7965db0b" as Address;

  // ── Scenario 1: Authorized minter can mint ──
  await runScenario(
    "Authorized minter can mint — tokenId 0 assigned to customer",
    async () => {
      const hash = await contract.write("mintTicket", [customerAddress]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, "success");

      const owner = await contract.read("ownerOf", [0n]);
      assert.equal(owner.toLowerCase(), customerAddress.toLowerCase());
    },
  );

  // ── Scenario 2: Unauthorized minting rejected ──
  await runScenario("Unauthorized wallet cannot mint", async () => {
    await contract.write("revokeRole", [MINTER_ROLE, deployerAddress]);
    try {
      await contract.write("mintTicket", [customerAddress]);
      assert.fail("Expected revert");
    } catch { /* expected */ }
    await contract.write("grantRole", [MINTER_ROLE, deployerAddress]);
  });

  // ── Scenario 3: Multiple mints are unique ──
  await runScenario("Multiple mints produce unique sequential token IDs", async () => {
    const h1 = await contract.write("mintTicket", [customerAddress]);
    await publicClient.waitForTransactionReceipt({ hash: h1 });
    const h2 = await contract.write("mintTicket", [customerAddress]);
    await publicClient.waitForTransactionReceipt({ hash: h2 });

    assert.equal(await contract.read("ownerOf", [0n]), customerAddress);
    assert.equal(await contract.read("ownerOf", [1n]), customerAddress);
    assert.equal(await contract.read("ownerOf", [2n]), customerAddress);
  });

  // ── Scenario 4: ownerOf returns correct address ──
  await runScenario("ownerOf returns the correct wallet address", async () => {
    const owner = await contract.read("ownerOf", [0n]);
    assert.equal(owner.toLowerCase(), customerAddress.toLowerCase());
  });

  // ── Scenario 5: Owner can transfer ──
  await runScenario("NFT owner can transfer the ticket", async () => {
    const c = contract.getContract();
    const hash = await customerWallet.writeContract({
      address: contractAddress as Address,
      abi: c.abi,
      functionName: "safeTransferFrom",
      args: [customerAddress, recipientAddress, 0n],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const newOwner = await contract.read("ownerOf", [0n]);
    assert.equal(newOwner.toLowerCase(), recipientAddress.toLowerCase());

    // Transfer back
    const h2 = await recipientWallet.writeContract({
      address: contractAddress as Address,
      abi: c.abi,
      functionName: "safeTransferFrom",
      args: [recipientAddress, customerAddress, 0n],
    });
    await publicClient.waitForTransactionReceipt({ hash: h2 });
  });

  // ── Scenario 6: Non-owner cannot transfer ──
  await runScenario("Another wallet cannot transfer someone else's NFT", async () => {
    try {
      await unauthorizedWallet.writeContract({
        address: contractAddress as Address,
        abi: contract.getContract().abi,
        functionName: "safeTransferFrom",
        args: [customerAddress, unauthorizedAddress, 0n],
      });
      assert.fail("Expected revert");
    } catch { /* expected */ }
  });

  // ── Scenario 7: Authorized burner can burn ──
  await runScenario("Authorized burner can burn a refunded NFT", async () => {
    // Mint token 3 specifically for burn testing
    const mintHash = await contract.write("mintTicket", [customerAddress]);
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    const owner = await contract.read("ownerOf", [3n]);
    assert.equal(owner.toLowerCase(), customerAddress.toLowerCase());

    const hash = await contract.write("burnRefundedTicket", [3n]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");
  });

  // ── Scenario 8: Unauthorized wallet cannot burn ──
  await runScenario("Unauthorized wallet cannot burn", async () => {
    try {
      await unauthorizedWallet.writeContract({
        address: contractAddress as Address,
        abi: contract.getContract().abi,
        functionName: "burnRefundedTicket",
        args: [2n],
      });
      assert.fail("Expected revert");
    } catch { /* expected */ }
  });

  // ── Scenario 9: Burned token has no owner ──
  await runScenario("Burned NFT no longer has an owner", async () => {
    try {
      await contract.read("ownerOf", [3n]);
      assert.fail("Expected revert");
    } catch { /* expected */ }
  });

  // ── Scenario 10: Role management ──
  await runScenario("Admin can grant and revoke contract roles", async () => {
    await contract.write("grantRole", [MINTER_ROLE, unauthorizedAddress]);
    assert.ok(await contract.read("hasRole", [MINTER_ROLE, unauthorizedAddress]));

    await contract.write("revokeRole", [MINTER_ROLE, unauthorizedAddress]);
    assert.equal(await contract.read("hasRole", [MINTER_ROLE, unauthorizedAddress]), false);

    try {
      await unauthorizedWallet.writeContract({
        address: contractAddress as Address,
        abi: contract.getContract().abi,
        functionName: "grantRole",
        args: [MINTER_ROLE, customerAddress],
      });
      assert.fail("Expected revert");
    } catch { /* expected */ }
  });

  // ── Scenario 11: Interface support ──
  await runScenario("Contract supports ERC-721 and AccessControl interfaces", async () => {
    const erc721 = await contract.read("supportsInterface", [ERC721_ID]);
    assert.equal(erc721, true);

    const ac = await contract.read("supportsInterface", [ACCESS_CONTROL_ID]);
    assert.equal(ac, true);
  });

  // ── Report ──
  console.log("");
  if (failures.length === 0) {
    console.log("All scenarios passed.");
  } else {
    console.error(`${failures.length} scenario(s) failed:`);
    for (const name of failures) {
      console.error(`  ✗ ${name}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
