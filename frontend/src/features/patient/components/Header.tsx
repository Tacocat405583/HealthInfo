import { ChevronLeft, KeyRound, User, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';
import { useApp } from '../../../app/context/AppContext';

export function Header() {
  const navigate = useNavigate();
  const { shortAddress } = useWallet();
  const { isReady, isInitializing, initKeys } = useEncryption();
  const { currentPatientId, patients } = useApp();
  const currentPatient = patients.find((p) => p.id === currentPatientId);

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
          <h1 className="text-foreground">HealthPortal</h1>
          <p className="text-sm text-muted-foreground">Your health, simplified</p>
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
        <button className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm text-foreground">{currentPatient?.name ?? shortAddress ?? 'Patient'}</span>
        </button>
      </div>
    </header>
  );
}
