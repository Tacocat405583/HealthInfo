import { Home, Users, Calendar, TestTube, Pill, ShieldCheck, MessageSquare, StickyNote } from 'lucide-react';

const menuItems = [
  { icon: Home,          label: 'Dashboard',      id: 'dashboard' },
  { icon: Users,         label: 'My Patients',    id: 'patients' },
  { icon: Calendar,      label: 'Schedule',       id: 'schedule' },
  { icon: TestTube,      label: 'Lab Orders',     id: 'labs' },
  { icon: Pill,          label: 'Prescriptions',  id: 'prescriptions' },
  { icon: ShieldCheck,   label: 'Authorization',  id: 'authorization' },
  { icon: MessageSquare, label: 'Messages',       id: 'messages', badge: 5 },
  { icon: StickyNote,    label: 'Clinical Notes', id: 'notes' },
];

interface DoctorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DoctorSidebar({ activeTab, onTabChange }: DoctorSidebarProps) {
  return (
    <aside className="bg-sidebar border-r border-sidebar-border w-64 p-4 flex flex-col gap-2">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            activeTab === item.id
              ? 'bg-primary text-white'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === item.id
                ? 'bg-white text-primary'
                : 'bg-primary text-white'
            }`}>
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </aside>
  );
}
