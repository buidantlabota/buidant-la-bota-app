'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Solicitud } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { Eye, CheckCircle, XCircle, UserPlus, FileText } from 'lucide-react';

export default function SolicitudsPage() {
    const supabase = createClient();
    const [solicituds, setSolicituds] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'TOTES' | 'NOVA' | 'ACCEPTADA' | 'REBUTJADA'>('NOVA');
    const [filterYear, setFilterYear] = useState<string>('tots');
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    useEffect(() => {
        fetchSolicituds();
    }, []);

    const fetchSolicituds = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('solicituds')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSolicituds(data);

            // Extract years from data_actuacio (or created_at if null)
            const years = Array.from(new Set(data.map((s: Solicitud) => {
                const dateStr = (s.data_actuacio || s.created_at) as string;
                return new Date(dateStr).getFullYear().toString();
            }))).sort().reverse() as string[];
            setAvailableYears(years);
        }
        setLoading(false);
    };

    const filteredSolicituds = solicituds.filter((s: Solicitud) => {
        const matchesEstat = filter === 'TOTES' || s.estat === filter;

        let matchesYear = true;
        if (filterYear !== 'tots') {
            const dateStr = s.data_actuacio || s.created_at;
            matchesYear = new Date(dateStr).getFullYear().toString() === filterYear;
        }

        return matchesEstat && matchesYear;
    });

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sol·licituds Web</h1>
                    <p className="text-gray-500 mt-1">Gestió d'entrades des del formulari públic</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="flex-1 lg:flex-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="tots">Tots els anys</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm overflow-x-auto no-scrollbar w-full lg:w-auto">
                        {(['NOVA', 'ACCEPTADA', 'REBUTJADA', 'TOTES'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 lg:flex-none px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4">Data Entrada</th>
                                <th className="p-4">Concepte</th>
                                <th className="p-4">Municipi / Data Acte</th>
                                <th className="p-4">Contacte</th>
                                <th className="p-4">Estat</th>
                                <th className="p-4 text-right">Accions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-12 text-center text-gray-400">Carregant sol·licituds...</td></tr>
                            ) : filteredSolicituds.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-gray-400">No hi ha sol·licituds amb aquest filtre.</td></tr>
                            ) : (
                                filteredSolicituds.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap text-gray-500 font-mono">
                                            {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{s.concepte}</div>
                                            <div className="text-xs text-gray-400">{s.tipus_actuacio}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-700">{s.municipi || '---'}</div>
                                            <div className="text-xs text-gray-500">
                                                {s.data_actuacio ? format(new Date(s.data_actuacio), 'dd/MM/yyyy') : 'Sense data'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{s.contacte_nom}</div>
                                            <div className="text-xs text-gray-400 font-mono">{s.contacte_email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.estat === 'NOVA' ? 'bg-blue-100 text-blue-700' :
                                                s.estat === 'ACCEPTADA' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                {s.estat}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/solicituds/${s.id}`}
                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                    title="Veure detall"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
