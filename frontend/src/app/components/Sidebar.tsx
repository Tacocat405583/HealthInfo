import { Calendar, FileText, Pill, Home, TestTube, StickyNote, ShieldCheck } from 'lucide-react';

const menuItems = [
  { icon: Home, label: 'Dashboard', id: 'dashboard' },
  { icon: Calendar, label: 'Appointments', id: 'appointments' },
  { icon: TestTube, label: 'Test Results', id: 'results' },
  { icon: StickyNote, label: 'Notes', id: 'notes' },
  { icon: Pill, label: 'Medications', id: 'medications' },
  { icon: FileText, label: 'Medical Records', id: 'records' },
  { icon: ShieldCheck, label: 'Privacy', id: 'privacy' },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="bg-sidebar border-r border-sidebar-border w-64 p-4 flex flex-col gap-2">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
              ? 'bg-primary text-white'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="flex-1 text-left">{item.label}</span>
        </button>
      ))}
    </aside>
  );
}
