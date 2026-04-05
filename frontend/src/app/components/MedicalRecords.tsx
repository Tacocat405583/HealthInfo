import {
  Download, FileText, Heart, TestTube, Pill,
  Activity, Brain, Eye, ChevronDown, ChevronUp,
  Lock, Loader2, AlertCircle, Smile, User,
} from 'lucide-react';
import { useState } from 'react';
import { RecordCategory } from '../../types/health';
import type { ClinicalNote } from '../../types/collections';
import { useRecord, useRecordPointer } from '../../hooks/useRecords';
import { localGet } from '../../services/localCollection';
import { useWallet } from '../../hooks/useWallet';
import { useEncryption } from '../../providers/EncryptionProvider';

// ─── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<number, { label: string; icon: React.ElementType; colorClass: string }> = {
  [RecordCategory.Dental]: { label: 'Dental', icon: Smile, colorClass: 'text-blue-500' },
  [RecordCategory.Cardiology]: { label: 'Cardiology', icon: Heart, colorClass: 'text-red-500' },
  [RecordCategory.Urology]: { label: 'Urology', icon: Activity, colorClass: 'text-purple-500' },
  [RecordCategory.Primary]: { label: 'Primary Care', icon: FileText, colorClass: 'text-green-500' },
  [RecordCategory.Pharmacy]: { label: 'Pharmacy', icon: Pill, colorClass: 'text-orange-500' },
  [RecordCategory.Labs]: { label: 'Lab Orders', icon: TestTube, colorClass: 'text-cyan-500' },
  [RecordCategory.Imaging]: { label: 'Imaging', icon: Eye, colorClass: 'text-violet-500' },
  [RecordCategory.MentalHealth]: { label: 'Mental Health', icon: Brain, colorClass: 'text-pink-500' },
};

// Scheduling (8) is internal — not shown in this view
const DISPLAYED_CATEGORIES: RecordCategory[] = [
  RecordCategory.Dental,
  RecordCategory.Cardiology,
  RecordCategory.Urology,
  RecordCategory.Primary,
  RecordCategory.Pharmacy,
  RecordCategory.Labs,
  RecordCategory.Imaging,
];

// ─── RecordDetail — rendered only when the row is expanded ────────────────────

function RecordDetail({ patientAddress, category }: {
  patientAddress: string;
  category: RecordCategory;
}) {
  const { record, isLoading, error } = useRecord(patientAddress, category);

  if (isLoading) return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      Decrypting record…
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 text-destructive text-sm py-2">
      <AlertCircle className="w-4 h-4" />
      Failed to decrypt: {(error as Error).message}
    </div>
  );

  if (!record) return null;

  // Decode bytes to string
  const text = new TextDecoder().decode(record.data);

  // Try to parse as JSON array
  let items: unknown[] = [];
  let isJson = true;
  try {
    const parsed: unknown = JSON.parse(text);
    items = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    isJson = false;
  }

  if (!isJson) {
    return (
      <pre className="text-xs text-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto">
        {text}
      </pre>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No entries in this category yet.</p>;
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {items.map((item, i) => (
        <div key={i} className="bg-card rounded-lg p-3 border border-border">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ patientAddress, category, isExpanded, onToggle }: {
  patientAddress: string;
  category: RecordCategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  const { data: pointer, isLoading: pointerLoading } = useRecordPointer(patientAddress, category);

  // Fetch record (only active when expanded; hook itself gates on keypair)
  const { record } = useRecord(
    isExpanded ? patientAddress : null,
    category,
  );

  // localStorage entries written by doctors
  const localEntries = localGet<ClinicalNote>(patientAddress, category);
  const hasLocal = localEntries.length > 0;
  const hasOnChain = Boolean(pointer?.cid);

  // While checking chain, show a skeleton
  if (pointerLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
        <div className="h-4 bg-muted rounded w-36" />
      </div>
    );
  }

  // Hide if nothing to show
  if (!hasOnChain && !hasLocal) return null;

  function handleDownload() {
    if (!record) return;
    const blob = new Blob([record.data as BlobPart], { type: record.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.label.replace(/\s+/g, '_')}_record.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${meta.colorClass}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-foreground font-medium">{meta.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasOnChain
              ? <span className="font-mono">CID: {pointer!.cid.slice(0, 20)}…</span>
              : <span>{localEntries.length} record{localEntries.length !== 1 ? 's' : ''}</span>
            }
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {record && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-accent transition-colors text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30 px-5 py-4 space-y-4">
          {/* On-chain / IPFS entries */}
          {hasOnChain && <RecordDetail patientAddress={patientAddress} category={category} />}

          {/* localStorage entries from doctors */}
          {hasLocal && (
            <div className="space-y-2">
              {localEntries.map((entry) => (
                <div key={entry.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {entry.authorName}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MedicalRecords() {
  const { address, isConnected } = useWallet();
  const { isReady, initKeys, isInitializing } = useEncryption();
  const [expanded, setExpanded] = useState<RecordCategory | null>(null);

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Medical Records</h2>
          <p className="text-muted-foreground">Access and download your complete health history</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Wallet not connected</p>
          <p className="text-sm text-muted-foreground">Connect your wallet to view your medical records</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Medical Records</h2>
          <p className="text-muted-foreground">Access and download your complete health history</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Encryption not activated</p>
          <p className="text-sm text-muted-foreground">
            Activate encryption to decrypt and view your records
          </p>
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
      <div>
        <h2 className="text-foreground mb-2">Medical Records</h2>
        <p className="text-muted-foreground">
          Your encrypted health records — stored on IPFS, indexed on-chain
        </p>
      </div>

      <div className="space-y-3">
        {DISPLAYED_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat}
            patientAddress={address}
            category={cat}
            isExpanded={expanded === cat}
            onToggle={() => setExpanded(expanded === cat ? null : cat)}
          />
        ))}
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Only categories with existing records are shown. Your data is encrypted end-to-end —
          only you and providers you have explicitly authorized can read it.
        </p>
      </div>
    </div>
  );
}
