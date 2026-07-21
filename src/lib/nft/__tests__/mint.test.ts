import test from "node:test";
import assert from "node:assert/strict";

const CONTRACT_ADDRESS = "0x1111111111111111111111111111111111111111" as const;
const CUSTOMER_ADDRESS = "0x3333333333333333333333333333333333333333" as const;
const TRANSACTION_HASH = `0x${"a".repeat(64)}` as const;
const TEST_PRIVATE_KEY = `0x${"b".repeat(64)}` as const;

test("mintTicket: successful receipt returns transaction hash and confirmed token ID", async () => {
  const url = new URL("../mint.ts", import.meta.url);
  const mod = await import(url.href);

  const fakeRequest = {
    address: CONTRACT_ADDRESS,
    abi: [] as never[],
    functionName: "mintTicket",
    args: [CUSTOMER_ADDRESS],
    account: "0x2222222222222222222222222222222222222222",
  };

  const fakePublicClient = {
    simulateContract: async () => ({ request: fakeRequest, result: 0n }),
    waitForTransactionReceipt: async () => ({
      status: "success",
      logs: [
        {
          address: CONTRACT_ADDRESS,
          data: "0x" as `0x${string}`,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000003333333333333333333333333333333333333333",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ] as `0x${string}`[],
        },
      ],
    }),
  };

  const fakeWalletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: async () => TRANSACTION_HASH,
  };

  const result = await mod.mintTicket(CUSTOMER_ADDRESS, {
    publicClient: fakePublicClient,
    walletClient: fakeWalletClient,
    contractAddress: CONTRACT_ADDRESS,
    contractAbi: [
      {
        type: "event" as const,
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: true, name: "tokenId", type: "uint256" },
        ],
      },
      {
        type: "function" as const,
        name: "mintTicket",
        inputs: [{ name: "to", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "nonpayable",
      },
    ],
  });

  assert.ok(result.tokenId !== undefined);
  assert.equal(typeof result.tokenId, "bigint");
  assert.ok(result.transactionHash.startsWith("0x"));

  const serialized = JSON.stringify(result, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
});

test("mintTicket: reverted receipt throws", async () => {
  const url = new URL("../mint.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    simulateContract: async () => ({
      request: { address: CONTRACT_ADDRESS, abi: [], functionName: "mintTicket", args: [CUSTOMER_ADDRESS], account: "0x2222222222222222222222222222222222222222" },
      result: 0n,
    }),
    waitForTransactionReceipt: async () => ({ status: "reverted", logs: [] }),
  };

  const fakeWalletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: async () => TRANSACTION_HASH,
  };

  try {
    await mod.mintTicket(CUSTOMER_ADDRESS, {
      publicClient: fakePublicClient,
      walletClient: fakeWalletClient,
      contractAddress: CONTRACT_ADDRESS,
    });
    assert.fail("Expected error for reverted receipt");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert.ok(msg.includes("reverted"));
    assert.equal(msg.includes(TEST_PRIVATE_KEY), false);
  }
});

test("mintTicket: private key does not appear in returned result", async () => {
  const url = new URL("../mint.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    simulateContract: async () => ({
      request: { address: CONTRACT_ADDRESS, abi: [], functionName: "mintTicket", args: [CUSTOMER_ADDRESS], account: "0x2222222222222222222222222222222222222222" },
      result: 0n,
    }),
    waitForTransactionReceipt: async () => ({
      status: "success",
      logs: [
        {
          address: CONTRACT_ADDRESS,
          data: "0x" as `0x${string}`,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000003333333333333333333333333333333333333333",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ] as `0x${string}`[],
        },
      ],
    }),
  };

  const fakeWalletClient = {
    account: { address: "0x2222222222222222222222222222222222222222" },
    writeContract: async () => TRANSACTION_HASH,
  };

  const result = await mod.mintTicket(CUSTOMER_ADDRESS, {
    publicClient: fakePublicClient,
    walletClient: fakeWalletClient,
    contractAddress: CONTRACT_ADDRESS,
    contractAbi: [
      {
        type: "event" as const,
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: true, name: "tokenId", type: "uint256" },
        ],
      },
      {
        type: "function" as const,
        name: "mintTicket",
        inputs: [{ name: "to", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "nonpayable",
      },
    ],
  });

  const serialized = JSON.stringify(result, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  assert.equal(serialized.includes(TEST_PRIVATE_KEY), false);
});
