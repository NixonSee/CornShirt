import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("marketplace writes require customer authorization", () => {
  const create = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
  const cancel = readFileSync(
    new URL("./[listingId]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(create, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(create, /createResaleListing/);
  assert.match(cancel, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(cancel, /cancelResaleListing/);
  assert.match(cancel, /params: Promise<\{ listingId: string \}>/);
});
