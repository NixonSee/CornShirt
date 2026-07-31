import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("all authenticated roles expose Profile only in the burger navigation", () => {
  const navigation = read("../navConfig.ts");
  const roleNav = read("../RoleNav.tsx");

  assert.match(navigation, /\/customer\/profile/);
  assert.match(navigation, /\/organizer\/profile/);
  assert.match(navigation, /\/admin\/profile/);
  assert.doesNotMatch(roleNav, /app-profile-link/);
  assert.doesNotMatch(roleNav, /View profile/);
});

test("profile password form validates and updates only the signed-in user", () => {
  const form = read("./ChangePasswordForm.tsx");

  assert.match(form, /password\.length < 8/);
  assert.match(form, /password !== confirmation/);
  assert.match(form, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.doesNotMatch(form, /supabaseAdmin/);
});

test("shared profile follows the unified CornShirt account-panel layout", () => {
  const page = read("./ProfilePage.tsx");
  const styles = read("./ProfilePage.module.css");

  assert.match(page, /<h1>Profile<\/h1>/);
  assert.match(page, /styles\.accountPanel/);
  assert.doesNotMatch(page, />Dashboard</);
  assert.match(styles, /\.accountPanel/);
  assert.match(styles, /var\(--primary\)/);
});

test("role profile pages authorize before reading private profile data", () => {
  const pages = [
    ["../../app/customer/profile/page.tsx", 'await requireRole(["customer", "user"])'],
    ["../../app/organizer/profile/page.tsx", 'await requireRole(["organizer"])'],
    ["../../app/admin/profile/page.tsx", 'await requireRole(["admin"])'],
  ] as const;

  for (const [path, authorization] of pages) {
    const source = read(path);
    assert.equal(source.includes(authorization), true);
    assert.ok(source.indexOf(authorization) < source.indexOf('from("profiles")'));
  }
});

test("organizer profile loads only linked private documents with signed URLs", () => {
  const source = read("../../app/organizer/profile/page.tsx");

  assert.match(source, /\.eq\("owner_id", user\.id\)/);
  assert.match(source, /\.eq\("application_id", application\.application_id\)/);
  assert.match(source, /\.createSignedUrl\(document\.file_path, 600\)/);
  assert.match(source, /business_license/);
  assert.match(source, /owner_id_proof/);
  assert.match(source, /tax_certificate/);
});
