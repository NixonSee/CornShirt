import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  getContract,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local is in the main CornShirt folder.
const envPath = path.resolve(__dirname, "..", "..", ".env.local");

dotenv.config({
  path: envPath,
  quiet: true,
  override: true,
});

const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim();
const rawPrivateKey = process.env.PLATFORM_CONTRACT_PRIVATE_KEY?.trim();
const checkOnly = process.argv.includes("--check");

if (!rpcUrl) {
  throw new Error("SEPOLIA_RPC_URL is missing from .env.local");
}

let parsedRpcUrl;

try {
  parsedRpcUrl = new URL(rpcUrl);
} catch {
  throw new Error("SEPOLIA_RPC_URL must be a valid HTTP or HTTPS URL.");
}

if (!["http:", "https:"].includes(parsedRpcUrl.protocol)) {
  throw new Error("SEPOLIA_RPC_URL must use HTTP or HTTPS.");
}

if (!rawPrivateKey) {
  throw new Error("PLATFORM_CONTRACT_PRIVATE_KEY is missing from .env.local");
}

// MetaMask may export the key without 0x.
const deployerKey = rawPrivateKey.startsWith("0x")
  ? rawPrivateKey
  : `0x${rawPrivateKey}`;

if (!/^0x[a-fA-F0-9]{64}$/.test(deployerKey)) {
  throw new Error(
    "PLATFORM_CONTRACT_PRIVATE_KEY must contain exactly 64 hexadecimal characters.",
  );
}

async function main() {
  const deployerAccount = privateKeyToAccount(deployerKey);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  let chainId;
  let balance;

  try {
    chainId = await publicClient.getChainId();
    balance = await publicClient.getBalance({
      address: deployerAccount.address,
    });
  } catch {
    throw new Error(
      "Could not connect to Sepolia through SEPOLIA_RPC_URL. Verify the endpoint and your internet connection.",
    );
  }

  if (chainId !== sepolia.id) {
    throw new Error(
      `SEPOLIA_RPC_URL returned chain ID ${chainId}; expected ${sepolia.id} for Sepolia.`,
    );
  }

  console.log("Network: Sepolia");
  console.log("Deploying account:", deployerAccount.address);
  console.log("Sepolia ETH balance:", formatEther(balance));

  if (checkOnly) {
    console.log("\nOK: Sepolia RPC, chain ID, and private key format are valid.");
    if (balance === 0n) {
      console.log("Warning: this account needs Sepolia ETH before deployment.");
    }
    return;
  }

  if (balance === 0n) {
    throw new Error(
      "The deployment account has no Sepolia ETH for deployment gas.",
    );
  }

  // Read the Hardhat-generated ABI and bytecode.
  const artifactPath = path.resolve(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "CornShirtTicket.sol",
    "CornShirtTicket.json",
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Contract artifact was not found at ${artifactPath}. Run "npx hardhat compile" first.`,
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  if (
    typeof artifact.bytecode !== "string" ||
    !artifact.bytecode.startsWith("0x") ||
    artifact.bytecode === "0x"
  ) {
    throw new Error("The contract artifact does not contain valid bytecode.");
  }

  console.log("\nDeploying CornShirtTicket...");

  const transactionHash = await walletClient.deployContract({
    account: deployerAccount,
    abi: artifact.abi,
    bytecode: artifact.bytecode,

    // Add args: [...] here only if the Solidity constructor
    // requires external constructor arguments.
  });

  console.log("Deployment transaction:", transactionHash);
  console.log(
    "View transaction:",
    `https://sepolia.etherscan.io/tx/${transactionHash}`,
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
    confirmations: 1,
  });

  if (receipt.status !== "success") {
    throw new Error("The deployment transaction was reverted.");
  }

  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    throw new Error("Deployment succeeded but no contract address was found.");
  }

  console.log("\nCornShirtTicket deployed to:", contractAddress);
  console.log(
    "View contract:",
    `https://sepolia.etherscan.io/address/${contractAddress}`,
  );

  // Verify contract roles.
  const contract = getContract({
    address: contractAddress,
    abi: artifact.abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });

  const defaultAdminRole = await contract.read.DEFAULT_ADMIN_ROLE();
  const minterRole = await contract.read.MINTER_ROLE();
  const burnerRole = await contract.read.BURNER_ROLE();

  const [hasAdminRole, hasMinterRole, hasBurnerRole] = await Promise.all([
    contract.read.hasRole([defaultAdminRole, deployerAccount.address]),
    contract.read.hasRole([minterRole, deployerAccount.address]),
    contract.read.hasRole([burnerRole, deployerAccount.address]),
  ]);

  console.log("\nRole verification:");
  console.log("DEFAULT_ADMIN_ROLE:", hasAdminRole);
  console.log("MINTER_ROLE:", hasMinterRole);
  console.log("BURNER_ROLE:", hasBurnerRole);

  if (!hasAdminRole || !hasMinterRole || !hasBurnerRole) {
    throw new Error(
      "The deployer was not granted all required contract roles.",
    );
  }

  const marketplaceArtifactPath = path.resolve(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "CornShirtMarketplace.sol",
    "CornShirtMarketplace.json",
  );

  if (!fs.existsSync(marketplaceArtifactPath)) {
    throw new Error(
      `Contract artifact was not found at ${marketplaceArtifactPath}. Run "npx hardhat compile" first.`,
    );
  }

  const marketplaceArtifact = JSON.parse(
    fs.readFileSync(marketplaceArtifactPath, "utf8"),
  );

  console.log("\nDeploying CornShirtMarketplace...");
  const marketplaceTransactionHash = await walletClient.deployContract({
    account: deployerAccount,
    abi: marketplaceArtifact.abi,
    bytecode: marketplaceArtifact.bytecode,
    args: [contractAddress],
  });
  const marketplaceReceipt = await publicClient.waitForTransactionReceipt({
    hash: marketplaceTransactionHash,
    confirmations: 1,
  });

  if (marketplaceReceipt.status !== "success" || !marketplaceReceipt.contractAddress) {
    throw new Error("CornShirtMarketplace deployment failed.");
  }

  const marketplaceAddress = marketplaceReceipt.contractAddress;
  const marketplace = getContract({
    address: marketplaceAddress,
    abi: marketplaceArtifact.abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });
  const settlerRole = await marketplace.read.SETTLER_ROLE();
  const [configuredTicketAddress, hasSettlerRole] = await Promise.all([
    marketplace.read.ticketContract(),
    marketplace.read.hasRole([settlerRole, deployerAccount.address]),
  ]);

  if (
    configuredTicketAddress.toLowerCase() !== contractAddress.toLowerCase() ||
    !hasSettlerRole
  ) {
    throw new Error("CornShirtMarketplace deployment verification failed.");
  }

  console.log("CornShirtMarketplace deployed to:", marketplaceAddress);
  console.log(
    "View contract:",
    `https://sepolia.etherscan.io/address/${marketplaceAddress}`,
  );
  console.log("SETTLER_ROLE:", hasSettlerRole);

  // Update only the deployed contract addresses in .env.local.
  let envContent = "";

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const lines = envContent
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim() !== "" &&
        !line.startsWith("TICKET_NFT_CONTRACT_ADDRESS=") &&
        !line.startsWith("MARKETPLACE_CONTRACT_ADDRESS="),
    );

  lines.push(`TICKET_NFT_CONTRACT_ADDRESS=${contractAddress}`);
  lines.push(`MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);

  fs.writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");

  console.log("Marketplace contract address was written to .env.local");

  console.log(
    "\nTICKET_NFT_CONTRACT_ADDRESS was written to .env.local",
  );
  console.log("Sepolia deployment completed successfully");
}

main().catch((error) => {
  console.error("\nDeployment failed:");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
