import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { configVariable, defineConfig } from "hardhat/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(currentDirectory, "../.env.local"),
  quiet: true,
  override: true,
});

export default defineConfig({
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
    },
  },

  networks: {
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11155111,
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
