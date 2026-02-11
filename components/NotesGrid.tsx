'use client';

import { Note, NoteColor } from '@/types';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface NotesGridProps {
    notes: Note[];
    onNotesChange: () => void;
}

export function NotesGrid({ notes, onNotesChange }: NotesGridProps) {
    const supabase = createClient();
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filtrar notes per cerca
    const filteredNotes = notes.filter(note => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            (note.title?.toLowerCase().includes(query)) ||
            note.content.toLowerCase().includes(query) ||
            (note.categoria?.toLowerCase().includes(query))
        );
    });

    // Separar notes pinned i no pinned
    const pinnedNotes = filteredNotes.filter(n => n.pinned && !n.archived);
    const unpinnedNotes = filteredNotes.filter(n => !n.pinned && !n.archived);

    const handleSaveNote = async (noteData: Partial<Note>) => {
        try {
            if (noteData.id) {
                // Update existing note
                const { error } = await supabase
                    .from('notes')
                    .update(noteData)
                    .eq('id', noteData.id);

                if (error) throw error;
            } else {
                // Create new note
                const { error } = await supabase
                    .from('notes')
                    .insert([noteData]);

                if (error) throw error;
            }

            onNotesChange();
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Error en guardar la nota');
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            onNotesChange();
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Error en eliminar la nota');
        }
    };

    const handlePinNote = async (id: string, pinned: boolean) => {
        try {
            const { error } = await supabase
                .from('notes')
                .update({ pinned })
                .eq('id', id);

            if (error) throw error;
            onNotesChange();
        } catch (error) {
            console.error('Error pinning note:', error);
        }
    };

    const handleColorChange = async (id: string, color: NoteColor) => {
        try {
            const { error } = await supabase
                .from('notes')
                .update({ color })
                .eq('id', id);

            if (error) throw error;
            onNotesChange();
        } catch (error) {
            console.error('Error changing color:', error);
        }
    };

    const handleEditNote = (note: Note) => {
        setEditingNote(note);
        setShowEditor(true);
    };

    const handleNewNote = () => {
        setEditingNote(null);
        setShowEditor(true);
    };

    return (
        <div className="space-y-6">
            {/* Header amb cerca i botó nou */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        search
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca notes..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>

                <button
                    onClick={handleNewNote}
                    className="bg-primary hover:bg-red-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                >
                    <span className="material-icons-outlined">add</span>
                    Nova nota
                </button>
            </div>

            {/* Notes Pinned */}
            {pinnedNotes.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1">
                        <span className="material-icons-outlined text-sm">push_pin</span>
                        ANCORADES
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pinnedNotes.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onEdit={handleEditNote}
                                onDelete={handleDeleteNote}
                                onPin={handlePinNote}
                                onColorChange={handleColorChange}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Notes Normals */}
            {unpinnedNotes.length > 0 && (
                <div>
                    {pinnedNotes.length > 0 && (
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">ALTRES</h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {unpinnedNotes.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onEdit={handleEditNote}
                                onDelete={handleDeleteNote}
                                onPin={handlePinNote}
                                onColorChange={handleColorChange}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {filteredNotes.length === 0 && (
                <div className="text-center py-16">
                    <span className="material-icons-outlined text-6xl text-gray-300 mb-4">note_add</span>
                    <p className="text-gray-500 text-lg">
                        {searchQuery ? 'No s\'han trobat notes' : 'Encara no tens cap nota'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={handleNewNote}
                            className="mt-4 text-primary hover:text-red-900 font-medium"
                        >
                            Crea la teva primera nota
                        </button>
                    )}
                </div>
            )}

            {/* Editor Modal */}
            {showEditor && (
                <NoteEditor
                    note={editingNote}
                    onSave={handleSaveNote}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingNote(null);
                    }}
                />
            )}
        </div>
    );
}
