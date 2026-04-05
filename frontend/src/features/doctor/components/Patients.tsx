import { Search, User, ChevronRight, ChevronDown, FileText, Lock, Clock, CheckCircle, XCircle, Send, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../../app/context/AppContext';
import { localAdd, localGet } from '../../../services/localCollection';
import { RecordCategory, RECORD_CATEGORY_LABELS } from '../../../types/health';
import type { ClinicalNote } from '../../../types/collections';
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
    patients,
    doctors,
    testResults,
    addPatientByAddress,
    requestPatientAccess,
    getPatientAccessStatus,
  } = useApp();

  const [search, setSearch] = useState('');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addAddress, setAddAddress] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [requestReason, setRequestReason] = useState('');

  // Doctor record creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPatientId, setCreatePatientId] = useState('');
  const [recordCategory, setRecordCategory] = useState<RecordCategory>(RecordCategory.Primary);
  const [recordTitle, setRecordTitle] = useState('');
  const [recordContent, setRecordContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const DOCTOR_CATEGORIES = [
    RecordCategory.Dental,
    RecordCategory.Cardiology,
    RecordCategory.Urology,
    RecordCategory.Primary,
    RecordCategory.Pharmacy,
    RecordCategory.Labs,
    RecordCategory.Imaging,
  ];

  const myPatients = patients.filter((p) => p.doctors.includes(currentDoctorId));
  const filtered = myPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddPatient() {
    const trimmed = addAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      setAddError('Enter a valid Ethereum address (0x…)');
      return;
    }
    const ok = addPatientByAddress(trimmed, addName, currentDoctorId);
    if (!ok) {
      setAddError('This patient is already on your roster.');
      return;
    }
    setShowAddDialog(false);
    setAddAddress('');
    setAddName('');
    setAddError('');
  }

  function openRequestDialog(patientId: string) {
    setSelectedPatientId(patientId);
    setRequestReason('');
    setShowRequestDialog(true);
  }

  function submitRequest() {
    if (!requestReason.trim() || !selectedPatientId) return;
    requestPatientAccess(currentDoctorId, selectedPatientId, requestReason);
    setShowRequestDialog(false);
    setRequestReason('');
    setSelectedPatientId('');
  }

  function openCreateDialog(patientId: string) {
    setCreatePatientId(patientId);
    setRecordCategory(RecordCategory.Primary);
    setRecordTitle('');
    setRecordContent('');
    setShowCreateDialog(true);
  }

  async function submitRecord() {
    if (!recordContent.trim() || !createPatientId) return;
    const doctor = doctors.find((d) => d.id === currentDoctorId);
    const patient = patients.find((p) => p.id === createPatientId);
    if (!patient) return;
    setIsSaving(true);
    try {
      const note: ClinicalNote = {
        id: `rec_${Date.now()}`,
        authorAddress: doctor?.address ?? currentDoctorId,
        authorName: doctor?.name ?? 'Doctor',
        patientAddress: patient.address,
        patientName: patient.name,
        title: recordTitle.trim() || 'Clinical Note',
        content: recordContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localAdd<ClinicalNote>(patient.address, recordCategory, note);
      setShowCreateDialog(false);
      setRecordTitle('');
      setRecordContent('');
      setCreatePatientId('');
    } finally {
      setIsSaving(false);
    }
  }

  function AccessBadge({ status }: { status: ReturnType<typeof getPatientAccessStatus> }) {
    if (status === 'approved') return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
        <CheckCircle className="w-3 h-3" /> Access granted
      </span>
    );
    if (status === 'pending') return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
        <Clock className="w-3 h-3" /> Awaiting patient
      </span>
    );
    if (status === 'denied') return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
        <XCircle className="w-3 h-3" /> Denied
      </span>
    );
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">My Patients</h2>
          <p className="text-muted-foreground">Manage and review your patient roster</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{myPatients.length} total patients</span>
          <Button size="sm" onClick={() => { setAddAddress(''); setAddName(''); setAddError(''); setShowAddDialog(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Patient
          </Button>
        </div>
      </div>

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

      <div className="space-y-3">
        {filtered.map((patient) => {
          const accessStatus = getPatientAccessStatus(currentDoctorId, patient.id);
          const hasAccess = accessStatus === 'approved';
          const isExpanded = expandedPatient === patient.id;
          const myRecords = testResults.filter(
            (t) => t.patientId === patient.id && t.doctorId === currentDoctorId
          );

          return (
            <div key={patient.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header row */}
              <div
                onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                className="p-5 hover:bg-accent/50 transition-colors flex items-center gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-medium">{patient.name}</p>
                    <AccessBadge status={accessStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[
                      patient.age && `Age ${patient.age}`,
                      patient.gender,
                      patient.bloodType && `Blood Type: ${patient.bloodType}`,
                    ].filter(Boolean).join(' · ') || 'Profile not set'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Last Visit: {patient.lastVisit}</p>
                </div>

                {isExpanded
                  ? <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  : <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                }
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border p-5 bg-background space-y-4">
                  {hasAccess ? (
                    <div className="space-y-4">
                      {/* Doctor-created medical records */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Medical Records
                          </h4>
                          <Button size="sm" variant="outline" onClick={() => openCreateDialog(patient.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Create Record
                          </Button>
                        </div>
                        {(() => {
                          const doctorAddr = doctors.find((d) => d.id === currentDoctorId)?.address ?? currentDoctorId;
                          const allRecords = DOCTOR_CATEGORIES.flatMap((cat) =>
                            localGet<ClinicalNote>(patient.address, cat)
                              .filter((n) => n.authorAddress === doctorAddr)
                              .map((n) => ({ ...n, categoryLabel: RECORD_CATEGORY_LABELS[cat] }))
                          ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                          return allRecords.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No records created yet for this patient.</p>
                          ) : (
                            <div className="space-y-2">
                              {allRecords.map((rec) => (
                                <div key={rec.id} className="bg-card border border-border rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-sm font-medium text-foreground">{rec.title}</p>
                                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{rec.categoryLabel}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{new Date(rec.createdAt).toLocaleDateString()}</p>
                                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{rec.content}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Test results from AppContext */}
                      {myRecords.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Test Results ({myRecords.length})
                          </h4>
                          <div className="space-y-2">
                            {myRecords.map((test) => (
                              <div key={test.id} className="bg-card border border-border rounded-lg p-3">
                                <p className="text-sm font-medium text-foreground">{test.type}</p>
                                <p className="text-xs text-muted-foreground">{new Date(test.date).toLocaleDateString()}</p>
                                <p className="text-sm text-foreground mt-1">
                                  <strong>Result:</strong> {test.result}
                                </p>
                                {test.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/50 border border-border rounded-xl p-6 flex flex-col items-center gap-3 text-center">
                      <Lock className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="text-foreground font-medium">
                          {accessStatus === 'pending'
                            ? 'Waiting for patient approval'
                            : accessStatus === 'denied'
                              ? 'Patient denied access'
                              : 'Patient permission required'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {accessStatus === 'none'
                            ? 'You must request permission from the patient before viewing their records.'
                            : accessStatus === 'pending'
                              ? 'Your request has been sent. The patient will be notified to approve.'
                              : 'The patient denied your access request. You may send a new request.'}
                        </p>
                      </div>
                      {(accessStatus === 'none' || accessStatus === 'denied') && (
                        <Button
                          size="sm"
                          onClick={() => openRequestDialog(patient.id)}
                          className="mt-1"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Request Records Access
                        </Button>
                      )}
                    </div>
                  )}
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

      {/* Add patient by address dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); setAddError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient</DialogTitle>
            <DialogDescription>
              Enter the patient's wallet address to add them to your roster.
              They can find their address in MetaMask or at the top of their patient portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Wallet Address</label>
              <Input
                placeholder="0x…"
                value={addAddress}
                onChange={(e) => { setAddAddress(e.target.value); setAddError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPatient()}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g., Jane Smith"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPatient()}
              />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddPatient} disabled={!addAddress.trim()}>Add Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create record dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Clinical Record</DialogTitle>
            <DialogDescription>
              Write a clinical note for{' '}
              <strong>{patients.find((p) => p.id === createPatientId)?.name}</strong>.
              It will appear in their medical records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
              <select
                value={recordCategory}
                onChange={(e) => setRecordCategory(Number(e.target.value) as RecordCategory)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                {DOCTOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{RECORD_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Title</label>
              <Input
                placeholder="e.g., Follow-up Visit Notes"
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Content</label>
              <Textarea
                placeholder="Write your findings, observations, or instructions..."
                value={recordContent}
                onChange={(e) => setRecordContent(e.target.value)}
                className="min-h-[140px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => void submitRecord()} disabled={!recordContent.trim() || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access request dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Records Access</DialogTitle>
            <DialogDescription>
              Your request will be sent to{' '}
              <strong>{patients.find((p) => p.id === selectedPatientId)?.name}</strong> for approval.
              You will not be able to view their records until they approve.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Reason for Request
            </label>
            <Textarea
              placeholder="e.g., Referred for cardiology follow-up..."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={!requestReason.trim()}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
