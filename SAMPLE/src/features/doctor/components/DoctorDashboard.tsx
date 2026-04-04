import { Calendar, Clock, MessageSquare, Users, AlertCircle, CheckCircle, Activity } from 'lucide-react';

export function DoctorDashboard() {
  const todayAppointments = [
    { time: '9:00 AM',  patient: 'Sarah Johnson',  type: 'Follow-up',   status: 'completed' },
    { time: '10:30 AM', patient: 'Marcus Rivera',  type: 'New Patient', status: 'in-progress' },
    { time: '1:00 PM',  patient: 'Linda Park',     type: 'Telehealth',  status: 'scheduled' },
    { time: '2:30 PM',  patient: 'Tom Wheeler',    type: 'Follow-up',   status: 'scheduled' },
    { time: '4:00 PM',  patient: 'Diana Flores',   type: 'Annual Exam', status: 'scheduled' },
  ];

  const pendingLabs = [
    { patient: 'Sarah Johnson',  test: 'Lipid Panel',  ordered: 'Apr 2, 2026',  urgent: false },
    { patient: 'Marcus Rivera',  test: 'CBC',          ordered: 'Apr 3, 2026',  urgent: true  },
    { patient: 'Tom Wheeler',    test: 'HbA1c',        ordered: 'Apr 1, 2026',  urgent: false },
  ];

  const statusStyles: Record<string, string> = {
    'completed':    'bg-primary/10 text-primary',
    'in-progress':  'bg-secondary text-secondary-foreground',
    'scheduled':    'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Good morning, Dr. Chen</h2>
        <p className="text-muted-foreground">Here is your overview for today, April 4, 2026</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Calendar,      label: "Today's Appointments", value: '5',  sub: '1 completed',       color: 'bg-primary/10',     iconColor: 'text-primary' },
          { icon: Users,         label: 'Active Patients',      value: '142',sub: 'Under your care',   color: 'bg-secondary/30',   iconColor: 'text-foreground' },
          { icon: AlertCircle,   label: 'Pending Lab Reviews',  value: '3',  sub: '1 urgent',          color: 'bg-destructive/10', iconColor: 'text-destructive' },
          { icon: MessageSquare, label: 'Unread Messages',      value: '5',  sub: 'From patients',     color: 'bg-primary/10',     iconColor: 'text-primary' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-sm text-foreground mt-0.5">{stat.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground">Today's Schedule</h3>
            <span className="text-xs text-muted-foreground">April 4, 2026</span>
          </div>
          <div className="space-y-3">
            {todayAppointments.map((appt, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-16 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {appt.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{appt.patient}</p>
                  <p className="text-xs text-muted-foreground">{appt.type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusStyles[appt.status]}`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending lab results */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground">Pending Lab Reviews</h3>
            <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">3 pending</span>
          </div>
          <div className="space-y-3">
            {pendingLabs.map((lab, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground">{lab.patient}</p>
                    {lab.urgent && (
                      <span className="text-xs px-1.5 py-0.5 bg-destructive text-white rounded-full">Urgent</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{lab.test} — ordered {lab.ordered}</p>
                </div>
                <button className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity flex-shrink-0">
                  Review
                </button>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors text-sm">
            View all lab orders
          </button>
        </div>
      </div>

      {/* Quick-action banner */}
      <div className="bg-gradient-to-br from-primary to-primary/70 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="mb-2">Refill Requests</h3>
            <p className="text-white/80 mb-4">
              You have <strong>2 pending prescription refill requests</strong> from patients waiting for your approval.
            </p>
            <button className="px-4 py-2 bg-white text-primary rounded-lg hover:shadow-lg transition-shadow text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Review Refill Requests
            </button>
          </div>
          <Activity className="w-16 h-16 text-white/20 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
