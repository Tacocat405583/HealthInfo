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
  // Relative URL — goes through Vite dev server proxy (/api/zotgpt → Azure)
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
      // 0.5 gives enough variation between regenerate clicks to be visibly
      // different, without losing coherence. UCI's gpt-4o deployment resolves
      // at runtime to a reasoning model (see usage.model in response), which
      // is highly deterministic at low temperatures — temp 0.2 was producing
      // near-identical outputs on regenerate.
      temperature: 0.5,
      // Azure OpenAI gpt-4o (api-version 2024-02-01+) requires `max_completion_tokens`,
      // not `max_tokens` — the older name returns HTTP 400 invalid_request_error.
      // dance_tutorial uses this form too (zotgpt_service.py line 187).
      max_completion_tokens: 2000,
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
