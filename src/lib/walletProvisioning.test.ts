import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { WalletProvisioningDependencies } from "./walletProvisioningCore";

const walletProvisioningCoreUrl = new URL(
  "./walletProvisioningCore.ts",
  import.meta.url,
);
const { parseProvisioningRpcResult, provisionCustomerWallet } = (await import(
  walletProvisioningCoreUrl.href
)) as typeof import("./walletProvisioningCore");

const sqlPath = new URL(
  "../../scripts/sql/create-custodial-wallets.sql",
  import.meta.url,
);

test("wallet migration creates a server-only custodial table and atomic RPC", () => {
  const sql = readFileSync(sqlPath, "utf8");

  assert.match(sql, /add column if not exists wallet_status text/i);
  assert.match(sql, /add column if not exists wallet_error text/i);
  assert.match(sql, /create table if not exists public\.custodial_wallets/i);
  assert.match(sql, /enable row level security/i);
  assert.match(
    sql,
    /create or replace function public\.provision_customer_wallet/i,
  );
  assert.match(sql, /insert into public\.custodial_wallets/i);
  assert.match(sql, /update public\.profiles/i);
  assert.match(sql, /wallet_status = 'ready'/i);
  assert.match(sql, /v_role not in \('customer', 'user'\)/i);
  assert.match(
    sql,
    /revoke all on function public\.provision_customer_wallet/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.provision_customer_wallet/i,
  );

  const normalized = sql.toLowerCase();
  const functionBody = normalized.slice(
    normalized.indexOf("create or replace function public.provision_customer_wallet"),
  );
  const insertIndex = functionBody.indexOf(
    "insert into public.custodial_wallets",
  );
  const updateIndex = functionBody.indexOf("update public.profiles");
  assert.ok(insertIndex >= 0 && updateIndex > insertIndex);
  assert.doesNotMatch(
    sql,
    /grant\s+select[^;]*custodial_wallets[^;]*to\s+authenticated/i,
  );
});

const privateKey =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const generatedAddress = "0x1111111111111111111111111111111111111111";
const encrypted = {
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
    generateWallet: () => ({ address: generatedAddress, privateKey }),
    encryptWallet: () => encrypted,
    persistWallet: async () => ({
      walletAddress: generatedAddress,
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
        walletAddress: generatedAddress,
      }),
      generateWallet: () => {
        generated = true;
        return { address: generatedAddress, privateKey };
      },
    }),
  );

  assert.equal(result.created, false);
  assert.equal(result.walletAddress, generatedAddress);
  assert.equal(generated, false);
});

test("generates, encrypts, and atomically persists a pending customer wallet", async () => {
  let persistedUserId = "";
  const result = await provisionCustomerWallet(
    "customer-2",
    dependencies({
      persistWallet: async (input) => {
        persistedUserId = input.userId;
        assert.equal(input.walletAddress, generatedAddress);
        assert.deepEqual(input.encrypted, encrypted);
        return {
          walletAddress: generatedAddress,
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
          walletAddress: generatedAddress,
        }),
        generateWallet: () => {
          generated = true;
          return { address: generatedAddress, privateKey };
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
      wallet_address: generatedAddress,
      wallet_status: "ready",
      created: true,
    }),
    {
      walletAddress: generatedAddress,
      walletStatus: "ready",
      created: true,
    },
  );
  assert.throws(() => parseProvisioningRpcResult({}), /invalid/i);
  assert.throws(
    () =>
      parseProvisioningRpcResult({
        wallet_address: generatedAddress,
        wallet_status: "pending",
        created: false,
      }),
    /invalid/i,
  );
});
