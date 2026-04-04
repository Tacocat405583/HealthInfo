import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Video, User } from 'lucide-react';

interface DoctorAppointment {
  id: number;
  time: string;
  duration: string;
  patient: string;
  age: number;
  type: string;
  mode: string;
  location: string;
  reason: string;
  status: string;
  date: string; // e.g. "April 4, 2026"
}

interface DoctorCalendarViewProps {
  appointments: DoctorAppointment[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusColors: Record<string, string> = {
  completed:    'bg-primary/10 text-primary',
  'in-progress':'bg-secondary text-secondary-foreground',
  scheduled:    'bg-muted text-muted-foreground',
};

export function DoctorCalendarView({ appointments }: DoctorCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();

  const apptsByDay: Record<number, DoctorAppointment[]> = {};
  appointments.forEach((appt) => {
    const d = new Date(appt.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!apptsByDay[day]) apptsByDay[day] = [];
      apptsByDay[day].push(appt);
    }
  });

  const selectedAppts = selectedDay ? (apptsByDay[selectedDay] ?? []) : [];

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar grid */}
      <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="text-foreground font-medium">{monthName} {year}</h3>
          <button
            onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const appts = day ? apptsByDay[day] : undefined;
            const count = appts?.length ?? 0;
            const isSelected = day === selectedDay;
            const isTodayDay = day ? isToday(day) : false;

            return (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                  aspect-square
                  ${!day ? 'invisible pointer-events-none' : ''}
                  ${isSelected ? 'bg-primary text-white' : ''}
                  ${!isSelected && count > 0 ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}
                  ${!isSelected && count === 0 ? 'text-foreground hover:bg-accent' : ''}
                  ${isTodayDay && !isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                `}
              >
                <span>{day}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                    {count}pt
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded bg-primary/10 inline-block" />
            Has appointments
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded ring-2 ring-primary inline-block" />
            Today
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col overflow-y-auto">
        {selectedDay ? (
          <>
            <h3 className="text-foreground font-medium mb-4">
              {monthName} {selectedDay}
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                {selectedAppts.length} appointment{selectedAppts.length !== 1 ? 's' : ''}
              </span>
            </h3>
            {selectedAppts.length > 0 ? (
              <div className="space-y-3">
                {selectedAppts
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((appt) => (
                    <div key={appt.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-foreground font-medium leading-tight">{appt.patient}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[appt.status] ?? ''}`}>
                              {appt.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Age {appt.age} · {appt.type}</p>
                        </div>
                      </div>
                      {appt.mode === 'telehealth' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/20 text-foreground rounded-full text-xs mb-2">
                          <Video className="w-2.5 h-2.5" /> Telehealth
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mb-2 italic">{appt.reason}</p>
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {appt.time} · {appt.duration}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {appt.location}
                        </div>
                      </div>
                      {appt.status === 'scheduled' && (
                        <button className="w-full py-1.5 bg-primary text-white rounded-lg text-xs hover:opacity-90 transition-opacity">
                          {appt.mode === 'telehealth' ? 'Start Call' : 'Check In'}
                        </button>
                      )}
                      {appt.status === 'in-progress' && (
                        <button className="w-full py-1.5 bg-primary text-white rounded-lg text-xs hover:opacity-90 transition-opacity">
                          Open Chart
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No appointments scheduled</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Select a day</p>
            <p className="text-xs text-muted-foreground">Click any date to see scheduled patients</p>
          </div>
        )}
      </div>
    </div>
  );
}
