import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Video } from 'lucide-react';

interface Appointment {
  id: number;
  doctor: string;
  specialty: string;
  date: string; // e.g. "April 5, 2026"
  time: string;
  location: string;
  type: string;
}

interface CalendarViewProps {
  appointments: Appointment[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ appointments }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();

  // Index appointments by day number for this month/year
  const apptsByDay: Record<number, Appointment[]> = {};
  appointments.forEach((appt) => {
    const d = new Date(appt.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!apptsByDay[day]) apptsByDay[day] = [];
      apptsByDay[day].push(appt);
    }
  });

  const selectedAppts = selectedDay ? (apptsByDay[selectedDay] ?? []) : [];

  // Calendar grid: leading nulls + day numbers
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
        {/* Month navigation */}
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

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const hasAppt = day ? !!apptsByDay[day] : false;
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
                  ${!isSelected && hasAppt ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}
                  ${!isSelected && !hasAppt ? 'text-foreground hover:bg-accent' : ''}
                  ${isTodayDay && !isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                `}
              >
                <span>{day}</span>
                {hasAppt && (
                  <span
                    className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded bg-primary/10 inline-block" />
            Has appointment
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded ring-2 ring-primary inline-block" />
            Today
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
        {selectedDay ? (
          <>
            <h3 className="text-foreground font-medium mb-4">
              {monthName} {selectedDay}
            </h3>
            {selectedAppts.length > 0 ? (
              <div className="space-y-4">
                {selectedAppts.map((appt) => (
                  <div key={appt.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-medium leading-tight">{appt.doctor}</p>
                        <p className="text-xs text-muted-foreground">{appt.specialty}</p>
                      </div>
                    </div>
                    {appt.type === 'Telehealth' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs mb-2">
                        <Video className="w-2.5 h-2.5" /> Telehealth
                      </span>
                    )}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {appt.time}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {appt.location}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs hover:opacity-90 transition-opacity">
                        {appt.type === 'Telehealth' ? 'Join Call' : 'View Details'}
                      </button>
                      <button className="px-3 py-1.5 border border-border text-foreground rounded-lg text-xs hover:bg-accent transition-colors">
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No appointments on this day</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Select a day</p>
            <p className="text-xs text-muted-foreground">Click any date to see your appointments</p>
          </div>
        )}
      </div>
    </div>
  );
}
