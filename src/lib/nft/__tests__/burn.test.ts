import test from "node:test";
import assert from "node:assert/strict";

const CONTRACT_ADDRESS = "0x1111111111111111111111111111111111111111" as const;
const TRANSACTION_HASH = `0x${"a".repeat(64)}` as const;
const TEST_PRIVATE_KEY = `0x${"b".repeat(64)}` as const;

test("burnRefundedTicket: successful burn returns transactionHash", async () => {
  const url = new URL("../burn.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const fakeWalletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: async () => TRANSACTION_HASH,
  };

  const result = await mod.burnRefundedTicket(5n, {
    publicClient: fakePublicClient,
    walletClient: fakeWalletClient,
    contractAddress: CONTRACT_ADDRESS,
  });

  assert.ok(result.transactionHash.startsWith("0x"));

  const serialized = JSON.stringify(result, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
});

test("burnRefundedTicket: receipt reverted throws", async () => {
  const url = new URL("../burn.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    waitForTransactionReceipt: async () => { throw new Error("receipt reverted"); },
  };

  const fakeWalletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: async () => TRANSACTION_HASH,
  };

  try {
    await mod.burnRefundedTicket(5n, {
      publicClient: fakePublicClient,
      walletClient: fakeWalletClient,
      contractAddress: CONTRACT_ADDRESS,
    });
    assert.fail("Expected error for reverted receipt");
  } catch {
    assert.ok(true);
  }
});

test("burnRefundedTicket: platform key does not appear in result or errors", async () => {
  const url = new URL("../burn.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    waitForTransactionReceipt: async () => ({ status: "success" }),
  };

  const fakeWalletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: async () => TRANSACTION_HASH,
  };

  const result = await mod.burnRefundedTicket(5n, {
    publicClient: fakePublicClient,
    walletClient: fakeWalletClient,
    contractAddress: CONTRACT_ADDRESS,
  });

  const serialized = JSON.stringify(result, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
});
