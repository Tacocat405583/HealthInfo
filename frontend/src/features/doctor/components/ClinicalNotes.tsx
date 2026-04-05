import { Clock, Loader2, Lock, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RecordCategory } from '../../../types/health';
import type { ClinicalNote } from '../../../types/collections';
import {
  useCollection,
  useAddToCollection,
  useUpdateInCollection,
  useRemoveFromCollection,
} from '../../../hooks/useCollection';
import { useWallet } from '../../../hooks/useWallet';
import { useEncryption } from '../../../providers/EncryptionProvider';

// Doctor's clinical notes are stored in the doctor's own Primary category.
// Each note carries patientName / patientAddress to identify who it's about.

export function ClinicalNotes() {
  const { address, isConnected } = useWallet();
  const { isReady, initKeys, isInitializing } = useEncryption();

  const { data: notes = [], isLoading } = useCollection<ClinicalNote>(
    address ?? null,
    RecordCategory.Primary,
    { enabled: isConnected && isReady },
  );

  const { add, isAdding } = useAddToCollection<ClinicalNote>();
  const { update, isUpdating } = useUpdateInCollection<ClinicalNote>();
  const { remove, isRemoving } = useRemoveFromCollection();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState('');
  const [draft, setDraft] = useState({ patient: '', title: '', content: '' });
  const [isDirty, setIsDirty] = useState(false);

  const filtered = notes.filter(
    (n) => !patientFilter || n.patientName.toLowerCase().includes(patientFilter.toLowerCase()),
  );

  const activeNote = filtered.find((n) => n.id === selectedId) ?? (filtered.length > 0 ? filtered[0] : null);

  // Sync draft when active note changes
  useEffect(() => {
    if (activeNote && activeNote.id !== selectedId) {
      setSelectedId(activeNote.id);
      setDraft({ patient: activeNote.patientName, title: activeNote.title, content: activeNote.content });
      setIsDirty(false);
    }
  }, [activeNote, selectedId]);

  const selectNote = (note: ClinicalNote) => {
    setSelectedId(note.id);
    setDraft({ patient: note.patientName, title: note.title, content: note.content });
    setIsDirty(false);
  };

  const createNote = async () => {
    if (!address) return;
    const newNote: ClinicalNote = {
      id: `note_${Date.now()}`,
      authorAddress: address,
      authorName: 'Dr. (me)',
      patientAddress: '',
      patientName: '',
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await add({ patient: address, category: RecordCategory.Primary, item: newNote });
    setSelectedId(newNote.id);
    setDraft({ patient: '', title: 'New Note', content: '' });
    setIsDirty(false);
    setPatientFilter('');
  };

  const saveNote = async () => {
    if (!activeNote || !address) return;
    const updated: ClinicalNote = {
      ...activeNote,
      patientName: draft.patient,
      title: draft.title || 'Untitled',
      content: draft.content,
      updatedAt: new Date().toISOString(),
    };
    await update({ patient: address, category: RecordCategory.Primary, item: updated });
    setIsDirty(false);
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm('Delete this note?') || !address) return;
    await remove({ patient: address, category: RecordCategory.Primary, itemId: id });
    if (selectedId === id) {
      const remaining = filtered.filter((n) => n.id !== id);
      if (remaining.length > 0) {
        selectNote(remaining[0]);
      } else {
        setSelectedId(null);
        setDraft({ patient: '', title: '', content: '' });
      }
    }
    setIsDirty(false);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Clinical Notes</h2>
          <p className="text-muted-foreground">Write and manage SOAP notes and clinical documentation</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Wallet not connected</p>
          <p className="text-sm text-muted-foreground">Connect your wallet to access clinical notes</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Clinical Notes</h2>
          <p className="text-muted-foreground">Write and manage SOAP notes and clinical documentation</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Encryption not activated</p>
          <p className="text-sm text-muted-foreground">
            Clinical notes are encrypted — activate encryption to read and write them
          </p>
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

  const isMutating = isAdding || isUpdating || isRemoving;

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
              onChange={(e) => { setPatientFilter(e.target.value); setSelectedId(null); }}
              className="w-full px-3 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <button
              onClick={() => void createNote()}
              disabled={isAdding}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 text-sm disabled:opacity-60"
            >
              {isAdding
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />
              }
              New Note
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-7rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm p-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notes…
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-6">No notes found</p>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full p-4 border-b border-border text-left hover:bg-accent transition-colors ${
                    selectedId === note.id ? 'bg-accent' : ''
                  }`}
                >
                  <p className="text-xs text-primary font-medium mb-0.5 truncate">
                    {note.patientName || 'No patient'}
                  </p>
                  <p className="text-sm text-foreground truncate">{note.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
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
                    value={draft.patient}
                    onChange={(e) => { setDraft((d) => ({ ...d, patient: e.target.value })); setIsDirty(true); }}
                    placeholder="Patient name..."
                    className="px-2 py-1 bg-input-background rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-40"
                  />
                  <input
                    value={draft.title}
                    onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setIsDirty(true); }}
                    placeholder="Note title..."
                    className="flex-1 px-2 py-1 bg-input-background rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(activeNote.updatedAt).toLocaleString()}
                  </div>
                  {isDirty && (
                    <button
                      onClick={() => void saveNote()}
                      disabled={isUpdating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:opacity-90 disabled:opacity-60"
                    >
                      {isUpdating
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Save className="w-3.5 h-3.5" />
                      }
                      Save
                    </button>
                  )}
                  <button
                    onClick={() => void deleteNote(activeNote.id)}
                    disabled={isMutating}
                    className="text-destructive hover:opacity-70 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4">
                <textarea
                  value={draft.content}
                  onChange={(e) => { setDraft((d) => ({ ...d, content: e.target.value })); setIsDirty(true); }}
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
