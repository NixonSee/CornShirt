# Customer Managed-Wallet Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically provision exactly one encrypted, CornShirt-managed Ethereum wallet for each customer account while keeping organizers, admins, visitors, and all private-key material outside the flow.

**Architecture:** Registration creates the Supabase customer profile with a pending wallet state, then calls a customer-authorized Next.js endpoint. A server-only service generates a Viem account, encrypts its private key with AES-256-GCM, and calls a restricted PostgreSQL RPC that inserts `custodial_wallets` and updates the customer profile atomically. Repeated requests return the existing public address, and failed attempts can be retried without replacing a wallet.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Auth/PostgreSQL/RPC, Viem local accounts, Node `crypto`, Node test runner, ESLint

---

## File Structure

### Create

- `scripts/sql/create-custodial-wallets.sql` — profile wallet-state columns, server-only custodial-wallet table, constraints, RLS, and atomic provisioning RPC.
- `src/lib/walletEncryption.ts` — validate the server encryption key and encrypt/decrypt prototype private keys with AES-256-GCM.
- `src/lib/walletEncryption.test.ts` — encryption round-trip, random-IV, tamper, and configuration tests.
- `src/lib/walletProvisioningCore.ts` — dependency-injected, side-effect-free provisioning workflow and stable errors.
- `src/lib/walletProvisioning.ts` — server-only Viem, encryption, Supabase, and RPC adapter for the provisioning workflow.
- `src/lib/walletProvisioning.test.ts` — SQL contract and pure workflow tests for existing, new, failed, and concurrent-style retry behavior.
- `src/app/api/customer/wallet/provision/route.ts` — bodyless customer-authorized provisioning endpoint.
- `src/app/api/customer/wallet/provision/route.test.ts` — API authorization and response-contract source tests.
- `src/app/register/page.test.ts` — registration ordering, customer-only profile, retry UI, and secret-boundary source tests.

### Modify

- `src/app/register/page.tsx` — set the pending state, provision after profile creation, show wallet progress, and allow safe retry.
- `src/app/customer/page.tsx` — expose a safe retry after login when wallet provisioning is pending or failed.
- `src/app/customer/page.test.ts` — preserve customer event routing and verify the authenticated retry contract.
- `docs/API_AND_ROUTES.md` — document the new protected provisioning endpoint.
- `docs/superpowers/specs/2026-07-06-customer-managed-wallet-provisioning-design.md` — keep the approved schema wording synchronized if implementation discoveries require a narrow clarification.

### Do Not Modify

- DICKEN, NFT, Stripe, ticket-purchase, resale-settlement, organizer, and admin implementation files.
- `docs/AGENTS.md` without separate user approval.
- `.env.local`; add `WALLET_ENCRYPTION_KEY` locally during verification but never commit it.

---

### Task 1: Add the customer-only wallet schema and atomic RPC

**Files:**
- Create: `scripts/sql/create-custodial-wallets.sql`
- Test: `src/lib/walletProvisioning.test.ts`

- [ ] **Step 1: Write the failing SQL contract test**

Create `src/lib/walletProvisioning.test.ts` with the initial migration contract:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sqlPath = new URL(
  "../../scripts/sql/create-custodial-wallets.sql",
  import.meta.url,
);

test("wallet migration creates a server-only custodial table and atomic RPC", () => {
  const sql = readFileSync(sqlPath, "utf8");

  assert.match(sql, /add column if not exists wallet_status text/i);
  assert.match(sql, /add column if not exists wallet_error text/i);
  assert.match(sql, /create table if not exists public\.custodial_wallets/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /create or replace function public\.provision_customer_wallet/i);
  assert.match(sql, /insert into public\.custodial_wallets/i);
  assert.match(sql, /update public\.profiles/i);
  assert.match(sql, /wallet_status = 'ready'/i);
  assert.match(sql, /role not in \('customer', 'user'\)/i);
  assert.match(sql, /revoke all on function public\.provision_customer_wallet/i);
  assert.match(sql, /grant execute on function public\.provision_customer_wallet/i);

  const insertIndex = sql.indexOf("insert into public.custodial_wallets");
  const updateIndex = sql.indexOf("update public.profiles");
  assert.ok(insertIndex >= 0 && updateIndex > insertIndex);
  assert.doesNotMatch(sql, /grant\s+select.*custodial_wallets.*authenticated/is);
});
```

- [ ] **Step 2: Run the SQL contract test and verify it fails**

Run:

```powershell
node --test src/lib/walletProvisioning.test.ts
```

Expected: FAIL with `ENOENT` for `scripts/sql/create-custodial-wallets.sql`.

- [ ] **Step 3: Create the migration and RPC**

Create `scripts/sql/create-custodial-wallets.sql`:

```sql
begin;

alter table public.profiles
  add column if not exists wallet_status text,
  add column if not exists wallet_error text;

do $$
begin
  alter table public.profiles
    add constraint profiles_wallet_status_check
    check (wallet_status is null or wallet_status in ('pending', 'ready', 'failed'));
exception
  when duplicate_object then null;
end
$$;

update public.profiles
set wallet_status = 'ready', wallet_error = null
where role in ('customer', 'user')
  and wallet_address is not null
  and wallet_status is null;

update public.profiles
set wallet_status = 'pending'
where role in ('customer', 'user')
  and wallet_address is null
  and wallet_status is null;

create table if not exists public.custodial_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text not null,
  encrypted_private_key text not null,
  encryption_iv text not null,
  encryption_auth_tag text not null,
  key_version integer not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custodial_wallets_address_lower_uidx
  on public.custodial_wallets (lower(wallet_address));

alter table public.custodial_wallets enable row level security;

revoke all on table public.custodial_wallets from public, anon, authenticated;
grant select, insert, update on table public.custodial_wallets to service_role;

create or replace function public.provision_customer_wallet(
  p_user_id uuid,
  p_wallet_address text,
  p_encrypted_private_key text,
  p_encryption_iv text,
  p_encryption_auth_tag text,
  p_key_version integer
)
returns table(wallet_address text, wallet_status text, created boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_profile_address text;
  v_profile_status text;
  v_existing_address text;
begin
  select p.role, p.wallet_address, p.wallet_status
    into v_role, v_profile_address, v_profile_status
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'customer_profile_missing';
  end if;

  if v_role not in ('customer', 'user') then
    raise exception using errcode = '42501', message = 'customer_role_required';
  end if;

  select c.wallet_address
    into v_existing_address
  from public.custodial_wallets c
  where c.user_id = p_user_id;

  if found then
    if v_profile_address is distinct from v_existing_address
       or v_profile_status is distinct from 'ready' then
      raise exception using errcode = '23514', message = 'wallet_records_inconsistent';
    end if;

    return query select v_existing_address, 'ready'::text, false;
    return;
  end if;

  if v_profile_address is not null or v_profile_status = 'ready' then
    raise exception using errcode = '23514', message = 'wallet_records_inconsistent';
  end if;

  insert into public.custodial_wallets (
    user_id,
    wallet_address,
    encrypted_private_key,
    encryption_iv,
    encryption_auth_tag,
    key_version
  ) values (
    p_user_id,
    p_wallet_address,
    p_encrypted_private_key,
    p_encryption_iv,
    p_encryption_auth_tag,
    p_key_version
  );

  update public.profiles
  set wallet_address = p_wallet_address,
      wallet_status = 'ready',
      wallet_error = null
  where user_id = p_user_id
    and role in ('customer', 'user');

  if not found then
    raise exception using errcode = 'P0002', message = 'customer_profile_missing';
  end if;

  return query select p_wallet_address, 'ready'::text, true;
end;
$$;

revoke all on function public.provision_customer_wallet(
  uuid, text, text, text, text, integer
) from public, anon, authenticated;

grant execute on function public.provision_customer_wallet(
  uuid, text, text, text, text, integer
) to service_role;

commit;
```

PostgreSQL executes a function call transactionally. An exception in the function rolls back both the custodial insert and profile update; do not add transaction-control statements inside the function body.

- [ ] **Step 4: Run the SQL contract test and verify it passes**

Run:

```powershell
node --test src/lib/walletProvisioning.test.ts
```

Expected: PASS for the migration contract test.

- [ ] **Step 5: Apply and inspect the migration in the development Supabase project**

Run the script in the Supabase SQL editor, then run:

```sql
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('wallet_address', 'wallet_status', 'wallet_error')
order by column_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'custodial_wallets';
```

Expected: all three profile columns are present; `custodial_wallets.rowsecurity` is `true`. Do not query decrypted private-key values during verification.

- [ ] **Step 6: Commit the schema checkpoint**

```powershell
git add scripts/sql/create-custodial-wallets.sql src/lib/walletProvisioning.test.ts
git commit -m "feat: add atomic custodial wallet schema"
```

### Task 2: Add authenticated encryption for prototype wallet keys

**Files:**
- Create: `src/lib/walletEncryption.ts`
- Create: `src/lib/walletEncryption.test.ts`

- [ ] **Step 1: Write failing encryption tests**

Create `src/lib/walletEncryption.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptPrivateKey,
  encryptPrivateKey,
  readWalletEncryptionKey,
} from "./walletEncryption.ts";

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
```

- [ ] **Step 2: Run the encryption test and verify it fails**

Run:

```powershell
node --test src/lib/walletEncryption.test.ts
```

Expected: FAIL because `walletEncryption.ts` does not exist.

- [ ] **Step 3: Implement the encryption boundary**

Create `src/lib/walletEncryption.ts`:

```ts
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
```

- [ ] **Step 4: Run the encryption tests and verify they pass**

Run:

```powershell
node --test src/lib/walletEncryption.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Generate a local encryption key without committing it**

Run:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Add the printed value manually to `.env.local`:

```dotenv
WALLET_ENCRYPTION_KEY=<base64-encoded-32-byte-value>
```

Expected: `.env.local` remains ignored by Git. Never paste the value into tests, documentation, logs, screenshots, or chat.

- [ ] **Step 6: Commit the encryption checkpoint**

```powershell
git add src/lib/walletEncryption.ts src/lib/walletEncryption.test.ts
git commit -m "feat: encrypt managed wallet keys"
```

### Task 3: Build the idempotent server-only provisioning service

**Files:**
- Modify: `src/lib/walletProvisioning.test.ts`
- Create: `src/lib/walletProvisioningCore.ts`
- Create: `src/lib/walletProvisioning.ts`

- [ ] **Step 1: Extend the service tests with dependency-injected behavior**

Append to `src/lib/walletProvisioning.test.ts`:

```ts
import {
  provisionCustomerWallet,
  type WalletProvisioningDependencies,
} from "./walletProvisioningCore.ts";

const privateKey =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const generatedAddress = "0x1111111111111111111111111111111111111111";
const encrypted = {
  ciphertext: "ciphertext",
  iv: "iv",
  authTag: "tag",
  keyVersion: 1,
};

function dependencies(
  overrides: Partial<WalletProvisioningDependencies> = {},
): WalletProvisioningDependencies {
  return {
    loadWalletState: async () => ({
      kind: "pending",
      walletAddress: null,
    }),
    generateWallet: () => ({ address: generatedAddress, privateKey }),
    encryptWallet: () => encrypted,
    persistWallet: async () => ({
      walletAddress: generatedAddress,
      walletStatus: "ready",
      created: true,
    }),
    markFailed: async () => undefined,
    ...overrides,
  };
}

test("returns an existing ready wallet without generating another key", async () => {
  let generated = false;
  const result = await provisionCustomerWallet(
    "customer-1",
    dependencies({
      loadWalletState: async () => ({
        kind: "ready",
        walletAddress: generatedAddress,
      }),
      generateWallet: () => {
        generated = true;
        return { address: generatedAddress, privateKey };
      },
    }),
  );

  assert.equal(result.created, false);
  assert.equal(result.walletAddress, generatedAddress);
  assert.equal(generated, false);
});

test("generates, encrypts, and atomically persists a pending customer wallet", async () => {
  let persistedUserId = "";
  const result = await provisionCustomerWallet(
    "customer-2",
    dependencies({
      persistWallet: async (input) => {
        persistedUserId = input.userId;
        assert.equal(input.walletAddress, generatedAddress);
        assert.deepEqual(input.encrypted, encrypted);
        return {
          walletAddress: generatedAddress,
          walletStatus: "ready",
          created: true,
        };
      },
    }),
  );

  assert.equal(persistedUserId, "customer-2");
  assert.equal(result.created, true);
  assert.equal(result.walletStatus, "ready");
});

test("rejects inconsistent records without generating a replacement", async () => {
  let generated = false;
  await assert.rejects(
    provisionCustomerWallet(
      "customer-3",
      dependencies({
        loadWalletState: async () => ({
          kind: "inconsistent",
          walletAddress: generatedAddress,
        }),
        generateWallet: () => {
          generated = true;
          return { address: generatedAddress, privateKey };
        },
      }),
    ),
    /inconsistent/i,
  );
  assert.equal(generated, false);
});

test("marks a safe failure category when wallet persistence fails", async () => {
  let category = "";
  await assert.rejects(
    provisionCustomerWallet(
      "customer-4",
      dependencies({
        persistWallet: async () => {
          throw new Error("database internals must not reach the client");
        },
        markFailed: async (_userId, safeCategory) => {
          category = safeCategory;
        },
      }),
    ),
    /could not be provisioned/i,
  );
  assert.equal(category, "storage_error");
});
```

- [ ] **Step 2: Run the service tests and verify they fail**

Run:

```powershell
node --test src/lib/walletProvisioning.test.ts
```

Expected: the SQL test passes and service tests fail because `walletProvisioningCore.ts` does not exist.

- [ ] **Step 3: Implement the pure provisioning workflow**

Create `src/lib/walletProvisioningCore.ts`:

```ts
import type { EncryptedPrivateKey } from "./walletEncryption";

export type WalletState =
  | { kind: "pending" | "failed"; walletAddress: null }
  | { kind: "ready" | "inconsistent"; walletAddress: string };

export interface PersistWalletInput {
  userId: string;
  walletAddress: string;
  encrypted: EncryptedPrivateKey;
}

export interface PersistedWallet {
  walletAddress: string;
  walletStatus: "ready";
  created: boolean;
}

export interface WalletProvisioningDependencies {
  loadWalletState(userId: string): Promise<WalletState>;
  generateWallet(): { address: string; privateKey: `0x${string}` };
  encryptWallet(privateKey: `0x${string}`): EncryptedPrivateKey;
  persistWallet(input: PersistWalletInput): Promise<PersistedWallet>;
  markFailed(userId: string, category: "configuration_error" | "storage_error"): Promise<void>;
}

export class WalletProvisioningError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WalletProvisioningError";
  }
}

export async function provisionCustomerWallet(
  userId: string,
  dependencies: WalletProvisioningDependencies,
) {
  const state = await dependencies.loadWalletState(userId);
  if (state.kind === "ready") {
    return {
      walletAddress: state.walletAddress,
      walletStatus: "ready" as const,
      created: false,
    };
  }
  if (state.kind === "inconsistent") {
    throw new WalletProvisioningError(
      "Managed wallet records are inconsistent and require inspection.",
      409,
    );
  }

  try {
    const generated = dependencies.generateWallet();
    const encrypted = dependencies.encryptWallet(generated.privateKey);
    const persisted = await dependencies.persistWallet({
      userId,
      walletAddress: generated.address,
      encrypted,
    });
    return persisted;
  } catch (error) {
    const category =
      error instanceof Error && error.message.includes("WALLET_ENCRYPTION_KEY")
        ? "configuration_error"
        : "storage_error";
    await dependencies.markFailed(userId, category);
    throw new WalletProvisioningError(
      "Managed wallet could not be provisioned. Please retry.",
      500,
    );
  }
}
```

- [ ] **Step 4: Implement the server-only Supabase adapter**

Create `src/lib/walletProvisioning.ts`:

```ts
import "server-only";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  encryptPrivateKey,
  readWalletEncryptionKey,
  type EncryptedPrivateKey,
} from "@/lib/walletEncryption";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  provisionCustomerWallet as runProvisioning,
  WalletProvisioningError,
  type PersistWalletInput,
  type WalletProvisioningDependencies,
  type WalletState,
} from "@/lib/walletProvisioningCore";

export { WalletProvisioningError } from "@/lib/walletProvisioningCore";

async function loadWalletState(userId: string): Promise<WalletState> {
  const [{ data: profile, error: profileError }, { data: wallet, error: walletError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("wallet_address, wallet_status")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("custodial_wallets")
        .select("wallet_address")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw new WalletProvisioningError("Customer profile is unavailable.", 409);
  }
  if (walletError) {
    throw new WalletProvisioningError("Wallet state could not be loaded.", 500);
  }

  const profileAddress = profile.wallet_address as string | null;
  const storedAddress = (wallet?.wallet_address as string | undefined) ?? null;
  if (profile.wallet_status === "ready" && profileAddress && storedAddress) {
    return profileAddress.toLowerCase() === storedAddress.toLowerCase()
      ? { kind: "ready", walletAddress: profileAddress }
      : { kind: "inconsistent", walletAddress: profileAddress };
  }
  if (profileAddress || storedAddress || profile.wallet_status === "ready") {
    return {
      kind: "inconsistent",
      walletAddress: profileAddress ?? storedAddress ?? "unavailable",
    };
  }
  return {
    kind: profile.wallet_status === "failed" ? "failed" : "pending",
    walletAddress: null,
  };
}

async function persistWallet(input: PersistWalletInput) {
  const { data, error } = await supabaseAdmin
    .rpc("provision_customer_wallet", {
      p_user_id: input.userId,
      p_wallet_address: input.walletAddress,
      p_encrypted_private_key: input.encrypted.ciphertext,
      p_encryption_iv: input.encrypted.iv,
      p_encryption_auth_tag: input.encrypted.authTag,
      p_key_version: input.encrypted.keyVersion,
    })
    .single();

  if (error || !data) throw new Error("wallet_rpc_failed");
  return {
    walletAddress: String(data.wallet_address),
    walletStatus: "ready" as const,
    created: Boolean(data.created),
  };
}

async function markFailed(
  userId: string,
  category: "configuration_error" | "storage_error",
) {
  await supabaseAdmin
    .from("profiles")
    .update({ wallet_status: "failed", wallet_error: category })
    .eq("user_id", userId)
    .in("role", ["customer", "user"])
    .is("wallet_address", null);
}

const dependencies: WalletProvisioningDependencies = {
  loadWalletState,
  generateWallet: () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { address: account.address, privateKey };
  },
  encryptWallet: (privateKey): EncryptedPrivateKey =>
    encryptPrivateKey(privateKey, readWalletEncryptionKey()),
  persistWallet,
  markFailed,
};

export function provisionCustomerWallet(userId: string) {
  return runProvisioning(userId, dependencies);
}
```

Keep error logs limited to user ID, category, and outcome. Do not log generated accounts, encrypted values, RPC arguments, or caught raw errors that may later contain sensitive context.

- [ ] **Step 5: Run the service tests and verify they pass**

Run:

```powershell
node --test src/lib/walletProvisioning.test.ts
```

Expected: the SQL contract and four provisioning-service tests pass.

- [ ] **Step 6: Commit the service checkpoint**

```powershell
git add src/lib/walletProvisioningCore.ts src/lib/walletProvisioning.ts src/lib/walletProvisioning.test.ts
git commit -m "feat: provision managed customer wallets"
```

### Task 4: Add the protected provisioning API

**Files:**
- Create: `src/app/api/customer/wallet/provision/route.test.ts`
- Create: `src/app/api/customer/wallet/provision/route.ts`

- [ ] **Step 1: Write the failing API contract test**

Create `src/app/api/customer/wallet/provision/route.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("wallet provisioning is customer-authorized and bodyless", () => {
  assert.match(routeSource, /authorizeApiRole\(\["customer", "user"\]\)/);
  assert.match(routeSource, /provisionCustomerWallet\(auth\.identity\.user\.id\)/);
  assert.doesNotMatch(routeSource, /request\.json\(/);
  assert.doesNotMatch(routeSource, /privateKey|encrypted_private_key/);
});

test("wallet provisioning returns only public status fields", () => {
  assert.match(routeSource, /walletAddress:\s*result\.walletAddress/);
  assert.match(routeSource, /walletStatus:\s*result\.walletStatus/);
  assert.match(routeSource, /result\.created\s*\?\s*201\s*:\s*200/);
});
```

- [ ] **Step 2: Run the API contract test and verify it fails**

Run:

```powershell
node --test src/app/api/customer/wallet/provision/route.test.ts
```

Expected: FAIL because `route.ts` does not exist.

- [ ] **Step 3: Implement the route**

Create `src/app/api/customer/wallet/provision/route.ts`:

```ts
import { authorizeApiRole } from "@/lib/requireRole";
import {
  provisionCustomerWallet,
  WalletProvisioningError,
} from "@/lib/walletProvisioning";

export async function POST() {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await provisionCustomerWallet(auth.identity.user.id);
    return Response.json(
      {
        walletAddress: result.walletAddress,
        walletStatus: result.walletStatus,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof WalletProvisioningError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "Managed wallet could not be provisioned. Please retry." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run the API test and verify it passes**

Run:

```powershell
node --test src/app/api/customer/wallet/provision/route.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit the API checkpoint**

```powershell
git add src/app/api/customer/wallet/provision/route.ts src/app/api/customer/wallet/provision/route.test.ts
git commit -m "feat: expose customer wallet provisioning API"
```

### Task 5: Integrate wallet provisioning into registration with retry

**Files:**
- Create: `src/app/register/page.test.ts`
- Modify: `src/app/register/page.tsx`

- [ ] **Step 1: Write the failing registration contract test**

Create `src/app/register/page.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("customer registration marks the wallet pending before provisioning", () => {
  assert.match(source, /role:\s*"customer"/);
  assert.match(source, /wallet_status:\s*"pending"/);
  const profileIndex = source.indexOf('.from("profiles").insert');
  const provisionIndex = source.indexOf('/api/customer/wallet/provision');
  assert.ok(profileIndex >= 0 && provisionIndex > profileIndex);
});

test("registration provisions through a bodyless request and supports retry", () => {
  assert.match(source, /method:\s*"POST"/);
  assert.doesNotMatch(source, /privateKey|encrypted_private_key/);
  assert.match(source, /Creating your CornShirt wallet/);
  assert.match(source, /Retry wallet setup/);
  assert.match(source, /provisionWallet/);
});
```

- [ ] **Step 2: Run the registration test and verify it fails**

Run:

```powershell
node --test src/app/register/page.test.ts
```

Expected: both tests fail because registration does not yet set or provision wallet state.

- [ ] **Step 3: Add wallet provisioning state and helper**

In `src/app/register/page.tsx`, add state near the existing loading state:

```ts
const [isProvisioningWallet, setIsProvisioningWallet] = useState(false);
const [walletRetryAvailable, setWalletRetryAvailable] = useState(false);
```

Add this helper inside `RegisterContent`:

```ts
async function provisionWallet(): Promise<boolean> {
  setIsProvisioningWallet(true);
  setWalletRetryAvailable(false);
  setErrorMessage("");

  try {
    const response = await fetch("/api/customer/wallet/provision", {
      method: "POST",
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setErrorMessage(
        body.error ??
          "Your account was created, but wallet setup needs another attempt.",
      );
      setWalletRetryAvailable(true);
      return false;
    }
    return true;
  } catch {
    setErrorMessage(
      "Your account was created, but wallet setup needs another attempt.",
    );
    setWalletRetryAvailable(true);
    return false;
  } finally {
    setIsProvisioningWallet(false);
  }
}

function finishRegistration() {
  setSuccessMessage(
    "Account and managed wallet created. Redirecting you to the login page...",
  );
  setTimeout(() => {
    router.push(withEventReturnTo("/login", returnTo));
  }, 1500);
}
```

- [ ] **Step 4: Set pending state and provision after profile creation**

Change the customer profile insert to include:

```ts
const { error: profileError } = await supabase.from("profiles").insert({
  user_id: userId,
  name: name.trim(),
  email: email.trim(),
  role: "customer",
  wallet_status: "pending",
});
```

Replace the existing success-message and timeout block with:

```ts
const walletReady = await provisionWallet();
if (!walletReady) return;
finishRegistration();
```

This ordering ensures only the customer registration branch calls provisioning. Do not add provisioning to organizer invitation, admin, partner-application, or login flows.

- [ ] **Step 5: Add progress and retry UI**

Above the submit button, after the existing status messages, add:

```tsx
{isProvisioningWallet ? (
  <p className="form-success" role="status">
    Creating your CornShirt wallet...
  </p>
) : null}

{walletRetryAvailable ? (
  <button
    className="button secondary full"
    type="button"
    disabled={isProvisioningWallet}
    onClick={async () => {
      if (await provisionWallet()) finishRegistration();
    }}
  >
    Retry wallet setup
  </button>
) : null}
```

Update the main submit button disable condition and loading label:

```tsx
<button
  className="button full"
  type="submit"
  disabled={isLoading || isProvisioningWallet || walletRetryAvailable}
>
  {isLoading || isProvisioningWallet ? (
    <>
      <Loader2 className="button-spinner" size={18} />
      {isProvisioningWallet
        ? "Creating your CornShirt wallet..."
        : "Creating account..."}
    </>
  ) : (
    "Create account"
  )}
</button>
```

Do not ask for, display, or add controls for private keys, seed phrases, RPC URLs, or external wallets.

- [ ] **Step 6: Run the registration test and targeted lint**

Run:

```powershell
node --test src/app/register/page.test.ts
npx.cmd eslint src/app/register/page.tsx src/app/register/page.test.ts
```

Expected: 2 tests pass and ESLint exits with no errors.

- [ ] **Step 7: Commit the registration checkpoint**

```powershell
git add src/app/register/page.tsx src/app/register/page.test.ts
git commit -m "feat: provision customer wallet during registration"
```

### Task 6: Preserve wallet recovery after registration

**Files:**
- Modify: `src/app/customer/page.test.ts`
- Modify: `src/app/customer/page.tsx`

- [ ] **Step 1: Update the existing event-discovery assertion and add a failing wallet-retry contract**

In `src/app/customer/page.test.ts`, replace the stale assertion that expects a prop-less `EventDiscovery` with:

```ts
assert.match(source, /<EventDiscovery detailBasePath="\/customer\/events"\s*\/>/);
```

Update the existing profile-select assertion to include the new wallet state:

```ts
assert.match(source, /\.select\("name,wallet_address,wallet_status,role"\)/);
```

Append this test:

```ts
test("customer dashboard can recover pending or failed wallet provisioning", () => {
  assert.match(source, /wallet_status/);
  assert.match(source, /retryWalletSetup/);
  assert.match(source, /\/api\/customer\/wallet\/provision/);
  assert.match(source, /Retry wallet setup/);
  assert.match(source, /wallet_status:\s*"ready"/);
});
```

- [ ] **Step 2: Run the customer page test and verify the new wallet test fails**

Run:

```powershell
node --test src/app/customer/page.test.ts
```

Expected: existing customer-page tests pass after the route assertion correction; the new wallet-recovery test fails because the dashboard does not read or retry `wallet_status`.

- [ ] **Step 3: Load wallet status with the customer profile**

In `src/app/customer/page.tsx`, extend `CustomerProfile`:

```ts
interface CustomerProfile {
  name: string | null;
  wallet_address: string | null;
  wallet_status: "pending" | "ready" | "failed" | null;
  role: string | null;
}
```

Change the profile query to:

```ts
.select("name,wallet_address,wallet_status,role")
```

Add state beside the existing loading state:

```ts
const [isProvisioningWallet, setIsProvisioningWallet] = useState(false);
```

- [ ] **Step 4: Add the authenticated retry handler**

Inside `CustomerPage`, add:

```ts
async function retryWalletSetup() {
  setIsProvisioningWallet(true);
  setErrorMessage("");

  try {
    const response = await fetch("/api/customer/wallet/provision", {
      method: "POST",
    });
    const body = (await response.json().catch(() => ({}))) as {
      walletAddress?: string;
      walletStatus?: "ready";
      error?: string;
    };

    if (!response.ok || !body.walletAddress) {
      setErrorMessage(body.error ?? "Wallet setup could not be completed.");
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            wallet_address: body.walletAddress ?? null,
            wallet_status: "ready",
          }
        : current,
    );
  } catch {
    setErrorMessage("Wallet setup could not be completed.");
  } finally {
    setIsProvisioningWallet(false);
  }
}
```

- [ ] **Step 5: Render the recovery state only for customers without a ready wallet**

Immediately after `RoleNav`, add:

```tsx
{profile?.wallet_status !== "ready" ? (
  <section className="customer-wallet-setup state-card" aria-live="polite">
    <h2>Finish wallet setup</h2>
    <p className="muted">
      Your customer account is ready, but its CornShirt-managed wallet still
      needs to be created before top-ups, purchases, or resale settlement.
    </p>
    <button
      className="button"
      type="button"
      disabled={isProvisioningWallet}
      onClick={retryWalletSetup}
    >
      {isProvisioningWallet ? "Creating wallet..." : "Retry wallet setup"}
    </button>
  </section>
) : null}
```

This control is inside the customer-only route tree and calls the same idempotent API. Do not add it to visitor, organizer, or admin pages.

- [ ] **Step 6: Run the customer-page test and targeted lint**

Run:

```powershell
node --test src/app/customer/page.test.ts
npx.cmd eslint src/app/customer/page.tsx src/app/customer/page.test.ts
```

Expected: customer-page tests pass and ESLint exits with no errors.

- [ ] **Step 7: Commit the recovery checkpoint**

```powershell
git add src/app/customer/page.tsx src/app/customer/page.test.ts
git commit -m "feat: retry customer wallet provisioning"
```

### Task 7: Document and verify the complete wallet-provisioning slice

**Files:**
- Modify: `docs/API_AND_ROUTES.md`
- Verify: all files from Tasks 1–5

- [ ] **Step 1: Document the protected endpoint**

Under `## API Routes` in `docs/API_AND_ROUTES.md`, add:

```markdown
- `POST /api/customer/wallet/provision` - Idempotently create the authenticated customer's CornShirt-managed wallet. Returns only the public address and provisioning status.
```

Under the route list or an adjacent note, add:

```markdown
Wallet provisioning is customer-only. Organizer and admin accounts do not receive managed wallets automatically. Encrypted private-key material remains server-only and is never returned by this API.
```

- [ ] **Step 2: Run all focused wallet tests**

Run:

```powershell
node --test src/lib/walletEncryption.test.ts src/lib/walletProvisioning.test.ts src/app/api/customer/wallet/provision/route.test.ts src/app/register/page.test.ts
```

Expected: all wallet tests pass with zero failures.

- [ ] **Step 3: Run the complete repository test set**

Run:

```powershell
$tests = rg --files src -g '*.test.ts'
node --test $tests
```

Expected: all tests pass. If unrelated pre-existing failures remain, record their exact names and outputs; do not describe the wallet feature as fully verified until its focused tests pass independently.

- [ ] **Step 4: Run lint and the production build**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: ESLint has zero errors and the production build succeeds. If the known missing local `nodemailer` installation still blocks the build, run `npm.cmd install` only with user approval, rerun the build, and report the dependency issue separately from wallet behavior.

- [ ] **Step 5: Perform a local registration smoke test**

With the Supabase migration applied and `WALLET_ENCRYPTION_KEY` set locally:

1. Register a new customer.
2. Confirm the UI shows `Creating your CornShirt wallet` before redirecting.
3. Confirm the customer's `profiles.wallet_status` is `ready` and `wallet_address` begins with `0x`.
4. Confirm exactly one `custodial_wallets` record exists for the customer.
5. Retry `POST /api/customer/wallet/provision` while signed in as that customer.
6. Confirm it returns `200` with the same address and does not add a second row.
7. Confirm an organizer or admin request receives `403` and creates no custodial row.
8. Inspect browser network responses and confirm no private key, ciphertext, IV, or authentication tag is returned.

Do not print or copy encrypted/decrypted key fields while performing the smoke test.

- [ ] **Step 6: Review scope and secrets before completion**

Run:

```powershell
rg -n "privateKey|encrypted_private_key|WALLET_ENCRYPTION_KEY" src/app src/components
git diff --check
git status --short
```

Expected:

- no client component contains private-key or encryption-key access;
- the provisioning response contains only public address/status fields;
- no DICKEN, Stripe, NFT, purchasing, resale-settlement, organizer, or admin feature implementation was added;
- no `.env.local` or secret value is staged;
- `git diff --check` reports no whitespace errors.

- [ ] **Step 7: Commit documentation after verification**

```powershell
git add docs/API_AND_ROUTES.md docs/superpowers/specs/2026-07-06-customer-managed-wallet-provisioning-design.md
git commit -m "docs: document customer wallet provisioning"
```

After this plan is fully implemented and verified, return to brainstorming for the separate local DICKEN ERC-20 design. Do not start DICKEN implementation from this plan.
