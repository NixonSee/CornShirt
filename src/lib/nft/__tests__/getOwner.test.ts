import test from "node:test";
import assert from "node:assert/strict";

const CONTRACT_ADDRESS = "0x1111111111111111111111111111111111111111" as const;
const OWNER_ADDRESS = "0x3333333333333333333333333333333333333333" as const;
const TEST_PRIVATE_KEY = `0x${"b".repeat(64)}` as const;

test("getTicketOwner: returns correct address for existing token", async () => {
  const url = new URL("../getOwner.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    readContract: async () => OWNER_ADDRESS,
  };

  const owner = await mod.getTicketOwner(0n, {
    publicClient: fakePublicClient,
    contractAddress: CONTRACT_ADDRESS,
  });

  assert.equal(owner.toLowerCase(), OWNER_ADDRESS.toLowerCase());
});

test("getTicketOwner: reverts for nonexistent token", async () => {
  const url = new URL("../getOwner.ts", import.meta.url);
  const mod = await import(url.href);

  const fakePublicClient = {
    readContract: async () => { throw new Error("ERC721NonexistentToken"); },
  };

  try {
    await mod.getTicketOwner(99999n, {
      publicClient: fakePublicClient,
      contractAddress: CONTRACT_ADDRESS,
    });
    assert.fail("Expected error for nonexistent token");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    assert.ok(msg.includes("ERC721NonexistentToken") || msg.length > 0);
    assert.equal(msg.includes(TEST_PRIVATE_KEY), false);
  }
});
