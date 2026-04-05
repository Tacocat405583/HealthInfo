# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
HealthVault/
├── frontend/        # React + Vite + TypeScript app (all active work)
├── hardhat/         # Hardhat 3 smart-contract workspace (Solidity 0.8.28)
├── SAMPLE/          # Deprecated Figma export — do NOT modify
└── docs/            # Design docs (hackathon planning notes)
```

## Commands

### Frontend
```bash
cd frontend
npm install
npm run dev        # dev server on localhost:3000
npm run build      # tsc + vite build (type-check then bundle)
npm run preview    # preview production build
```

### Smart Contract
```bash
cd hardhat
npm install
npx hardhat compile
npx hardhat node                                          # local chain (chainId 31337)
npx hardhat run scripts/deploy.ts --network localhost    # deploy (script not yet created)
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat test
```

## Environment Variables (frontend/.env)

```
VITE_CHAIN_ID=31337                    # 31337=Hardhat, 11155111=Sepolia
VITE_CONTRACT_ADDRESS=0x5FbDB...       # deployed HealthVault address
VITE_IPFS_API_URL=http://localhost:5001
VITE_IPFS_GATEWAY_URL=http://localhost:8080
VITE_PINATA_JWT=                       # leave blank for local Kubo
VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Dev only — NOT exposed to browser (used by Vite proxy handler)
ZOTGPT_API_KEY=                        # UCI ZotGPT / Azure OpenAI key
ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu
```

IPFS: if `VITE_PINATA_JWT` is set the app uses Pinata; otherwise it hits the local Kubo HTTP API at `VITE_IPFS_API_URL`.

AI calls (`/api/zotgpt/*`) are proxied through the Vite dev server so `ZOTGPT_API_KEY` never reaches the browser.

## Architecture Overview

### Data Model

Every patient owns 9 **category slots** (RecordCategory enum in `types/health.ts`):

| Value | Category | Primary writer |
|---|---|---|
| 0–2 | Dental, Cardiology, Urology | Doctor (ReadWrite) |
| 3 | Primary | Doctor (clinical notes) |
| 4 | Pharmacy | Doctor (prescriptions) |
| 5 | Labs | Doctor (lab orders) |
| 6 | Imaging | Doctor or patient |
| 7 | MentalHealth | Patient (personal notes) |
| 8 | Scheduling | Doctor (appointments) |

Each slot holds **one encrypted IPFS blob**. That blob is a **JSON array** of domain objects (LabOrder[], Prescription[], Appointment[], etc. from `types/collections.ts`). CRUD means: fetch array → mutate → re-encrypt → re-upload → update on-chain CID. This is called the **Collections pattern** (`services/collection.ts`, `hooks/useCollection.ts`).

### Encryption Stack

```
MetaMask personal_sign("HealthVault Key Derivation v1:" + address)
  → HKDF-SHA256 → secp256k1 keypair (ECIES)

Per category slot: one DEK (AES-256-GCM random key)
  Patient encrypts DEK: wrapDEK(dek, patientPublicKey) → encryptedDEK (stored on-chain)
  When granting provider access: unwrapDEK(encryptedDEK, patientPrivKey) → dek
                                  wrapDEK(dek, providerPublicKey) → providerWrappedDEK (on-chain)
  Provider decrypts: unwrapDEK(providerWrappedDEK, providerPrivKey) → dek

File blob stored on IPFS: [4B IV len][IV bytes][4B ciphertext len][AES-GCM ciphertext+tag]
ECIES wrapped DEK format: [33B ephemeral pubkey][12B IV][32B encrypted DEK][16B auth tag] → base64
```

Key insight: **DEK is always reused** when updating a collection — never regenerated — so existing provider access grants remain valid after writes.

### Provider / Patient Layer Separation

```
Web3Provider (providers/Web3Provider.tsx)
  └─ ethers.BrowserProvider + MetaMask event listeners
  └─ exposes: address, chainId, signer, connect()

EncryptionProvider (providers/EncryptionProvider.tsx)
  └─ signs key derivation message → HKDF → ECIES keypair
  └─ persists encrypted private key to IndexedDB (keystore.ts)
  └─ exposes: keypair, publicKeyHex, isReady, initKeys()

AppProvider (providers/AppProvider.tsx)
  └─ composes: QueryClientProvider + Web3Provider + EncryptionProvider

AppContext (app/context/AppContext.tsx)
  └─ UI state: userRole (patient | doctor), walletAddress
  └─ mock data: patients[], doctors[], testResults[]
  └─ medication request workflow (local state, not on-chain)
```

### Contract Service

`services/contract.ts` — `HealthVaultService` class:
- Takes `signer` + `chainId`, instantiates contract from `contracts/HealthVault.abi.json`
- `peekRecord(patient, category)` — static call, no audit event (use for writes)
- `getRecord(patient, category)` — state-mutating, emits `RecordAccessed` (use for reads)
- `addRecord` / `updateRecord` — determined by whether `peekRecord` returns a pointer
- `listGrantsForPatient(patient)` — returns `GrantInfo[]` sorted by `grantedAt`

All hooks call `useContract()` to get the service instance, which returns `null` when wallet is disconnected.

### React Query Cache Keys

```
['record', patientAddress, category, 'patient'|'provider']  ← useRecord
['recordPointer', patientAddress, category]                  ← useRecordPointer
['collection', patientAddress, category, providerAddr|'patient'] ← useCollection
['grants', patientAddress]                                   ← useGrants
['accessLevel', patientAddress, provider, category]          ← useAccessLevel
```

### Routing & Role Selection

`main.tsx` — `BrowserRouter` with three routes:
- `/` → `LandingPage` — wallet connect + role selection (patient vs doctor)
- `/patient` → `PatientApp` — patient dashboard
- `/doctor` → `DoctorApp` — doctor dashboard

`setUserRole('patient' | 'doctor')` in `AppContext` drives which portal the user enters.

## Key Architecture Decisions (Hackathon Simplifications)

1. **Doctor collections stored in doctor's own category slots** — clinical notes, lab orders, prescriptions, and schedule are written to the *doctor's* IPFS slots rather than per-patient slots. Each item carries `patientName`/`patientAddress` fields for identification. In production these would be per-patient with proper access grants.

2. **Single-patient demo** — `AppContext` hardcodes `patient1.address = connectedWallet`. In the demo the connected wallet IS the patient.

3. **Appointment date format** — `Appointment.date` is ISO `"YYYY-MM-DD"`. `DoctorCalendarView` uses `new Date(appt.date)`, which parses both ISO and locale strings.

## AI Feature (docs/record-ai-panel-plan.md)

`frontend/src/ai/` implements on-device AI summarization:
- `useUnderstandRecord(record, enabled)` — user must explicitly trigger (privacy-first)
- `extractText.ts` — PDF via `pdfjs-dist`, JSON/text decoded directly
- `llmClient.ts` — Azure OpenAI format via `/api/zotgpt` Vite proxy
- `prompts.ts` — summary (3-5 bullets) + medical glossary, no diagnostic advice
- `fallbackData.ts` — hardcoded fallbacks for Labs/Imaging/Primary if API fails
- `useUnderstandRecord.ts` is in `hooks/` (not `ai/`) — it's the React Query wrapper

## Files You Will Often Need

| Purpose | File |
|---|---|
| RecordCategory / AccessLevel enums | `frontend/src/types/health.ts` |
| Domain types (Appointment, LabOrder, etc.) | `frontend/src/types/collections.ts` |
| All contract calls | `frontend/src/services/contract.ts` |
| ECIES + AES crypto | `frontend/src/services/encryption.ts` |
| Collection CRUD service | `frontend/src/services/collection.ts` |
| Collection React hooks | `frontend/src/hooks/useCollection.ts` |
| Contract address per chain | `frontend/src/contracts/addresses.ts` |
| Patient portal entry | `frontend/src/features/patient/PatientApp.tsx` |
| Doctor portal entry | `frontend/src/features/doctor/DoctorApp.tsx` |
