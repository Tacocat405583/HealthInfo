import { FileText, Loader2, Lock, Plus, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';
import { RecordCategory } from '../../../types/health';
import type { LabOrder } from '../../../types/collections';
import {
  useCollection,
  useAddToCollection,
  useUpdateInCollection,
} from '../../../hooks/useCollection';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';

type FilterTab = 'pending-review' | 'reviewed' | 'all';

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'pending-review', label: 'Needs Review' },
  { id: 'reviewed',       label: 'Reviewed' },
  { id: 'all',            label: 'All Orders' },
];

interface NewOrderForm {
  test: string;
  patientName: string;
  urgent: boolean;
}

export function LabOrders() {
  const { address, isConnected } = useWallet();
  const { isReady, initKeys, isInitializing } = useEncryption();

  const { data: orders = [], isLoading } = useCollection<LabOrder>(
    address ?? null,
    RecordCategory.Labs,
    { enabled: isConnected && isReady },
  );

  const { add, isAdding } = useAddToCollection<LabOrder>();
  const { update, isUpdating } = useUpdateInCollection<LabOrder>();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending-review');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewOrderForm>({ test: '', patientName: '', urgent: false });

  const filtered = orders.filter((o) =>
    activeFilter === 'all' ? true : o.status === activeFilter,
  );

  const pendingCount = orders.filter((o) => o.status === 'pending-review').length;

  const submitOrder = async () => {
    if (!address || !form.test.trim()) return;
    const newOrder: LabOrder = {
      id: `lab_${Date.now()}`,
      orderedByAddress: address,
      orderedByName: 'Dr. (me)',
      test: form.test.trim(),
      ordered: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      resulted: null,
      status: 'pending-review',
      urgent: form.urgent,
      items: [],
    };
    await add({ patient: address, category: RecordCategory.Labs, item: newOrder });
    setShowForm(false);
    setForm({ test: '', patientName: '', urgent: false });
  };

  const markReviewed = async (order: LabOrder) => {
    if (!address) return;
    await update({
      patient: address,
      category: RecordCategory.Labs,
      item: { ...order, status: 'reviewed' },
    });
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Lab Orders</h2>
          <p className="text-muted-foreground">Review incoming results and manage orders</p>
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
          <h2 className="text-foreground mb-2">Lab Orders</h2>
          <p className="text-muted-foreground">Review incoming results and manage orders</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Lab Orders</h2>
          <p className="text-muted-foreground">Review incoming results and manage orders</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Order'}
        </button>
      </div>

      {/* New Order form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-foreground font-medium">New Lab Order</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Test Name</label>
              <input
                value={form.test}
                onChange={(e) => setForm((f) => ({ ...f, test: e.target.value }))}
                placeholder="e.g. Complete Blood Count"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Patient Name</label>
              <input
                value={form.patientName}
                onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.urgent}
              onChange={(e) => setForm((f) => ({ ...f, urgent: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">Mark as urgent</span>
          </label>
          <button
            onClick={() => void submitOrder()}
            disabled={isAdding || !form.test.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Order
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeFilter === tab.id
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
            {tab.id === 'pending-review' && pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-destructive text-white rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lab cards */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading lab orders…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">
            {activeFilter === 'pending-review' ? 'No orders needing review' : 'No lab orders'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((lab) => (
            <div key={lab.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-foreground font-medium">{lab.test}</p>
                        {lab.urgent && (
                          <span className="text-xs px-1.5 py-0.5 bg-destructive text-white rounded-full">Urgent</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Ordered: {lab.ordered}</p>
                      {lab.resulted && (
                        <p className="text-xs text-muted-foreground mt-0.5">Resulted: {lab.resulted}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lab.status === 'pending-review' && lab.items.length > 0 && (
                      <button
                        onClick={() => void markReviewed(lab)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-60 text-sm"
                      >
                        {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Mark Reviewed
                      </button>
                    )}
                    {lab.status === 'reviewed' && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">Reviewed</span>
                    )}
                  </div>
                </div>
              </div>

              {lab.items.length > 0 ? (
                <div className="p-5 bg-muted/30 space-y-2">
                  {lab.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          item.status === 'normal' ? 'bg-primary/10' : 'bg-destructive/10'
                        }`}>
                          {item.status === 'normal'
                            ? <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            : <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                          }
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Range: {item.range}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'normal'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : lab.status === 'pending-review' ? (
                <div className="p-4 bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">Awaiting results from lab…</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
