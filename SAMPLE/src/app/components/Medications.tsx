import { AlertCircle, Pill, RefreshCw } from 'lucide-react';
import { RecordAIPanel } from '../../ai/RecordAIPanel';

export function Medications() {
  const medications = [
    {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      prescribedBy: 'Dr. Sarah Martinez',
      startDate: 'Jan 15, 2026',
      refillsLeft: 2,
      nextRefill: 'Apr 15, 2026',
      instructions: 'Take in the morning with water',
    },
    {
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'Once daily at bedtime',
      prescribedBy: 'Dr. Sarah Martinez',
      startDate: 'Feb 1, 2026',
      refillsLeft: 3,
      nextRefill: 'May 1, 2026',
      instructions: 'Take at bedtime',
    },
    {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily with meals',
      prescribedBy: 'Dr. James Chen',
      startDate: 'Dec 10, 2025',
      refillsLeft: 1,
      nextRefill: 'Apr 10, 2026',
      instructions: 'Take with breakfast and dinner',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Your Medications</h2>
        <p className="text-muted-foreground">Manage your prescriptions and refills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Pill className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-foreground mb-1">Active Medications</h3>
          <p className="text-2xl text-foreground">3</p>
          <p className="text-sm text-muted-foreground mt-2">Currently prescribed</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
            <RefreshCw className="w-5 h-5 text-secondary" />
          </div>
          <h3 className="text-foreground mb-1">Refills Available</h3>
          <p className="text-2xl text-foreground">6</p>
          <p className="text-sm text-muted-foreground mt-2">Total across all medications</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <h3 className="text-foreground mb-1">Refills Needed</h3>
          <p className="text-2xl text-foreground">1</p>
          <p className="text-sm text-muted-foreground mt-2">Within 2 weeks</p>
        </div>
      </div>

      <div className="space-y-4">
        {medications.map((med, index) => {
          const context = [
            `Medication: ${med.name} ${med.dosage}`,
            `Frequency: ${med.frequency}`,
            `Instructions: ${med.instructions}`,
            `Prescribed by: ${med.prescribedBy}`,
            `Start date: ${med.startDate}`,
          ].join('\n');

          return (
            <div key={index} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1">{med.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{med.dosage} - {med.frequency}</p>
                    <p className="text-xs text-muted-foreground">Prescribed by {med.prescribedBy}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs ${
                  med.refillsLeft <= 1
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {med.refillsLeft} refills left
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Started</p>
                  <p className="text-sm text-foreground">{med.startDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Next Refill</p>
                  <p className="text-sm text-foreground">{med.nextRefill}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                  <p className="text-sm text-foreground">{med.instructions}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                  Request Refill
                </button>
                <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors">
                  Set Reminder
                </button>
              </div>

              {/* AI Panel — explain this medication to the patient */}
              <RecordAIPanel
                key={index}
                id={index}
                label={med.name}
                mode="medication"
                context={context}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
