import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const AUTHORITATIVE_DOCS = [
  "docs/SPECS.md",
  "docs/ROLE_FEATURES_AND_FLOW.md",
  "docs/API_AND_ROUTES.md",
  "docs/SMART_CONTRACTS.md",
  "docs/UNFINISHED_FEATURES_TODO.md",
  "docs/AGENTS.md",
  "docs/CLAUDE.md",
  "docs/CODEX.md",
  "docs/DESIGN.md",
  "docs/COMPONENTS.md",
];

function listProductionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listProductionFiles(entryPath);
    if (!entry.isFile() || entry.name.endsWith(".test.ts")) return [];
    return [entryPath];
  });
}

test("active application and documentation do not reference the retired token", () => {
  const files = [
    ...listProductionFiles(path.join(ROOT, "src")),
    ...AUTHORITATIVE_DOCS.map((file) => path.join(ROOT, file)),
  ];
  const forbidden = new RegExp(["DICK", "EN|ERC-20"].join(""), "i");
  const matches = files
    .filter((file) => forbidden.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(ROOT, file));

  assert.deepEqual(matches, []);
});

test("the retired customer top-up route is absent", () => {
  assert.equal(existsSync(path.join(ROOT, "src/app/customer/top-up")), false);
});
