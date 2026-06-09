# CornShirt

CornShirt is a Web2 + Web3 concert ticketing and payment management platform. The system allows organizers to create events, users to top up platform tokens and purchase blockchain-based tickets, and admins to monitor events, users, transactions, and ticket verification records.

The platform uses an ERC-20 token called **DICKEN** for ticket payment and an ERC-721 **Ticket NFT** to represent unique ticket ownership.

---

## Tech Stack

### Frontend

* Next.js
* React.js
* TypeScript
* TailwindCSS
* react-qr-code
* React Toastify
* Wagmi + Viem
* Reown AppKit

### Backend

* Next.js API Routes
* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* Stripe Test Mode

### Smart Contract

* Solidity
* DICKEN Token Contract (ERC-20)
* Ticket NFT Contract (ERC-721)
* OpenZeppelin
* Hardhat
* Hardhat Node
* Hardhat Ignition

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-link>
cd CornShirt
```

If the folder name is lowercase, use:

```bash
cd cornshirt
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Install Required Libraries

If the required libraries are not installed yet, run:

```bash
npm install react-qr-code react-toastify
npm install @supabase/supabase-js
npm install stripe
npm i @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
npm install --save-dev hardhat
npm install --save-dev @openzeppelin/contracts
```

---

### 4. Create Environment File

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_DICKEN_TOKEN_CONTRACT_ADDRESS=
NEXT_PUBLIC_TICKET_NFT_CONTRACT_ADDRESS=
```

Do not upload `.env.local` to GitHub.

Make sure `.gitignore` includes:

```text
.env*.local
```

---

### 5. Run the Development Server

```bash
npm run dev
```

Open the project in your browser:

```text
http://localhost:3000
```

---

## Current Folder Structure

```text
CornShirt/
├── .next/
├── node_modules/
├── public/
│
├── src/
│   ├── abi/
│   │
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │
│   ├── context/
│   │   └── web3.tsx
│   │
│   ├── lib/
│   │   └── supabaseClient.ts
│   │
│   └── utils/
│       ├── smartContractAddress.ts
│       ├── toast.ts
│       └── web3config.ts
│
├── .env.local
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json
```

## Folder Notes

* `src/app/` stores the main Next.js pages, layouts, and route files.
* `src/components/` stores reusable UI components.
* `src/context/` stores global providers such as the Web3 context.
* `src/lib/` stores external service clients such as Supabase.
* `src/utils/` stores helper files such as toast messages, Web3 configuration, and smart contract addresses.
* `src/abi/` stores smart contract ABI JSON files after contract deployment.
* `public/` stores public images and static assets.
* `.env.local` stores private environment variables and must not be uploaded to GitHub.
* `.next/` and `node_modules/` are generated folders and should not be edited manually.

---

## Branch Workflow

Recommended workflow:

```bash
git checkout dev
git pull origin dev
git checkout -b your-branch-name
```

After completing a task:

```bash
git add .
git commit -m "Your commit message"
git push origin your-branch-name
```

Then create a pull request to merge into `dev`.

Do not push directly to `main`.

---

## Important Rules

* Do not upload `.env.local`
* Do not upload `node_modules`
* Do not manually edit `.next`
* Always pull the latest code before starting work
* Commit small changes regularly
* Use clear commit messages
* Test before pushing
* Merge into `dev` first before `main`

---

## Useful Commands

### Start Project

```bash
npm run dev
```

### Check Git Status

```bash
git status
```

### Pull Latest Code

```bash
git pull origin dev
```

### Create New Branch

```bash
git checkout -b branch-name
```

### Switch Branch

```bash
git checkout branch-name
```

### Add, Commit, Push

```bash
git add .
git commit -m "Commit message"
git push origin branch-name
```
