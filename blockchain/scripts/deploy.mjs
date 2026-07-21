import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = "http://127.0.0.1:8545";
const DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
  });

  const deployerAccount = privateKeyToAccount(DEPLOYER_KEY);
  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: hardhat,
    transport: http(RPC_URL),
  });

  console.log("Deploying account:", deployerAccount.address);

  // Read artifact for ABI + bytecode
  const artifactPath = path.resolve(
    __dirname, "..", "artifacts", "contracts",
    "CornShirtTicket.sol", "CornShirtTicket.json",
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  if (!contractAddress) {
    throw new Error("Deployment failed — no contract address in receipt.");
  }

  console.log("CornShirtTicket deployed to:", contractAddress);

  // Read roles from the contract
  const contract = getContract({
    address: contractAddress,
    abi: artifact.abi,
    client: { public: publicClient, wallet: walletClient },
  });

  const minterRole = await contract.read.MINTER_ROLE();
  const burnerRole = await contract.read.BURNER_ROLE();
  console.log("MINTER_ROLE:", minterRole);
  console.log("BURNER_ROLE:", burnerRole);
  console.log("Deployer has DEFAULT_ADMIN_ROLE, MINTER_ROLE, and BURNER_ROLE");

  // Write to .env.local
  const envPath = path.resolve(__dirname, "..", "..", ".env.local");
  let envContent = "";
  try {
    envContent = fs.readFileSync(envPath, "utf-8");
  } catch {
    // file does not exist yet
  }

  const lines = envContent
    .split("\n")
    .filter((l) => !l.startsWith("TICKET_NFT_CONTRACT_ADDRESS="));
  lines.push(`TICKET_NFT_CONTRACT_ADDRESS=${contractAddress}`);
  fs.writeFileSync(envPath, lines.join("\n").trim() + "\n");

  console.log(`\n✔ TICKET_NFT_CONTRACT_ADDRESS written to .env.local`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
