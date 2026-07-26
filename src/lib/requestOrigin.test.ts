import assert from "node:assert/strict";
import test from "node:test";

import { getPublicRequestOrigin } from "./requestOrigin.ts";

test("uses the Cloudflare browser origin when Next reconstructs localhost", () => {
  const request = new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "https://scanner-preview.trycloudflare.com",
    },
  });

  assert.equal(
    getPublicRequestOrigin(request),
    "https://scanner-preview.trycloudflare.com",
  );
});

test("uses a forwarded Cloudflare host when the Origin header is absent", () => {
  const request = new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "x-forwarded-host": "scanner-preview.trycloudflare.com",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(
    getPublicRequestOrigin(request),
    "https://scanner-preview.trycloudflare.com",
  );
});

test("rejects an unrelated browser origin", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;

  try {
    const request = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://untrusted.example",
      },
    });

    assert.equal(getPublicRequestOrigin(request), "http://localhost:3000");
  } finally {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  }
});
