import { Activity, Calendar, Heart, TrendingUp, Users, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';

export function Dashboard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { currentPatientId, patients, doctors, addMedicationRequest } = useApp();
  const currentPatient = patients.find((p) => p.id === currentPatientId);
  const [showMedRequestDialog, setShowMedRequestDialog] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [medicationReason, setMedicationReason] = useState('');

  const patientDoctors = currentPatient?.doctors
    .map(docId => doctors.find(d => d.id === docId))
    .filter(Boolean) || [];

  const handleSubmitMedRequest = () => {
    if (currentPatient && patientDoctors.length > 0) {
      // Assign to primary care doctor (first in list)
      const primaryDoctor = patientDoctors[0];
      if (primaryDoctor) {
        addMedicationRequest({
          patientId: currentPatientId,
          patientName: currentPatient.name,
          medication: medicationName,
          reason: medicationReason,
          assignedDoctorId: primaryDoctor.id,
        });

        setShowMedRequestDialog(false);
        setMedicationName('');
        setMedicationReason('');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Welcome back, {currentPatient?.name ?? '…'}</h2>
        <p className="text-muted-foreground">Here is your health overview for today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>
          <h3 className="text-foreground mb-1">Next Appointment</h3>
          <p className="text-sm text-muted-foreground">Dr. Martinez - Cardiology</p>
          <p className="text-sm text-primary mt-2">Tomorrow at 2:00 PM</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-secondary" />
            </div>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <h3 className="text-foreground mb-1">Heart Rate</h3>
          <p className="text-2xl text-foreground">72 <span className="text-sm text-muted-foreground">bpm</span></p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-primary" />
            <p className="text-xs text-primary">Normal range</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <h3 className="text-foreground mb-1">Steps Average</h3>
          <p className="text-2xl text-foreground">8,543</p>
          <p className="text-xs text-muted-foreground mt-2">Goal: 10,000 steps</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Care Team */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Care Team
            </h3>
          </div>
          <div className="space-y-3">
            {patientDoctors.map((doctor: any) => (
              <div key={doctor.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-medium">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowMedRequestDialog(true)}
            className="w-full mt-4 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Request Medication
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-foreground mb-4">Recent Test Results</h3>
          <div className="space-y-4">
            {[
              { name: 'Blood Pressure', value: '120/80 mmHg', date: 'Mar 28, 2026', status: 'normal' },
              { name: 'Cholesterol', value: '185 mg/dL', date: 'Mar 15, 2026', status: 'normal' },
              { name: 'Blood Sugar', value: '95 mg/dL', date: 'Mar 15, 2026', status: 'normal' },
            ].map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-foreground">{result.name}</p>
                  <p className="text-sm text-muted-foreground">{result.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-foreground">{result.value}</p>
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {result.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onTabChange?.('results')}
            className="w-full mt-4 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            View all results
          </button>
        </div>
      </div>

      {/* Medication Request Dialog */}
      <Dialog open={showMedRequestDialog} onOpenChange={setShowMedRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Medication</DialogTitle>
            <DialogDescription>
              Submit a request to your primary care physician for a medication prescription or refill.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Medication Name
              </label>
              <Input
                placeholder="e.g., Lisinopril 10mg"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Reason for Request
              </label>
              <Textarea
                placeholder="Explain why you need this medication..."
                value={medicationReason}
                onChange={(e) => setMedicationReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMedRequestDialog(false);
                setMedicationName('');
                setMedicationReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitMedRequest}
              disabled={!medicationName.trim() || !medicationReason.trim()}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
