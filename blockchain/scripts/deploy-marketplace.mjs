import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  getContract,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", "..", ".env.local");

dotenv.config({ path: envPath, quiet: true, override: true });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing from .env.local`);
  return value;
}

async function main() {
  const rpcUrl = required("SEPOLIA_RPC_URL");
  const rawPrivateKey = required("PLATFORM_CONTRACT_PRIVATE_KEY");
  const ticketAddress = getAddress(required("TICKET_NFT_CONTRACT_ADDRESS"));
  const deployerKey = rawPrivateKey.startsWith("0x")
    ? rawPrivateKey
    : `0x${rawPrivateKey}`;

  if (!/^0x[a-fA-F0-9]{64}$/.test(deployerKey)) {
    throw new Error(
      "PLATFORM_CONTRACT_PRIVATE_KEY must contain 64 hexadecimal characters.",
    );
  }

  const account = privateKeyToAccount(deployerKey);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const [chainId, ticketBytecode] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getCode({ address: ticketAddress }),
  ]);
  if (chainId !== sepolia.id) {
    throw new Error(
      `Expected Sepolia chain ID ${sepolia.id}, received ${chainId}.`,
    );
  }
  if (!ticketBytecode || ticketBytecode === "0x") {
    throw new Error("No Ticket NFT contract exists at TICKET_NFT_CONTRACT_ADDRESS.");
  }

  const artifactPath = path.resolve(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "CornShirtMarketplace.sol",
    "CornShirtMarketplace.json",
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error('Marketplace artifact missing. Run "npm run compile" first.');
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("Ticket NFT:", ticketAddress);
  console.log("Deploying CornShirtMarketplace...");
  const hash = await walletClient.deployContract({
    account,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [ticketAddress],
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error("CornShirtMarketplace deployment failed.");
  }

  const marketplace = getContract({
    address: receipt.contractAddress,
    abi: artifact.abi,
    client: { public: publicClient, wallet: walletClient },
  });
  const settlerRole = await marketplace.read.SETTLER_ROLE();
  const [configuredTicket, canSettle] = await Promise.all([
    marketplace.read.ticketContract(),
    marketplace.read.hasRole([settlerRole, account.address]),
  ]);
  if (
    configuredTicket.toLowerCase() !== ticketAddress.toLowerCase() ||
    !canSettle
  ) {
    throw new Error("Marketplace deployment verification failed.");
  }

  const envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";
  const lines = envContent
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim() !== "" &&
        !line.startsWith("MARKETPLACE_CONTRACT_ADDRESS="),
    );
  lines.push(`MARKETPLACE_CONTRACT_ADDRESS=${receipt.contractAddress}`);
  fs.writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");

  console.log("CornShirtMarketplace:", receipt.contractAddress);
  console.log("Deployment transaction:", hash);
  console.log("MARKETPLACE_CONTRACT_ADDRESS was written to .env.local");
}

main().catch((error) => {
  console.error(
    "Marketplace deployment failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
