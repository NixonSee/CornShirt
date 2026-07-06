import assert from "node:assert/strict";
import test from "node:test";

const walletEncryptionUrl = new URL("./walletEncryption.ts", import.meta.url);
const {
  decryptPrivateKey,
  encryptPrivateKey,
  readWalletEncryptionKey,
} = (await import(walletEncryptionUrl.href)) as typeof import("./walletEncryption");

const encryptionKey = Buffer.alloc(32, 7);
const privateKey =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;

test("encrypts and decrypts an Ethereum private key", () => {
  const encrypted = encryptPrivateKey(privateKey, encryptionKey);
  assert.equal(decryptPrivateKey(encrypted, encryptionKey), privateKey);
  assert.equal(encrypted.keyVersion, 1);
});

test("uses a fresh IV for every encryption", () => {
  const first = encryptPrivateKey(privateKey, encryptionKey);
  const second = encryptPrivateKey(privateKey, encryptionKey);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
});

test("rejects tampered encrypted wallet material", () => {
  const encrypted = encryptPrivateKey(privateKey, encryptionKey);
  assert.throws(() =>
    decryptPrivateKey(
      { ...encrypted, authTag: Buffer.alloc(16, 1).toString("base64") },
      encryptionKey,
    ),
  );
});

test("requires a base64-encoded 32-byte server key", () => {
  assert.deepEqual(
    readWalletEncryptionKey(Buffer.alloc(32, 3).toString("base64")),
    Buffer.alloc(32, 3),
  );
  assert.throws(() => readWalletEncryptionKey(undefined), /not configured/i);
  assert.throws(
    () => readWalletEncryptionKey(Buffer.alloc(16).toString("base64")),
    /32 bytes/i,
  );
});
