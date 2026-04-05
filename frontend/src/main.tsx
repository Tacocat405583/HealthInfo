import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider as BackendProvider } from './providers/AppProvider'
import { AppProvider } from './app/context/AppContext'
import LandingPage from './pages/LandingPage'
import PatientApp from './features/patient/PatientApp'
import DoctorApp from './features/doctor/DoctorApp'
import { FaceAuthGate } from './components/FaceAuthGate'
import { Toaster } from './app/components/ui/sonner'
import { useFaceAuth } from './hooks/useFaceAuth'
import { useEncryption } from './providers/EncryptionProvider'
import { useWallet } from './hooks/useWallet'
import './styles/index.css'

/** Wraps protected routes — shows wallet connect → face auth → app in order. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, connect, isConnecting } = useWallet()
  const { isVerified: faceVerified } = useFaceAuth()
  const { isReady: keysReady } = useEncryption()

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Connect your wallet to continue</h2>
          <button
            onClick={() => void connect()}
            disabled={isConnecting}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {isConnecting ? 'Connecting…' : 'Connect MetaMask'}
          </button>
        </div>
      </div>
    )
  }

  if (!faceVerified || !keysReady) {
    return <FaceAuthGate />
  }

  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <BackendProvider>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/patient" element={<ProtectedRoute><PatientApp /></ProtectedRoute>} />
          <Route path="/doctor" element={<ProtectedRoute><DoctorApp /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="bottom-right" />
    </AppProvider>
  </BackendProvider>
)
