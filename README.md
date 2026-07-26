# CornShirt

CornShirt is a concert ticketing marketplace built with Next.js, Supabase,
Stripe, and an ERC-721 Ticket NFT contract. Customers pay in MYR through
Stripe, receive tickets in platform-managed wallets, can list transferable
tickets for resale, and present QR codes for organizer verification.

## Technology

- Next.js 16, React 19, and TypeScript
- Supabase Auth, PostgreSQL, and Storage
- Stripe Checkout and signed webhooks
- Viem, Solidity, OpenZeppelin, and Hardhat
- Plain CSS, Lucide icons, Recharts, and `react-qr-code`

The application uses one smart contract:
`blockchain/contracts/CornShirtTicket.sol`.

## Setup

Install the application dependencies:

```bash
npm install
```

Install the isolated blockchain dependencies:

```bash
cd blockchain
npm install
cd ..
```

Create `.env.local` in the project root. Do not commit this file.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

TICKET_NFT_CONTRACT_ADDRESS=
PLATFORM_CONTRACT_PRIVATE_KEY=
HARDHAT_RPC_URL=http://127.0.0.1:8545
WALLET_ENCRYPTION_KEY=

# Optional organizer rejection email configuration
GMAIL_USER=
GMAIL_APP_PASSWORD=
REJECT_FROM_EMAIL=
```

`WALLET_ENCRYPTION_KEY` must be a base64-encoded 32-byte key.

Review and run the required database migrations from `scripts/sql` in the
Supabase SQL Editor. Migrations are not executed automatically by the
application.

## Development

Start Next.js:

```bash
npm run dev
```

For local blockchain testing, use separate terminals:

```bash
npm run hardhat:node
npm run hardhat:deploy
```

The local deployment writes the Ticket NFT contract address to `.env.local`.

Stripe webhook forwarding is only required when testing payment workflows:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Verification

```bash
npm test
npm run lint
npm run build
```

The contract integration test additionally requires the local Hardhat node:

```bash
npm run test:contracts
```

## Repository layout

```text
blockchain/       Ticket NFT contract, deployment script, and contract test
docs/             Architecture, API, Stripe, and system-testing documentation
public/           Runtime images and media
scripts/sql/      Reviewed Supabase migrations
src/abi/          Ticket NFT ABI
src/app/          Next.js pages and API routes
src/components/   Shared UI components
src/lib/          Supabase, Stripe, wallet, marketplace, and NFT services
src/utils/        Runtime Web3 configuration
```

Generated folders such as `.next`, `node_modules`, `blockchain/artifacts`, and
`blockchain/cache` must not be edited or committed.
