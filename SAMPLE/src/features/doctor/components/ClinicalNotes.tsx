import { Clock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Note {
  id: number;
  patient: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const defaultNotes: Note[] = [
  {
    id: 1,
    patient: 'Sarah Johnson',
    title: 'Follow-up — Apr 2, 2026',
    content: 'Patient reports BP well controlled on current Lisinopril dose. No side effects. Ordered repeat lipid panel. Continue current regimen. Follow up in 6 weeks.',
    createdAt: new Date('2026-04-02T09:15:00').toISOString(),
    updatedAt: new Date('2026-04-02T09:15:00').toISOString(),
  },
  {
    id: 2,
    patient: 'Marcus Rivera',
    title: 'New Patient — Apr 4, 2026',
    content: 'New patient presenting for diabetes management. HbA1c 7.2% — slightly above target. Initiated Metformin 500mg BID. Discussed lifestyle modifications. Repeat HbA1c in 3 months.',
    createdAt: new Date('2026-04-04T10:30:00').toISOString(),
    updatedAt: new Date('2026-04-04T10:30:00').toISOString(),
  },
];

export function ClinicalNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('doctor-notes');
    return saved ? JSON.parse(saved) : defaultNotes;
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [patientFilter, setPatientFilter] = useState('');

  useEffect(() => {
    localStorage.setItem('doctor-notes', JSON.stringify(notes));
  }, [notes]);

  const filtered = notes.filter(
    (n) => !patientFilter || n.patient.toLowerCase().includes(patientFilter.toLowerCase())
  );

  const activeNote = filtered[selectedIndex] ?? null;

  const createNote = () => {
    const newNote: Note = {
      id: Date.now(),
      patient: '',
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedIndex(0);
    setPatientFilter('');
  };

  const updateNote = (field: 'content' | 'patient' | 'title', value: string) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const deleteNote = (id: number) => {
    if (!window.confirm('Delete this note?')) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedIndex(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Clinical Notes</h2>
        <p className="text-muted-foreground">Write and manage SOAP notes and clinical documentation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[620px]">
        {/* Left panel */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border space-y-2">
            <input
              type="text"
              placeholder="Filter by patient..."
              value={patientFilter}
              onChange={(e) => { setPatientFilter(e.target.value); setSelectedIndex(0); }}
              className="w-full px-3 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <button
              onClick={createNote}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-7rem)]">
            {filtered.map((note, i) => (
              <button
                key={note.id}
                onClick={() => setSelectedIndex(i)}
                className={`w-full p-4 border-b border-border text-left hover:bg-accent transition-colors ${
                  selectedIndex === i ? 'bg-accent' : ''
                }`}
              >
                <p className="text-xs text-primary font-medium mb-0.5 truncate">{note.patient || 'No patient'}</p>
                <p className="text-sm text-foreground truncate">{note.title || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center p-6">No notes found</p>
            )}
          </div>
        </div>

        {/* Editor panel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {activeNote ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    value={activeNote.patient}
                    onChange={(e) => updateNote('patient', e.target.value)}
                    placeholder="Patient name..."
                    className="px-2 py-1 bg-input-background rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-40"
                  />
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateNote('title', e.target.value)}
                    placeholder="Note title..."
                    className="flex-1 px-2 py-1 bg-input-background rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(activeNote.updatedAt).toLocaleString()}
                  </div>
                  <button onClick={() => deleteNote(activeNote.id)} className="text-destructive hover:opacity-70">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4">
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateNote('content', e.target.value)}
                  placeholder="Write your clinical note here (SOAP format, free text, etc.)..."
                  className="w-full h-full resize-none bg-transparent text-foreground focus:outline-none text-sm leading-relaxed placeholder:text-muted-foreground"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select or create a note
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
