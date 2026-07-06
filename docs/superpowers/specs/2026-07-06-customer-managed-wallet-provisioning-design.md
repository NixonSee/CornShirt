# Customer Managed-Wallet Provisioning Design

## Purpose

Automatically create one Ethereum wallet for every newly registered CornShirt customer so the customer never needs MetaMask, an external wallet, or a seed phrase. CornShirt uses a platform-managed wallet for local prototype transactions.

Only customer accounts receive a CornShirt-managed wallet automatically. Public visitors, organizers, admins, and partner applicants do not enter the wallet-provisioning flow.

This is a university prototype that runs against a local Hardhat network only. The wallets and any future DICKEN balances have no real monetary value.

## Scope

### Included

- Provision one Ethereum wallet immediately after a customer registration creates an authenticated Supabase session and customer profile.
- Enforce customer-only eligibility before generating or storing any wallet material. The legacy `user` role is eligible only where the existing application normalizes it as a customer account.
- Generate the wallet only in server-side code with Viem.
- Store the public address in `profiles.wallet_address`.
- Encrypt the private key before database storage.
- Keep encrypted wallet material in a dedicated server-only table.
- Make provisioning idempotent and safe to retry.
- Expose clear `pending`, `ready`, and `failed` provisioning states.
- Allow an authenticated customer whose provisioning failed to retry safely.
- Add automated coverage for encryption, authorization, idempotency, and registration integration.

### Excluded

- The DICKEN ERC-20 contract.
- Token minting, transfers, balances, or allowances.
- Stripe checkout and Stripe webhooks.
- Ticket purchases, NFT minting, resale settlement, or refunds.
- External wallets, wallet connection UI, seed-phrase export, or private-key export.
- Sepolia, mainnet, or any public blockchain deployment.
- Production custody, hardware security modules, MPC, or cloud KMS integration.
- Wallet-key rotation and account recovery after encryption-key loss.

The DICKEN design starts only after this wallet-provisioning specification is approved and implemented.

## Architecture

Provisioning uses the existing two-step customer registration flow:

1. Supabase Auth creates the user and immediately establishes a browser session.
2. The registration page inserts the `customer` profile with `wallet_status = 'pending'` and no wallet address.
3. The browser calls `POST /api/customer/wallet/provision` without sending a user ID, wallet address, or key material.
4. The route verifies the Supabase session and requires the `customer` or legacy `user` role.
5. A server-only wallet service generates a random private key with Viem and derives its Ethereum address.
6. The service encrypts the private key with AES-256-GCM.
7. A restricted PostgreSQL function/RPC atomically stores the encrypted wallet record, updates the authenticated customer's public wallet address, and changes the customer's wallet status to `ready`.
8. The browser receives only the public wallet address and continues to the customer experience.

The browser never generates, receives, decrypts, or stores the private key.

## Data Model

### `profiles` additions

- `wallet_address text null`
- `wallet_status text null`
- `wallet_error text null`

`wallet_status` is constrained to:

- `pending`: registration exists but wallet provisioning has not completed;
- `ready`: a custodial wallet record exists and `wallet_address` is populated;
- `failed`: the last provisioning attempt failed and may be retried.

Customer registration explicitly sets `wallet_status = 'pending'`. Non-customer profiles keep `wallet_address`, `wallet_status`, and `wallet_error` as `null`, preventing organizer and admin accounts from appearing to have wallet provisioning in progress.

`wallet_error` stores only a safe operational category such as `configuration_error` or `storage_error`. It must not contain private keys, ciphertext, stack traces, database internals, or environment-variable values.

### `custodial_wallets`

- `user_id uuid primary key`
- `wallet_address text not null`
- `encrypted_private_key text not null`
- `encryption_iv text not null`
- `encryption_auth_tag text not null`
- `key_version integer not null default 1`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The table enforces one wallet per user and case-insensitive uniqueness for wallet addresses. Row Level Security is enabled with no browser-facing policies. Only trusted server-side service-role code may read or write this table.

The private key is never added to `profiles`, authentication metadata, API responses, logs, transaction descriptions, or client-readable tables.

The current CornShirt schema stores customer account fields in the customer's `profiles` row rather than a separate `customers` table. Therefore, references to `customers.wallet_address` and `customers.wallet_status` in the product requirement map to `profiles.wallet_address` and `profiles.wallet_status` for the row whose role is `customer` or the legacy customer-equivalent `user` role.

## Atomic PostgreSQL Function/RPC

Implementation must add a restricted PostgreSQL function exposed to trusted server code as an RPC. The function receives the authenticated user ID, public wallet address, encrypted private-key fields, and key version from the server-only wallet service.

Within one database transaction, the function must:

1. Insert the new `custodial_wallets` record.
2. Update the customer's `profiles.wallet_address` value.
3. Update the customer's `profiles.wallet_status` value to `ready` and clear any previous safe `wallet_error` value.
4. Complete all changes atomically so they commit together.

If any insert, validation, or update fails, PostgreSQL must roll back the complete function call. It must never leave a custodial wallet without its matching customer address and ready status, or mark a customer ready without a custodial wallet record.

The function must verify that exactly one matching customer profile exists and that its role is `customer` or the supported legacy customer-equivalent `user`. Execution is revoked from browser-facing database roles and granted only to the trusted server role. The function returns only the public wallet address and `ready` status; it never returns encrypted or decrypted private-key material.

## Encryption and Secret Handling

The wallet service uses Node's cryptography implementation with:

- AES-256-GCM;
- a random 12-byte initialization vector for every encryption;
- the authentication tag stored beside the ciphertext;
- a 32-byte encryption key supplied as `WALLET_ENCRYPTION_KEY` in server-only environment configuration;
- a `key_version` field so a later design can introduce controlled key rotation.

`WALLET_ENCRYPTION_KEY` must never use the `NEXT_PUBLIC_` prefix and must never be committed. Startup or provisioning fails closed when the key is missing, malformed, or the wrong length.

For this local-only university prototype, encrypted database storage is acceptable because no wallet contains real assets. Losing `WALLET_ENCRYPTION_KEY` makes existing managed wallets unrecoverable; the prototype recovery procedure is to reset the local chain and reprovision test wallets.

## Provisioning API

### `POST /api/customer/wallet/provision`

The request has no body. Identity always comes from the verified Supabase session.

Possible results:

- `200`: an existing ready wallet is returned; no new wallet is generated.
- `201`: a new wallet was generated and stored successfully.
- `401`: no authenticated Supabase user.
- `403`: the authenticated profile is not a customer or legacy user.
- `409`: the customer profile is missing or cannot enter the provisioning flow.
- `500`: provisioning failed; the profile is marked `failed` with a safe error category when possible.

Successful responses contain only:

```json
{
  "walletAddress": "0x...",
  "walletStatus": "ready"
}
```

The API must use the existing server authorization helpers rather than trusting a browser-supplied user ID or role.

## Idempotency and Concurrency

Provisioning is keyed by the authenticated Supabase user ID.

- If that user already has a complete custodial wallet, return its public address.
- If `profiles.wallet_address` is populated but the custodial record is missing or inconsistent, fail safely for inspection; do not silently generate a replacement wallet.
- Concurrent requests are resolved by the primary key on `custodial_wallets.user_id` and the unique wallet-address index.
- The winning request stores the wallet. A losing request discards its newly generated in-memory key and reloads the stored wallet address.
- Persisting the custodial record, customer wallet address, and customer ready status must use the required restricted PostgreSQL function/RPC so all changes commit or roll back together.

Private-key variables should be kept in the smallest possible function scope and must never be included in thrown error messages.

## Registration Experience

The existing name, email, password, default-customer role, and immediate-session behavior remain unchanged.

After the profile is created, registration shows a short `Creating your CornShirt wallet` state while it calls the provisioning endpoint. On success, registration continues through its existing completion or redirect behavior.

If provisioning fails:

- the Supabase account and customer profile remain valid;
- the UI explains that the account was created but wallet setup needs another attempt;
- the UI offers `Retry wallet setup`;
- retry calls the same idempotent endpoint;
- ticket purchase, top-up, and resale settlement remain unavailable until `wallet_status = 'ready'`.

Customer pages that require a wallet display a safe unavailable state when provisioning is not ready. They never fabricate an address or balance.

## Local Hardhat Boundary

Wallet generation is chain-independent, so provisioning does not require the Hardhat node to be running and does not submit a blockchain transaction. The wallet is created with a zero balance.

The future DICKEN phase will connect these addresses to a local Hardhat ERC-20 deployment. Resetting the Hardhat network clears contracts and token balances but does not invalidate the generated Ethereum addresses. Prototype data may be reset or reseeded when the local chain is restarted.

No automatic ETH funding is included in this phase. The later DICKEN and purchasing designs will decide whether the platform pays gas or managed customer wallets receive local test ETH.

## Error Handling and Observability

- Return stable, user-safe messages from the API.
- Log only request correlation information, authenticated user ID, error category, and operation outcome.
- Never log private keys, encryption keys, ciphertext, authentication tags, or decrypted values.
- Treat authentication, missing-profile, invalid-role, configuration, encryption, and storage failures as separate internal categories.
- A failed request must not leave plaintext key material in persistent storage.
- Registration retry must remain safe after timeouts where the browser does not know whether the first request succeeded.

## Testing and Verification

Automated tests cover:

- random wallet generation produces a valid Ethereum address;
- encrypt/decrypt round trips restore the original private key;
- different encryptions use different initialization vectors;
- tampered ciphertext or authentication tags fail decryption;
- a missing or malformed encryption key fails closed;
- unauthenticated and wrong-role requests cannot provision wallets;
- browser-supplied identity or key fields are ignored because the endpoint accepts no body;
- first provisioning creates exactly one wallet;
- repeated and concurrent provisioning returns the same stored address;
- inconsistent profile and custodial records fail without replacing the wallet;
- the registration flow requests provisioning after customer-profile creation;
- client bundles and API responses contain no private-key material;
- wallet-dependent customer pages handle `pending` and `failed` states safely.

Verification includes the focused tests, complete relevant Node test set, `npm run lint`, and `npm run build`. The known local missing-`nodemailer` dependency must be reported separately if it still blocks the production build.

## Success Criteria

- Every newly registered customer receives exactly one CornShirt-managed Ethereum address.
- Organizer, admin, visitor, and partner-applicant accounts do not receive managed wallets automatically.
- Registration requires no wallet extension, wallet connection, seed phrase, or blockchain interaction.
- Only the public address is stored in the customer profile and returned to the browser.
- Private keys are encrypted before storage and accessible only to server-side code.
- Provisioning can be retried without creating a second wallet.
- Partial or inconsistent wallet records are detected rather than silently replaced.
- The restricted PostgreSQL RPC inserts `custodial_wallets`, updates the customer's address, and marks the customer ready in one atomic transaction.
- Wallet-dependent features remain unavailable until provisioning is ready.
- The design remains explicitly limited to local Hardhat and valueless prototype assets.
- No DICKEN, Stripe, ticket-purchase, NFT, or resale-settlement behavior is introduced in this phase.
