import { CheckCircle, Clock, ShieldCheck, ShieldX, User, XCircle, ShieldOff, Plus } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useWallet } from '../../hooks/useWallet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';

export function Privacy() {
  const { address, isConnected } = useWallet();
  const { currentPatientId, patientAccessRequests, respondToPatientAccess, revokePatientAccess, grantAccessDirectly, doctors } = useApp();
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Privacy</h2>
          <p className="text-muted-foreground">Control which providers can access your records</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <ShieldX className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Wallet not connected</p>
        </div>
      </div>
    );
  }

  const myRequests = patientAccessRequests.filter((r) => r.patientId === currentPatientId);
  const pending = myRequests.filter((r) => r.status === 'pending');

  // Most recent request per doctor (for approved/revoked display)
  const latestByDoctor = new Map<string, typeof myRequests[0]>();
  for (const req of [...myRequests].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    latestByDoctor.set(req.doctorId, req);
  }
  const approvedRequests = [...latestByDoctor.values()].filter((r) => r.status === 'approved');
  const declinedRequests = [...latestByDoctor.values()].filter((r) => r.status === 'denied' || r.status === 'revoked');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Privacy &amp; Access Control</h2>
        <p className="text-muted-foreground">
          Review and respond to provider requests to access your health records
        </p>
      </div>

      {/* Pending requests */}
      <div className="space-y-3">
        <h3 className="text-foreground font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          Pending Requests
          {pending.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
              {pending.length}
            </span>
          )}
        </h3>

        {pending.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No pending access requests</p>
          </div>
        ) : (
          pending.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-medium">{req.doctorName}</p>
                  <p className="text-sm text-muted-foreground">{req.doctorSpecialty}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">Reason: </span>
                    {req.reason}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToPatientAccess(req.id, 'approved')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Access
                </button>
                <button
                  onClick={() => respondToPatientAccess(req.id, 'denied')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/5 transition-colors text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approved providers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Providers with Access
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setSelectedDoctorId(''); setShowGrantDialog(true); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Grant Access
          </Button>
        </div>

        {approvedRequests.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">No providers have been granted access yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvedRequests.map((req) => {
              const doctor = doctors.find((d) => d.id === req.doctorId);
              return (
                <div key={req.doctorId} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{doctor?.name ?? req.doctorId}</p>
                    <p className="text-sm text-muted-foreground">{doctor?.specialty}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1 mr-2">
                    <CheckCircle className="w-3 h-3" />
                    Approved {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => revokePatientAccess(req.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive text-destructive rounded-lg hover:bg-destructive/5 transition-colors text-xs"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Denied / revoked */}
      {declinedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-foreground font-semibold flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            Denied / Revoked
          </h3>
          <div className="space-y-2">
            {declinedRequests.map((req) => (
              <div key={req.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 opacity-70">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-medium">{req.doctorName}</p>
                  <p className="text-sm text-muted-foreground">{req.doctorSpecialty}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full">
                  {req.status === 'revoked' ? 'Revoked' : 'Denied'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          You control who can access your health records. Approving a request lets that
          provider view records shared with them. You can be asked again after a denial.
        </p>
      </div>

      {/* Grant access dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Provider Access</DialogTitle>
            <DialogDescription>
              Select a provider to grant them access to your records directly,
              without waiting for them to send a request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {doctors
              .filter((d) => !approvedRequests.some((r) => r.doctorId === d.id))
              .map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => setSelectedDoctorId(doctor.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    selectedDoctorId === doctor.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doctor.name}</p>
                    <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                  </div>
                  {selectedDoctorId === doctor.id && (
                    <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            {doctors.filter((d) => !approvedRequests.some((r) => r.doctorId === d.id)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                All known providers already have access.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>Cancel</Button>
            <Button
              disabled={!selectedDoctorId}
              onClick={() => {
                if (!selectedDoctorId || !currentPatientId) return;
                grantAccessDirectly(selectedDoctorId, currentPatientId);
                setShowGrantDialog(false);
              }}
            >
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
