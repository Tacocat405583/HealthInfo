import { Bell, ChevronLeft, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router';

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="mr-1 p-1.5 hover:bg-accent rounded-lg transition-colors"
          title="Back to home"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-2 h-3 border-2 border-white border-t-0 rounded-b-sm"></div>
          </div>
        </div>
        <div>
          <h1 className="text-foreground">HealthVault</h1>
          <p className="text-sm text-muted-foreground">Your health, simplified</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-accent rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </button>
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm text-foreground">Sarah Johnson</span>
        </button>
      </div>
    </header>
  );
}
