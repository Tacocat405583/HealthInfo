import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Appointments } from './components/Appointments';
import { TestResults } from './components/TestResults';
import { Messages } from './components/Messages';
import { Medications } from './components/Medications';
import { Notes } from './components/Notes';

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
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-foreground mb-2">Medical Records</h2>
              <p className="text-muted-foreground">Access your complete medical history</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-muted-foreground">Medical records feature coming soon...</p>
            </div>
          </div>
        );
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