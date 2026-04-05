# HealthVault

A decentralized patient health portal built for PantherHacks. HealthVault lets patients own their medical records on-chain — encrypted, stored on IPFS, and accessible only to providers they explicitly authorize. Doctors request access per record category; patients approve or deny. An opt-in AI summary panel explains records in plain English (patient) or clinical terms (doctor).

---

## Features

### Patient Portal (`/patient`)
- **Dashboard** — health overview, care team, quick actions, medication requests
- **Test Results** — lab results with normal/warning indicators and AI-powered plain-English explanations
- **Medications** — active prescriptions with dosage, refill status, and AI summaries
- **Appointments** — upcoming and past appointment history
- **Record Access** — view and manage which providers have access to which record categories

### Doctor Portal (`/doctor`)
- **Patients** — expandable patient cards with records and access control
- **Lab Orders** — review incoming lab results with AI clinical interpretation
- **Prescriptions** — manage active prescriptions, approve/deny patient medication requests
- **Authorization** — approve or deny incoming record access requests from other doctors; track outgoing requests
- **Schedule** — manage appointments with calendar view

### AI Summary (powered by ZotGPT / Azure OpenAI)
Every lab result, medication, and clinical record has an opt-in AI summary panel:
- **Patient mode** — plain-English explanation with a medical term glossary
- **Doctor mode** — concise clinical interpretation highlighting out-of-range values
- Privacy-first: no data is sent until the user clicks "Generate AI Summary"
- Keyword-matched fallback summaries activate if the AI is unavailable

### Encryption & Privacy
- Keys derived from a MetaMask wallet signature via HKDF-SHA256 → ECIES keypair
- Each record category encrypted with a unique AES-256-GCM data encryption key (DEK)
- DEKs wrapped per-user (patient + authorized providers) and stored on-chain
- Medical data stored as encrypted blobs on IPFS (Pinata or local Kubo)
- API key for ZotGPT never reaches the browser — proxied server-side through Vite middleware

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| UI components | Radix UI + shadcn/ui |
| Routing | React Router v7 |
| State | React Context API + React Query |
| Blockchain | Hardhat 3 + ethers.js (Solidity 0.8.28) |
| Storage | IPFS (Pinata cloud or local Kubo) |
| Encryption | ECIES (secp256k1) + AES-256-GCM |
| AI | UCI ZotGPT (Azure OpenAI `gpt-4o`) |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [MetaMask](https://metamask.io/) browser extension

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server on localhost:3000
npm run build      # type-check + bundle
npm run preview    # preview production build
```

### Smart Contract

```bash
cd hardhat
npm install
npx hardhat compile
npx hardhat node                                          # local chain (chainId 31337)
npx hardhat run scripts/deploy.ts --network localhost    # deploy locally
npx hardhat run scripts/deploy.ts --network sepolia      # deploy to testnet
npx hardhat test
```

### Environment Setup

Create `frontend/.env`:

```env
VITE_CHAIN_ID=31337                    # 31337=Hardhat local, 11155111=Sepolia
VITE_CONTRACT_ADDRESS=0x5FbDB...       # deployed HealthVault contract address
VITE_IPFS_API_URL=http://localhost:5001
VITE_IPFS_GATEWAY_URL=http://localhost:8080
VITE_PINATA_JWT=                       # leave blank for local Kubo
VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Dev only — NOT exposed to browser (used by Vite proxy)
ZOTGPT_API_KEY=                        # UCI ZotGPT / Azure OpenAI key
ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu
```

If `VITE_PINATA_JWT` is set, the app uses Pinata. Otherwise it hits the local Kubo HTTP API.

Open [http://localhost:3000](http://localhost:3000) and connect MetaMask to get started.

---

## Project Structure

```
HealthVault/
├── frontend/src/
│   ├── ai/                     # AI integration
│   │   ├── llmClient.ts        # ZotGPT fetch client (server-proxied)
│   │   ├── prompts.ts          # System prompts per mode (patient/doctor/lab)
│   │   ├── fallbackData.ts     # Pre-written fallbacks for offline/error states
│   │   └── RecordAIPanel.tsx   # Opt-in AI summary UI component
│   ├── contracts/
│   │   ├── HealthVault.abi.json # Contract ABI
│   │   └── addresses.ts        # Contract address per chain ID
│   ├── hooks/                  # React Query hooks
│   │   ├── useCollection.ts    # Collection CRUD (fetch → mutate → re-encrypt → upload)
│   │   ├── useRecord.ts        # On-chain record pointer reads
│   │   ├── useGrants.ts        # Provider access grants
│   │   ├── useAccess.ts        # Access level checks
│   │   └── useWallet.ts        # MetaMask connection
│   ├── providers/
│   │   ├── Web3Provider.tsx    # ethers.js + MetaMask event listeners
│   │   ├── EncryptionProvider.tsx # Key derivation, ECIES keypair, IndexedDB keystore
│   │   └── AppProvider.tsx     # Composes all providers
│   ├── services/
│   │   ├── contract.ts         # HealthVaultService — all contract calls
│   │   ├── collection.ts       # Collection pattern: encrypted JSON arrays on IPFS
│   │   ├── encryption.ts       # ECIES + AES-256-GCM primitives
│   │   ├── ipfs.ts             # IPFS upload/fetch (Pinata or local Kubo)
│   │   └── keystore.ts         # IndexedDB encrypted key persistence
│   ├── types/
│   │   ├── health.ts           # RecordCategory + AccessLevel enums
│   │   └── collections.ts      # Domain types (LabOrder, Prescription, Appointment, etc.)
│   ├── features/
│   │   ├── patient/            # Patient portal (PatientApp.tsx + components)
│   │   └── doctor/             # Doctor portal (DoctorApp.tsx + components)
│   └── pages/
│       └── LandingPage.tsx     # Wallet connect + role selection
├── hardhat/                    # Solidity smart contracts
└── SAMPLE/                     # Deprecated Figma export — do not modify
```

---

## Data Model

Every patient owns 9 **record category slots** on-chain:

| Value | Category | Primary writer |
|---|---|---|
| 0 | Dental | Doctor |
| 1 | Cardiology | Doctor |
| 2 | Urology | Doctor |
| 3 | Primary | Doctor (clinical notes) |
| 4 | Pharmacy | Doctor (prescriptions) |
| 5 | Labs | Doctor (lab orders) |
| 6 | Imaging | Doctor or patient |
| 7 | MentalHealth | Patient (personal notes) |
| 8 | Scheduling | Doctor (appointments) |

Each slot holds one encrypted IPFS blob — a JSON array of domain objects. Updating a record means: fetch array → mutate → re-encrypt with the same DEK → re-upload → update on-chain CID.

---

## Demo Accounts

Connect any MetaMask wallet on the Hardhat local network. The connected wallet is treated as the patient in the demo. Click "Patient Sign In" or "Doctor Sign In" on the landing page — no separate login required.

| Role | Notes |
|---|---|
| Patient | Connected MetaMask wallet |
| Doctor | Dr. James Chen (mock data, Primary Care) |
