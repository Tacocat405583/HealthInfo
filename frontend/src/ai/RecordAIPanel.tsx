import { useEffect, useState } from 'react'
import { Bot, Sparkles, ShieldCheck, RefreshCw } from 'lucide-react'
import { RECORD_CATEGORY_LABELS, type DecryptedRecord } from '../types/health'
import { useUnderstandRecord } from './useUnderstandRecord'

interface Props {
  record: DecryptedRecord | null
}

/**
 * AI summary panel for a decrypted medical record.
 *
 * Privacy-first design: the initial state shows a "Generate AI Summary" button.
 * Nothing is sent to the AI provider until the user explicitly clicks it. This
 * aligns with HealthVault's end-to-end encryption narrative — the user is in
 * control of when their plaintext leaves the device.
 *
 * State machine:
 *   1. Initial   — button + description + disclaimer (no network calls)
 *   2. Loading   — skeleton bullets (isLoading = first fetch, isFetching = refetch)
 *   3. Success   — summary + glossary + Regenerate + disclaimer
 *   4. Error     — message + Retry button
 *   5. Fallback  — cached pre-written summary (shown when live call fails)
 *
 * Drop-in usage in a record viewer:
 *   <div className="flex">
 *     <YourRecordViewer record={record} />
 *     <RecordAIPanel record={record} />
 *   </div>
 *
 * When the user switches records, `consented` is reset to false via a
 * useEffect watching `record.pointer.cid` — each distinct record requires a
 * fresh explicit opt-in.
 */
export function RecordAIPanel({ record }: Props) {
  // User must explicitly click "Generate" before any data leaves the browser.
  const [consented, setConsented] = useState(false)

  // Reset consent when the user switches to a different record.
  // Placing `key={cid}` on the component's own JSX root does NOT trigger a
  // remount — keys only take effect from a parent's perspective. So we
  // explicitly reset state here instead.
  useEffect(() => {
    setConsented(false)
  }, [record?.pointer.cid])

  const {
    data: insight,
    isLoading,
    isFetching, // true during refetch too, not just first load
    error,
    refetch,
  } = useUnderstandRecord(record, consented)

  if (!record) return null

  // Use refetch() instead of queryClient.invalidateQueries() — more explicit
  // and unambiguous. refetch forces queryFn to run again regardless of staleTime.
  const regenerate = () => {
    void refetch()
  }

  // Skeleton should show during first load AND during refetch from Regenerate
  const showSkeleton = consented && (isLoading || isFetching)

  return (
    <aside
      className="w-full max-w-sm border-l border-gray-200 bg-white p-6 flex flex-col gap-5"
    >
      <header className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-600" strokeWidth={2} />
        <h2 className="text-lg font-semibold">AI Summary</h2>
        <span className="ml-auto text-xs text-gray-400">
          {RECORD_CATEGORY_LABELS[record.category]}
        </span>
      </header>

      {/* ─── State 1: Initial — require explicit opt-in ─────────────── */}
      {!consented && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-600 leading-relaxed">
            Want a plain-English summary of this record?
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 leading-relaxed">
            <strong className="block mb-1 text-gray-700">
              What happens when you click:
            </strong>
            • This decrypted record is sent to our AI provider once
            <br />
            • You get a 3–5 bullet summary + a glossary of medical terms
            <br />
            • Your data is not stored by the provider
            <br />
            • Takes 1–2 seconds
          </div>
          <button
            onClick={() => setConsented(true)}
            className="w-full py-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            Generate AI Summary
          </button>
        </div>
      )}

      {/* ─── State 2: Loading (first fetch OR refetch) ──────────────── */}
      {showSkeleton && <SkeletonBullets />}

      {/* ─── State 3: Error ─────────────────────────────────────────── */}
      {consented && !showSkeleton && error && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
          <button
            onClick={regenerate}
            className="self-start flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={2.5} />
            Retry
          </button>
        </div>
      )}

      {/* ─── State 4: Success / fallback ────────────────────────────── */}
      {consented && !showSkeleton && insight && (
        <>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              What this record says
            </h3>
            <ul className="space-y-2 text-sm text-gray-800">
              {insight.summary.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
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
            disabled={isFetching}
            className="text-xs text-gray-500 hover:text-blue-600 self-start flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`}
              strokeWidth={2.5}
            />
            Regenerate
          </button>
        </>
      )}

      {/* Privacy footer — always visible in all states */}
      <footer className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed flex gap-2">
        <ShieldCheck
          className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
          strokeWidth={2}
        />
        <span>
          <strong className="text-gray-600">AI is opt-in.</strong> Your decrypted
          record is only sent to our AI provider when you click Generate, and is
          not stored by them. All blockchain and IPFS data remains end-to-end
          encrypted.
        </span>
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
