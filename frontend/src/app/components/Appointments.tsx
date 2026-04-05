import { Calendar, Clock, List, MapPin, Video } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarView } from './CalendarView';

const appointments = [
  {
    id: 1,
    doctor: 'Dr. Sarah Martinez',
    specialty: 'Cardiology',
    date: 'April 5, 2026',
    time: '2:00 PM',
    location: 'Building A, Room 305',
    type: 'In-person',
  },
  {
    id: 2,
    doctor: 'Dr. James Chen',
    specialty: 'Primary Care',
    date: 'April 12, 2026',
    time: '10:30 AM',
    location: 'Video Call',
    type: 'Telehealth',
  },
  {
    id: 3,
    doctor: 'Dr. Emily Roberts',
    specialty: 'Dermatology',
    date: 'April 18, 2026',
    time: '3:15 PM',
    location: 'Building C, Room 120',
    type: 'In-person',
  },
];

export function Appointments() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  function handleJoinCall(doctor: string) {
    toast.info(`Connecting to your telehealth visit with ${doctor}…`, {
      description: 'Your provider will join shortly.',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Your Appointments</h2>
          <p className="text-muted-foreground">Manage your upcoming healthcare visits</p>
        </div>
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

      {view === 'calendar' ? (
        <CalendarView appointments={appointments} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-foreground">{appointment.doctor}</h3>
                        {appointment.type === 'Telehealth' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs">
                            <Video className="w-3 h-3" />
                            Telehealth
                          </span>
                        )}
                      </div>
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
                  {appointment.type === 'Telehealth' && (
                    <button
                      onClick={() => handleJoinCall(appointment.doctor)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      Join Call
                    </button>
                  )}
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
    </div>
  );
}
