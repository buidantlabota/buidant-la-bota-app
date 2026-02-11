'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Note } from '@/types';
import Link from 'next/link';
import { NotesGrid } from '@/components/NotesGrid';
import { BoloKanban } from '@/components/BoloKanban';

import { useSearchParams } from 'next/navigation';

function TasquesContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(true);
    const [activeTab, setActiveTab] = useState<'tasques' | 'notes'>('tasques');

    useEffect(() => {
        const view = searchParams.get('view');
        if (view === 'notes') {
            setActiveTab('notes');
        }
        fetchNotes();
    }, [searchParams]);

    const fetchNotes = async () => {
        setLoadingNotes(true);
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('archived', false)
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoadingNotes(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Tasques i Estats</h1>
                    <p className="text-gray-500 mt-2 font-medium">
                        Gestió del flux de treball dels bolos i notes ràpides
                    </p>
                </div>

                {/* Tabs Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('tasques')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'tasques'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="material-icons-outlined text-sm mr-2 align-middle">analytics</span>
                        Tauler de Bolos
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'notes'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="material-icons-outlined text-sm mr-2 align-middle">sticky_note_2</span>
                        Notes ({notes.length})
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {activeTab === 'tasques' ? (
                    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-6 md:p-8 overflow-x-auto min-h-[700px]">
                            <BoloKanban />
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50/50 to-orange-50/50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-icons-outlined text-orange-400">sticky_note_2</span>
                                Notes Ràpides
                            </h2>
                        </div>
                        <div className="p-8">
                            <NotesGrid notes={notes} onNotesChange={fetchNotes} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TasquesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregant...</div>}>
            <TasquesContent />
        </Suspense>
    );
}
