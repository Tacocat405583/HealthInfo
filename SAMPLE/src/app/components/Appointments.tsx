import { Calendar, Clock, MapPin, Plus, Video } from 'lucide-react';

export function Appointments() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">Your Appointments</h2>
          <p className="text-muted-foreground">Manage your upcoming healthcare visits</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
          Schedule New
        </button>
      </div>

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

              <div className="flex flex-col gap-2">
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                  {appointment.type === 'Telehealth' ? 'Join Call' : 'View Details'}
                </button>
                <button className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors whitespace-nowrap">
                  Reschedule
                </button>
              </div>
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
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{past.date}</p>
                <button className="text-sm text-primary hover:underline">View notes</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
