import { Search, User, ChevronRight, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const patients = [
  { id: 1, name: 'Sarah Johnson',  age: 34, dob: 'Mar 12, 1992', lastVisit: 'Apr 2, 2026',  condition: 'Hypertension',     status: 'active',  alerts: 0 },
  { id: 2, name: 'Marcus Rivera',  age: 52, dob: 'Nov 8, 1973',  lastVisit: 'Apr 4, 2026',  condition: 'Type 2 Diabetes',  status: 'active',  alerts: 1 },
  { id: 3, name: 'Linda Park',     age: 67, dob: 'Jul 22, 1958', lastVisit: 'Mar 20, 2026', condition: 'COPD',             status: 'active',  alerts: 0 },
  { id: 4, name: 'Tom Wheeler',    age: 45, dob: 'Feb 14, 1981', lastVisit: 'Mar 15, 2026', condition: 'High Cholesterol', status: 'active',  alerts: 0 },
  { id: 5, name: 'Diana Flores',   age: 29, dob: 'Sep 3, 1996',  lastVisit: 'Jan 10, 2026', condition: 'Asthma',          status: 'active',  alerts: 0 },
  { id: 6, name: 'George Kwan',    age: 71, dob: 'Apr 27, 1954', lastVisit: 'Feb 28, 2026', condition: 'Heart Disease',   status: 'inactive',alerts: 0 },
  { id: 7, name: 'Priya Nair',     age: 38, dob: 'Dec 1, 1987',  lastVisit: 'Mar 30, 2026', condition: 'Anxiety',         status: 'active',  alerts: 0 },
  { id: 8, name: 'Carlos Mendes',  age: 60, dob: 'Jun 18, 1965', lastVisit: 'Mar 5, 2026',  condition: 'Arthritis',       status: 'active',  alerts: 0 },
];

export function Patients() {
  const [search, setSearch] = useState('');

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground mb-2">My Patients</h2>
          <p className="text-muted-foreground">Manage and review your patient roster</p>
        </div>
        <div className="text-sm text-muted-foreground">{patients.length} total patients</div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or condition..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Patient list */}
      <div className="space-y-3">
        {filtered.map((patient) => (
          <div
            key={patient.id}
            className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium">{patient.name}</p>
                  {patient.alerts > 0 && (
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Age {patient.age} · DOB {patient.dob}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Primary Condition</p>
                <p className="text-sm text-foreground">{patient.condition}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Last Visit</p>
                <p className="text-sm text-foreground">{patient.lastVisit}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  patient.status === 'active'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {patient.status}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground">No patients match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
