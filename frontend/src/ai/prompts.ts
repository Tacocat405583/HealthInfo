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

export function buildUserPrompt(recordText: string | null | undefined): string {
  // Defensive null/undefined guard — caller shouldn't pass null but types can lie
  // (e.g., if extractText starts returning null for a new mime type).
  const safeText = recordText ?? ''

  // 8000 chars ≈ 2000 tokens — safe margin below typical model context limits.
  // A typical lab report PDF is far below this. If we ever hit longer docs,
  // extend this layer with chunking (out of scope for hackathon).
  return `Record content (extracted from the file):
---
${safeText.slice(0, 8000)}
---

Generate the summary and glossary.`
}
