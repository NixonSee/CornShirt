import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import type { Hex } from "viem";

export interface EncryptedPrivateKey {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function readWalletEncryptionKey(
  encoded = process.env.WALLET_ENCRYPTION_KEY,
): Buffer {
  if (!encoded) {
    throw new Error("WALLET_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("WALLET_ENCRYPTION_KEY must be exactly 32 bytes in base64.");
  }

  return key;
}

// Private key is encrypted with AES-256-GCM and stored in the database
export function encryptPrivateKey(
  privateKey: Hex,
  encryptionKey: Buffer,
): EncryptedPrivateKey {
  if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
    throw new Error("Invalid Ethereum private key.");
  }
  if (encryptionKey.length !== 32) {
    throw new Error("Wallet encryption key must be 32 bytes.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: 1,
  };
}

export function decryptPrivateKey(
  encrypted: EncryptedPrivateKey,
  encryptionKey: Buffer,
): Hex {
  if (encryptionKey.length !== 32) {
    throw new Error("Wallet encryption key must be 32 bytes.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  if (!PRIVATE_KEY_PATTERN.test(plaintext)) {
    throw new Error("Decrypted wallet key is invalid.");
  }

  return plaintext as Hex;
}
