# HealthVault Hackathon — Record AI Summary & Glossary

## Context

專案位置：`Hackathon/Chapman_Hack/HealthInfo`，**< 48 小時**剩餘時間的
Chapman 黑客松作品。產品名稱 **HealthVault**，tagline「Your decentralized health
data, under your control」。

### 專案已從 SAMPLE 翻新為 Web3 架構

原本存在一個叫 `SAMPLE/` 的 Figma Make 匯出前端（含 Dashboard、Appointments、
TestResults、Messages 等 mock 頁面）。隊友近期的 commits 中多次 merge smart-contract
分支、兩次 delete SAMPLE 目錄，並且建立了兩個新目錄取代它：

- **`frontend/`**（專案名稱 `healthvault-frontend`）：全新重寫的 React + Vite 前端,
  整合 `ethers`、`@noble/curves`、`@noble/hashes`、`jotai`、`@tanstack/react-query`、
  `idb`。已經有完整的分層：`providers/`、`hooks/`、`services/`、`types/`、`contracts/`。
- **`hardhat/`**：Hardhat 3.3 smart contract 開發環境，Solidity 0.8.28。

**SAMPLE 目錄已廢棄**——雖然還留在 repo 裡，新工作全部在 `frontend/` 下。

### 產品資料模型：records，不是 chat

團隊明確決定**不做 chat/messages**。醫生和病人的溝通透過**加密健康記錄**進行：

- 記錄分類為 8 種 `RecordCategory`：Dental、Cardiology、Urology、Primary、
  Pharmacy、Labs、Imaging、MentalHealth
- 檔案用 AES-256-GCM 加密，DEK 用 ECIES (secp256k1) 包裝
- 加密 blob 上傳 IPFS（dev: 本地 Kubo；prod: Pinata），拿到 CID
- 智能合約 `HealthVault.sol` 存 `(cid, dataHash, encryptedDEK, category, timestamps)`
- 存取透過 grant 系統：病人授予醫生 ReadOnly 或 ReadWrite
- MetaMask personal_sign 衍生 ECIES keypair（HKDF-SHA256 + HealthVault Key
  Derivation v1 domain string），私鑰從不落地
- 所有讀取會發 `RecordAccessed` 事件作為鏈上審計日誌

### 團隊分工

- **隊友 A**：前端頁面（landing page、doctor portal、patient view），骨架已在
  最新 commit 初步搭好，實際頁面內容仍在開發
- **隊友 B**：智能合約（Solidity）、部署腳本、Hardhat / IPFS 基礎建設
- **使用者（本 plan 的主人）**：本任務的範圍——AI 解讀記錄的功能

### 本 plan 的目標

在 48 小時 hackathon 內，讓使用者完成一個**獨立的 AI 元件**：當病人打開一筆已解密
的健康記錄時，AI 讀取內容、產生白話摘要 + 術語 glossary。此元件**完全不依賴**
隊友 A 的 UI 進度或隊友 B 的合約部署狀態（開發期用 mock `DecryptedRecord`），
使團隊可以完全平行開發，最後由隊友 A 把此元件 drop 進他的 record viewer 頁面。

## Scope

### 納入範圍

1. 一個 React 元件 **`<RecordAIPanel record={DecryptedRecord} />`**，可接入
   任何顯示記錄的 UI。**使用者必須按「Generate AI Summary」按鈕才會觸發 LLM
   呼叫**——privacy-first 設計，對齊 end-to-end 加密敘事（見 State Machine 段）
2. 一個 hook **`useUnderstandRecord(record, enabled)`** 負責抽文字、呼叫 LLM、
   快取結果。`enabled` 參數由 UI 層的按鈕狀態控制
3. 一個薄的 **LLM client** 用 Azure OpenAI 格式（透過 Vite dev server proxy）呼叫 UCI ZotGPT
4. **文字抽取層**：
   - PDF：動態 import `pdfjs-dist`，轉為純文字
   - `text/*` 和 `application/json`：直接 decode
   - 其他（image/*、binary）：回傳 null，AI 面板顯示「無法解讀此檔案類型」
5. **Prompt 設計**：summary（3-5 bullets）+ glossary（3-6 術語白話定義），強制
   禁止診斷/處方建議
6. **Demo 保命符**：針對 3 種典型記錄（Labs / Imaging / Primary）的 hardcoded
   fallback 摘要，API 失敗時自動啟用
7. **Opt-in 隱私免責宣告**在 UI 上永久可見
8. **獨立開發沙盒頁** `AIPanelPlayground.tsx`，用 hardcoded 假 `DecryptedRecord`
   迭代 prompt，不需等整個 wallet → chain → IPFS 流程會動

### 明確排除

- ❌ 任何 chat/messages 功能（團隊已確認不做）
- ❌ 修改隊友任何既有檔案（`useRecord.ts`、`Web3Provider.tsx` 等一概不動）
- ❌ 智能合約部署 / Hardhat 設定（隊友 B）
- ❌ Record viewer、doctor portal、landing page（隊友 A）
- ❌ MetaMask 連線流程、ECIES 金鑰衍生(隊友 B 已做在 `Web3Provider` / `EncryptionProvider`)
- ❌ IPFS 上傳/下載（隊友已做在 `services/ipfs.ts`）
- ❌ 圖片 OCR（掃描版報告超出 48h 範圍）
- ❌ On-device LLM（WebLLM、Transformers.js；風險過高）
- ❌ 多語言支援（只做英文輸入 → 英文白話輸出）
- ❌ SAMPLE 目錄（已廢棄）

## Architecture

### 資料流

```
隊友 B 已完成的流程                            你的 AI 擴充
─────────────────────                         ─────────────────

1. MetaMask connect
   (useWallet)
         │
         ▼
2. sign("HealthVault Key
   Derivation v1:" + addr)
   → HKDF → ECIES keypair
   (useEncryption.initKeys)
         │
         ▼
3. Fetch pointer from contract
   getRecord(patient, cat)
         │
         ▼
4. Fetch encrypted blob
   fetchFromIPFS(cid)
         │
         ▼
5. Decrypt locally
   unwrapDEK + decryptFile
         │
         ▼
6. DecryptedRecord ready    ──────────▶  ┌──────────────────────────┐
   {                                      │ <RecordAIPanel           │
     data: Uint8Array,                    │   record={decryptedRec}/>│
     mimeType: 'application/pdf',         │                          │
     category: Cardiology,                │ useUnderstandRecord(rec) │
     pointer: { ... }                     │      │                   │
   }                                      │      ▼                   │
                                          │ extractText(data, mime)  │
                                          │      │                   │
                                          │      ▼                   │
                                          │ llmClient.chat({         │
                                          │   system, user           │
                                          │ })                       │
                                          │      │                   │
                                          │      ▼                   │
                                          │ parse JSON →             │
                                          │ { summary, glossary }    │
                                          │      │                   │
                                          │      ▼                   │
                                          │ render bullets +         │
                                          │ glossary +               │
                                          │ disclaimer               │
                                          └──────────────────────────┘
```

**關鍵特性**：你的 `<RecordAIPanel>` 的**唯一外部依賴**是
`DecryptedRecord`（形狀定義在 `frontend/src/types/health.ts`）。它不需要 wallet
連線、不需要合約、不需要 IPFS 工作就能獨立 render——開發期用假的
`DecryptedRecord`，demo 期用真的。

### 新增檔案清單

```
frontend/
├── .env.local                            ★新增  gitignored，blockchain/IPFS + ZotGPT 合併設定
├── src/
│   ├── ai/                               ★新增資料夾
│   │   ├── llmClient.ts                  ★新增  ZotGPT fetch wrapper (~40 行)
│   │   ├── extractText.ts                ★新增  PDF / JSON / text 抽文字 (~50 行)
│   │   ├── useUnderstandRecord.ts        ★新增  react-query hook (~80 行)
│   │   ├── fallbackData.ts               ★新增  demo 保命符 (~40 行)
│   │   ├── prompts.ts                    ★新增  system + user prompt builder (~50 行)
│   │   └── RecordAIPanel.tsx             ★新增  UI 元件 (~100 行)
│   └── dev/                              ★新增資料夾 (僅 dev 期使用)
│       └── AIPanelPlayground.tsx         ★新增  獨立開發沙盒 (~60 行)
```

### 修改檔案

1. **`frontend/vite.config.ts`**：新增 `server.proxy` 區塊用於 ZotGPT API key
   保護（詳見下方 `llmClient.ts` 和 `vite.config.ts` 設計章節）。這是使用者
   唯一需要修改的既有檔案。
2. **`frontend/.gitignore`**：新增一行 `.env*.local` 防止 `.env.local` 被 commit
   （安全性修正，目前的 gitignore 只擋 `.env`，不擋 `.env.local`）。

其他既有檔案一律不動。隊友 A 之後在他的 record viewer 裡
`import { RecordAIPanel } from '../ai/RecordAIPanel'` 並 render 即可。

### 依賴異動（`frontend/package.json`）

新增兩個 runtime dependency：
- `pdfjs-dist` (^4.x) — PDF 文字抽取
- （其他都用現有套件和 Web API）

建議使用者用 `cd frontend && npm install pdfjs-dist` 新增，並 commit 更新的
`package.json` 和 `package-lock.json`。

## Detailed Design

### `src/ai/llmClient.ts`

**ZotGPT 是 UCI 的 Azure OpenAI 服務**（endpoint `https://azureapi.zotgpt.uci.edu`），
不是一般 OpenAI 相容格式。參考來源：`~/codespace/dance_tutorial/backend/app/services/zotgpt_service.py`。

Azure OpenAI 的差異：
- URL 格式：`{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={ver}`
- Auth header：`api-key: <key>`（不是 `Authorization: Bearer`）
- Request body **不含 `model` 欄位**（model 由 URL 裡的 deployment 名稱決定）
- Response 形狀和 OpenAI 相同：`choices[0].message.content`

**關鍵安全決定：API key 絕對不進 browser bundle**。frontend 呼叫的是 Vite dev
server 的 proxy 路徑 `/api/zotgpt/...`，Vite 在 Node 側把 request 轉發到 Azure，
並在轉發時附加 `api-key` header。API key 只存在於 Node 程序記憶體和 `.env.local`
檔案，**永遠不會被 Vite 編譯進 JavaScript bundle**。

```ts
// HACKATHON DEMO MODE — calls ZotGPT via Vite dev server proxy (see vite.config.ts).
// The api-key header is attached by the proxy, NEVER touches the browser.
//
// Reference implementation (Python, backend-based):
//   ~/codespace/dance_tutorial/backend/app/services/zotgpt_service.py
//
// Post-hackathon migration: `npm run build` does NOT include the dev proxy, so
// production needs a real backend proxy. Options:
//   - Vercel Function / Cloudflare Worker / Deno Deploy
//   - A minimal Node/Express server (like dance_tutorial's FastAPI backend)
// Function signature stays identical: { system, user } -> string.

export interface ChatArgs {
  system: string
  user: string
}

/**
 * The deployment name and api-version are public (not secrets) — they tell the
 * proxy which Azure deployment to hit. The actual API key is injected by Vite
 * dev server proxy configuration (see vite.config.ts), never exposed here.
 */
const DEPLOYMENT = import.meta.env.VITE_ZOTGPT_DEPLOYMENT ?? 'gpt-4o-mini'
const API_VERSION = import.meta.env.VITE_ZOTGPT_API_VERSION ?? '2024-10-21'

export async function chat({ system, user }: ChatArgs): Promise<string> {
  // Relative URL — goes through Vite dev server proxy
  const url =
    `/api/zotgpt/deployments/${DEPLOYMENT}/chat/completions` +
    `?api-version=${API_VERSION}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // NO auth header here — the proxy adds `api-key` on the Node side
    },
    body: JSON.stringify({
      // NO `model` field — Azure uses deployment name in URL
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM response missing content')
  return content
}
```

### `vite.config.ts` 修改（必須做）

**必須修改**既有的 `frontend/vite.config.ts` 加入 proxy 設定。這是 plan 唯一
允許使用者修改的既有檔案（因為 Vite proxy 只能在這裡配置）。

目前的檔案內容（隊友寫的）：
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  resolve: { alias: { '@': '/src' } },
  optimizeDeps: { include: ['ethers'] },
  server: { port: 3000 },
})
```

**改成**（只加一個 proxy 區塊到既有的 `server` 物件，不動其他設定）：
```ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load .env / .env.local etc. at config time so non-VITE vars
  // (like ZOTGPT_API_KEY) are available to the proxy handler.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: { global: 'globalThis' },
    resolve: { alias: { '@': '/src' } },
    optimizeDeps: { include: ['ethers'] },
    server: {
      port: 3000,
      proxy: {
        // Proxy AI requests to UCI ZotGPT Azure OpenAI
        '/api/zotgpt': {
          target: env.ZOTGPT_ENDPOINT || 'https://azureapi.zotgpt.uci.edu',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zotgpt/, '/openai'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.ZOTGPT_API_KEY
              if (apiKey) {
                proxyReq.setHeader('api-key', apiKey)
              } else {
                console.warn('[vite proxy] ZOTGPT_API_KEY not set — AI calls will fail')
              }
            })
          },
        },
      },
    },
  }
})
```

**這個修改和隊友有衝突的風險嗎？** 隊友的既有 `vite.config.ts` 只有 20 行基本設定，
這次新增的 proxy 區塊和他的設定**正交**（不動 plugins、alias、optimizeDeps、port）。
如果隊友之後也要加 proxy，兩邊合併很容易——把對方的 proxy rule 複製進來就好。

### env 檔案策略（回應「要有自己的 env 檔，因為要推 repo」）

**問題**：目前 `frontend/.gitignore` 只有：
```
.env
/node_modules
package-lock.json
dist
```
它**沒有**擋 `.env.local`、`.env.*.local`。如果使用者建立 `.env.local` 放 API key，
`git add .` 會直接把 key commit 進去推上 GitHub——**真實的安全風險**。

**解決方案**（兩步）：

1. **更新 `frontend/.gitignore`**（使用者必須手動做這一步，plan 無法 edit .gitignore）：
   ```
   .env
   .env*.local         # ← 新增這行，擋 .env.local / .env.development.local 等
   /node_modules
   package-lock.json
   dist
   ```

2. **建立 `frontend/.env.local`**（永遠不入 git）放 ZotGPT 設定：
   ```
   # ZotGPT (UCI Azure OpenAI) — server-side only, NOT exposed to browser.
   # DO NOT add VITE_ prefix to these two — they must stay server-only.
   ZOTGPT_API_KEY=<你從 UCI ZotGPT portal 拿到的 primary key>
   ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu

   # These two are non-secret (visible in browser bundle) — VITE_ prefix is OK.
   VITE_ZOTGPT_DEPLOYMENT=gpt-4o-mini
   VITE_ZOTGPT_API_VERSION=2024-10-21
   ```

**為什麼這樣分 VITE_ 前綴**：
- `ZOTGPT_API_KEY`、`ZOTGPT_ENDPOINT`：**無 VITE_**，只在 Node 側（vite.config.ts）
  讀取。Vite 絕對不會把它編進 JS bundle。這是**敏感資料的唯一正確做法**。
- `VITE_ZOTGPT_DEPLOYMENT`、`VITE_ZOTGPT_API_VERSION`：**有 VITE_**，會被 bundle
  進 frontend 讓 `llmClient.ts` 讀取。這兩個**不是機密**（deployment name 和 API
  version 被任何人知道都沒有安全影響）——它們只是告訴 proxy 要打哪個 deployment。

**為什麼不把 ZotGPT 設定加到既有的 `frontend/.env.example`**：
- `.env.example` 是**入 git 的範本檔**，內容應該是公開可分享的
- 加 ZotGPT 到範本檔會讓接手的人誤以為「這個檔是放所有 env 的地方」而把真 key
  也填進去
- 保持關注點分離：`.env.example` 繼續放 blockchain / IPFS 範例；ZotGPT 的設定
  **只存在於每個開發者本機的 `.env.local`**，永不入 git

### 每位團隊成員的設定步驟（寫進 HANDOFF）

```bash
# 1. 更新 gitignore（一次性，可 commit 給全隊用）
# 在 frontend/.gitignore 加一行：
#   .env*.local

# 2. 每個開發者在自己機器建 frontend/.env.local
cd frontend
cat > .env.local <<EOF
ZOTGPT_API_KEY=<your key from ZotGPT portal>
ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu
VITE_ZOTGPT_DEPLOYMENT=gpt-4o-mini
VITE_ZOTGPT_API_VERSION=2024-10-21
EOF

# 3. 確認這個檔案不會被 git 追蹤
git status   # .env.local 不應該出現在 untracked files 裡
             # 如果出現了，代表 .gitignore 規則還沒加對，停下來檢查

# 4. 啟動 dev server
npm run dev
# Vite 會在 http://localhost:3000 啟動，proxy 會自動啟用
```

**假設**：ZotGPT 用的是 Azure OpenAI API（根據 `dance_tutorial/backend/app/services/zotgpt_service.py` 確認）。若團隊發現 ZotGPT 後端換成純 OpenAI 相容格式，
只需調整 `llmClient.ts` 和 `vite.config.ts` 的 URL rewrite 規則，其他層不受影響。

### `src/ai/extractText.ts`

根據 `mimeType` 分派抽文字邏輯。

```ts
import type { DecryptedRecord } from '../types/health'

export async function extractText(record: DecryptedRecord): Promise<string | null> {
  const { data, mimeType } = record

  if (mimeType === 'application/pdf') {
    return extractPdfText(data)
  }
  if (mimeType === 'application/json') {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(data))
      return JSON.stringify(parsed, null, 2)
    } catch {
      return new TextDecoder().decode(data)
    }
  }
  if (mimeType.startsWith('text/')) {
    return new TextDecoder().decode(data)
  }

  // image/*, binary — not supported in 48h scope
  return null
}

async function extractPdfText(data: Uint8Array): Promise<string> {
  // Dynamic import to avoid ~2MB hit on initial load
  const pdfjs = await import('pdfjs-dist')
  // Worker setup: use CDN worker for simplicity in hackathon
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const pdf = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: { str?: string }) => item.str ?? '')
      .join(' ')
    pages.push(text)
  }
  return pages.join('\n\n')
}
```

### `src/ai/prompts.ts`

```ts
import { RECORD_CATEGORY_LABELS, type RecordCategory } from '../types/health'

export function buildSystemPrompt(category: RecordCategory): string {
  return `You are helping a patient understand their medical record.
They have opened a record from the "${RECORD_CATEGORY_LABELS[category]}" category
and want to know what it says in plain English.

Your tasks:
1. "summary": 3-5 bullet points covering the most important things in this
   record, in plain English that a non-medical reader can follow. Each bullet is
   1 sentence. If something is abnormal or flagged, call it out clearly without
   alarming language.
2. "glossary": 3-6 medical terms from the record that a non-medical reader
   would not know. For each, provide a plain-English definition in 1 sentence.

Strict rules:
- Do NOT diagnose. Do NOT prescribe. Do NOT recommend specific treatment.
- If something in the record warrants doctor follow-up, say "You may want to
  discuss this with your doctor" — never a specific action.
- Keep tone calm, informative, respectful.
- If the record is mostly empty, not medical, or unreadable, return
  {"summary": ["Not enough content to summarize"], "glossary": []}.

Output strict JSON, no markdown, no preamble, no code fences:
{
  "summary": ["...", "...", "..."],
  "glossary": [
    {"term": "...", "definition": "..."}
  ]
}`
}

export function buildUserPrompt(recordText: string): string {
  return `Record content (extracted from the file):
---
${recordText.slice(0, 8000)}
---

Generate the summary and glossary.`
}
```

**為什麼 8000 字元截斷**：LLM 輸入 token 限制。8000 chars ≈ 2000 tokens，典型
檢驗報告 PDF 遠低於此，安全邊界。若真遇到長文件可在未來擴充成 chunking；48h
內不處理。

### `src/ai/useUnderstandRecord.ts`

使用 `@tanstack/react-query`（隊友已在 AppProvider 設好 QueryClient）做
cache、loading 狀態、錯誤處理。

**設計決定：使用者必須明確 opt-in（按按鈕）才觸發 LLM 呼叫。** 這不是技術限制,
而是 **privacy-first 設計取捨**——對齊產品「end-to-end 加密」的核心敘事。Hook 接
受一個 `enabled` 參數由 UI 層控制：初始 `false`（只 render 按鈕），使用者按下後
flip 到 `true`，react-query 才真的去呼叫 ZotGPT。cache 生效後同一筆 record（同
一個 cid）在 5 分鐘內不會重複呼叫，切到別的 record 再切回來也會直接用 cache。

```ts
import { useQuery } from '@tanstack/react-query'
import type { DecryptedRecord } from '../types/health'
import { chat } from './llmClient'
import { extractText } from './extractText'
import { buildSystemPrompt, buildUserPrompt } from './prompts'
import { getFallback } from './fallbackData'

export interface GlossaryItem {
  term: string
  definition: string
}
export interface RecordInsight {
  summary: string[]
  glossary: GlossaryItem[]
  /** Whether this result came from the fallback table (not the live LLM) */
  isFallback: boolean
}

/**
 * Fetch an AI summary + glossary for a decrypted medical record.
 *
 * IMPORTANT: This hook does nothing until `enabled` is true. The UI layer
 * (RecordAIPanel) keeps `enabled` false until the user explicitly clicks the
 * "Generate AI Summary" button. This is an opt-in privacy guarantee, not an
 * implementation detail — the decrypted plaintext never leaves the browser
 * unless the user takes an explicit action.
 *
 * Cache: once fetched, the result is cached by `cid + updatedAt`. Re-opening
 * the same record (even switching threads and coming back) uses the cache.
 * To force a re-fetch (e.g., "Regenerate" button), call
 * queryClient.invalidateQueries({ queryKey: ['recordInsight', cid, updatedAt] }).
 */
export function useUnderstandRecord(
  record: DecryptedRecord | null,
  enabled: boolean,
) {
  return useQuery<RecordInsight>({
    queryKey: ['recordInsight', record?.pointer.cid, record?.pointer.updatedAt],
    enabled: Boolean(record) && enabled,
    staleTime: 5 * 60 * 1000, // 5 min — records don't change often
    gcTime: 30 * 60 * 1000,   // Keep cache for 30 min after unmount
    queryFn: async (): Promise<RecordInsight> => {
      if (!record) throw new Error('No record provided')

      // Try to extract text
      const text = await extractText(record)
      if (!text) {
        // Unsupported file type (image, binary)
        return {
          summary: ['This file type cannot be analyzed automatically.'],
          glossary: [],
          isFallback: true,
        }
      }

      try {
        const system = buildSystemPrompt(record.category)
        const user = buildUserPrompt(text)
        const raw = await chat({ system, user })

        // Strip potential code fences just in case
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
        const parsed = JSON.parse(cleaned) as {
          summary: string[]
          glossary: GlossaryItem[]
        }

        if (!Array.isArray(parsed.summary) || !Array.isArray(parsed.glossary)) {
          throw new Error('LLM response shape invalid')
        }

        return { ...parsed, isFallback: false }
      } catch (err) {
        console.error('AI summary failed, using fallback:', err)
        return { ...getFallback(record.category), isFallback: true }
      }
    },
  })
}
```

### `src/ai/fallbackData.ts`

針對 3 種典型 demo 情境預錄的摘要。API 任何錯都自動 fallback。

```ts
import { RecordCategory } from '../types/health'
import type { RecordInsight } from './useUnderstandRecord'

const FALLBACKS: Partial<Record<RecordCategory, Omit<RecordInsight, 'isFallback'>>> = {
  [RecordCategory.Labs]: {
    summary: [
      'Your cholesterol levels are mostly within normal range.',
      'LDL is slightly above the ideal target of 100 mg/dL.',
      'Blood pressure and blood sugar readings look healthy.',
      'You may want to discuss dietary adjustments with your doctor at the next visit.',
    ],
    glossary: [
      { term: 'LDL', definition: 'Often called "bad" cholesterol; high levels can clog arteries over time.' },
      { term: 'HDL', definition: '"Good" cholesterol that helps remove other forms of cholesterol.' },
      { term: 'mg/dL', definition: 'Milligrams per deciliter — the standard unit for measuring substances in blood.' },
    ],
  },
  [RecordCategory.Cardiology]: {
    summary: [
      'Your ECG reading shows a normal heart rhythm.',
      'Heart rate and blood pressure are in the healthy range.',
      'The doctor noted slight elevation in cholesterol to monitor.',
      'A follow-up in 6 months was recommended.',
    ],
    glossary: [
      { term: 'ECG (or EKG)', definition: 'A test that records the electrical activity of your heart.' },
      { term: 'Sinus rhythm', definition: 'The normal, healthy pattern of heartbeats.' },
    ],
  },
  [RecordCategory.Primary]: {
    summary: [
      'Your annual checkup was generally positive.',
      'Weight, blood pressure, and vitals are all within expected ranges.',
      'The doctor recommended a follow-up lab panel in 6 months.',
    ],
    glossary: [
      { term: 'Vitals', definition: 'Basic health measurements: temperature, heart rate, breathing rate, blood pressure.' },
    ],
  },
}

const GENERIC: Omit<RecordInsight, 'isFallback'> = {
  summary: [
    'This record contains medical information from your healthcare provider.',
    'Please open the document to view the full details.',
    'You may want to discuss this record with your doctor if anything is unclear.',
  ],
  glossary: [],
}

export function getFallback(category: RecordCategory): RecordInsight {
  const data = FALLBACKS[category] ?? GENERIC
  return { ...data, isFallback: true }
}
```

### `src/ai/RecordAIPanel.tsx`

UI 元件。Loading skeleton、結果顯示、disclaimer。

```tsx
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RECORD_CATEGORY_LABELS, type DecryptedRecord } from '../types/health'
import { useUnderstandRecord } from './useUnderstandRecord'

interface Props {
  record: DecryptedRecord | null
}

export function RecordAIPanel({ record }: Props) {
  // User must explicitly click "Generate" before any data leaves the browser.
  // This state resets when the user opens a different record (via key below).
  const [consented, setConsented] = useState(false)
  const queryClient = useQueryClient()

  const { data: insight, isLoading, error } = useUnderstandRecord(record, consented)

  if (!record) return null

  const regenerate = () => {
    queryClient.invalidateQueries({
      queryKey: ['recordInsight', record.pointer.cid, record.pointer.updatedAt],
    })
  }

  return (
    <aside
      // key forces state reset when user switches to a different record
      key={record.pointer.cid}
      className="w-full max-w-sm border-l border-gray-200 bg-white p-6 flex flex-col gap-5"
    >
      <header className="flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <h2 className="text-lg font-semibold">AI Summary</h2>
        <span className="ml-auto text-xs text-gray-400">
          {RECORD_CATEGORY_LABELS[record.category]}
        </span>
      </header>

      {/* ─── State 1: Initial — require explicit opt-in ─────────────────── */}
      {!consented && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-600 leading-relaxed">
            Want a plain-English summary of this record?
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 leading-relaxed">
            <strong className="block mb-1 text-gray-700">What happens when you click:</strong>
            • This decrypted record is sent to our AI provider once<br />
            • You get a 3–5 bullet summary + a glossary of medical terms<br />
            • Your data is not stored by the provider<br />
            • Takes 1–2 seconds
          </div>
          <button
            onClick={() => setConsented(true)}
            className="w-full py-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            ✨ Generate AI Summary
          </button>
        </div>
      )}

      {/* ─── State 2: Loading after consent ──────────────────────────────── */}
      {consented && isLoading && <SkeletonBullets />}

      {/* ─── State 3: Error ──────────────────────────────────────────────── */}
      {consented && error && (
        <p className="text-sm text-red-600">
          Something went wrong. Please try again.
        </p>
      )}

      {/* ─── State 4: Success / fallback ─────────────────────────────────── */}
      {consented && insight && (
        <>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              What this record says
            </h3>
            <ul className="space-y-2 text-sm text-gray-800">
              {insight.summary.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {insight.glossary.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Medical terms, in plain English
              </h3>
              <dl className="space-y-2 text-sm">
                {insight.glossary.map((item, i) => (
                  <div key={i}>
                    <dt className="font-medium text-gray-900">{item.term}</dt>
                    <dd className="text-gray-600">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {insight.isFallback && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Showing cached summary (AI temporarily unavailable).
            </p>
          )}

          <button
            onClick={regenerate}
            className="text-xs text-gray-500 hover:text-blue-600 self-start"
          >
            🔄 Regenerate
          </button>
        </>
      )}

      {/* Privacy footer — always visible in all states */}
      <footer className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
        🔒 <strong>AI is opt-in.</strong> Your decrypted record is only sent to
        our AI provider when you click Generate, and is not stored by them.
        All blockchain and IPFS data remains end-to-end encrypted.
      </footer>
    </aside>
  )
}

function SkeletonBullets() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-4/6" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-3/6" />
    </div>
  )
}
```

### `src/dev/AIPanelPlayground.tsx`

獨立開發沙盒頁。讓使用者**完全不需要** wallet / chain / IPFS 就能 render
`<RecordAIPanel>` 並迭代 prompt。

```tsx
import { useState } from 'react'
import { RecordCategory, type DecryptedRecord } from '../types/health'
import { RecordAIPanel } from '../ai/RecordAIPanel'

// A sample record with inline text content for quick prompt iteration.
// Use pasted real-world lab report text here for realistic results.
const SAMPLE_TEXT = `Patient: Sarah Johnson
Date: April 4, 2026

LIPID PANEL
- Total Cholesterol: 195 mg/dL (normal <200)
- LDL-C: 110 mg/dL (above ideal <100)
- HDL-C: 55 mg/dL (normal >40)
- Triglycerides: 125 mg/dL (normal <150)

BLOOD PRESSURE
- 120/80 mmHg (normal)

NOTES
Dr. Martinez: Your cardiovascular health is generally good. LDL is slightly
elevated; consider dietary adjustments and recheck in 6 months.`

const textBytes = new TextEncoder().encode(SAMPLE_TEXT)

const MOCK_RECORD: DecryptedRecord = {
  category: RecordCategory.Labs,
  mimeType: 'text/plain',
  filename: 'sample-lab.txt',
  data: textBytes,
  objectUrl: URL.createObjectURL(new Blob([textBytes], { type: 'text/plain' })),
  pointer: {
    cid: 'bafybeimockmockmockmockmockmockmockmockmockmock',
    dataHash: '0xmock',
    encryptedDEK: 'mock',
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
    lastModifiedBy: '0xMockPatient',
  },
}

export function AIPanelPlayground() {
  const [record] = useState<DecryptedRecord>(MOCK_RECORD)
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">AI Panel Playground</h1>
        <p className="text-sm text-gray-600 mb-4">
          Dev-only sandbox for iterating on the AI prompt without needing
          wallet / chain / IPFS.
        </p>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
          {SAMPLE_TEXT}
        </pre>
      </main>
      <RecordAIPanel record={record} />
    </div>
  )
}
```

**開發期如何不動到 App.tsx**：使用者應該在自己的 feature branch 上暫時把
`main.tsx` 最後一行的 `<App />` 換成 `<AIPanelPlayground />` 做 prompt 迭代。
**這個修改是 local-only 開發手段，絕不 commit 進 feature branch 的 PR**——
整合時一定要先 `git checkout frontend/src/main.tsx` 還原，只把 `src/ai/*` 和
`src/dev/*` 的新檔案放進 PR。這樣可以完全避開和隊友 A 對 `App.tsx` 的編輯衝突。

另一個選項是**建立一個 dev 專用 route**（`react-router-dom` 已在 dependencies），
例如 `#/playground` hash route，但這仍需要改 `App.tsx` 加上 route，所以仍會和
隊友 A 衝突。**最乾淨的做法就是上面的 main.tsx local-only 改動 + 絕不 commit**。

### env 檔最終布局（整理版）

`frontend/.env.example`（**不動**，隊友寫好的 blockchain/IPFS 範本）：
```
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_IPFS_API_URL=http://localhost:5001
VITE_IPFS_GATEWAY_URL=http://localhost:8080
VITE_PINATA_JWT=
VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud
```

`frontend/.env.local`（**新增，gitignored，每個開發者自己的**）：
```
# Existing blockchain/IPFS vars — copy from .env.example and fill in real values
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_IPFS_API_URL=http://localhost:5001
VITE_IPFS_GATEWAY_URL=http://localhost:8080
VITE_PINATA_JWT=
VITE_PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# ─── ZotGPT (UCI Azure OpenAI) ──────────────────────────
# Server-side only — NO VITE_ prefix, not exposed to browser
ZOTGPT_API_KEY=<your primary key from UCI ZotGPT portal>
ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu

# Client-safe (non-secret) — VITE_ prefix OK
VITE_ZOTGPT_DEPLOYMENT=gpt-4o-mini
VITE_ZOTGPT_API_VERSION=2024-10-21
```

`frontend/.gitignore`（**必須新增 `.env*.local` 規則**——見「env 檔案策略」段）。

## Implementation Steps

| 時段（累計）| 步驟 | 驗證 |
|---|---|---|
| 0–0.5h | 讀 `frontend/src/types/health.ts`、`hooks/useRecords.ts`、`services/encryption.ts`，確認 `DecryptedRecord` 形狀和 `RecordCategory` enum 值 | 你能在白板畫出資料流 |
| 0.5–1h | `cd frontend && npm install pdfjs-dist`；更新 `frontend/.gitignore` 加入 `.env*.local`；建立 `frontend/.env.local` 填 ZotGPT 設定（`ZOTGPT_API_KEY`、`ZOTGPT_ENDPOINT`、`VITE_ZOTGPT_DEPLOYMENT`、`VITE_ZOTGPT_API_VERSION`）；修改 `frontend/vite.config.ts` 加入 `/api/zotgpt` proxy | `git status` 確認 `.env.local` 未被追蹤；`npm run dev` 不報錯 |
| 1–2h | 寫 `llmClient.ts` + 在 browser console 呼叫一次 hello world（`fetch('/api/zotgpt/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21', ...)`） | Console 看到 ZotGPT 回應，且 Network tab 看到 request 走 `/api/zotgpt/*` 而非直接打 Azure |
| 2–3h | 寫 `prompts.ts` + `extractText.ts`（先只做 text/plain 和 json，PDF 留後面） | 能抽一段純文字 |
| 3–4h | 寫 `useUnderstandRecord.ts` + `fallbackData.ts` 骨架 + `RecordAIPanel.tsx` 最簡版本 | 在 console 看到結構化輸出 |
| 4–5h | 寫 `AIPanelPlayground.tsx`，暫時把 `main.tsx` 渲染它（**local-only，不 commit**） | 瀏覽器看到完整 UI：skeleton → summary → glossary |
| 5–6h | PDF 支援：`extractText.ts` 加上 `pdfjs-dist` 路徑，playground 裡放一份真 PDF 測 | PDF → 抽出文字 → AI 產摘要 |
| 6–9h | **Prompt 迭代**：用 3 種不同 record（lab report、doctor note、imaging summary）測試，反覆調到 summary + glossary 真的像人寫的 | 你朗讀一次不用查字典 |
| 9–10h | `fallbackData.ts` 完整 3 個類別預錄 + 斷網測試 | 關網路後 playground 仍正常 render |
| 10–11h | UI 打磨：disclaimer、isFallback 標示、loading 動畫、錯誤態 | 各種 state 切換都順 |
| 11–12h | 和隊友 A 同步：把 `<RecordAIPanel>` import 到他的 record viewer 頁面 | 他的頁面打開真實解密記錄後，右邊出現 AI 面板 |

**Buffer**：剩下時間（12h+）全拿來 demo rehearsal、prompt 最後打磨、錄 fallback 影片、幫隊友 debug。

## Error Handling

| 情境 | 處理 |
|---|---|
| `ZOTGPT_API_KEY` / `ZOTGPT_ENDPOINT` 未設（Node 側） | Vite proxy console warn，request 被送出但 Azure 回 401 → hook catch → `isFallback: true` |
| `VITE_ZOTGPT_DEPLOYMENT` / `VITE_ZOTGPT_API_VERSION` 未設（browser 側） | `llmClient.chat()` 用 default 值 `gpt-4o-mini` / `2024-10-21`，若 deployment 不存在 Azure 會回 404 → fallback |
| ZotGPT HTTP 非 2xx | throw → fallback |
| Response JSON parse 失敗 | throw → fallback |
| Response 缺 `summary` / `glossary` 欄位 | throw → fallback |
| `extractText` 回 null（image、binary） | hook 回「無法解讀此檔案類型」訊息，glossary 空陣列 |
| PDF 解析失敗（損壞或加密） | `extractText` 裡 try/catch 回 null，走上面 unsupported 路徑 |
| 長記錄超過 8000 字元 | 在 `buildUserPrompt` 裡 slice 截斷（hackathon 範圍先這樣） |
| LLM 回應包了 ` ```json ` code fence | `useUnderstandRecord` 裡先 strip code fence 再 parse |

**免責宣告 UI**：無論 summary 來自 live LLM 或 fallback，`RecordAIPanel` 底部永遠
顯示 opt-in + not stored 的說明文字。這是**產品可信度**的核心，不是法律裝飾。

## Verification

### 開發中（無需任何 Web3 基礎建設）

```bash
cd frontend
npm install pdfjs-dist
# 先更新 .gitignore 加入 .env*.local 規則（見「env 檔案策略」段），再繼續：
cp .env.example .env.local
# 編輯 .env.local，加入 ZotGPT 四個變數：
#   ZOTGPT_API_KEY=<your key>
#   ZOTGPT_ENDPOINT=https://azureapi.zotgpt.uci.edu
#   VITE_ZOTGPT_DEPLOYMENT=gpt-4o-mini
#   VITE_ZOTGPT_API_VERSION=2024-10-21
# 修改 vite.config.ts 加入 /api/zotgpt proxy（見 llmClient 段）
npm run dev
# 瀏覽器打開 http://localhost:3000  (注意: frontend/vite.config.ts 設 port: 3000，不是預設 5173)
# 開發期把 main.tsx 最後一行的 <App /> 暫時換成 <AIPanelPlayground />（local-only，不 commit）
```

### 功能驗證 checklist

1. **Playground 進入（初始狀態）**：左邊看到 sample text，右邊 AI panel **顯示藍色「✨ Generate AI Summary」按鈕** + 說明文字 + 隱私 disclaimer。**此時 Network tab 應該無任何 /api/zotgpt 請求**——這是 privacy-first 設計的驗證點
2. **點擊 Generate 按鈕**：按鈕消失 → skeleton bullets 出現 → 1–2 秒後出現 summary 內容。Network tab 此時應該看到**恰好一次** POST `/api/zotgpt/deployments/.../chat/completions`
3. **Summary 品質**：3–5 個 bullet，每條 1 句話，沒有醫學術語，沒有診斷語氣
4. **Glossary 品質**：3–6 個術語，解釋清楚
5. **Regenerate 按鈕**：點右下角的「🔄 Regenerate」→ skeleton 再次出現 → 1–2 秒後新結果（可能和上次略不同，因為 temperature > 0）
6. **Cache 驗證**：按 Generate 後切到 Playground 外（如果有其他頁）再切回來 → summary 依然顯示（react-query cache 生效）→ 此時 Network tab 不應有新請求
7. **Disclaimer 永久可見**：所有四個狀態（初始/loading/success/error）底部都顯示灰色隱私 disclaimer
8. **Fallback 測試**：暫時把 `.env.local` 的 `ZOTGPT_API_KEY` 改成錯的 → 重整 → 按 Generate → 面板顯示 Labs 類別的 hardcoded fallback + "Showing cached summary" 提示
9. **Env 完全未設**：刪除 `.env.local` 裡的 ZotGPT 四個變數 → 重整 → 按 Generate → 仍然 fallback，不 crash。**Vite console 應該看到 `[vite proxy] ZOTGPT_API_KEY not set` warn**
10. **PDF 測試**：把 playground 的 mock record 改成載入一份真的 PDF bytes（可以從 project 放一份 `public/sample-lab.pdf`）、mimeType 改 `application/pdf` → 按 Generate → 面板仍然產生摘要
11. **Unsupported mime**：把 mock record 的 mimeType 改 `image/png` → 按 Generate → 面板顯示「This file type cannot be analyzed」
12. **Consent 不洩漏**：React DevTools 檢查 `RecordAIPanel` state——在按下按鈕前，`consented` 應該是 `false`，確認 hook 的 `enabled` 也是 `false`，確認沒有任何 ZotGPT call 發出
13. **不影響隊友**：`cd frontend && git diff` 確認只改了 `vite.config.ts` 和 `.gitignore`，沒有動到 `src/hooks/`、`src/services/`、`src/providers/`、`src/contracts/` 任何現有檔案

### 整合測試（等隊友 A 的 record viewer 好了才做）

1. 隊友 A 在他的 record viewer 頁面 `import { RecordAIPanel }` 並 render 在右側
2. 連 MetaMask、註冊 patient、上傳一份真的 PDF 記錄
3. 打開這筆記錄 → 左邊 PDF viewer + 右邊你的 AI 面板
4. 確認 AI 摘要真的是基於這份 PDF 的內容

## Team Handoff

### 給隊友 A（前端頁面作者）

整合你的 AI 面板到 record viewer 只需要 3 行：

```tsx
import { RecordAIPanel } from '../ai/RecordAIPanel'

<div className="flex">
  <YourRecordViewer record={record} />
  <RecordAIPanel record={record} />
</div>
```

`record` 是從 `useRecord(patient, category)` 拿到的 `DecryptedRecord`（可為 null
表示尚未載入，`RecordAIPanel` 內部會處理）。不需要其他 prop、不需要 provider、
不需要 context——它用 react-query 的 QueryClient（已在 AppProvider 裡）做 cache。

### 給隊友 B（合約/IPFS/加密作者）

你的工作這邊完全不受影響。AI 功能只讀 `DecryptedRecord.data`（Uint8Array），
這是你在 `useRecord.ts` 回傳的型別。我沒有改你任何檔案，沒有改任何型別定義。

**未來 production deploy 時**：目前是靠 Vite dev server 的 proxy 保護 API key
（見 `vite.config.ts` 的 `/api/zotgpt` 區塊）。`npm run build` 出來的 static
bundle **不包含 dev server**，所以 production 時 `fetch('/api/zotgpt/...')` 會
打不到東西。要上線需要把 proxy 邏輯搬到真正的 serverless function：

- **選項 1**：Vercel Function / Cloudflare Worker / Deno Deploy，收 POST 後用
  `ZOTGPT_API_KEY` env var 轉發到 `https://azureapi.zotgpt.uci.edu/openai/...`
- **選項 2**：你的後端自己加一個 `/api/zotgpt` endpoint（和目前 Vite proxy 行為
  一致），前端程式碼完全不用改——`llmClient.ts` 的 `fetch('/api/zotgpt/...')`
  會自動打到同源的後端 endpoint

因為團隊不用 Supabase 而是 Web3 + IPFS，LLM key **不能放鏈上也不能放 IPFS**，
必須有伺服器保管。AI 呼叫和資料儲存是兩個不同的 concern。

## Critical Files

**必讀**（使用者在開工前必須看過）：
- `frontend/src/types/health.ts` — `DecryptedRecord`、`RecordCategory`、`AccessLevel` 定義
- `frontend/src/hooks/useRecords.ts` — `useRecord()` 回傳的資料形狀
- `frontend/src/providers/AppProvider.tsx` — QueryClient 和 provider 順序

**會新建**（使用者這次的工作）：
- `frontend/src/ai/llmClient.ts`
- `frontend/src/ai/extractText.ts`
- `frontend/src/ai/prompts.ts`
- `frontend/src/ai/useUnderstandRecord.ts`
- `frontend/src/ai/fallbackData.ts`
- `frontend/src/ai/RecordAIPanel.tsx`
- `frontend/src/dev/AIPanelPlayground.tsx`
- `frontend/.env.local`

**不動**：`frontend/src/` 既有所有檔案；`hardhat/`；舊的 `SAMPLE/`。

## Assumptions / Open Questions

1. **ZotGPT 是 UCI Azure OpenAI**（已根據 `~/codespace/dance_tutorial/backend/app/services/zotgpt_service.py` 驗證）：endpoint `https://azureapi.zotgpt.uci.edu`、
   auth 用 `api-key` header、URL 含 deployment 名稱、request body 不含 `model`
   欄位。本 plan 的 `llmClient.ts` 和 `vite.config.ts` proxy 設定都已對應此格式。
   若 UCI 未來換 API，只需改這兩個檔案。
2. **Prompt 語言：英文輸入、英文輸出**。翻譯目標是「英文醫學術語 → 簡單英文白話」，
   適合 Chapman 英語環境。
3. **記錄檔案類型：主要是 PDF 和純文字**。圖片掃描版不在 48h 範圍。
4. **Hackathon demo 時 ZotGPT 可達**：若 demo 現場網路差或 ZotGPT 被封鎖，
   fallback 資料會自動啟用。使用者應在 demo 前實際測試 fallback 路徑，確認
   不會露出錯誤訊息。
5. **隊友 A 的 record viewer 頁面在 hackathon 結束前可用**：若不可用，
   AIPanelPlayground 本身就是一個可以 demo 的頁面，使用者可以獨立展示。
