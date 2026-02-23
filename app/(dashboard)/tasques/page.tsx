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

    // Year Filtering State
    const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);

    useEffect(() => {
        const view = searchParams.get('view');
        if (view === 'notes') {
            setActiveTab('notes');
        }
        fetchNotes();
        fetchAvailableYears();
    }, [searchParams, selectedYear]);

    const fetchAvailableYears = async () => {
        const { data } = await supabase.from('bolos').select('data_bolo');
        if (data) {
            const years = Array.from(new Set((data as any[]).map(b => b.data_bolo ? new Date(b.data_bolo).getFullYear() : null).filter(y => y !== null))) as number[];
            setAvailableYears(years.sort((a, b) => b - a));
        }
    };

    const fetchNotes = async () => {
        setLoadingNotes(true);
        try {
            let query = supabase
                .from('notes')
                .select('*, bolos(data_bolo)')
                .eq('archived', false);

            const { data, error } = await query
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter by year in JS to handle both creation date and associated bolo date
            const notesFromDB = (data || []) as any[];
            const filteredData = notesFromDB.filter(note => {
                if (selectedYear === 'all') return true;

                const noteYear = new Date(note.created_at).getFullYear();
                const boloYear = note.bolos?.data_bolo ? new Date(note.bolos.data_bolo).getFullYear() : null;

                return boloYear === selectedYear || (boloYear === null && noteYear === selectedYear);
            }) as Note[];

            setNotes(filteredData);
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

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Year Selector */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedYear(val === 'all' ? 'all' : parseInt(val));
                            }}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 cursor-pointer h-[42px]"
                        >
                            <option value="all">Des de l'inici</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <span className="material-icons-outlined text-sm">expand_more</span>
                        </div>
                    </div>

                    {/* Tabs Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl h-[42px]">
                        <button
                            onClick={() => setActiveTab('tasques')}
                            className={`px-6 py-1 rounded-lg font-bold text-sm transition-all flex items-center ${activeTab === 'tasques'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="material-icons-outlined text-sm mr-2">analytics</span>
                            Tauler
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`px-6 py-1 rounded-lg font-bold text-sm transition-all flex items-center ${activeTab === 'notes'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="material-icons-outlined text-sm mr-2">sticky_note_2</span>
                            Notes ({notes.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {activeTab === 'tasques' ? (
                    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-6 md:p-8 overflow-x-auto min-h-[700px]">
                            <BoloKanban externalYear={selectedYear} />
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
