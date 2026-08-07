import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("all authenticated roles reach Profile from the account menu and the drawer", () => {
  const navigation = read("../navConfig.ts");
  // Point at the implementation, not the RoleNav adapter, or this is vacuous.
  const roleNav = read("../nav/SiteNav.tsx");
  const globalStyles = read("../../app/globals.css");

  assert.match(navigation, /\/customer\/profile/);
  assert.match(navigation, /\/organizer\/profile/);
  assert.match(navigation, /\/admin\/profile/);

  // Profile is lifted out of the centre pill into the account menu...
  assert.match(roleNav, /const profileItem = items\.find/);
  assert.match(roleNav, /const pillItems = items\.filter/);
  // ...which is the only place a signed-in user can sign out.
  assert.match(roleNav, /sitenav-menu-signout/);
  assert.doesNotMatch(roleNav, /sitenav-cta-signout/);
  assert.doesNotMatch(roleNav, /app-profile-link/);

  // Admin and organizer share the approved edge-aligned navbar geometry.
  assert.match(
    globalStyles,
    /\.app-topbar\.sitenav:is\([\s\S]*?\[data-audience="organizer"\][\s\S]*?\[data-audience="admin"\][\s\S]*?\)\s*\{[\s\S]*?width:\s*100%;/,
  );
});

test("profile password form verifies the current password before updating", () => {
  const form = read("./ChangePasswordForm.tsx");

  assert.match(form, /passwordPolicyError\(password\)/);
  assert.match(form, /PASSWORD_MIN_LENGTH/);
  assert.match(form, /PasswordStrengthMeter/);
  assert.match(form, /password !== confirmation/);
  assert.match(form, /Current password/);
  assert.match(form, /autoComplete="current-password"/);
  assert.match(form, /supabase\.auth\.signInWithPassword/);
  assert.match(form, /current_password: currentPassword/);
  assert.match(form, /supabase\.auth\.updateUser/);
  assert.match(form, /supabase\.auth\.resetPasswordForEmail/);
  assert.match(form, /intent", "recovery"/);
  assert.match(form, /Send reset link/);
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
  assert.match(source, /\.createSignedUrl\(document\.file_path, 3600\)/);
  assert.match(source, /business_license/);
  assert.match(source, /owner_id_proof/);
  assert.match(source, /tax_certificate/);
});
