
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import LandingPage from "./pages/LandingPage";
import PatientApp from "./app/App";
import DoctorApp from "./features/doctor/DoctorApp";
import { AppProvider } from "./app/context/AppContext";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/patient" element={<PatientApp />} />
        <Route path="/doctor" element={<DoctorApp />} />
      </Routes>
    </BrowserRouter>
  </AppProvider>
);
