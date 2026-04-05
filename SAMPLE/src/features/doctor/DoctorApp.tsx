import { useState } from 'react';
import { DoctorHeader } from './components/DoctorHeader';
import { DoctorSidebar } from './components/DoctorSidebar';
import { DoctorDashboard } from './components/DoctorDashboard';
import { Patients } from './components/Patients';
import { Schedule } from './components/Schedule';
import { LabOrders } from './components/LabOrders';
import { Prescriptions } from './components/Prescriptions';
import { Authorization } from './components/Authorization';
import { DoctorMessages } from './components/DoctorMessages';
import { ClinicalNotes } from './components/ClinicalNotes';

export default function DoctorApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':     return <DoctorDashboard />;
      case 'patients':      return <Patients />;
      case 'schedule':      return <Schedule />;
      case 'labs':          return <LabOrders />;
      case 'prescriptions': return <Prescriptions />;
      case 'authorization': return <Authorization />;
      case 'messages':      return <DoctorMessages />;
      case 'notes':         return <ClinicalNotes />;
      default:              return <DoctorDashboard />;
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
