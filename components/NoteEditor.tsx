'use client';

import { Note, NoteColor, NoteCategoria } from '@/types';
import { useState, useEffect } from 'react';

interface NoteEditorProps {
    note?: Note | null;
    onSave: (noteData: Partial<Note>) => void;
    onClose: () => void;
}

const COLOR_MAP: Record<NoteColor, { bg: string; border: string }> = {
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-300' },
    green: { bg: 'bg-green-100', border: 'border-green-300' },
    pink: { bg: 'bg-pink-100', border: 'border-pink-300' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-300' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-300' },
    gray: { bg: 'bg-gray-100', border: 'border-gray-300' },
    red: { bg: 'bg-red-100', border: 'border-red-300' },
};

const COLORS: NoteColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'gray', 'red'];
const CATEGORIES: (NoteCategoria | null)[] = [null, 'IMPORTANT', 'RECORDATORI', 'MATERIAL', 'LOGÍSTICA', 'GENERAL'];

export function NoteEditor({ note, onSave, onClose }: NoteEditorProps) {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [color, setColor] = useState<NoteColor>(note?.color || 'yellow');
    const [categoria, setCategoria] = useState<NoteCategoria | null>(note?.categoria || null);
    const [pinned, setPinned] = useState(note?.pinned || false);

    const colorStyle = COLOR_MAP[color];

    const handleSave = () => {
        if (!content.trim()) {
            alert('El contingut de la nota no pot estar buit');
            return;
        }

        onSave({
            ...(note?.id && { id: note.id }),
            title: title.trim() || null,
            content: content.trim(),
            color,
            categoria,
            pinned,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
                className={`w-full max-w-2xl rounded-xl border-2 ${colorStyle.bg} ${colorStyle.border} shadow-2xl overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-300/50 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        {note ? 'Editar nota' : 'Nova nota'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <span className="material-icons-outlined text-gray-700">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Títol (opcional)"
                        className="w-full px-4 py-2 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold"
                    />

                    {/* Content */}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Escriu la teva nota aquí..."
                        rows={8}
                        className="w-full px-4 py-3 bg-white/60 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        autoFocus
                    />

                    {/* Categoria */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Categoria
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat || 'none'}
                                    onClick={() => setCategoria(cat)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${categoria === cat
                                            ? 'bg-primary text-white'
                                            : 'bg-white/60 text-gray-700 hover:bg-white'
                                        }`}
                                >
                                    {cat || 'Cap'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color
                        </label>
                        <div className="flex gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-10 h-10 rounded-full border-2 ${COLOR_MAP[c].bg} ${COLOR_MAP[c].border} hover:scale-110 transition-transform ${color === c ? 'ring-4 ring-primary ring-offset-2' : ''
                                        }`}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Pin Toggle */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="pinned"
                            checked={pinned}
                            onChange={(e) => setPinned(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="pinned" className="text-sm text-gray-700 flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">push_pin</span>
                            Ancorar nota (apareix a dalt)
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-300/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        Cancel·lar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary hover:bg-red-900 text-white rounded-lg transition-colors font-medium"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
