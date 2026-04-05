import { Clock, FileText, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RecordCategory } from "../../types/health";
import type { ClinicalNote, PersonalNote } from "../../types/collections";
import {
  useCollection,
  useAddToCollection,
  useUpdateInCollection,
  useRemoveFromCollection,
} from "../../hooks/useCollection";
import { localGet } from "../../services/localCollection";
import { useWallet } from "../../hooks/useWallet";

export function Notes() {
  const { address, isConnected } = useWallet();

  const { data: notes = [], isLoading } = useCollection<PersonalNote>(
    address ?? null,
    RecordCategory.MentalHealth,
    { enabled: isConnected, localOnly: true },
  );

  const { add, isAdding } = useAddToCollection<PersonalNote>({ localOnly: true });
  const { update, isUpdating } = useUpdateInCollection<PersonalNote>({ localOnly: true });
  const { remove, isRemoving } = useRemoveFromCollection({ localOnly: true });

  // Local draft state for the active note being edited
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Select first note when collection loads for the first time
  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
      setDraft(notes[0].content);
    }
  }, [notes, selectedId]);

  const activeNote = notes.find((n) => n.id === selectedId) ?? null;

  const selectNote = (note: PersonalNote) => {
    setSelectedId(note.id);
    setDraft(note.content);
    setIsDirty(false);
  };

  const createNote = async () => {
    if (!address) return;
    const newNote: PersonalNote = {
      id: `note_${Date.now()}`,
      title: "New Note",
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await add({ patient: address, category: RecordCategory.MentalHealth, item: newNote });
    setSelectedId(newNote.id);
    setDraft("");
    setIsDirty(false);
  };

  const saveNote = async () => {
    if (!activeNote || !address) return;
    const lines = draft.split("\n");
    const title = lines[0]?.trim() || "New Note";
    const updated: PersonalNote = {
      ...activeNote,
      title,
      content: draft,
      updatedAt: new Date().toISOString(),
    };
    await update({ patient: address, category: RecordCategory.MentalHealth, item: updated });
    setIsDirty(false);
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("Delete this note?") || !address) return;
    await remove({ patient: address, category: RecordCategory.MentalHealth, itemId: id });
    if (selectedId === id) {
      const remaining = notes.filter((n) => n.id !== id);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
        setDraft(remaining[0].content);
      } else {
        setSelectedId(null);
        setDraft("");
      }
    }
    setIsDirty(false);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground mb-2">Notes</h2>
          <p className="text-muted-foreground">Write and manage your personal notes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Wallet not connected</p>
          <p className="text-sm text-muted-foreground">Connect your wallet to access your notes</p>
        </div>
      </div>
    );
  }

  const isMutating = isAdding || isUpdating || isRemoving;

  // Doctor-created clinical notes visible to the patient
  const doctorNotes = address ? localGet<ClinicalNote>(address, RecordCategory.Primary) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Notes</h2>
        <p className="text-muted-foreground">Write and manage your personal notes</p>
      </div>

      {/* Doctor-created records */}
      {doctorNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-foreground font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            From Your Doctor
          </h3>
          <div className="space-y-2">
            {doctorNotes.map((note) => (
              <div key={note.id} className="bg-card border border-border rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-foreground font-medium">{note.title}</p>
                  <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{note.authorName}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap mt-2">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* LEFT PANEL */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border space-y-2">
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full px-3 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => void createNote()}
              disabled={isAdding}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              New Note
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-6rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm p-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notes…
              </div>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-6">
                No notes yet. Create your first note.
              </p>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full p-4 border-b border-border text-left hover:bg-accent transition-colors ${
                    selectedId === note.id ? "bg-accent" : ""
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-foreground truncate">{note.title || "New Note"}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {note.content.slice(0, 40)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL (EDITOR) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {activeNote ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {new Date(activeNote.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
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
                  {isMutating && !isUpdating && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  <button
                    onClick={() => void deleteNote(activeNote.id)}
                    disabled={isMutating}
                    className="text-red-500 hover:opacity-80 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4">
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Start writing..."
                  className="w-full h-full resize-none bg-transparent text-foreground focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select or create a note
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
