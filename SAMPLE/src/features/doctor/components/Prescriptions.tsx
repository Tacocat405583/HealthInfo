import { Pill, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../../app/context/AppContext';
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

const activePrescriptions = [
  { patient: 'Sarah Johnson',  medication: 'Lisinopril',    dosage: '10mg',  sig: 'Once daily',           refills: 2, written: 'Jan 15, 2026' },
  { patient: 'Sarah Johnson',  medication: 'Atorvastatin',  dosage: '20mg',  sig: 'Once daily at bedtime', refills: 3, written: 'Feb 1, 2026'  },
  { patient: 'Michael Brown',  medication: 'Metformin',     dosage: '500mg', sig: 'Twice daily with meals', refills: 1, written: 'Dec 10, 2025' },
  { patient: 'Emily Davis',    medication: 'Albuterol',     dosage: '90mcg', sig: 'As needed',              refills: 5, written: 'Nov 5, 2025'  },
];

export function Prescriptions() {
  const { currentDoctorId, medicationRequests, updateMedicationRequest } = useApp();
  const [showDenialDialog, setShowDenialDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');

  // Get medication requests assigned to current doctor
  const myRequests = medicationRequests.filter(req => req.assignedDoctorId === currentDoctorId);
  const pendingRequests = myRequests.filter(req => req.status === 'pending');

  const handleApprove = (requestId: string) => {
    updateMedicationRequest(requestId, 'approved');
  };

  const handleDenyClick = (requestId: string) => {
    setSelectedRequest(requestId);
    setShowDenialDialog(true);
  };

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
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs">
            <XCircle className="w-3 h-3" />
            Denied
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Prescriptions</h2>
          <p className="text-muted-foreground">Manage prescriptions and medication requests</p>
        </div>
      </div>

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
              <div
                key={request.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
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
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDenyClick(request.id)}
                      >
                        Deny
                      </Button>
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

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Medication
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Dosage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sig
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Refills
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Written
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activePrescriptions.map((rx, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">{rx.patient}</td>
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
      </div>

      {/* Denial Dialog */}
      <Dialog open={showDenialDialog} onOpenChange={setShowDenialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Medication Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this medication request. This will be shared with the patient.
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
            <Button variant="outline" onClick={() => {
              setShowDenialDialog(false);
              setDenialReason('');
              setSelectedRequest(null);
            }}>
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
