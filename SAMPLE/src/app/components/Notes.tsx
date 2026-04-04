import { Clock, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Note {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("notes");
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now(),
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(0);
  };

  const activeNote = notes[selectedNote];

  const updateNote = (value: string) => {
    const updated = [...notes];
    updated[selectedNote] = {
      ...activeNote,
      content: value,
      updatedAt: new Date().toISOString(),
    };
    setNotes(updated);
  };

  const deleteNote = (index: number) => {
    const confirmDelete = window.confirm("Delete this note?");
    if (!confirmDelete) return;

    const updated = notes.filter((_, i) => i !== index);
    setNotes(updated);

    // Fix selected note
    if (updated.length === 0) {
      setSelectedNote(0);
    } else if (index === selectedNote) {
      setSelectedNote(0); // fallback to first note
    } else if (index < selectedNote) {
      setSelectedNote(selectedNote - 1);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Notes</h2>
        <p className="text-muted-foreground">
          Write and manage your personal notes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* LEFT PANEL */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden">
          {/* Search + New */}
          <div className="p-4 border-b border-border space-y-2">
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full px-3 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              onClick={createNewNote}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {/* Notes List */}
          <div className="overflow-y-auto h-[calc(100%-6rem)]">
            {notes.map((note, index) => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(index)}
                className={`w-full p-4 border-b border-border text-left hover:bg-accent transition-colors ${
                  selectedNote === index ? "bg-accent" : ""
                }`}
              >
                <p className="text-sm text-muted-foreground mb-1">
                  {formatDate(note.createdAt)}
                </p>

                <p className="text-foreground truncate">
                  {note.content || "New Note"}
                </p>

                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {note.content.slice(0, 40)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL (EDITOR) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {activeNote ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {new Date(activeNote.createdAt).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => deleteNote(selectedNote)}
                  className="text-red-500 hover:opacity-80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Editor */}
              <div className="flex-1 p-4">
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateNote(e.target.value)}
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