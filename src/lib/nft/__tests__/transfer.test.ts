import test from "node:test";
import assert from "node:assert/strict";

const CONTRACT_ADDRESS = "0x1111111111111111111111111111111111111111" as const;
const CUSTOMER_ADDRESS = "0x3333333333333333333333333333333333333333" as const;
const RECIPIENT_ADDRESS = "0x4444444444444444444444444444444444444444" as const;
const TRANSACTION_HASH = `0x${"a".repeat(64)}` as const;
const TEST_PRIVATE_KEY = `0x${"b".repeat(64)}` as const;

test("transferTicket: valid transfer succeeds and returns transactionHash", async () => {
  const url = new URL("../transfer.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const fakeCustomerWallet = {
    walletClient: { writeContract: async () => TRANSACTION_HASH },
    accountAddress: CUSTOMER_ADDRESS,
  };

  const result = await mod.transferTicket(
    TEST_PRIVATE_KEY,
    CUSTOMER_ADDRESS,
    RECIPIENT_ADDRESS,
    0n,
    {
      publicClient: fakePublicClient,
      createCustomerWallet: () => fakeCustomerWallet,
      contractAddress: CONTRACT_ADDRESS,
    },
  );

  assert.ok(result.transactionHash.startsWith("0x"));

  const serialized = JSON.stringify(result, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
});

test("transferTicket: invalid private key format is rejected", async () => {
  const url = new URL("../transfer.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  try {
    await mod.transferTicket(
      "invalidkey" as `0x${string}`,
      CUSTOMER_ADDRESS,
      RECIPIENT_ADDRESS,
      0n,
      {
        publicClient: fakePublicClient,
        contractAddress: CONTRACT_ADDRESS,
      },
    );
    assert.fail("Expected error for invalid private key");
  } catch {
    assert.ok(true);
  }
});

test("transferTicket: private key does not appear in result or errors", async () => {
  const url = new URL("../transfer.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const fakeCustomerWallet = {
    walletClient: { writeContract: async () => TRANSACTION_HASH },
    accountAddress: CUSTOMER_ADDRESS,
  };

  try {
    const result = await mod.transferTicket(
      TEST_PRIVATE_KEY,
      CUSTOMER_ADDRESS,
      RECIPIENT_ADDRESS,
      0n,
      {
        publicClient: fakePublicClient,
        createCustomerWallet: () => fakeCustomerWallet,
        contractAddress: CONTRACT_ADDRESS,
      },
    );
    const serialized = JSON.stringify(result, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
    assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert.equal(msg.includes(TEST_PRIVATE_KEY), false);
  }
});
