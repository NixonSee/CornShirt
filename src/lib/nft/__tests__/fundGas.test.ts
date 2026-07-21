import test from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";

const VALID_ADDRESS = "0xc0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0" as const;
const PLATFORM_ADDRESS = "0x2222222222222222222222222222222222222222" as const;
const TRANSACTION_HASH = `0x${"a".repeat(64)}` as const;
const TEST_PRIVATE_KEY = `0x${"b".repeat(64)}` as const;

test("fundCustomerGas: balance above threshold does not send funding", async () => {
  const url = new URL("../fundGas.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    getBalance: async () => parseEther("1.0"),
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const result = await mod.fundCustomerGas(VALID_ADDRESS, {
    publicClient: fakePublicClient,
  });

  assert.equal(result.funded, false);
  assert.ok(typeof result.balance === "bigint");
});

test("fundCustomerGas: balance exactly at threshold does not send funding", async () => {
  const url = new URL("../fundGas.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    getBalance: async () => parseEther("0.01"),
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const result = await mod.fundCustomerGas(VALID_ADDRESS, {
    publicClient: fakePublicClient,
  });

  assert.equal(result.funded, false);
});

test("fundCustomerGas: balance below threshold sends 0.1 ETH", async () => {
  const url = new URL("../fundGas.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    getBalance: async () => parseEther("0.005"),
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const fakeWalletClient = {
    account: { address: PLATFORM_ADDRESS },
    sendTransaction: async () => TRANSACTION_HASH,
  };

  const result = await mod.fundCustomerGas(VALID_ADDRESS, {
    publicClient: fakePublicClient,
    walletClient: fakeWalletClient,
    platformAddress: PLATFORM_ADDRESS,
  });

  assert.equal(result.funded, true);
  assert.ok(typeof result.balance === "bigint");
  assert.ok(result.transactionHash.startsWith("0x"));
});

test("fundCustomerGas: invalid destination address is rejected", async () => {
  const url = new URL("../fundGas.ts", import.meta.url);
  const mod = await import(url.href);

  try {
    await mod.fundCustomerGas("0x0" as `0x${string}`);
    assert.fail("Expected error for invalid address");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert.ok(msg.length > 0);
  }
});

test("fundCustomerGas: platform key does not appear in result or errors", async () => {
  const url = new URL("../fundGas.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    getBalance: async () => parseEther("0.005"),
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const fakeWalletClient = {
    account: { address: PLATFORM_ADDRESS },
    sendTransaction: async () => TRANSACTION_HASH,
  };

  try {
    const result = await mod.fundCustomerGas(VALID_ADDRESS, {
      publicClient: fakePublicClient,
      walletClient: fakeWalletClient,
      platformAddress: PLATFORM_ADDRESS,
    });

    const serialized = JSON.stringify(result, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
    assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert.equal(msg.includes(TEST_PRIVATE_KEY), false);
  }
});
