# HealthVault

A modern patient health portal built for PantherHacks. HealthPortal gives patients a clear, accessible view of their medical records while giving doctors the tools to manage patients, review lab results, handle prescriptions, and control record access — all in one place.

---

## Features

### Patient Portal (`/patient`)
- **Dashboard** — overview of health status, care team, and quick actions including medication requests
- **Test Results** — view lab results with normal/warning status indicators and AI-powered plain-English explanations
- **Medications** — active prescriptions with dosage, refill status, and AI medication summaries
- **Appointments** — upcoming and past appointment history

### Doctor Portal (`/doctor`)
- **Patients** — expandable patient cards with records, access control, and the ability to request access to records ordered by other physicians
- **Lab Orders** — review incoming lab results with AI clinical interpretation
- **Prescriptions** — manage active prescriptions and approve/deny patient medication requests
- **Authorization** — approve or deny incoming record access requests from other doctors; track outgoing requests

### AI Summary (powered by ZotGPT / Azure OpenAI)
Every lab result, medication, and clinical record has an opt-in AI summary panel:
- **Patient mode** — plain-English explanation with a medical term glossary
- **Doctor mode** — concise clinical interpretation highlighting out-of-range values
- Privacy-first: no data is sent until the user clicks "Generate AI Summary"
- Keyword-matched fallback summaries activate if the AI is unavailable

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| UI components | Radix UI + shadcn/ui |
| Routing | React Router v7 |
| State | React Context API |
| AI | UCI ZotGPT (Azure OpenAI `gpt-4o`) |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Installation

```bash
cd HealthInfo/SAMPLE
pnpm install
```

### Environment setup

Create `HealthInfo/SAMPLE/.env.local`:

```env
# Server-side only — injected by Vite middleware, never bundled into the browser
ZOTGPT_API_KEY=your_api_key_here
ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu

# Safe to expose — non-secret config
VITE_ZOTGPT_DEPLOYMENT=gpt-4o
VITE_ZOTGPT_API_VERSION=2024-02-01
```

### Run

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

- **Patient view** → click "Patient Sign In"
- **Doctor view** → click "Doctor Sign In"

---

## Project Structure

```
SAMPLE/src/
├── ai/                     # AI integration
│   ├── llmClient.ts        # ZotGPT fetch client
│   ├── prompts.ts          # System prompts per mode (lab, doctor-lab, medication)
│   ├── fallbackData.ts     # Pre-written fallbacks for offline/error states
│   └── RecordAIPanel.tsx   # Opt-in AI summary UI component
├── app/
│   ├── components/         # Patient-facing pages (Dashboard, Medications, TestResults, etc.)
│   ├── context/            # AppContext — global state (patients, doctors, requests, notifications)
│   └── App.tsx             # Patient app shell
├── features/
│   └── doctor/
│       ├── components/     # Doctor-facing pages (Patients, LabOrders, Prescriptions, Authorization)
│       ├── DoctorApp.tsx   # Doctor app shell
│       └── DoctorSidebar.tsx
└── pages/
    └── LandingPage.tsx
```

---

## How the AI Proxy Works

ZotGPT requires an `api-key` header that cannot be exposed in the browser bundle. Rather than using Vite's built-in proxy (which had response-body forwarding issues), a custom Vite server middleware intercepts all `/api/zotgpt/*` requests, forwards them to ZotGPT server-side using Node's native `fetch`, and pipes the response back — keeping the API key entirely server-side.

---

## Demo Accounts

The app uses pre-loaded mock data. No login is required — just click "Patient Sign In" or "Doctor Sign In" on the landing page.

| Role | Context |
|---|---|
| Patient | Sarah Johnson (default) |
| Doctor | Dr. James Chen (default) |
