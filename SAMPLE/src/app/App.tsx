import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Appointments } from './components/Appointments';
import { TestResults } from './components/TestResults';
import { Messages } from './components/Messages';
import { Medications } from './components/Medications';
import { Notes } from './components/Notes';
import { MedicalRecords } from './components/MedicalRecords';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <Appointments />;
      case 'results':
        return <TestResults />;
      case 'messages':
        return <Messages />;
      case 'notes' :
        return <Notes />;
      case 'medications':
        return <Medications />;
      case 'records':
        return <MedicalRecords />;
      default:
        return <Dashboard />;
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
    </div>
  );
}