import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useWeb3 } from '../../providers/Web3Provider';
import { localAdd, localGet } from '../../services/localCollection';
import { RecordCategory } from '../../types/health';

export interface Patient {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  lastVisit: string;
  nextAppointment?: string;
  doctors: string[];
  address: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  address: string;
}

export interface TestResult {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  date: string;
  result: string;
  notes?: string;
}

export interface AuthorizationRequest {
  id: string;
  requestingDoctorId: string;
  requestingDoctorName: string;
  targetDoctorId: string;
  targetDoctorName: string;
  patientId: string;
  patientName: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  denialReason?: string;
  createdAt: string;
}

export interface MedicationRequest {
  id: string;
  patientId: string;
  patientName: string;
  medication: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  denialReason?: string;
  createdAt: string;
  assignedDoctorId: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'authorization_request' | 'authorization_approved' | 'authorization_denied' | 'medication_request' | 'medication_approved' | 'medication_denied';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

// ── Hardcoded doctors (always available, no login) ───────────────────────────
const DOCTORS: Doctor[] = [
  {
    id: 'doctor1',
    name: 'Dr. James Chen',
    specialty: 'Primary Care',
    email: 'james.chen@healthportal.com',
    address: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 'doctor2',
    name: 'Dr. Sarah Martinez',
    specialty: 'Cardiology',
    email: 'sarah.martinez@healthportal.com',
    address: '0x0000000000000000000000000000000000000002',
  },
];

// ── Demo patients seeded for the doctor's view ───────────────────────────────
const DEMO_PATIENTS: Patient[] = [
  {
    id: 'patient_demo1',
    name: 'Michael Brown',
    age: 45,
    gender: 'Male',
    bloodType: 'O+',
    lastVisit: '2024-03-10',
    doctors: ['doctor1', 'doctor2'],
    address: '0x0000000000000000000000000000000000000004',
  },
  {
    id: 'patient_demo2',
    name: 'Emily Davis',
    age: 28,
    gender: 'Female',
    bloodType: 'B-',
    lastVisit: '2024-03-18',
    doctors: ['doctor1', 'doctor2'],
    address: '0x0000000000000000000000000000000000000005',
  },
];

const DEMO_TEST_RESULTS: TestResult[] = [
  {
    id: 'test1',
    patientId: 'patient_demo1',
    doctorId: 'doctor1',
    type: 'Lipid Panel',
    date: '2024-03-10',
    result: 'Elevated LDL',
    notes: 'Recommend dietary changes and follow-up in 3 months',
  },
  {
    id: 'test2',
    patientId: 'patient_demo2',
    doctorId: 'doctor2',
    type: 'Echocardiogram',
    date: '2024-03-18',
    result: 'Normal',
    notes: 'No significant findings',
  },
];

const STORAGE_KEY = 'healthvault_patients';

function loadStoredPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Patient[]) : [];
  } catch {
    return [];
  }
}

function saveStoredPatients(patients: Patient[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  } catch {
    // storage quota exceeded — ignore
  }
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Patient access request (doctor → patient authorization) ──────────────────
export interface PatientAccessRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  createdAt: string;
}

// ── Context type ─────────────────────────────────────────────────────────────
interface AppContextType {
  currentDoctorId: string;
  setCurrentDoctorId: (id: string) => void;
  currentPatientId: string;
  setCurrentPatientId: (id: string) => void;
  walletAddress: string | null;
  userRole: 'patient' | 'doctor' | null;
  setUserRole: (role: 'patient' | 'doctor') => void;
  doctors: Doctor[];
  patients: Patient[];
  testResults: TestResult[];
  authorizationRequests: AuthorizationRequest[];
  medicationRequests: MedicationRequest[];
  patientAccessRequests: PatientAccessRequest[];
  notifications: Notification[];
  addAuthorizationRequest: (request: Omit<AuthorizationRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateAuthorizationRequest: (id: string, status: 'approved' | 'denied', denialReason?: string) => void;
  addMedicationRequest: (request: Omit<MedicationRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateMedicationRequest: (id: string, status: 'approved' | 'denied', denialReason?: string) => void;
  updatePatientName: (patientId: string, name: string) => void;
  addPatientByAddress: (address: string, name: string, doctorId: string) => boolean;
  requestPatientAccess: (doctorId: string, patientId: string, reason: string) => void;
  grantAccessDirectly: (doctorId: string, patientId: string) => void;
  respondToPatientAccess: (requestId: string, status: 'approved' | 'denied') => void;
  revokePatientAccess: (requestId: string) => void;
  getPatientAccessStatus: (doctorId: string, patientId: string) => 'none' | 'pending' | 'approved' | 'denied' | 'revoked';
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  getUnreadNotificationCount: (userId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { address } = useWeb3();
  const [currentDoctorId, setCurrentDoctorId] = useState('');
  const [currentPatientId, setCurrentPatientId] = useState('');
  const [userRole, setUserRole] = useState<'patient' | 'doctor' | null>(null);

  // Registered patients live in localStorage; demo patients are always static.
  const [registeredPatients, setRegisteredPatients] = useState<Patient[]>(loadStoredPatients);
  const patients = [...DEMO_PATIENTS, ...registeredPatients];

  // Prevent processing the same address twice in the same session
  const seenAddresses = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!address) return;
    const lowerAddr = address.toLowerCase();
    if (seenAddresses.current.has(lowerAddr)) return;
    seenAddresses.current.add(lowerAddr);

    setRegisteredPatients((prev) => {
      const existing = prev.find((p) => p.address.toLowerCase() === lowerAddr);
      if (existing) {
        setCurrentPatientId(existing.id);
        return prev;
      }

      // Auto-register new patient
      const newPatient: Patient = {
        id: `patient_${lowerAddr}`,
        name: shortAddress(address),
        lastVisit: new Date().toISOString().split('T')[0],
        doctors: ['doctor1', 'doctor2'],
        address,
      };

      const updated = [...prev, newPatient];
      saveStoredPatients(updated);
      setCurrentPatientId(newPatient.id);

      // Seed a welcome note on first sign-up
      if (localGet(address, RecordCategory.MentalHealth).length === 0) {
        localAdd(address, RecordCategory.MentalHealth, {
          id: 'note_welcome',
          title: 'Welcome to HealthPortal',
          content:
            'Welcome to HealthPortal!\n\nThis is your private health journal. Use this space to track symptoms, questions for your doctor, or any personal health observations. Only you can see what you write here.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return updated;
    });
  }, [address]);

  const [testResults] = useState<TestResult[]>(DEMO_TEST_RESULTS);
  const [authorizationRequests, setAuthorizationRequests] = useState<AuthorizationRequest[]>([]);
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequest[]>([]);
  const [patientAccessRequests, setPatientAccessRequests] = useState<PatientAccessRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addAuthorizationRequest = (request: Omit<AuthorizationRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: AuthorizationRequest = {
      ...request,
      id: `auth_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setAuthorizationRequests((prev) => [...prev, newRequest]);
    setNotifications((prev) => [
      ...prev,
      {
        id: `notif_${Date.now()}`,
        userId: request.targetDoctorId,
        type: 'authorization_request',
        title: 'New Authorization Request',
        message: `${request.requestingDoctorName} is requesting access to ${request.patientName}'s records`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: newRequest.id,
      },
    ]);
  };

  const updateAuthorizationRequest = (id: string, status: 'approved' | 'denied', denialReason?: string) => {
    setAuthorizationRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status, denialReason } : req))
    );
    const request = authorizationRequests.find((req) => req.id === id);
    if (request) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif_${Date.now()}`,
          userId: request.requestingDoctorId,
          type: status === 'approved' ? 'authorization_approved' : 'authorization_denied',
          title: status === 'approved' ? 'Authorization Approved' : 'Authorization Denied',
          message:
            status === 'approved'
              ? `${request.targetDoctorName} approved your request to access ${request.patientName}'s records`
              : `${request.targetDoctorName} denied your request${denialReason ? `: ${denialReason}` : ''}`,
          read: false,
          createdAt: new Date().toISOString(),
          relatedId: id,
        },
      ]);
    }
  };

  const addMedicationRequest = (request: Omit<MedicationRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: MedicationRequest = {
      ...request,
      id: `med_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setMedicationRequests((prev) => [...prev, newRequest]);
    setNotifications((prev) => [
      ...prev,
      {
        id: `notif_${Date.now()}`,
        userId: request.assignedDoctorId,
        type: 'medication_request',
        title: 'New Medication Request',
        message: `${request.patientName} is requesting ${request.medication}`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: newRequest.id,
      },
    ]);
  };

  const updateMedicationRequest = (id: string, status: 'approved' | 'denied', denialReason?: string) => {
    setMedicationRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status, denialReason } : req))
    );
    const request = medicationRequests.find((req) => req.id === id);
    if (request) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif_${Date.now()}`,
          userId: request.patientId,
          type: status === 'approved' ? 'medication_approved' : 'medication_denied',
          title: status === 'approved' ? 'Medication Request Approved' : 'Medication Request Denied',
          message:
            status === 'approved'
              ? `Your request for ${request.medication} has been approved`
              : `Your request for ${request.medication} has been denied${denialReason ? `: ${denialReason}` : ''}`,
          read: false,
          createdAt: new Date().toISOString(),
          relatedId: id,
        },
      ]);
    }
  };

  const updatePatientName = (patientId: string, name: string) => {
    setRegisteredPatients((prev) => {
      const updated = prev.map((p) => (p.id === patientId ? { ...p, name } : p));
      saveStoredPatients(updated);
      return updated;
    });
  };

  const addPatientByAddress = (walletAddress: string, name: string, doctorId: string): boolean => {
    const normalised = walletAddress.trim().toLowerCase();
    const all = [...DEMO_PATIENTS, ...registeredPatients];
    // Already on this doctor's roster?
    const existing = all.find((p) => p.address.toLowerCase() === normalised);
    if (existing) {
      if (existing.doctors.includes(doctorId)) return false; // already added
      // Add doctor to existing patient
      setRegisteredPatients((prev) => {
        const updated = prev.map((p) =>
          p.address.toLowerCase() === normalised
            ? { ...p, doctors: [...p.doctors, doctorId] }
            : p
        );
        saveStoredPatients(updated);
        return updated;
      });
      return true;
    }
    // New patient entry
    const newPatient: Patient = {
      id: walletAddress.trim(),
      name: name.trim() || shortAddress(walletAddress.trim()),
      lastVisit: 'Unknown',
      doctors: [doctorId],
      address: walletAddress.trim(),
    };
    setRegisteredPatients((prev) => {
      const updated = [...prev, newPatient];
      saveStoredPatients(updated);
      return updated;
    });
    return true;
  };

  const grantAccessDirectly = (doctorId: string, patientId: string) => {
    const doctor = DOCTORS.find((d) => d.id === doctorId);
    const patient = [...DEMO_PATIENTS, ...registeredPatients].find((p) => p.id === patientId);
    if (!doctor || !patient) return;
    const req: PatientAccessRequest = {
      id: `pac_${Date.now()}`,
      doctorId,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      patientId,
      patientName: patient.name,
      reason: 'Granted directly by patient',
      status: 'approved',
      createdAt: new Date().toISOString(),
    };
    setPatientAccessRequests((prev) => [...prev, req]);
  };

  const requestPatientAccess = (doctorId: string, patientId: string, reason: string) => {
    const doctor = DOCTORS.find((d) => d.id === doctorId);
    const patient = [...DEMO_PATIENTS, ...registeredPatients].find((p) => p.id === patientId);
    if (!doctor || !patient) return;

    const newReq: PatientAccessRequest = {
      id: `pac_${Date.now()}`,
      doctorId,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      patientId,
      patientName: patient.name,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setPatientAccessRequests((prev) => [...prev, newReq]);
    // Notify the patient
    setNotifications((prev) => [
      ...prev,
      {
        id: `notif_${Date.now()}`,
        userId: patientId,
        type: 'authorization_request',
        title: 'Records Access Request',
        message: `${doctor.name} (${doctor.specialty}) has requested access to your health records.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: newReq.id,
      },
    ]);
  };

  const respondToPatientAccess = (requestId: string, status: 'approved' | 'denied') => {
    setPatientAccessRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );
    const req = patientAccessRequests.find((r) => r.id === requestId);
    if (req) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `notif_${Date.now()}`,
          userId: req.doctorId,
          type: status === 'approved' ? 'authorization_approved' : 'authorization_denied',
          title: status === 'approved' ? 'Records Access Approved' : 'Records Access Denied',
          message:
            status === 'approved'
              ? `${req.patientName} approved your request to access their health records.`
              : `${req.patientName} denied your request to access their health records.`,
          read: false,
          createdAt: new Date().toISOString(),
          relatedId: requestId,
        },
      ]);
    }
  };

  const revokePatientAccess = (requestId: string) => {
    setPatientAccessRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'revoked' as const } : r))
    );
  };

  const getPatientAccessStatus = (
    doctorId: string,
    patientId: string,
  ): 'none' | 'pending' | 'approved' | 'denied' | 'revoked' => {
    const req = patientAccessRequests
      .filter((r) => r.doctorId === doctorId && r.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return req ? req.status : 'none';
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = (userId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );
  };

  const getUnreadNotificationCount = (userId: string) =>
    notifications.filter((n) => n.userId === userId && !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentDoctorId,
        setCurrentDoctorId,
        currentPatientId,
        setCurrentPatientId,
        walletAddress: address,
        userRole,
        setUserRole,
        doctors: DOCTORS,
        patients,
        testResults,
        authorizationRequests,
        medicationRequests,
        patientAccessRequests,
        notifications,
        addAuthorizationRequest,
        updateAuthorizationRequest,
        addMedicationRequest,
        updateMedicationRequest,
        updatePatientName,
        addPatientByAddress,
        requestPatientAccess,
        grantAccessDirectly,
        respondToPatientAccess,
        revokePatientAccess,
        getPatientAccessStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        getUnreadNotificationCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
}
