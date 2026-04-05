import { Calendar, Clock, List, MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { CalendarView } from './CalendarView';
import { useApp } from '../context/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

const upcomingAppointments = [
  {
    id: 1,
    doctor: 'Dr. Sarah Martinez',
    specialty: 'Cardiology',
    date: 'April 5, 2026',
    time: '2:00 PM',
    location: 'Building A, Room 305',
  },
  {
    id: 2,
    doctor: 'Dr. James Chen',
    specialty: 'Primary Care',
    date: 'April 12, 2026',
    time: '10:30 AM',
    location: 'Building B, Room 210',
  },
  {
    id: 3,
    doctor: 'Dr. Emily Roberts',
    specialty: 'Dermatology',
    date: 'April 18, 2026',
    time: '3:15 PM',
    location: 'Building C, Room 120',
  },
];

export function Appointments() {
  const { currentPatientId, patients, doctors, addAppointmentRequest } = useApp();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showDialog, setShowDialog] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const currentPatient = patients.find(p => p.id === currentPatientId);
  const primaryDoctorId = currentPatient?.doctors[0] ?? 'doctor1';
  const primaryDoctor = doctors.find(d => d.id === primaryDoctorId);

  const calendarAppointments = upcomingAppointments.map(a => ({
    ...a,
    type: 'In-person',
  }));

  const handleSubmit = () => {
    if (!preferredDate || !reason) return;
    addAppointmentRequest({
      patientId: currentPatientId,
      patientName: currentPatient?.name ?? 'Patient',
      doctorId: primaryDoctorId,
      preferredDate,
      reason,
    });
    setSubmitted(true);
    setShowDialog(false);
    setPreferredDate('');
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Your Appointments</h2>
          <p className="text-muted-foreground">Manage your upcoming healthcare visits</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule New
          </button>
        </div>
      </div>

      {submitted && (
        <div className="bg-primary/10 border border-primary/20 text-primary rounded-xl px-4 py-3 text-sm">
          Your appointment request has been sent to {primaryDoctor?.name ?? 'your doctor'}. They will confirm shortly.
        </div>
      )}

      {view === 'calendar' ? (
        <CalendarView appointments={calendarAppointments} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground mb-1">{appointment.doctor}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{appointment.specialty}</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{appointment.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{appointment.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted rounded-xl p-6">
            <h3 className="text-foreground mb-4">Past Appointments</h3>
            <div className="space-y-3">
              {[
                { doctor: 'Dr. Michael Lee', specialty: 'Orthopedics', date: 'Mar 22, 2026' },
                { doctor: 'Dr. Lisa Wang', specialty: 'Ophthalmology', date: 'Feb 15, 2026' },
              ].map((past, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg">
                  <div>
                    <p className="text-foreground">{past.doctor}</p>
                    <p className="text-sm text-muted-foreground">{past.specialty}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{past.date}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Request an appointment with {primaryDoctor?.name ?? 'your doctor'}. They will confirm the time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Preferred Date</label>
              <Input
                type="date"
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Reason for Visit</label>
              <Textarea
                placeholder="Describe why you'd like to schedule this appointment..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!preferredDate || !reason.trim()}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
