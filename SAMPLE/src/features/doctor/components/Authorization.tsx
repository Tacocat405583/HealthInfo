import { useState } from 'react';
import { useApp } from '../../../app/context/AppContext';
import { Clock, CheckCircle, XCircle, FileText, AlertCircle } from 'lucide-react';
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

export function Authorization() {
  const {
    currentDoctorId,
    doctors,
    authorizationRequests,
    updateAuthorizationRequest,
  } = useApp();

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [showDenialDialog, setShowDenialDialog] = useState(false);

  const currentDoctor = doctors.find(d => d.id === currentDoctorId);

  // Requests where current doctor is the target (needs to approve/deny)
  const incomingRequests = authorizationRequests.filter(
    req => req.targetDoctorId === currentDoctorId
  );

  // Requests made by current doctor
  const outgoingRequests = authorizationRequests.filter(
    req => req.requestingDoctorId === currentDoctorId
  );

  const handleApprove = (requestId: string) => {
    updateAuthorizationRequest(requestId, 'approved');
  };

  const handleDenyClick = (requestId: string) => {
    setSelectedRequest(requestId);
    setShowDenialDialog(true);
  };

  const handleDenyConfirm = () => {
    if (selectedRequest) {
      updateAuthorizationRequest(selectedRequest, 'denied', denialReason);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Authorization Management</h2>
        <p className="text-muted-foreground">
          Manage access requests to view patient records across providers
        </p>
      </div>

      {/* Incoming Requests */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold">Incoming Requests</h3>
          <span className="ml-auto text-sm text-muted-foreground">
            {incomingRequests.filter(r => r.status === 'pending').length} pending
          </span>
        </div>

        {incomingRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No authorization requests received
          </p>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-background border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {request.requestingDoctorName}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Requesting access to <strong>{request.patientName}</strong>'s records
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Requested on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.status === 'denied' && request.denialReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <strong className="text-red-900">Denial Reason:</strong>
                        <p className="text-red-800 mt-1">{request.denialReason}</p>
                      </div>
                    )}
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
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Requests */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold">My Requests</h3>
          <span className="ml-auto text-sm text-muted-foreground">
            {outgoingRequests.filter(r => r.status === 'pending').length} pending
          </span>
        </div>

        {outgoingRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            You haven't made any authorization requests yet
          </p>
        ) : (
          <div className="space-y-3">
            {outgoingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-background border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">
                        Request to {request.targetDoctorName}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Access to <strong>{request.patientName}</strong>'s records
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Requested on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.status === 'denied' && request.denialReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <strong className="text-red-900">Denial Reason:</strong>
                        <p className="text-red-800 mt-1">{request.denialReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Denial Dialog */}
      <Dialog open={showDenialDialog} onOpenChange={setShowDenialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Authorization Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this request. This will be shared with the requesting physician.
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
