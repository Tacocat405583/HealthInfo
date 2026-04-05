import { createContext, useContext, useState, ReactNode } from 'react';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  lastVisit: string;
  nextAppointment?: string;
  doctors: string[]; // Array of doctor IDs treating this patient
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
  assignedDoctorId: string; // Doctor who should handle this request
}

export interface Notification {
  id: string;
  userId: string; // Doctor or patient ID
  type: 'authorization_request' | 'authorization_approved' | 'authorization_denied' | 'medication_request' | 'medication_approved' | 'medication_denied';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string; // ID of related request
}

interface AppContextType {
  currentDoctorId: string;
  setCurrentDoctorId: (id: string) => void;
  currentPatientId: string;
  setCurrentPatientId: (id: string) => void;
  doctors: Doctor[];
  patients: Patient[];
  testResults: TestResult[];
  authorizationRequests: AuthorizationRequest[];
  medicationRequests: MedicationRequest[];
  notifications: Notification[];
  addAuthorizationRequest: (request: Omit<AuthorizationRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateAuthorizationRequest: (id: string, status: 'approved' | 'denied', denialReason?: string) => void;
  addMedicationRequest: (request: Omit<MedicationRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateMedicationRequest: (id: string, status: 'approved' | 'denied', denialReason?: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  getUnreadNotificationCount: (userId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentDoctorId, setCurrentDoctorId] = useState('doctor1');
  const [currentPatientId, setCurrentPatientId] = useState('patient1');

  const [doctors] = useState<Doctor[]>([
    {
      id: 'doctor1',
      name: 'Dr. James Chen',
      specialty: 'Primary Care',
      email: 'james.chen@healthportal.com',
    },
    {
      id: 'doctor2',
      name: 'Dr. Sarah Martinez',
      specialty: 'Cardiology',
      email: 'sarah.martinez@healthportal.com',
    },
  ]);

  const [patients] = useState<Patient[]>([
    {
      id: 'patient1',
      name: 'Sarah Johnson',
      age: 34,
      gender: 'Female',
      bloodType: 'A+',
      lastVisit: '2024-03-15',
      nextAppointment: '2024-04-22',
      doctors: ['doctor1', 'doctor2'],
    },
    {
      id: 'patient2',
      name: 'Michael Brown',
      age: 45,
      gender: 'Male',
      bloodType: 'O+',
      lastVisit: '2024-03-10',
      doctors: ['doctor1'],
    },
    {
      id: 'patient3',
      name: 'Emily Davis',
      age: 28,
      gender: 'Female',
      bloodType: 'B-',
      lastVisit: '2024-03-18',
      doctors: ['doctor2'],
    },
  ]);

  const [testResults] = useState<TestResult[]>([
    {
      id: 'test1',
      patientId: 'patient1',
      doctorId: 'doctor1',
      type: 'Complete Blood Count',
      date: '2024-03-15',
      result: 'Normal',
      notes: 'All values within normal range',
    },
    {
      id: 'test2',
      patientId: 'patient1',
      doctorId: 'doctor2',
      type: 'Echocardiogram',
      date: '2024-03-14',
      result: 'Mild mitral valve prolapse',
      notes: 'Follow-up recommended in 6 months',
    },
    {
      id: 'test3',
      patientId: 'patient1',
      doctorId: 'doctor2',
      type: 'ECG',
      date: '2024-03-14',
      result: 'Normal sinus rhythm',
    },
    {
      id: 'test4',
      patientId: 'patient2',
      doctorId: 'doctor1',
      type: 'Lipid Panel',
      date: '2024-03-10',
      result: 'Elevated LDL',
      notes: 'Recommend dietary changes and follow-up in 3 months',
    },
  ]);

  const [authorizationRequests, setAuthorizationRequests] = useState<AuthorizationRequest[]>([]);
  const [medicationRequests, setMedicationRequests] = useState<MedicationRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addAuthorizationRequest = (request: Omit<AuthorizationRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: AuthorizationRequest = {
      ...request,
      id: `auth_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setAuthorizationRequests(prev => [...prev, newRequest]);

    // Create notification for target doctor
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      userId: request.targetDoctorId,
      type: 'authorization_request',
      title: 'New Authorization Request',
      message: `${request.requestingDoctorName} is requesting access to ${request.patientName}'s records`,
      read: false,
      createdAt: new Date().toISOString(),
      relatedId: newRequest.id,
    };
    setNotifications(prev => [...prev, notification]);
  };

  const updateAuthorizationRequest = (id: string, status: 'approved' | 'denied', denialReason?: string) => {
    setAuthorizationRequests(prev =>
      prev.map(req =>
        req.id === id ? { ...req, status, denialReason } : req
      )
    );

    // Find the request to get details for notification
    const request = authorizationRequests.find(req => req.id === id);
    if (request) {
      // Create notification for requesting doctor
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        userId: request.requestingDoctorId,
        type: status === 'approved' ? 'authorization_approved' : 'authorization_denied',
        title: status === 'approved' ? 'Authorization Approved' : 'Authorization Denied',
        message: status === 'approved'
          ? `${request.targetDoctorName} approved your request to access ${request.patientName}'s records`
          : `${request.targetDoctorName} denied your request to access ${request.patientName}'s records${denialReason ? `: ${denialReason}` : ''}`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: id,
      };
      setNotifications(prev => [...prev, notification]);
    }
  };

  const addMedicationRequest = (request: Omit<MedicationRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: MedicationRequest = {
      ...request,
      id: `med_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setMedicationRequests(prev => [...prev, newRequest]);

    // Create notification for assigned doctor
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      userId: request.assignedDoctorId,
      type: 'medication_request',
      title: 'New Medication Request',
      message: `${request.patientName} is requesting ${request.medication}`,
      read: false,
      createdAt: new Date().toISOString(),
      relatedId: newRequest.id,
    };
    setNotifications(prev => [...prev, notification]);
  };

  const updateMedicationRequest = (id: string, status: 'approved' | 'denied', denialReason?: string) => {
    setMedicationRequests(prev =>
      prev.map(req =>
        req.id === id ? { ...req, status, denialReason } : req
      )
    );

    // Find the request to get details for notification
    const request = medicationRequests.find(req => req.id === id);
    if (request) {
      // Create notification for patient
      const notification: Notification = {
        id: `notif_${Date.now()}`,
        userId: request.patientId,
        type: status === 'approved' ? 'medication_approved' : 'medication_denied',
        title: status === 'approved' ? 'Medication Request Approved' : 'Medication Request Denied',
        message: status === 'approved'
          ? `Your request for ${request.medication} has been approved`
          : `Your request for ${request.medication} has been denied${denialReason ? `: ${denialReason}` : ''}`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: id,
      };
      setNotifications(prev => [...prev, notification]);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllNotificationsAsRead = (userId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.userId === userId ? { ...notif, read: true } : notif
      )
    );
  };

  const getUnreadNotificationCount = (userId: string) => {
    return notifications.filter(notif => notif.userId === userId && !notif.read).length;
  };

  return (
    <AppContext.Provider
      value={{
        currentDoctorId,
        setCurrentDoctorId,
        currentPatientId,
        setCurrentPatientId,
        doctors,
        patients,
        testResults,
        authorizationRequests,
        medicationRequests,
        notifications,
        addAuthorizationRequest,
        updateAuthorizationRequest,
        addMedicationRequest,
        updateMedicationRequest,
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
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
