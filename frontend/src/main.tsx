import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider as BackendProvider } from './providers/AppProvider'
import { AppProvider } from './app/context/AppContext'
import LandingPage from './pages/LandingPage'
import PatientApp from './features/patient/PatientApp'
import DoctorApp from './features/doctor/DoctorApp'
import { Toaster } from './app/components/ui/sonner'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <BackendProvider>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/patient" element={<PatientApp />} />
          <Route path="/doctor" element={<DoctorApp />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="bottom-right" />
    </AppProvider>
  </BackendProvider>
)
