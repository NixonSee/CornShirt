import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("Supabase sessions are cookie-backed for browser and server requests", () => {
  const packageJson = JSON.parse(read("../../package.json"));
  const serverUrl = new URL("./supabase/server.ts", import.meta.url);
  const proxyHelperUrl = new URL("./supabase/proxy.ts", import.meta.url);
  const proxyUrl = new URL("../proxy.ts", import.meta.url);

  assert.equal(Boolean(packageJson.dependencies["@supabase/ssr"]), true);
  assert.match(read("./supabaseClient.ts"), /createBrowserClient/);
  assert.equal(existsSync(serverUrl), true);
  assert.equal(existsSync(proxyHelperUrl), true);
  assert.equal(existsSync(proxyUrl), true);

  if (!existsSync(serverUrl) || !existsSync(proxyHelperUrl) || !existsSync(proxyUrl)) {
    return;
  }

  assert.match(read("./supabase/server.ts"), /createServerClient/);
  assert.match(read("./supabase/server.ts"), /cookies\(\)/);
  assert.match(read("./supabase/proxy.ts"), /auth\.getClaims\(\)/);
  assert.match(read("../proxy.ts"), /updateSession\(request\)/);
});

test("session proxy leaves API routes to route handlers", () => {
  const proxySource = read("../proxy.ts");

  assert.match(proxySource, /matcher:/);
  assert.match(proxySource, /\(\?!api\|/);
});

test("central role authorization verifies identity before profile roles", () => {
  const guardUrl = new URL("./requireRole.ts", import.meta.url);
  assert.equal(existsSync(guardUrl), true);
  if (!existsSync(guardUrl)) return;

  const guard = read("./requireRole.ts");
  assert.match(guard, /auth\.getUser\(\)/);
  assert.match(guard, /\.from\("profiles"\)/);
  assert.match(guard, /export async function requireRole/);
  assert.match(guard, /export async function authorizeApiRole/);
  assert.match(guard, /redirect\("\/login"\)/);
  assert.match(guard, /redirect\("\/visitor"\)/);
});

test("role authorization rejects deactivated accounts", () => {
  const guard = read("./requireRole.ts");
  assert.match(guard, /\.select\("role, status"\)/);
  assert.match(guard, /profile\.status === "deactivated"/);
  assert.match(guard, /status:\s*"deactivated"/);
  assert.match(guard, /redirect\("\/login\?error=deactivated"\)/);
  assert.match(guard, /result\.status === "deactivated"/);
  assert.match(guard, /Account deactivated/);
});

test("all dashboard route trees have server role layouts", () => {
  const expectations = [
    ["../app/admin/layout.tsx", '["admin"]'],
    ["../app/organizer/layout.tsx", '["organizer"]'],
    ["../app/customer/layout.tsx", '["customer", "user"]'],
  ] as const;

  for (const [path, roles] of expectations) {
    const url = new URL(path, import.meta.url);
    assert.equal(existsSync(url), true, `${path} must exist`);
    if (existsSync(url)) {
      assert.match(read(path), /await requireRole/);
      assert.equal(read(path).includes(roles), true);
    }
  }
});

test("sensitive admin pages guard before service-role reads", () => {
  const pages = [
    "../app/admin/page.tsx",
    "../app/admin/organizers/page.tsx",
    "../app/admin/pending-events/page.tsx",
  ];

  for (const path of pages) {
    const source = read(path);
    assert.match(source, /await requireRole\(\["admin"\]\)/);
    const firstServiceRoleRead = source.search(/supabaseAdmin\s*\.from/);
    assert.notEqual(firstServiceRoleRead, -1);
    assert.ok(
      source.indexOf('await requireRole(["admin"])') <
        firstServiceRoleRead,
      `${path} must authorize before its first service-role query`,
    );
  }
});

test("admin mutations use the verified caller instead of body-controlled identity", () => {
  const approveRoute = read("../app/api/admin/events/[eventId]/approve/route.ts");
  const rejectRoute = read("../app/api/admin/events/[eventId]/reject/route.ts");

  for (const source of [approveRoute, rejectRoute]) {
    assert.match(source, /authorizeApiRole\(\["admin"\]\)/);
    assert.match(source, /const adminId = auth\.identity\.user\.id/);
    assert.doesNotMatch(source, /admin_id is required/);
    assert.match(source, /admin_id: adminId/);
  }

  // Approve takes no body at all.
  assert.doesNotMatch(approveRoute, /request\.json\(\)/);

  // Reject may parse a body, but only for the optional reason — never identity.
  assert.match(rejectRoute, /reason\?: unknown/);
  assert.doesNotMatch(rejectRoute, /admin_id:\s*body/);
  assert.doesNotMatch(rejectRoute, /adminId\s*=\s*body/);

  const table = read("../components/admin/PendingEventsTable.tsx");
  assert.doesNotMatch(table, /auth\.getSession\(\)/);
  assert.doesNotMatch(table, /admin_id/);
});
