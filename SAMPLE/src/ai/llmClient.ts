// ZotGPT (UCI Azure OpenAI) client.
// Calls /api/zotgpt/... which is proxied by Vite dev server.
// The api-key header is injected by the proxy — it NEVER touches the browser bundle.

export interface ChatArgs {
  system: string;
  user: string;
}

const DEPLOYMENT  = import.meta.env.VITE_ZOTGPT_DEPLOYMENT ?? 'gpt-4o';
const API_VERSION = import.meta.env.VITE_ZOTGPT_API_VERSION ?? '2024-02-01';

export async function chat({ system, user }: ChatArgs): Promise<string> {
  const url =
    `/api/zotgpt/deployments/${DEPLOYMENT}/chat/completions` +
    `?api-version=${API_VERSION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: 2000,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${text}`);
  }

  if (!text || !text.trim()) {
    throw new Error('LLM returned empty response body');
  }

  let json: { choices: Array<{ message: { content: string } }> };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`LLM response not valid JSON: ${text.slice(0, 200)}`);
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`LLM response missing content. Body: ${text.slice(0, 200)}`);
  return content;
}
