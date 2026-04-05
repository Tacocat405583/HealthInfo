import { AlertCircle, Loader2, Lock, ShieldCheck, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { RecordCategory, AccessLevel, RECORD_CATEGORY_LABELS, ACCESS_LEVEL_LABELS } from '../../../types/health';
import type { GrantInfo } from '../../../types/health';
import { useGrants, useRevokeAccess, useGrantAccess } from '../../../hooks/useAccess';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';

export function Authorization() {
  const { address, isConnected } = useWallet();
  const { isReady, initKeys, isInitializing } = useEncryption();

  // Grants for the connected wallet as a patient
  const { data: grants = [], isLoading } = useGrants(address ?? null);
  const { revokeAccess, isRevoking } = useRevokeAccess();
  const { grantAccess, isGranting, grantError } = useGrantAccess();

  const [grantProvider, setGrantProvider] = useState('');
  const [grantCategory, setGrantCategory] = useState<RecordCategory>(RecordCategory.Dental);
  const [grantLevel, setGrantLevel] = useState<AccessLevel.ReadOnly | AccessLevel.ReadWrite>(AccessLevel.ReadOnly);
  const [showGrantForm, setShowGrantForm] = useState(false);

  // Group grants by provider
  const grantsByProvider: Record<string, GrantInfo[]> = {};
  for (const g of grants) {
    if (!grantsByProvider[g.provider]) grantsByProvider[g.provider] = [];
    grantsByProvider[g.provider].push(g);
  }

  const handleRevoke = async (provider: string, category: RecordCategory) => {
    if (!window.confirm(`Revoke access to ${RECORD_CATEGORY_LABELS[category]}?`)) return;
    await revokeAccess({ provider, category });
  };

  const handleGrant = async () => {
    if (!grantProvider.trim()) return;
    await grantAccess({ provider: grantProvider.trim(), category: grantCategory, level: grantLevel });
    setShowGrantForm(false);
    setGrantProvider('');
  };

  const ALL_CATEGORIES = Object.values(RecordCategory).filter((v) => typeof v === 'number') as RecordCategory[];

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Authorization</h2>
          <p className="text-muted-foreground">Manage provider access to your health records</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Wallet not connected</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Authorization</h2>
          <p className="text-muted-foreground">Manage provider access to your health records</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Encryption not activated</p>
          <button
            onClick={() => void initKeys()}
            disabled={isInitializing}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isInitializing ? 'Activating…' : 'Activate Encryption'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-foreground mb-2">Authorization</h2>
          <p className="text-muted-foreground">Manage provider access to health records on-chain</p>
        </div>
        <button
          onClick={() => setShowGrantForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm"
        >
          <ShieldCheck className="w-4 h-4" />
          Grant Access
        </button>
      </div>

      {/* Grant form */}
      {showGrantForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-foreground font-medium">Grant Provider Access</h3>
          {grantError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {(grantError as Error).message}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Provider Wallet Address</label>
              <input
                value={grantProvider}
                onChange={(e) => setGrantProvider(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                value={grantCategory}
                onChange={(e) => setGrantCategory(Number(e.target.value) as RecordCategory)}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{RECORD_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Access Level</label>
              <select
                value={grantLevel}
                onChange={(e) => setGrantLevel(Number(e.target.value) as AccessLevel.ReadOnly | AccessLevel.ReadWrite)}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={AccessLevel.ReadOnly}>Read Only</option>
                <option value={AccessLevel.ReadWrite}>Read &amp; Write</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleGrant()}
              disabled={isGranting || !grantProvider.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
            >
              {isGranting && <Loader2 className="w-4 h-4 animate-spin" />}
              Grant Access
            </button>
            <button
              onClick={() => setShowGrantForm(false)}
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current grants */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold">Active Provider Grants</h3>
          <span className="ml-auto text-sm text-muted-foreground">{grants.length} total</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading grants from chain…
          </div>
        ) : Object.keys(grantsByProvider).length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <ShieldX className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">No providers have been granted access</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grantsByProvider).map(([provider, provGrants]) => (
              <div key={provider} className="bg-background border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground font-mono">{provider}</p>
                </div>
                <div className="space-y-2">
                  {provGrants.map((g) => (
                    <div
                      key={`${g.provider}-${g.category}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">{RECORD_CATEGORY_LABELS[g.category]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${g.level === AccessLevel.ReadWrite
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                          }`}>
                          {ACCESS_LEVEL_LABELS[g.level]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(g.grantedAt * 1000).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => void handleRevoke(g.provider, g.category)}
                          disabled={isRevoking}
                          className="flex items-center gap-1 text-xs px-2 py-1 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 disabled:opacity-40"
                        >
                          <ShieldX className="w-3 h-3" />
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          All grants are stored on-chain. Revoking access removes the provider's ability to
          decrypt your records. Existing data they downloaded cannot be revoked retroactively.
        </p>
      </div>
    </div>
  );
}
