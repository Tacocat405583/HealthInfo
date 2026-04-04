import { Pill, RefreshCw, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

const refillRequests = [
  {
    id: 1,
    patient: 'Sarah Johnson',
    medication: 'Lisinopril 10mg',
    lastFilled: 'Mar 15, 2026',
    requestedDate: 'Apr 3, 2026',
    pharmacy: 'CVS Pharmacy — Main St',
    status: 'pending',
  },
  {
    id: 2,
    patient: 'Marcus Rivera',
    medication: 'Metformin 500mg',
    lastFilled: 'Mar 10, 2026',
    requestedDate: 'Apr 2, 2026',
    pharmacy: 'Walgreens — Oak Ave',
    status: 'pending',
  },
];

const activePrescriptions = [
  { patient: 'Sarah Johnson',  medication: 'Lisinopril',    dosage: '10mg',  sig: 'Once daily',          refills: 2, written: 'Jan 15, 2026' },
  { patient: 'Sarah Johnson',  medication: 'Atorvastatin',  dosage: '20mg',  sig: 'Once daily at bedtime',refills: 3, written: 'Feb 1, 2026'  },
  { patient: 'Marcus Rivera',  medication: 'Metformin',     dosage: '500mg', sig: 'Twice daily with meals',refills: 1, written: 'Dec 10, 2025' },
  { patient: 'Linda Park',     medication: 'Albuterol',     dosage: '90mcg', sig: 'As needed',            refills: 5, written: 'Nov 5, 2025'  },
  { patient: 'Tom Wheeler',    medication: 'Rosuvastatin',  dosage: '10mg',  sig: 'Once daily',           refills: 2, written: 'Mar 1, 2026'  },
  { patient: 'Diana Flores',   medication: 'Fluticasone',   dosage: '250mcg',sig: 'Twice daily',          refills: 3, written: 'Jan 10, 2026' },
];

export function Prescriptions() {
  const [requests, setRequests] = useState(refillRequests);

  const handleRefill = (id: number, approved: boolean) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: approved ? 'approved' : 'denied' } : r))
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Prescriptions</h2>
          <p className="text-muted-foreground">Manage prescriptions and refill requests</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm">
          <Plus className="w-4 h-4" />
          New Prescription
        </button>
      </div>

      {/* Refill requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Refill Requests</h3>
          <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
            {requests.filter((r) => r.status === 'pending').length} pending
          </span>
        </div>

        {requests.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">No pending refill requests</p>
          </div>
        )}

        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{req.patient}</p>
                    <p className="text-sm text-muted-foreground">{req.medication}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last filled: {req.lastFilled} · Pharmacy: {req.pharmacy}
                    </p>
                    <p className="text-xs text-muted-foreground">Requested: {req.requestedDate}</p>
                  </div>
                </div>

                {req.status === 'pending' ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRefill(req.id, true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRefill(req.id, false)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-destructive text-destructive rounded-lg hover:bg-destructive/5 transition-colors text-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Deny
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                    req.status === 'approved'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {req.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active prescriptions table */}
      <div>
        <h3 className="text-foreground mb-4">Active Prescriptions</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Patient</div>
            <div>Medication</div>
            <div>Dosage / Sig</div>
            <div>Refills</div>
            <div>Written</div>
          </div>
          {activePrescriptions.map((rx, i) => (
            <div
              key={i}
              className={`grid grid-cols-5 gap-4 px-5 py-4 items-center ${
                i !== activePrescriptions.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm text-foreground truncate">{rx.patient}</p>
              </div>
              <p className="text-sm text-foreground">{rx.medication}</p>
              <div>
                <p className="text-sm text-foreground">{rx.dosage}</p>
                <p className="text-xs text-muted-foreground">{rx.sig}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                rx.refills <= 1 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                {rx.refills} left
              </span>
              <p className="text-sm text-muted-foreground">{rx.written}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
