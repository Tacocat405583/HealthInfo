import { CheckCircle, Clock, Loader2, Lock, Pill, Plus, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../../app/context/AppContext';
import { RecordCategory } from '../../../types/health';
import type { Prescription } from '../../../types/collections';
import {
  useCollection,
  useAddToCollection,
} from '../../../hooks/useCollection';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../app/components/ui/dialog';
import { Button } from '../../../app/components/ui/button';
import { Textarea } from '../../../app/components/ui/textarea';

interface NewRxForm {
  patientName: string;
  medication: string;
  dosage: string;
  sig: string;
  refills: number;
}

export function Prescriptions() {
  const { address, isConnected } = useWallet();
  const { isReady, initKeys, isInitializing } = useEncryption();
  const { currentDoctorId, medicationRequests, updateMedicationRequest } = useApp();

  // Doctor's prescriptions stored in their own Pharmacy category
  const { data: rxList = [], isLoading } = useCollection<Prescription>(
    address ?? null,
    RecordCategory.Pharmacy,
    { enabled: isConnected && isReady },
  );

  const { add, isAdding } = useAddToCollection<Prescription>();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewRxForm>({
    patientName: '', medication: '', dosage: '', sig: 'Once daily', refills: 3,
  });
  const [showDenialDialog, setShowDenialDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');

  const myRequests = medicationRequests.filter((r) => r.assignedDoctorId === currentDoctorId);
  const pendingRequests = myRequests.filter((r) => r.status === 'pending');
  const activeRxs = rxList.filter((r) => r.status === 'active');

  const submitRx = async () => {
    if (!address || !form.medication.trim()) return;
    const newRx: Prescription = {
      id: `rx_${Date.now()}`,
      prescribedByAddress: address,
      prescribedByName: 'Dr. (me)',
      patientAddress: '',
      patientName: form.patientName.trim(),
      medication: form.medication.trim(),
      dosage: form.dosage.trim(),
      sig: form.sig.trim(),
      refills: form.refills,
      written: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'active',
    };
    await add({ patient: address, category: RecordCategory.Pharmacy, item: newRx });
    setShowForm(false);
    setForm({ patientName: '', medication: '', dosage: '', sig: 'Once daily', refills: 3 });
  };

  const handleApprove = (id: string) => updateMedicationRequest(id, 'approved');
  const handleDenyClick = (id: string) => { setSelectedRequest(id); setShowDenialDialog(true); };
  const handleDenyConfirm = () => {
    if (selectedRequest) {
      updateMedicationRequest(selectedRequest, 'denied', denialReason);
      setShowDenialDialog(false);
      setDenialReason('');
      setSelectedRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs"><Clock className="w-3 h-3" />Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs"><CheckCircle className="w-3 h-3" />Approved</span>;
      case 'denied':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs"><XCircle className="w-3 h-3" />Denied</span>;
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-foreground mb-2">Prescriptions</h2>
          <p className="text-muted-foreground">Manage prescriptions and medication requests</p>
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
      <div className="space-y-8">
        <div>
          <h2 className="text-foreground mb-2">Prescriptions</h2>
          <p className="text-muted-foreground">Manage prescriptions and medication requests</p>
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Prescriptions</h2>
          <p className="text-muted-foreground">Manage prescriptions and medication requests</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Prescription'}
        </button>
      </div>

      {/* New Prescription form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-foreground font-medium">New Prescription</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Patient Name</label>
              <input
                value={form.patientName}
                onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                placeholder="Patient name"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Medication</label>
              <input
                value={form.medication}
                onChange={(e) => setForm((f) => ({ ...f, medication: e.target.value }))}
                placeholder="e.g. Lisinopril"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dosage</label>
              <input
                value={form.dosage}
                onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g. 10mg"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sig (directions)</label>
              <input
                value={form.sig}
                onChange={(e) => setForm((f) => ({ ...f, sig: e.target.value }))}
                placeholder="e.g. Once daily"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Refills</label>
              <input
                type="number"
                min={0}
                max={12}
                value={form.refills}
                onChange={(e) => setForm((f) => ({ ...f, refills: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            onClick={() => void submitRx()}
            disabled={isAdding || !form.medication.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
            Write Prescription
          </button>
        </div>
      )}

      {/* Medication Requests from Patients */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Patient Medication Requests</h3>
          <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
            {pendingRequests.length} pending
          </span>
        </div>
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No medication requests</p>
            </div>
          ) : (
            myRequests.map((request) => (
              <div key={request.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Pill className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-foreground font-medium">{request.patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested on {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="ml-8 space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Medication</p>
                        <p className="text-sm text-foreground font-medium">{request.medication}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reason</p>
                        <p className="text-sm text-foreground">{request.reason}</p>
                      </div>
                      {request.status === 'denied' && request.denialReason && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <strong className="text-red-900">Denial Reason:</strong>
                          <p className="text-red-800 mt-1">{request.denialReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => handleApprove(request.id)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDenyClick(request.id)}>Deny</Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active prescriptions */}
      <div>
        <h3 className="text-foreground mb-4">Active Prescriptions</h3>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading prescriptions…
          </div>
        ) : activeRxs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">No active prescriptions</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Patient', 'Medication', 'Dosage', 'Sig', 'Refills', 'Written'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeRxs.map((rx) => (
                  <tr key={rx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{rx.patientName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{rx.medication}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{rx.dosage}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{rx.sig}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{rx.refills} left</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{rx.written}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Denial Dialog */}
      <Dialog open={showDenialDialog} onOpenChange={setShowDenialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Medication Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this request. This will be shared with the patient.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter denial reason..."
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDenialDialog(false); setDenialReason(''); setSelectedRequest(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDenyConfirm}>
              Deny Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
