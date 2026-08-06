import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseProvisioningRpcResult,
  provisionCustomerWallet,
  type WalletProvisioningDependencies,
} from "./walletProvisioningCore";

const TEST_PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const TEST_WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";
const MOCK_ENCRYPTED_WALLET = {
  ciphertext: "ciphertext",
  iv: "iv",
  authTag: "tag",
  keyVersion: 1,
};

function dependencies(
  overrides: Partial<WalletProvisioningDependencies> = {},
): WalletProvisioningDependencies {
  return {
    loadWalletState: async () => ({
      kind: "pending",
      walletAddress: null,
    }),
    generateWallet: () => ({ address: TEST_WALLET_ADDRESS, privateKey: TEST_PRIVATE_KEY }),
    encryptWallet: () => MOCK_ENCRYPTED_WALLET,
    persistWallet: async () => ({
      walletAddress: TEST_WALLET_ADDRESS,
      walletStatus: "ready",
      created: true,
    }),
    markFailed: async () => undefined,
    ...overrides,
  };
}

test("returns an existing ready wallet without generating another key", async () => {
  let generated = false;
  const result = await provisionCustomerWallet(
    "customer-1",
    dependencies({
      loadWalletState: async () => ({
        kind: "ready",
        walletAddress: TEST_WALLET_ADDRESS,
      }),
      generateWallet: () => {
        generated = true;
        return { address: TEST_WALLET_ADDRESS, privateKey: TEST_PRIVATE_KEY };
      },
    }),
  );

  assert.equal(result.created, false);
  assert.equal(result.walletAddress, TEST_WALLET_ADDRESS);
  assert.equal(generated, false);
});

test("generates, encrypts, and atomically persists a pending customer wallet", async () => {
  let persistedUserId = "";
  const result = await provisionCustomerWallet(
    "customer-2",
    dependencies({
      persistWallet: async (input) => {
        persistedUserId = input.userId;
        assert.equal(input.walletAddress, TEST_WALLET_ADDRESS);
        assert.deepEqual(input.encrypted, MOCK_ENCRYPTED_WALLET);
        return {
          walletAddress: TEST_WALLET_ADDRESS,
          walletStatus: "ready",
          created: true,
        };
      },
    }),
  );

  assert.equal(persistedUserId, "customer-2");
  assert.equal(result.created, true);
  assert.equal(result.walletStatus, "ready");
});

test("rejects inconsistent records without generating a replacement", async () => {
  let generated = false;
  await assert.rejects(
    provisionCustomerWallet(
      "customer-3",
      dependencies({
        loadWalletState: async () => ({
          kind: "inconsistent",
          walletAddress: TEST_WALLET_ADDRESS,
        }),
        generateWallet: () => {
          generated = true;
          return { address: TEST_WALLET_ADDRESS, privateKey: TEST_PRIVATE_KEY };
        },
      }),
    ),
    /inconsistent/i,
  );
  assert.equal(generated, false);
});

test("marks a safe failure category when wallet persistence fails", async () => {
  let category = "";
  await assert.rejects(
    provisionCustomerWallet(
      "customer-4",
      dependencies({
        persistWallet: async () => {
          throw new Error("database internals must not reach the client");
        },
        markFailed: async (_userId, safeCategory) => {
          category = safeCategory;
        },
      }),
    ),
    /could not be provisioned/i,
  );
  assert.equal(category, "storage_error");
});

test("server adapter keeps generation and encrypted persistence server-only", () => {
  const source = readFileSync(
    new URL("./walletProvisioning.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /import "server-only"/);
  assert.match(source, /generatePrivateKey\(\)/);
  assert.match(source, /privateKeyToAccount/);
  assert.match(source, /readWalletEncryptionKey\(\)/);
  assert.match(source, /\.rpc\("provision_customer_wallet"/);
  assert.match(source, /p_encrypted_private_key:/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*private/i);
});

test("validates the untyped provisioning RPC result", () => {
  assert.deepEqual(
    parseProvisioningRpcResult({
      wallet_address: TEST_WALLET_ADDRESS,
      wallet_status: "ready",
      created: true,
    }),
    {
      walletAddress: TEST_WALLET_ADDRESS,
      walletStatus: "ready",
      created: true,
    },
  );
  assert.throws(() => parseProvisioningRpcResult({}), /invalid/i);
  assert.throws(
    () =>
      parseProvisioningRpcResult({
        wallet_address: TEST_WALLET_ADDRESS,
        wallet_status: "pending",
        created: false,
      }),
    /invalid/i,
  );
});
