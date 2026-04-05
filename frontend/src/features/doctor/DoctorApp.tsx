import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, ChevronLeft } from 'lucide-react';
import { useApp } from '../../app/context/AppContext';
import { DoctorHeader } from './components/DoctorHeader';
import { DoctorSidebar } from './components/DoctorSidebar';
import { DoctorDashboard } from './components/DoctorDashboard';
import { Patients } from './components/Patients';
import { Schedule } from './components/Schedule';
import { LabOrders } from './components/LabOrders';
import { Prescriptions } from './components/Prescriptions';
import { Authorization } from './components/Authorization';
import { ClinicalNotes } from './components/ClinicalNotes';

export default function DoctorApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { currentDoctorId, setCurrentDoctorId, doctors } = useApp();
  const navigate = useNavigate();

  // ── Doctor selection screen ──────────────────────────────────────────────────
  if (!currentDoctorId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Provider Sign In</h2>
            <p className="text-muted-foreground">Select your account to continue</p>
          </div>

          <div className="space-y-3">
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => setCurrentDoctorId(doctor.id)}
                className="w-full flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-md transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main portal ──────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':     return <DoctorDashboard onTabChange={setActiveTab} />;
      case 'patients':      return <Patients />;
      case 'schedule':      return <Schedule />;
      case 'labs':          return <LabOrders />;
      case 'prescriptions': return <Prescriptions />;
      case 'authorization': return <Authorization />;
      case 'notes':         return <ClinicalNotes />;
      default:              return <DoctorDashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="size-full flex flex-col bg-background">
      <DoctorHeader />
      <div className="flex-1 flex overflow-hidden">
        <DoctorSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
