import { Calendar, Clock, List, MapPin, Video, User, Bell } from 'lucide-react';
import { useState } from 'react';
import { DoctorCalendarView } from './DoctorCalendarView';
import { useApp } from '../../../app/context/AppContext';

const appointments = [
  {
    id: 1,
    date: 'April 4, 2026',
    time: '9:00 AM',
    duration: '30 min',
    patient: 'Sarah Johnson',
    age: 34,
    type: 'Follow-up',
    mode: 'in-person',
    location: 'Exam Room 3',
    reason: 'Blood pressure check',
    status: 'completed',
  },
  {
    id: 2,
    date: 'April 4, 2026',
    time: '10:30 AM',
    duration: '60 min',
    patient: 'Marcus Rivera',
    age: 52,
    type: 'New Patient',
    mode: 'in-person',
    location: 'Exam Room 1',
    reason: 'Initial consultation — diabetes management',
    status: 'in-progress',
  },
  {
    id: 3,
    date: 'April 4, 2026',
    time: '1:00 PM',
    duration: '30 min',
    patient: 'Linda Park',
    age: 67,
    type: 'Follow-up',
    mode: 'telehealth',
    location: 'Video Call',
    reason: 'COPD medication review',
    status: 'scheduled',
  },
  {
    id: 4,
    date: 'April 4, 2026',
    time: '2:30 PM',
    duration: '30 min',
    patient: 'Tom Wheeler',
    age: 45,
    type: 'Follow-up',
    mode: 'in-person',
    location: 'Exam Room 2',
    reason: 'Cholesterol labs review',
    status: 'scheduled',
  },
  {
    id: 5,
    date: 'April 4, 2026',
    time: '4:00 PM',
    duration: '60 min',
    patient: 'Diana Flores',
    age: 29,
    type: 'Annual Exam',
    mode: 'in-person',
    location: 'Exam Room 1',
    reason: 'Annual wellness visit',
    status: 'scheduled',
  },
  {
    id: 6,
    date: 'April 7, 2026',
    time: '9:30 AM',
    duration: '30 min',
    patient: 'Priya Nair',
    age: 38,
    type: 'Follow-up',
    mode: 'telehealth',
    location: 'Video Call',
    reason: 'Anxiety medication check-in',
    status: 'scheduled',
  },
  {
    id: 7,
    date: 'April 7, 2026',
    time: '11:00 AM',
    duration: '45 min',
    patient: 'Carlos Mendes',
    age: 60,
    type: 'Follow-up',
    mode: 'in-person',
    location: 'Exam Room 2',
    reason: 'Arthritis pain management review',
    status: 'scheduled',
  },
  {
    id: 8,
    date: 'April 10, 2026',
    time: '2:00 PM',
    duration: '60 min',
    patient: 'George Kwan',
    age: 71,
    type: 'Follow-up',
    mode: 'in-person',
    location: 'Exam Room 3',
    reason: 'Cardiac follow-up post-procedure',
    status: 'scheduled',
  },
];

const statusStyles: Record<string, string> = {
  completed:     'bg-primary/10 text-primary',
  'in-progress': 'bg-secondary text-secondary-foreground border border-border',
  scheduled:     'bg-muted text-muted-foreground',
};

export function Schedule() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const { appointmentRequests, currentDoctorId } = useApp();

  const pendingRequests = appointmentRequests.filter(
    r => r.doctorId === currentDoctorId && r.status === 'pending'
  );

  const todayAppts = appointments.filter((a) => a.date === 'April 4, 2026');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-foreground mb-2">Schedule</h2>
          <p className="text-muted-foreground">Today's appointments — April 4, 2026</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Appointment Requests ({pendingRequests.length})</p>
          </div>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{req.patientName}</p>
                <p className="text-xs text-muted-foreground">Requested: {req.preferredDate} — {req.reason}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' ? (
        <DoctorCalendarView appointments={appointments} />
      ) : (
        <>
          {/* Day summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Today', value: String(todayAppts.length) },
              { label: 'Completed',   value: String(todayAppts.filter((a) => a.status === 'completed').length) },
              { label: 'Remaining',   value: String(todayAppts.filter((a) => a.status !== 'completed').length) },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Timeline — today only */}
          <div className="space-y-4">
            {todayAppts.map((appt) => (
              <div
                key={appt.id}
                className={`bg-card border rounded-xl p-6 hover:shadow-md transition-shadow ${
                  appt.status === 'in-progress' ? 'border-primary/30' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 flex-shrink-0 text-center">
                    <p className="text-sm font-semibold text-foreground">{appt.time}</p>
                    <p className="text-xs text-muted-foreground">{appt.duration}</p>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-foreground font-medium">{appt.patient}</p>
                      <span className="text-xs text-muted-foreground">Age {appt.age}</span>
                      {appt.mode === 'telehealth' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-secondary/30 text-foreground rounded-full">
                          <Video className="w-3 h-3" /> Telehealth
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{appt.type} · {appt.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {appt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {appt.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[appt.status]}`}>
                      {appt.status}
                    </span>
                    {appt.status === 'scheduled' && (
                      <button className="text-xs px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-accent transition-colors">
                        {appt.mode === 'telehealth' ? 'Start Call' : 'Check In'}
                      </button>
                    )}
                    {appt.status === 'in-progress' && (
                      <button className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                        Open Chart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
