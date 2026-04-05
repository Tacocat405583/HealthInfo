import { ChevronDown, ChevronLeft, KeyRound, LogOut, RefreshCw, User, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';
import { useApp } from '../../../app/context/AppContext';

export function DoctorHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { shortAddress } = useWallet();
  const { isReady, isInitializing, initKeys } = useEncryption();
  const { currentDoctorId, setCurrentDoctorId, doctors } = useApp();
  const currentDoctor = doctors.find((d) => d.id === currentDoctorId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-2 h-3 border-2 border-white border-t-0 rounded-b-sm"></div>
          </div>
        </div>
        <div>
          <h1 className="text-foreground">HealthPortal</h1>
          <p className="text-sm text-muted-foreground">Provider Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {shortAddress && (
          <span className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-mono flex items-center gap-1.5">
            <Wallet className="w-3 h-3" />
            {shortAddress}
          </span>
        )}
        {!isReady && (
          <button
            onClick={() => void initKeys()}
            disabled={isInitializing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:opacity-90 disabled:opacity-50"
          >
            <KeyRound className="w-3 h-3" />
            {isInitializing ? 'Activating…' : 'Activate Encryption'}
          </button>
        )}
        {/* Profile dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm text-foreground leading-tight">{currentDoctor?.name ?? 'Doctor'}</p>
              <p className="text-xs text-muted-foreground">{currentDoctor?.specialty ?? ''}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground">{currentDoctor?.name ?? 'Doctor'}</p>
                <p className="text-xs text-muted-foreground">{currentDoctor?.specialty} · Provider</p>
              </div>
              <button
                onClick={() => { setOpen(false); setCurrentDoctorId(''); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Switch Doctor
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/'); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
