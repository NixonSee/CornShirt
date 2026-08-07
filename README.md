# CornShirt

CornShirt is a role-based concert ticketing and resale platform. Customers pay
in Malaysian Ringgit (MYR) through Stripe Test Mode and receive ERC-721 Ticket
NFTs in encrypted, platform-managed wallets. Organizers manage events and scan
ticket QR codes, while administrators approve partners and events and monitor
platform activity.

This is a prototype: it uses Stripe test payments, records organizer revenue
and resale proceeds as simulated accounting, and makes no real payouts.

## How the system works

```text
Browser (visitor, customer, organizer, or admin)
                |
                v
      Next.js pages and API routes
       /          |             \
      v           v              v
Supabase      Stripe Test     Sepolia contracts
Auth + data   MYR payments    Ticket ownership,
workflows     and refunds     resale, and burns
      \           |              /
       \----------+-------------/
                  |
          verified server workflow
```

- **Supabase** stores authentication, roles, events, inventory, QR state,
  workflow state, audit records, and simulated MYR accounting.
- **Stripe** is authoritative for test payments and refunds. Browser redirects
  never count as proof of payment; signed webhooks complete paid workflows.
- **`CornShirtTicket`** is the ERC-721 contract and is authoritative for NFT
  token IDs and ownership.
- **`CornShirtMarketplace`** stores approval-based resale listings and allows
  only its settlement role to deliver a Stripe-confirmed resale.
- **Next.js server routes** authorize every protected action and coordinate
  Supabase, Stripe, email, and blockchain receipts.

## System features

### Visitor

- Browse active, admin-approved events.
- Search by event, artist, or venue and filter by category.
- View event details, venue, schedule, ticket zones, availability, transfer
  policy, and MYR prices.
- Register as a customer, log in, view the About page, or submit an organizer
  partner application with supporting documents.

### Customer

- Register with Supabase email/password authentication.
- Automatically receive one CornShirt-managed Ethereum wallet. The private key
  is encrypted with AES-256-GCM and is never returned to the browser.
- Buy primary tickets through Stripe Checkout in MYR.
- Receive exactly one Ticket NFT after the signed Stripe webhook confirms the
  expected payment and the mint receipt succeeds.
- View owned tickets, token IDs, transaction hashes, QR codes, event status,
  and wallet status.
- Transfer an eligible existing NFT to another wallet-ready registered
  customer by email, without creating a payment or replacement NFT.
- List eligible tickets for resale. A listing may be priced no higher than the
  original face value plus 15%.
- Buy another customer's resale listing through Stripe; the existing NFT is
  transferred to the buyer and the seller receives a simulated MYR proceeds
  record.
- Cancel an unreserved listing and relist the ticket later.
- View searchable, filterable, paginated purchase, transfer, resale, and refund
  history.
- Claim an eligible cancellation refund. Stripe refunds the latest paid
  acquisition to its original payer, then the surrendered NFT is burned.

### Organizer

- Receive an account invitation after an admin approves a public partner
  application.
- Create events from admin-curated venues and seat zones.
- Upload a banner, set event metadata, and price each venue zone in MYR.
- Edit pending events and submit them for admin approval.
- View event status, ticket supply, sold count, recorded primary revenue,
  trends, and recent ticket activity.
- Cancel an owned pending or active event and notify affected ticket holders.
- Scan a QR code with a camera or paste a ticket ID, verify on-chain ownership,
  and check in a valid ticket once.

### Admin

- View platform metrics, event-status charts, transaction activity, and recent
  pending events.
- Review and approve or reject partner applications. Approval sends a Supabase
  organizer invitation; rejection can send the supplied reason by email.
- Approve or reject pending events.
- Browse event details, inventory, sales, and recorded MYR activity.
- View organizers and their event counts.
- View users and deactivate or reactivate non-admin accounts.
- Cancel active events and write administrative audit records.

### Platform behavior

- Events remain live until three hours after their scheduled start. The
  lifecycle job runs opportunistically from server requests, then marks ended
  events `completed`, unused tickets `expired`, and active listings `expired`.
  The NFTs remain in their owners' wallets as collectibles.
- Inventory, checkout, transfer, resale, webhook, email, and refund operations
  use stored workflow state and idempotency keys to prevent duplicate effects.
- A resale seller retains the NFT while it is listed and grants the Marketplace
  contract approval. The contract rejects expired listings and reused payment
  references.
- Transactional email supports successful purchases, refunds, direct
  transfers, resale purchases/sales, and event cancellations.
- Role checks are performed on the server. Managed-wallet keys, the wallet
  encryption key, Stripe secrets, contract signer keys, and the Supabase
  service-role key remain server-only.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- Supabase Auth, PostgreSQL, Row Level Security, RPC functions, and Storage
- Stripe Checkout, refunds, signed webhooks, and idempotency
- Solidity, OpenZeppelin, Hardhat, and Viem
- Recharts, Lucide icons, `react-qr-code`, and camera QR scanning
- Nodemailer with Gmail SMTP

## Local development setup

This guide runs the Next.js application on `http://localhost:3000`. The local
application connects to a Supabase demo project, Stripe Test Mode, Gmail SMTP,
and contracts deployed on the Sepolia testnet. Use demo/test credentials only;
no production or live payment credentials are required for local assessment.

### 1. Prerequisites

Install or create:

- Node.js **20.9 or newer** and npm
- A Supabase project containing CornShirt's base schema
- A Stripe account in **Test Mode** and the Stripe CLI for local webhooks
- [`cloudflared`](https://developers.cloudflare.com/tunnel/downloads/) for the
  temporary HTTPS URL used by the mobile QR scanner
- A Sepolia HTTP RPC endpoint
- A dedicated testnet wallet funded with enough Sepolia ETH for contract
  deployment and application transactions
- The Hardhat contract workspace included in this repository
- A Gmail account with an app password for complete transactional workflows

The application runtime uses Sepolia chain ID `11155111`. A local Hardhat node
is not required to run the application; it is used only for optional contract
integration tests.

### 2. Install dependencies

The web application and blockchain workspace have separate lockfiles:

```bash
npm install
cd blockchain
npm install
cd ..
```

Use `npm ci` instead of `npm install` for a clean, lockfile-reproducible CI
installation.

### 3. Connect Supabase

Use the supplied CornShirt demo Supabase project, which already contains the
required schema, database functions, and reference data. Confirm the following
project resources and settings are available:

- Confirm that a public Storage bucket named `event-banners` exists for
  organizer event images.
- A private `partner-documents` bucket is created on the first application if
  absent; it may also be created beforehand.
- The supplied CornShirt demo database already contains the fixed venue and
  `venue_zones` records used by event creation. No admin seeding step is
  required.
- Enable email/password authentication. For the current local prototype, turn
  off **Confirm email** in the Supabase Email provider settings. Registration
  needs the sign-up session to create the customer profile and managed wallet,
  then redirects the customer to the login page.
- Bootstrap the first admin as a Supabase Auth user with a matching `profiles`
  row whose role is `admin`. This manual bootstrap is acceptable for the local
  demo; it may be prepared before assessment and its login credentials shared
  privately. Later organizers should be created through the partner-approval
  invitation flow.

#### Configure Supabase authentication URLs

Supabase only follows password-reset and invitation destinations that appear
in the project's redirect allowlist. Complete these steps before testing Auth
locally:

1. Sign in to the [official Supabase dashboard](https://supabase.com/dashboard)
   and open the CornShirt project.
2. Select **Authentication > URL Configuration**.
3. Set **Site URL** to the main deployed Vercel URL for production, for example:

   ```text
   https://your-project.vercel.app
   ```

4. Under **Redirect URLs**, select **Add URL**, enter the following local
   development pattern, and save it:

   ```text
   http://localhost:3000/**
   ```

   This official Supabase local-development pattern includes CornShirt's
   `http://localhost:3000/auth/callback` route and its recovery query
   parameters. Do not replace the production Site URL with localhost; keep
   localhost as an additional allowed redirect.
5. Go to **Authentication > Email Templates > Reset Password**. If the
   template is unchanged, keep its `{{ .ConfirmationURL }}` link. If it builds
   a custom link, use `{{ .RedirectTo }}` instead of `{{ .SiteURL }}` so the
   destination requested by CornShirt is preserved.
6. Start CornShirt at `http://localhost:3000`, request a new password-reset
   email from the local login page, and open the new email link. It should
   return to `/auth/callback` and then display the set-password page locally.

Password-reset emails generated before changing the URL configuration retain
their previous Vercel destination. Generate a new email after saving the
settings. If localhost is absent from **Redirect URLs**, Supabase ignores the
local `redirectTo` value and falls back to **Site URL**. See Supabase's
[official Redirect URLs guide](https://supabase.com/docs/guides/auth/redirect-urls)
for the allowlist and wildcard rules.

The workflow migrations under `scripts/sql` are tracked because application
tests and database workflows depend on them. The supplied demo project already
has these migrations applied, so do not run them again during normal lecturer
setup. They are retained for preparing or repairing another compatible copy of
the CornShirt database. They do not replace the base database schema.

### 4. Configure environment variables

The repository includes a safe `.env.example` template containing every
required variable without real secrets. Copy it to `.env.local` in the
repository root:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux, use:

```bash
cp .env.example .env.local
```

Open `.env.local` and replace the placeholders with the privately supplied
demo credentials. Do not commit `.env.local`; only `.env.example` is intended
to be stored in Git. The provided template contains:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Public application origins
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe Test Mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Sepolia testnet blockchain
SEPOLIA_RPC_URL=
PLATFORM_CONTRACT_PRIVATE_KEY=
TICKET_NFT_CONTRACT_ADDRESS=
MARKETPLACE_CONTRACT_ADDRESS=

# Managed customer-wallet encryption
WALLET_ENCRYPTION_KEY=

# Gmail SMTP notifications
GMAIL_USER=
GMAIL_APP_PASSWORD=
TRANSACTION_FROM_EMAIL=
REJECT_FROM_EMAIL=
```

Environment notes:

- `SUPABASE_SERVICE_ROLE_KEY`, all private keys, Stripe secrets, and Gmail
  credentials are server-only. Never prefix them with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_APP_URL` builds trusted checkout and email links.
  `NEXT_PUBLIC_SITE_URL` builds organizer invite links. For this local setup,
  keep both values set to `http://localhost:3000`.
- `PLATFORM_CONTRACT_PRIVATE_KEY` is used at runtime to mint, settle, burn, and
  fund managed customer wallets with Sepolia test ETH. Use a dedicated funded
  Sepolia wallet only. The same wallet deploys the contracts and receives the
  required contract roles.
- `MARKETPLACE_CONTRACT_ADDRESS` is required for the complete on-chain resale
  flow.
- `TRANSACTION_FROM_EMAIL` falls back to `REJECT_FROM_EMAIL`, then
  `GMAIL_USER`, if omitted.

Generate the required base64-encoded 32-byte wallet encryption key with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Store the result only in `WALLET_ENCRYPTION_KEY`. Changing this key after
wallets have been created prevents the server from decrypting their existing
private keys.

### 5. Set up the Sepolia testnet blockchain

CornShirt uses Ethereum Sepolia for contract deployment and application
transactions. Sepolia is intended for contract and application testing; its
ETH has no real-world value. The application expects Sepolia chain ID
`11155111`.

Use these official references during setup:

- [Alchemy's Sepolia deployment guide](https://www.alchemy.com/docs/how-to-deploy-a-smart-contract-to-the-sepolia-testnet)
- [Alchemy's Ethereum network reference](https://www.alchemy.com/docs/choosing-a-web3-network#sepolia-testnet)
- [MetaMask's guide to showing test networks](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/)
- [MetaMask's private-key export guide](https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key/)
- [Ethereum's Sepolia and faucet directory](https://ethereum.org/developers/docs/networks/#sepolia)
- [Google Cloud Web3's Ethereum Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)

The four blockchain variables in the root `.env.local` are:

```env
# Sepolia testnet blockchain
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
PLATFORM_CONTRACT_PRIVATE_KEY=YOUR_DEDICATED_TEST_WALLET_PRIVATE_KEY
TICKET_NFT_CONTRACT_ADDRESS=
MARKETPLACE_CONTRACT_ADDRESS=
```

#### `SEPOLIA_RPC_URL`

This is the HTTPS endpoint through which CornShirt connects to Sepolia. It is
not a wallet key.

1. Create or sign in to an account at the
   [official Alchemy dashboard](https://dashboard.alchemy.com/).
2. Create an app, select **Ethereum** as the chain and **Sepolia** as the
   network, and enable the Node API if the dashboard asks which product to use.
3. Open the app's endpoint/API-key page and copy its HTTPS RPC URL. It should
   follow this format:

   ```text
   https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
   ```

4. Paste the complete URL into `SEPOLIA_RPC_URL` in the root `.env.local`.
   Do not use the WebSocket URL beginning with `wss://`.

#### `PLATFORM_CONTRACT_PRIVATE_KEY`

This is the private key of the dedicated MetaMask test account that deploys
the contracts and performs the platform's mint, settlement, burn, and managed
wallet gas-funding transactions.

1. Install MetaMask only from the
   [official MetaMask website](https://metamask.io/download/), then create a
   separate account used only for CornShirt testing. Do not reuse a wallet that
   holds real assets.
2. Follow MetaMask's
   [official testnet instructions](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/)
   to show test networks, then select **Sepolia**.
3. In MetaMask, open the dedicated account's details and follow the
   [official private-key export instructions](https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key/).
4. Paste that account key into `PLATFORM_CONTRACT_PRIVATE_KEY`. The deployment
   script accepts the 64 hexadecimal characters with or without the leading
   `0x`.

Use the account's private key, not its public `0x...` wallet address, MetaMask
password, or Secret Recovery Phrase. Never send the private key to anyone,
place it in this README, expose it through a `NEXT_PUBLIC_` variable, or commit
`.env.local`.

#### Fund the platform wallet with Sepolia ETH

The platform wallet needs Sepolia ETH to pay the testnet gas fees for deploying
the two contracts and sending later application transactions. Obtain at least
`0.05 Sepolia ETH` for testing with the Google Cloud Web3 faucet:

1. Copy the dedicated account's **public wallet address** from MetaMask. This
   is the `0x...` account address, not the private key.
2. Open the
   [official Google Cloud Web3 Ethereum Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).
3. Sign in with a Google account if requested, paste the public wallet address
   into the faucet, complete any verification shown, and submit the request.
4. Wait for the Sepolia ETH to appear in MetaMask. Make sure MetaMask is showing
   the Sepolia network, then confirm the public address and balance on
   [Sepolia Etherscan](https://sepolia.etherscan.io/).

Request `0.05 Sepolia ETH` when that amount is available. Faucet amounts,
eligibility checks, and waiting periods may change, so follow the current
instructions displayed on Google Cloud's official page. If the Google Cloud
faucet is unavailable, use another faucet listed in the
[official Ethereum Sepolia directory](https://ethereum.org/developers/docs/networks/#sepolia).

Sepolia ETH has no real-world monetary value. Never enter a private key or
Secret Recovery Phrase into a faucet, and do not pay anyone for testnet ETH.

After setting the RPC URL and private key, validate the connection, Sepolia
chain ID, key format, platform wallet address, and balance from the repository
root:

```bash
npm --prefix blockchain run check:sepolia
```

The check prints only the platform wallet's public address and balance. If it
reports a zero balance, fund the address before continuing.

#### `TICKET_NFT_CONTRACT_ADDRESS` and `MARKETPLACE_CONTRACT_ADDRESS`

Do not obtain these values from Alchemy or copy addresses from another
project. CornShirt generates them when its own contracts are deployed. Leave
both variables blank initially, then compile and deploy from the repository
root:

```bash
npm run hardhat:compile
npm run hardhat:deploy
```

The deployment script:

1. Confirms that the RPC endpoint returns Sepolia chain ID `11155111`.
2. Deploys `CornShirtTicket` and verifies the deployer has its admin, minter,
   and burner roles.
3. Deploys `CornShirtMarketplace` with the new Ticket contract address and
   verifies its settlement role.
4. Writes both deployed addresses into the root `.env.local` automatically:

   ```env
   TICKET_NFT_CONTRACT_ADDRESS=0x...
   MARKETPLACE_CONTRACT_ADDRESS=0x...
   ```

The terminal also prints a Sepolia Etherscan link for each deployment. Open
those links, confirm that both transactions succeeded, and confirm that each
address is shown as a contract on
[Sepolia Etherscan](https://sepolia.etherscan.io/). Restart the Next.js server
after changing any environment value.

The deployed contracts persist between local application restarts. Do not
redeploy unless a contract changed or a deliberately fresh testnet deployment
is required. Existing database tickets must continue using the Ticket and
Marketplace addresses under which they were created.

### 6. Configure the Stripe CLI

Install the Stripe CLI and make sure the lecturer has access to the CornShirt
Stripe sandbox. The local listener command and `whsec_...` setup are shown in
Terminal 1 under [Start the application](#8-start-the-application). The webhook
handler processes:

- `checkout.session.completed`
- `refund.created`
- `refund.updated`

Keep Stripe in Test Mode. This local setup uses Stripe CLI forwarding and does
not require a publicly hosted webhook endpoint. Stripe Connect is not used.

### 7. Configure email

For Gmail SMTP, enable two-step verification on the sending account and create
an app password. Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and the desired sender
addresses in `.env.local`.

Some asset/database actions can finish without Gmail credentials, but the
Stripe webhook deliberately reports an email-pending failure after a purchase
or successful refund when its notification cannot be delivered. Configure SMTP
for clean end-to-end webhook completion. Supabase's own organizer invitations
and password-reset emails use the email provider configured in Supabase Auth,
not Nodemailer.

### 8. Start the application

After dependencies, Supabase, `.env.local`, the Stripe CLI, `cloudflared`, and
Gmail are configured, and the Sepolia contracts from step 5 are available,
open **three terminals** in the repository root.

#### Terminal 1 - Stripe listener

Sign in to the Stripe CLI once, then forward Stripe Test Mode events to the
local webhook route:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

The listener prints a webhook signing secret beginning with `whsec_`. Copy it
into `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Keep Terminal 1 running. A new signing secret may be generated when the Stripe
listener is restarted; if it changes, update `.env.local` and restart Terminal
2.

#### Terminal 2 - Next.js application

Start the local application from the repository root:

```bash
npm run dev
```

On Windows PowerShell, use this command if the execution policy blocks
`npm.ps1`:

```powershell
npm.cmd run dev
```

Keep Terminal 2 running and open <http://localhost:3000>.

#### Terminal 3 - Temporary HTTPS URL for the mobile scanner

After Terminal 2 is running, expose the local application through a Cloudflare
Quick Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

No Cloudflare account is required for a Quick Tunnel. Terminal 3 prints a
temporary address similar to:

```text
https://random-words.trycloudflare.com
```

Keep Terminal 3 running and open that HTTPS address on the organizer's phone.
The address changes whenever the tunnel is restarted. Quick Tunnels are for
local testing only: anyone who knows the temporary address can reach the local
development application, so stop Terminal 3 after testing and do not share the
URL publicly.

#### Services that do not need another terminal

- Supabase is accessed through the demo project values in `.env.local`.
- Gmail SMTP is accessed through `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
- Sepolia is accessed through `SEPOLIA_RPC_URL`; no local blockchain process
  needs to remain running.

Terminals 1, 2, and 3 must remain running during the complete local test. The
Sepolia deployment is persistent and does not need to be repeated when these
local processes restart.

An initial end-to-end setup normally follows this order:

1. Sign in with the bootstrapped admin account.
2. Approve a submitted organizer application.
3. Accept the organizer invitation, set a password, create an event, and have
   the admin approve it.
4. Register a customer and confirm that the managed wallet reaches `ready`.
5. Buy a ticket with Stripe's test card `4242 4242 4242 4242`, any future
   expiry, and any CVC.
6. In Terminal 1, confirm that `checkout.session.completed` reaches the local
   webhook and returns HTTP 200.
7. In the customer session, open **My Tickets** and **Transactions**. Confirm
   that the purchase is recorded, then open **View QR** for the ticket.
8. On the organizer's phone, open the temporary HTTPS `trycloudflare.com`
   address printed in Terminal 3 and sign in as the organizer. The phone and
   computer have separate browser sessions, so the customer remains signed in
   on the computer.
9. On the phone, log in as the organizer, open `/organizer/verify-ticket`,
   allow camera access, and scan the customer's QR code displayed on the
   computer.
10. Confirm that the scanner shows a valid ticket, select **Check in ticket**,
    and verify that it changes to **Checked in**.
11. Return to the customer session, refresh **My Tickets**, and confirm that the
    ticket is marked as `used` and no longer offers transfer or resale actions.

The scanner can access the camera over `http://localhost:3000` on the same
computer because browsers treat localhost as a trustworthy context. A phone is
not accessing the computer's localhost, however, so use the HTTPS Quick Tunnel
from Terminal 3 for the mobile organizer scanner. Do not use a plain LAN URL
such as `http://192.168.x.x:3000` for camera testing.

## Main routes

| Area | Routes |
| --- | --- |
| Public | `/visitor`, `/visitor/about`, `/visitor/apply`, `/events/[eventId]`, `/login`, `/register` |
| Customer | `/customer`, `/customer/tickets`, `/customer/marketplace`, `/customer/transactions`, `/customer/profile`, `/customer/events/[eventId]` |
| Organizer | `/organizer`, `/organizer/create-event`, `/organizer/events`, `/organizer/events/[eventId]`, `/organizer/verify-ticket`, `/organizer/profile` |
| Admin | `/admin`, `/admin/pending-events`, `/admin/events`, `/admin/organizers`, `/admin/users`, `/admin/partner-applications`, `/admin/profile` |
| Webhook | `POST /api/webhooks/stripe` |

The root route `/` redirects to `/visitor`. Protected layouts and APIs redirect
or reject users whose verified profile role does not match the requested area.

## Verification

Run application checks from the root:

```bash
npm test
npm run lint
npm run build
```

Contract integration tests intentionally use a disposable local Hardhat node
instead of Sepolia. These tests are separate from the application runtime.
Start the test node in one terminal:

```bash
npm run hardhat:node
```

Then run in another terminal:

```bash
npm run test:contracts
```

The application tests are predominantly unit and source-contract tests. A
fully automated Supabase + Stripe webhook + Sepolia end-to-end suite and
an admin reconciliation endpoint are not currently included; use
`docs/SYSTEM_TESTING_GUIDE.md` for the manual end-to-end and authorization
matrix.

On Windows PowerShell, if local execution policy blocks `npm.ps1`, use
`npm.cmd` in the commands above or adjust the execution policy according to
your organization's rules.

## Repository layout

```text
blockchain/contracts/   ERC-721 ticket and resale Marketplace contracts
blockchain/scripts/     Sepolia deployment and contract verification
blockchain/test/        Local Hardhat integration tests
docs/                   Design, routes, architecture, and testing guides
public/                 Logos, event artwork, images, and videos
src/abi/                Ticket contract ABI consumed by the server
src/app/                App Router pages and authenticated API routes
src/components/         Shared, role-specific, QR, event, and profile UI
src/lib/                Supabase, Stripe, wallet, NFT, email, and workflow logic
src/utils/              Sepolia runtime configuration
```

Generated directories such as `.next`, `node_modules`,
`blockchain/artifacts`, and `blockchain/cache` should not be edited or
committed.

## Additional documentation

- `docs/SPECS.md` - functional and non-functional requirements
- `docs/ROLE_FEATURES_AND_FLOW.md` - role workflows and failure handling
- `docs/API_AND_ROUTES.md` - API responsibilities
- `docs/SMART_CONTRACTS.md` - payment and NFT architecture
- `docs/STRIPE_LOCAL_TESTING.md` - local Stripe workflow testing
- `docs/SYSTEM_TESTING_GUIDE.md` - full manual system test plan
