'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, BoloStatus } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';

type KanbanColumn = {
    id: string;
    title: string;
    color: string;
    textColor: string;
};

const COLUMNS: KanbanColumn[] = [
    { id: 'nova', title: 'Nova', color: 'bg-red-600', textColor: 'text-white' },
    { id: 'pendent_confirmacio', title: 'Pendent de confirmació', color: 'bg-orange-500', textColor: 'text-white' },
    { id: 'confirmada', title: 'Confirmada', color: 'bg-emerald-600', textColor: 'text-white' },
    { id: 'pendent_cobrar', title: 'Pendents de cobrar', color: 'bg-yellow-400', textColor: 'text-gray-900' },
    { id: 'per_pagar', title: 'Per pagar', color: 'bg-lime-500', textColor: 'text-gray-900' },
    { id: 'tancada', title: 'Tancades', color: 'bg-red-900', textColor: 'text-white' },
];

export function BoloKanban({ externalYear }: { externalYear?: number | 'all' }) {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<number | null>(null);

    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
    const [showCurrentMonth, setShowCurrentMonth] = useState(false);

    // Sync with external year if provided
    useEffect(() => {
        if (externalYear !== undefined) {
            setSelectedYear(externalYear);
        }
    }, [externalYear]);

    useEffect(() => {
        fetchBolos();
    }, [selectedYear, showCurrentMonth]);

    const fetchBolos = async () => {
        setLoading(true);

        const now = new Date();
        let query = supabase
            .from('bolos')
            .select(`
                *,
                client:clients(nom)
            `);

        if (showCurrentMonth) {
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
            query = query.gte('data_bolo', startDate).lte('data_bolo', endDate);
        } else if (selectedYear !== 'all') {
            const startDate = `${selectedYear}-01-01`;
            const endDate = `${selectedYear}-12-31`;
            query = query.gte('data_bolo', startDate).lte('data_bolo', endDate);
        }

        const { data, error } = await query.order('data_bolo', { ascending: false });

        if (!error && data) {
            setBolos(data);

            // Update available years only on initial load or non-month-filtered load to keep list consistent
            if (!showCurrentMonth) {
                const years = Array.from(new Set(data.map((b: any) => new Date(b.data_bolo).getFullYear()))).sort((a: any, b: any) => b - a) as number[];
                setAvailableYears(years);

                const currentYear = new Date().getFullYear();
                if (selectedYear === 'all') {
                    // Default to current year if it exists in data, otherwise first year, otherwise keep all
                    if (years.includes(currentYear)) {
                        setSelectedYear(currentYear);
                    } else if (years.length > 0) {
                        setSelectedYear(years[0]);
                    }
                }
            }
        }
        setLoading(false);
    };

    const filteredBolos = selectedYear === 'all'
        ? bolos
        : bolos.filter(b => new Date(b.data_bolo).getFullYear() === selectedYear);

    const getBoloColumn = (bolo: Bolo): string => {
        const skipStates = ['Cancel·lat', 'Cancel·lats', 'rebutjat', 'REBUTJADA'];
        if (skipStates.includes(bolo.estat as string)) return '';

        const col = COLUMNS.find(c => c.title === (bolo.estat as string));
        if (col) return col.id;

        // Fallback for legacy states
        if (bolo.estat as string === 'Sol·licitat') return 'nova';
        if (bolo.estat as string === 'Confirmat') return 'confirmada';
        if (bolo.estat as string === 'Tancat') return 'tancada';

        // Check if status exists in our COLUMNS titles
        return 'nova';
    };

    const handleMove = async (bolo: Bolo, direction: 'next' | 'prev') => {
        const currentIndex = COLUMNS.findIndex(c => c.id === getBoloColumn(bolo));
        let nextIndex = currentIndex;

        if (direction === 'next' && currentIndex < COLUMNS.length - 1) {
            nextIndex++;
        } else if (direction === 'prev' && currentIndex > 0) {
            nextIndex--;
        }

        if (nextIndex === currentIndex || nextIndex === -1) return;

        const newStatus = COLUMNS[nextIndex].title as BoloStatus;

        setUpdating(bolo.id);
        const { error } = await supabase
            .from('bolos')
            .update({ estat: newStatus })
            .eq('id', bolo.id);

        if (!error) {
            setBolos(prev => prev.map(b => b.id === bolo.id ? { ...b, estat: newStatus } : b));
        }
        setUpdating(null);
    };

    const renderBoloCard = (bolo: Bolo) => (
        <div key={bolo.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10 group-hover:bg-primary transition-colors"></div>

            <Link href={`/bolos/${bolo.id}`} className="block">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{format(new Date(bolo.data_bolo), 'dd/MM/yyyy')}</div>
                    {bolo.import_total > 0 && (
                        <div className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {bolo.import_total.toFixed(0)}€
                        </div>
                    )}
                </div>

                <div className="font-black text-gray-900 leading-tight mb-1 text-sm group-hover:text-primary transition-colors">{bolo.nom_poble}</div>
                <div className="text-[11px] text-gray-400 font-medium truncate flex items-center gap-1">
                    <span className="material-icons-outlined text-xs">business</span>
                    {bolo.client?.nom || 'Sense client'}
                </div>

                {bolo.hora_inici && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50/80 w-fit px-2 py-1 rounded-lg">
                        <span className="material-icons-outlined text-xs">schedule</span>
                        {bolo.hora_inici.substring(0, 5)}h
                    </div>
                )}
            </Link>

            {/* Transition Buttons */}
            <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <button
                    onClick={() => handleMove(bolo, 'prev')}
                    disabled={getBoloColumn(bolo) === 'nova' || updating === bolo.id}
                    className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors border border-gray-100 flex justify-center items-center"
                    title="Anterior estat"
                >
                    <span className="material-icons-outlined text-sm">west</span>
                </button>
                <button
                    onClick={() => handleMove(bolo, 'next')}
                    disabled={getBoloColumn(bolo) === 'tancada' || updating === bolo.id}
                    className="flex-1 py-1.5 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-xl disabled:opacity-30 transition-all border border-primary/10 flex justify-center items-center"
                    title="Següent estat"
                >
                    <span className="material-icons-outlined text-sm">east</span>
                </button>
            </div>

            {updating === bolo.id && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20 animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Actualitzant</span>
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) return <div className="text-center py-20 text-gray-500 font-medium italic">Carregant bolos al tauler...</div>;

    return (
        <div className="space-y-4">
            {/* Month Toggle */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 px-4 sm:px-0">
                <button
                    onClick={() => setShowCurrentMonth(!showCurrentMonth)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all border shrink-0 ${showCurrentMonth
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary shadow-sm'
                        }`}
                    title="Mostra només els bolos del mes actual"
                >
                    <span className="material-icons-outlined text-sm">calendar_month</span>
                    <span className="text-[10px] uppercase">Mes Actual</span>
                    {showCurrentMonth && <span className="material-icons-outlined text-xs ml-1">check_circle</span>}
                </button>
            </div>

            <div className="flex lg:grid lg:grid-cols-6 gap-4 overflow-x-auto lg:overflow-x-visible pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-gray-200">
                {COLUMNS.map(col => (
                    <div key={col.id} className="flex-shrink-0 w-64 lg:w-auto flex flex-col h-[600px] group/col">
                        <div className={`${col.color} ${col.textColor} p-3 rounded-t-2xl font-black uppercase text-[9px] tracking-widest shadow-sm flex justify-between items-center shrink-0`}>
                            <span>{col.title}</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px]">{filteredBolos.filter(b => getBoloColumn(b) === col.id).length}</span>
                        </div>
                        <div className="flex-1 bg-gray-50/50 p-3 rounded-b-2xl border-x border-b border-gray-100 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
                            {filteredBolos
                                .filter(b => getBoloColumn(b) === col.id)
                                .map(renderBoloCard)}

                            {filteredBolos.filter(b => getBoloColumn(b) === col.id).length === 0 && (
                                <div className="text-center py-10 opacity-10 flex flex-col items-center gap-2">
                                    <span className="material-icons-outlined text-4xl">inventory_2</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Buit</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
