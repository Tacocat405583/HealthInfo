import { useState } from 'react';
import { User } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from '../../app/components/Sidebar';
import { Dashboard } from '../../app/components/Dashboard';
import { Appointments } from '../../app/components/Appointments';
import { TestResults } from '../../app/components/TestResults';
import { Medications } from '../../app/components/Medications';
import { Notes } from '../../app/components/Notes';
import { MedicalRecords } from '../../app/components/MedicalRecords';
import { Privacy } from '../../app/components/Privacy';
import { useApp } from '../../app/context/AppContext';
import { useWallet } from '../../hooks/useWallet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../app/components/ui/dialog';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';

// A name looks like a wallet short-address when it matches "0x????…????"
function isDefaultName(name: string | undefined) {
  return !name || /^0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}$/.test(name);
}

export default function PatientApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [nameInput, setNameInput] = useState('');
  const { currentPatientId, patients, updatePatientName } = useApp();
  const { isConnected } = useWallet();

  const currentPatient = patients.find((p) => p.id === currentPatientId);
  const showNameDialog = isConnected && !!currentPatient && isDefaultName(currentPatient.name);

  function handleSetName() {
    const trimmed = nameInput.trim();
    if (!trimmed || !currentPatientId) return;
    updatePatientName(currentPatientId, trimmed);
    setNameInput('');
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':    return <Dashboard onTabChange={setActiveTab} />;
      case 'appointments': return <Appointments />;
      case 'results':      return <TestResults />;
      case 'notes':        return <Notes />;
      case 'medications':  return <Medications />;
      case 'records':      return <MedicalRecords />;
      case 'privacy':      return <Privacy />;
      case 'tracking':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-foreground mb-2">Health Tracking</h2>
              <p className="text-muted-foreground">Monitor your health metrics over time</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-muted-foreground">Health tracking feature coming soon...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="size-full flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </main>
      </div>

      {/* Name setup dialog — shown once for new accounts */}
      <Dialog open={showNameDialog} onOpenChange={() => {}}>
        <DialogContent
          // Prevent closing by clicking outside or pressing Escape
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Welcome to HealthPortal!</DialogTitle>
            <DialogDescription className="text-center">
              Your account has been created. What should we call you?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder="Your full name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={handleSetName}
              disabled={!nameInput.trim()}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
