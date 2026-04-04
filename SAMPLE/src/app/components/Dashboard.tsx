import { Activity, Calendar, Clock, Heart, TrendingUp } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Welcome back, Sarah</h2>
        <p className="text-muted-foreground">Here is your health overview for today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>
          <h3 className="text-foreground mb-1">Next Appointment</h3>
          <p className="text-sm text-muted-foreground">Dr. Martinez - Cardiology</p>
          <p className="text-sm text-primary mt-2">Tomorrow at 2:00 PM</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-secondary" />
            </div>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <h3 className="text-foreground mb-1">Heart Rate</h3>
          <p className="text-2xl text-foreground">72 <span className="text-sm text-muted-foreground">bpm</span></p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-primary" />
            <p className="text-xs text-primary">Normal range</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <h3 className="text-foreground mb-1">Steps Average</h3>
          <p className="text-2xl text-foreground">8,543</p>
          <p className="text-xs text-muted-foreground mt-2">Goal: 10,000 steps</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-foreground mb-4">Recent Test Results</h3>
          <div className="space-y-4">
            {[
              { name: 'Blood Pressure', value: '120/80 mmHg', date: 'Mar 28, 2026', status: 'normal' },
              { name: 'Cholesterol', value: '185 mg/dL', date: 'Mar 15, 2026', status: 'normal' },
              { name: 'Blood Sugar', value: '95 mg/dL', date: 'Mar 15, 2026', status: 'normal' },
            ].map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-foreground">{result.name}</p>
                  <p className="text-sm text-muted-foreground">{result.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-foreground">{result.value}</p>
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {result.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors">
            View all results
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-foreground mb-4">Upcoming Appointments</h3>
          <div className="space-y-4">
            {[
              { doctor: 'Dr. Sarah Martinez', specialty: 'Cardiology', date: 'Apr 5, 2026', time: '2:00 PM' },
              { doctor: 'Dr. James Chen', specialty: 'Primary Care', date: 'Apr 12, 2026', time: '10:30 AM' },
              { doctor: 'Dr. Emily Roberts', specialty: 'Dermatology', date: 'Apr 18, 2026', time: '3:15 PM' },
            ].map((appt, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground">{appt.doctor}</p>
                  <p className="text-sm text-muted-foreground">{appt.specialty}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{appt.date} at {appt.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 px-4 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
            Schedule new appointment
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="mb-2">Health Tip of the Day</h3>
            <p className="text-white/90 mb-4">
              Stay hydrated! Aim for 8 glasses of water daily to support your overall health and energy levels.
            </p>
            <button className="px-4 py-2 bg-white text-primary rounded-lg hover:shadow-lg transition-shadow">
              Learn more
            </button>
          </div>
          <Activity className="w-16 h-16 text-white/20" />
        </div>
      </div>
    </div>
  );
}
