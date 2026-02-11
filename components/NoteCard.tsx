'use client';

import { Note, NoteColor } from '@/types';
import { useState } from 'react';

interface NoteCardProps {
    note: Note;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
    onPin: (id: string, pinned: boolean) => void;
    onColorChange: (id: string, color: NoteColor) => void;
}

const COLOR_MAP: Record<NoteColor, { bg: string; border: string; hover: string }> = {
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', hover: 'hover:shadow-yellow-200' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-300', hover: 'hover:shadow-blue-200' },
    green: { bg: 'bg-green-100', border: 'border-green-300', hover: 'hover:shadow-green-200' },
    pink: { bg: 'bg-pink-100', border: 'border-pink-300', hover: 'hover:shadow-pink-200' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-300', hover: 'hover:shadow-purple-200' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-300', hover: 'hover:shadow-orange-200' },
    gray: { bg: 'bg-gray-100', border: 'border-gray-300', hover: 'hover:shadow-gray-200' },
    red: { bg: 'bg-red-100', border: 'border-red-300', hover: 'hover:shadow-red-200' },
};

const COLORS: NoteColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'gray', 'red'];

export function NoteCard({ note, onEdit, onDelete, onPin, onColorChange }: NoteCardProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const colorStyle = COLOR_MAP[note.color];
    const isLongContent = note.content.length > 200;
    const [expanded, setExpanded] = useState(false);

    const displayContent = isLongContent && !expanded
        ? note.content.substring(0, 200) + '...'
        : note.content;

    return (
        <div
            className={`relative rounded-lg border-2 ${colorStyle.bg} ${colorStyle.border} p-4 transition-all duration-200 ${colorStyle.hover} hover:shadow-lg cursor-pointer group`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => {
                setShowActions(false);
                setShowColorPicker(false);
            }}
            onClick={() => onEdit(note)}
        >
            {/* Pin Icon */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
                {note.pinned && (
                    <span className="material-icons-outlined text-gray-700 text-lg">push_pin</span>
                )}
            </div>

            {/* Categoria Badge */}
            {note.categoria && (
                <div className="mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/60 text-gray-700 font-medium">
                        {note.categoria}
                    </span>
                </div>
            )}

            {/* Title */}
            {note.title && (
                <h3 className="font-bold text-gray-900 mb-2 pr-6">{note.title}</h3>
            )}

            {/* Content */}
            <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">
                {displayContent}
            </p>

            {/* Expandir/Col·lapsar */}
            {isLongContent && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900 mt-2 underline"
                >
                    {expanded ? 'Veure menys' : 'Veure més'}
                </button>
            )}

            {/* Actions (visible on hover) */}
            {showActions && (
                <div
                    className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded px-2 py-1 shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Color Picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Canviar color"
                        >
                            <span className="material-icons-outlined text-sm text-gray-600">palette</span>
                        </button>

                        {showColorPicker && (
                            <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg p-2 flex gap-1 z-10">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            onColorChange(note.id, color);
                                            setShowColorPicker(false);
                                        }}
                                        className={`w-6 h-6 rounded-full border-2 ${COLOR_MAP[color].bg} ${COLOR_MAP[color].border} hover:scale-110 transition-transform`}
                                        title={color}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPin(note.id, !note.pinned)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title={note.pinned ? 'Desancorar' : 'Ancorar'}
                        >
                            <span className="material-icons-outlined text-sm text-gray-600">
                                {note.pinned ? 'push_pin' : 'push_pin'}
                            </span>
                        </button>

                        <button
                            onClick={() => onEdit(note)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Editar"
                        >
                            <span className="material-icons-outlined text-sm text-gray-600">edit</span>
                        </button>

                        <button
                            onClick={() => {
                                if (confirm('Segur que vols eliminar aquesta nota?')) {
                                    onDelete(note.id);
                                }
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Eliminar"
                        >
                            <span className="material-icons-outlined text-sm text-red-600">delete</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
