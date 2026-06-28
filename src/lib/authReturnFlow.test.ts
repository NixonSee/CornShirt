import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loginSource = readFileSync(
  new URL("../app/login/page.tsx", import.meta.url),
  "utf8",
);
const registerSource = readFileSync(
  new URL("../app/register/page.tsx", import.meta.url),
  "utf8",
);

test("login and registration read validated event return paths", () => {
  [loginSource, registerSource].forEach((source) => {
    assert.equal(source.includes("useSearchParams"), true);
    assert.equal(source.includes("getSafeEventReturnTo"), true);
    assert.equal(source.includes("withEventReturnTo"), true);
    assert.equal(source.includes("<Suspense"), true);
  });
});

test("registration forwards the selected event to login", () => {
  assert.equal(
    registerSource.includes(
      'router.push(withEventReturnTo("/login", returnTo))',
    ),
    true,
  );
});

test("customer login returns to the event without changing staff routing", () => {
  assert.equal(
    loginSource.includes('router.replace(returnTo ?? "/customer")'),
    true,
  );
  assert.equal(loginSource.includes('router.replace("/admin")'), true);
  assert.equal(loginSource.includes('router.replace("/organizer")'), true);
});
