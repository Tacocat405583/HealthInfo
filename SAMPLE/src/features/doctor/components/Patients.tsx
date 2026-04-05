import { Search, User, ChevronRight, ChevronDown, FileText, Lock, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
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
import { Input } from '../../../app/components/ui/input';

export function Patients() {
  const {
    currentDoctorId,
    doctors,
    patients,
    testResults,
    authorizationRequests,
    addAuthorizationRequest,
  } = useApp();

  const [search, setSearch] = useState('');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedDoctorForAuth, setSelectedDoctorForAuth] = useState<string>('');
  const [selectedPatientForAuth, setSelectedPatientForAuth] = useState<string>('');
  const [authReason, setAuthReason] = useState('');

  const currentDoctor = doctors.find(d => d.id === currentDoctorId);

  // Get patients that have current doctor in their doctors list
  const myPatients = patients.filter(p => p.doctors.includes(currentDoctorId));

  const filtered = myPatients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase())
  );

  const togglePatient = (patientId: string) => {
    setExpandedPatient(expandedPatient === patientId ? null : patientId);
  };

  const getPatientTestResults = (patientId: string) => {
    return testResults.filter(test => test.patientId === patientId);
  };

  const getOtherDoctorsForPatient = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return [];
    return patient.doctors
      .filter(docId => docId !== currentDoctorId)
      .map(docId => doctors.find(d => d.id === docId))
      .filter(Boolean);
  };

  const hasRequestedAuthorization = (patientId: string, targetDoctorId: string) => {
    return authorizationRequests.find(
      req =>
        req.requestingDoctorId === currentDoctorId &&
        req.targetDoctorId === targetDoctorId &&
        req.patientId === patientId
    );
  };

  const handleRequestAuthorization = (patientId: string, targetDoctorId: string) => {
    setSelectedPatientForAuth(patientId);
    setSelectedDoctorForAuth(targetDoctorId);
    setShowAuthDialog(true);
  };

  const submitAuthRequest = () => {
    const patient = patients.find(p => p.id === selectedPatientForAuth);
    const targetDoctor = doctors.find(d => d.id === selectedDoctorForAuth);

    if (patient && targetDoctor && currentDoctor) {
      addAuthorizationRequest({
        requestingDoctorId: currentDoctorId,
        requestingDoctorName: currentDoctor.name,
        targetDoctorId: selectedDoctorForAuth,
        targetDoctorName: targetDoctor.name,
        patientId: selectedPatientForAuth,
        patientName: patient.name,
        reason: authReason,
      });

      setShowAuthDialog(false);
      setAuthReason('');
      setSelectedPatientForAuth('');
      setSelectedDoctorForAuth('');
    }
  };

  const getAuthRequestStatus = (request: any) => {
    if (!request) return null;
    switch (request.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-green-700">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-red-700">
            <XCircle className="w-3 h-3" />
            Denied
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">My Patients</h2>
          <p className="text-muted-foreground">Manage and review your patient roster</p>
        </div>
        <div className="text-sm text-muted-foreground">{myPatients.length} total patients</div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Patient list */}
      <div className="space-y-3">
        {filtered.map((patient) => {
          const patientTests = getPatientTestResults(patient.id);
          const otherDoctors = getOtherDoctorsForPatient(patient.id);
          const isExpanded = expandedPatient === patient.id;

          return (
            <div
              key={patient.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Patient Header */}
              <div
                onClick={() => togglePatient(patient.id)}
                className="p-5 hover:bg-accent/50 transition-colors flex items-center gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium">{patient.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Age {patient.age} · {patient.gender} · Blood Type: {patient.bloodType}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last Visit: {patient.lastVisit}
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border p-5 bg-background space-y-4">
                  {/* Test Results Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Test Results & Records
                    </h4>

                    {/* My Test Results */}
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase">My Records</p>
                      {patientTests.filter(test => test.doctorId === currentDoctorId).length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No records yet</p>
                      ) : (
                        patientTests
                          .filter(test => test.doctorId === currentDoctorId)
                          .map(test => (
                            <div key={test.id} className="bg-card border border-border rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{test.type}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(test.date).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm text-foreground mt-1">
                                    <strong>Result:</strong> {test.result}
                                  </p>
                                  {test.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    {/* Other Doctors' Records */}
                    {otherDoctors.map((otherDoctor: any) => {
                      const otherDoctorTests = patientTests.filter(test => test.doctorId === otherDoctor.id);
                      const authRequest = hasRequestedAuthorization(patient.id, otherDoctor.id);
                      const hasAccess = authRequest?.status === 'approved';

                      return (
                        <div key={otherDoctor.id} className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                              {otherDoctor.name} ({otherDoctor.specialty})
                              {authRequest && getAuthRequestStatus(authRequest)}
                            </p>
                            {!authRequest && otherDoctorTests.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestAuthorization(patient.id, otherDoctor.id)}
                                className="text-xs"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Request Access
                              </Button>
                            )}
                          </div>

                          {otherDoctorTests.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No records</p>
                          ) : hasAccess ? (
                            otherDoctorTests.map(test => (
                              <div key={test.id} className="bg-card border border-border rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{test.type}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(test.date).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-foreground mt-1">
                                      <strong>Result:</strong> {test.result}
                                    </p>
                                    {test.notes && (
                                      <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3">
                              <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm text-foreground">
                                  {otherDoctorTests.length} record(s) from {otherDoctor.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {authRequest?.status === 'pending'
                                    ? 'Authorization request pending...'
                                    : authRequest?.status === 'denied'
                                    ? `Access denied: ${authRequest.denialReason || 'No reason provided'}`
                                    : 'Request authorization to view these records'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground">No patients match your search.</p>
          </div>
        )}
      </div>

      {/* Authorization Request Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Authorization</DialogTitle>
            <DialogDescription>
              Request access to view {patients.find(p => p.id === selectedPatientForAuth)?.name}'s records from{' '}
              {doctors.find(d => d.id === selectedDoctorForAuth)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Reason for Request
            </label>
            <Textarea
              placeholder="Explain why you need access to these records..."
              value={authReason}
              onChange={(e) => setAuthReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAuthDialog(false);
                setAuthReason('');
                setSelectedPatientForAuth('');
                setSelectedDoctorForAuth('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitAuthRequest} disabled={!authReason.trim()}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
