import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { chat } from './llmClient';
import { buildSystemPrompt, buildUserPrompt, type AIMode } from './prompts';
import { getFallback, type AIInsight } from './fallbackData';

interface Props {
  /** Unique key — when this changes, panel resets (e.g. switching between records) */
  id: string | number;
  /** Human-readable label shown in the header, e.g. "Lipid Panel" */
  label: string;
  /** Controls which system prompt and fallback to use */
  mode: AIMode;
  /** Pre-serialized context string sent to the LLM as the record content */
  context: string;
}

export function RecordAIPanel({ id, label, mode, context }: Props) {
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setConsented(true);
    try {
      const system = buildSystemPrompt(mode);
      const user = buildUserPrompt(context);
      const raw = await chat({ system, user });
      const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleaned) as { summary: string[]; glossary: Array<{ term: string; definition: string }> };
      if (!Array.isArray(parsed.summary) || !Array.isArray(parsed.glossary)) {
        throw new Error('Unexpected response shape');
      }
      setInsight({ ...parsed, isFallback: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[RecordAIPanel] LLM call failed, using fallback:', err);
      setLastError(msg);
      setInsight(getFallback(label, mode));
    } finally {
      setLoading(false);
    }
  };

  const regenerate = () => {
    setInsight(null);
    run();
  };

  const modeLabel = mode === 'medication' ? 'Explain this medication' : mode === 'doctor-lab' ? 'AI Clinical Summary' : 'Explain this result';

  // Reset when id changes (different record opened)
  // We use key on the parent in each page to handle this, but also reset state defensively
  return (
    <div
      key={id}
      className="mt-3 border border-primary/20 rounded-xl bg-primary/5 overflow-hidden"
    >
      {/* Header — always visible */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium text-primary flex-1">AI Summary</span>
        {insight && !loading && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle AI panel"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          {/* State 1: Pre-consent opt-in */}
          {!consented && !loading && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get a plain-English explanation of this {mode === 'medication' ? 'medication' : 'result'} — including what the values mean and a glossary of medical terms.
              </p>
              <div className="text-xs text-muted-foreground/80 bg-background border border-border rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">Before you click:</p>
                <p>• This record is sent to our AI provider once to generate your summary.</p>
                <p>• Your data is not stored by the AI provider.</p>
                <p>• AI summaries are informational only — not medical advice.</p>
              </div>
              <button
                onClick={run}
                className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {modeLabel}
              </button>
            </div>
          )}

          {/* State 2: Loading */}
          {loading && (
            <div className="space-y-2 py-2">
              <div className="h-3 bg-primary/10 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-primary/10 rounded animate-pulse w-full" />
              <div className="h-3 bg-primary/10 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-primary/10 rounded animate-pulse w-2/3 mt-4" />
              <div className="h-3 bg-primary/10 rounded animate-pulse w-full" />
            </div>
          )}

          {/* State 3: Result */}
          {insight && !loading && (
            <div className="space-y-4">
              {/* Fallback notice */}
              {insight.isFallback && (
                <div className="flex flex-col gap-1 text-xs bg-background border border-border rounded-lg p-2">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Live AI unavailable — showing pre-written summary for this record type.</span>
                  </div>
                  {lastError && (
                    <p className="text-destructive font-mono break-all pl-5">{lastError}</p>
                  )}
                </div>
              )}

              {/* Summary */}
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Summary</p>
                <ul className="space-y-1.5">
                  {insight.summary.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Glossary */}
              {insight.glossary.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Medical Terms</p>
                  <div className="space-y-2">
                    {insight.glossary.map((g, i) => (
                      <div key={i} className="bg-background border border-border rounded-lg p-3">
                        <p className="text-xs font-semibold text-primary mb-0.5">{g.term}</p>
                        <p className="text-xs text-muted-foreground">{g.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer + regenerate */}
              <div className="flex items-center justify-between pt-1 border-t border-primary/10">
                <p className="text-xs text-muted-foreground/70 italic">
                  For informational use only — not medical advice.
                </p>
                <button
                  onClick={regenerate}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
