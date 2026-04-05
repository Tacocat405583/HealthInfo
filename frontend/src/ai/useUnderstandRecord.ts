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
 * Deep runtime validation of the LLM's parsed JSON response.
 * Verifies both the top-level shape AND the types of each item, to catch
 * malformed outputs like `summary: [123, null]` that would otherwise break
 * the UI at render time.
 */
function isRecordInsightShape(
  value: unknown,
): value is { summary: string[]; glossary: GlossaryItem[] } {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  if (!Array.isArray(v.summary)) return false
  if (!v.summary.every((s) => typeof s === 'string')) return false

  if (!Array.isArray(v.glossary)) return false
  if (
    !v.glossary.every(
      (g) =>
        g !== null &&
        typeof g === 'object' &&
        typeof (g as GlossaryItem).term === 'string' &&
        typeof (g as GlossaryItem).definition === 'string',
    )
  ) {
    return false
  }

  return true
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
    gcTime: 30 * 60 * 1000, // Keep cache for 30 min after unmount
    queryFn: async (): Promise<RecordInsight> => {
      if (!record) throw new Error('No record provided')

      // Wrap the ENTIRE flow (extraction + LLM call + parse) so any unexpected
      // exception — including extractText throwing on an unsupported codec —
      // converts to a fallback instead of propagating as an unhandled rejection.
      try {
        const text = await extractText(record)
        if (!text) {
          // Unsupported file type (image, binary)
          return {
            summary: ['This file type cannot be analyzed automatically.'],
            glossary: [],
            isFallback: true,
          }
        }

        const system = buildSystemPrompt(record.category)
        const user = buildUserPrompt(text)
        const raw = await chat({ system, user })

        // Strip potential code fences the model may add despite instructions
        const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
        const parsed = JSON.parse(cleaned) as unknown

        // Deep validation — shape AND item types. Malformed LLM output
        // (e.g. summary: [123, null]) would otherwise leak into the UI.
        if (!isRecordInsightShape(parsed)) {
          throw new Error('LLM response shape invalid')
        }

        return { ...parsed, isFallback: false }
      } catch (err) {
        // HIPAA/GDPR: the error object may carry the prompt or decrypted
        // record content (many LLM clients embed the request body in error
        // messages). Log only a safe summary in production; keep full details
        // in dev where devtools stay on the developer's machine.
        const safeMsg = err instanceof Error ? err.message : 'unknown error'
        if (import.meta.env.DEV) {
          console.error('AI summary failed, using fallback:', err)
        } else {
          console.error(`AI summary failed, using fallback: ${safeMsg}`)
        }
        return { ...getFallback(record.category), isFallback: true }
      }
    },
  })
}
