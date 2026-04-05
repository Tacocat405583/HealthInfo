import { Calendar, Clock, List, Loader2, Lock, MapPin, Plus, User, Video, X } from 'lucide-react';
import { useState } from 'react';
import { RecordCategory } from '../../../types/health';
import type { Appointment } from '../../../types/collections';
import {
  useCollection,
  useAddToCollection,
  useUpdateInCollection,
} from '../../../hooks/useCollection';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';
import { DoctorCalendarView } from './DoctorCalendarView';

const STATUS_STYLES: Record<string, string> = {
  completed:     'bg-primary/10 text-primary',
  'in-progress': 'bg-secondary text-secondary-foreground border border-border',
  scheduled:     'bg-muted text-muted-foreground',
  cancelled:     'bg-destructive/10 text-destructive',
};

interface NewApptForm {
  patientName: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  mode: 'in-person' | 'telehealth';
  location: string;
  reason: string;
}

export function Schedule() {
  const { address, isConnected } = useWallet();
  const { isReady, initKeys, isInitializing } = useEncryption();

  const { data: appointments = [], isLoading } = useCollection<Appointment>(
    address ?? null,
    RecordCategory.Scheduling,
    { enabled: isConnected && isReady },
  );

  const { add, isAdding } = useAddToCollection<Appointment>();
  const { update, isUpdating } = useUpdateInCollection<Appointment>();

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showForm, setShowForm] = useState(false);

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const todayAppts = appointments.filter((a) => a.date === today);

  const [form, setForm] = useState<NewApptForm>({
    patientName: '',
    date: today,
    time: '9:00 AM',
    duration: '30 min',
    type: 'Follow-up',
    mode: 'in-person',
    location: 'Exam Room 1',
    reason: '',
  });

  const submitAppt = async () => {
    if (!address || !form.patientName.trim()) return;
    const newAppt: Appointment = {
      id: `appt_${Date.now()}`,
      date: form.date,
      time: form.time,
      duration: form.duration,
      patientAddress: '',
      patientName: form.patientName.trim(),
      providerAddress: address,
      providerName: 'Dr. (me)',
      type: form.type,
      mode: form.mode,
      location: form.location,
      reason: form.reason,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    await add({ patient: address, category: RecordCategory.Scheduling, item: newAppt });
    setShowForm(false);
    setForm((f) => ({ ...f, patientName: '', reason: '', date: today }));
  };

  const updateStatus = async (appt: Appointment, status: Appointment['status']) => {
    if (!address) return;
    await update({ patient: address, category: RecordCategory.Scheduling, item: { ...appt, status } });
  };

  // Map our Appointment type to the shape DoctorCalendarView expects
  const calendarAppts = appointments.map((a, i) => ({
    id: i,
    time: a.time,
    duration: a.duration,
    patient: a.patientName,
    age: 0,
    type: a.type,
    mode: a.mode,
    location: a.location,
    reason: a.reason,
    status: a.status,
    date: a.date, // ISO "YYYY-MM-DD" — parseable by new Date()
  }));

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Schedule</h2>
          <p className="text-muted-foreground">Manage appointments and scheduling</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Wallet not connected</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Schedule</h2>
          <p className="text-muted-foreground">Manage appointments and scheduling</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Encryption not activated</p>
          <button
            onClick={() => void initKeys()}
            disabled={isInitializing}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isInitializing ? 'Activating…' : 'Activate Encryption'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-foreground mb-2">Schedule</h2>
          <p className="text-muted-foreground">
            Today's appointments — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
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
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Appointment'}
          </button>
        </div>
      </div>

      {/* New Appointment form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-foreground font-medium">New Appointment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Patient Name</label>
              <input
                value={form.patientName}
                onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                placeholder="Patient name"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Time</label>
              <input
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                placeholder="e.g. 9:00 AM"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
              <select
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {['15 min', '30 min', '45 min', '60 min'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Visit Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {['Follow-up', 'New Patient', 'Annual Exam', 'Urgent', 'Telehealth'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as 'in-person' | 'telehealth' }))}
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="in-person">In-person</option>
                <option value="telehealth">Telehealth</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Exam Room 1"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
              <input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Brief reason for visit"
                className="w-full px-3 py-2 bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            onClick={() => void submitAppt()}
            disabled={isAdding || !form.patientName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule Appointment
          </button>
        </div>
      )}

      {view === 'calendar' ? (
        <DoctorCalendarView appointments={calendarAppts} />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading schedule…
        </div>
      ) : (
        <>
          {/* Day summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Today',  value: todayAppts.length },
              { label: 'Completed',    value: todayAppts.filter((a) => a.status === 'completed').length },
              { label: 'Remaining',    value: todayAppts.filter((a) => a.status !== 'completed' && a.status !== 'cancelled').length },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Timeline — today only */}
          {todayAppts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-muted-foreground">No appointments scheduled for today</p>
            </div>
          ) : (
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
                        <p className="text-foreground font-medium">{appt.patientName}</p>
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
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[appt.status] ?? ''}`}>
                        {appt.status}
                      </span>
                      {appt.status === 'scheduled' && (
                        <button
                          onClick={() => void updateStatus(appt, appt.mode === 'telehealth' ? 'in-progress' : 'in-progress')}
                          disabled={isUpdating}
                          className="text-xs px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                        >
                          {appt.mode === 'telehealth' ? 'Start Call' : 'Check In'}
                        </button>
                      )}
                      {appt.status === 'in-progress' && (
                        <button
                          onClick={() => void updateStatus(appt, 'completed')}
                          disabled={isUpdating}
                          className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
