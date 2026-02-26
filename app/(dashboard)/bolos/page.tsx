'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Bolo } from '@/types';
import { ChevronDown, Check, X } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'Nova', label: 'Nova' },
    { value: 'Pendent de confirmació', label: 'Pendent' },
    { value: 'Confirmada', label: 'Confirmada' },
    { value: 'Pendents de cobrar', label: 'De cobrar' },
    { value: 'Per pagar', label: 'Per pagar' },
    { value: 'Tancades', label: 'Tancades' },
    { value: 'Cancel·lats', label: 'Cancel·lats' },
];

const MultiSelectFilter = ({
    label,
    options,
    selected,
    onChange,
    allowAdd,
    onAddOption
}: {
    label: string,
    options: { value: string, label: string }[],
    selected: string[],
    onChange: (values: string[]) => void,
    allowAdd?: boolean,
    onAddOption?: (value: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newType, setNewType] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
        setIsOpen(false);
    };

    const handleAddNew = () => {
        const trimmed = newType.trim();
        if (!trimmed) return;
        onAddOption?.(trimmed);
        onChange([...selected, trimmed]);
        setNewType('');
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-left flex justify-between items-center hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[38px]"
            >
                <div className="flex flex-wrap gap-1 max-w-[calc(100%-24px)]">
                    {selected.length === 0 ? (
                        <span className="text-gray-500">Tots</span>
                    ) : (
                        <span className="truncate block font-medium">
                            {selected.length === 1
                                ? (options.find(o => o.value === selected[0])?.label || selected[0])
                                : `${selected.length} seleccionats`}
                        </span>
                    )}
                </div>
                <div className="flex items-center shrink-0 ml-1">
                    {selected.length > 0 && (
                        <span
                            onClick={clearSelection}
                            className="mr-1 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={14} />
                        </span>
                    )}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full min-w-[200px] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-72 overflow-y-auto">
                    <div
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-100"
                        onClick={() => { onChange([]); setIsOpen(false); }}
                    >
                        <span className={`text-sm ${selected.length === 0 ? 'font-bold text-blue-600' : 'text-gray-700'}`}>Tots</span>
                        {selected.length === 0 && <Check size={16} className="text-blue-600" />}
                    </div>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                            onClick={() => toggleOption(option.value)}
                        >
                            <span className={`text-sm ${selected.includes(option.value) ? 'font-medium text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                {option.label}
                            </span>
                            {selected.includes(option.value) && <Check size={16} className="text-blue-600" />}
                        </div>
                    ))}
                    {allowAdd && (
                        <div className="border-t border-gray-100 p-2 mt-1">
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={newType}
                                    onChange={e => setNewType(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNew(); } }}
                                    placeholder="Nou tipus..."
                                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    onClick={e => e.stopPropagation()}
                                />
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleAddNew(); }}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-bold hover:bg-blue-700 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export default function BolosPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstat, setFilterEstat] = useState<string[]>([]);
    const [filterTipusIngres, setFilterTipusIngres] = useState<string[]>([]);
    const [filterAny, setFilterAny] = useState('tots');
    const [filterTipusActuacio, setFilterTipusActuacio] = useState<string[]>([]);
    const [filterCurrentMonth, setFilterCurrentMonth] = useState(false);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<string>('data-desc');
    const [actuacioOptions, setActuacioOptions] = useState<{ value: string, label: string }[]>([]);

    // Pot Stats for the header
    const [potStats, setPotStats] = useState({ real: 0, dispo: 0 });
    const [showPotRegistry, setShowPotRegistry] = useState(false);
    const [potLedger, setPotLedger] = useState<any[]>([]);
    const [selectedBoloForConvocatoria, setSelectedBoloForConvocatoria] = useState<Bolo | null>(null);
    const [convocatoriaText, setConvocatoriaText] = useState('');

    const generateConvocatoria = (bolo: Bolo) => {
        const dateStr = new Date(bolo.data_bolo).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const text = `📣 *CONVOCATÒRIA BUIDANT LA BOTA* 📣

📍 *Poble:* ${bolo.nom_poble}
📅 *Data:* ${dateStr}
⏰ *Hora:* ${(bolo.hora_inici || '').substring(0, 5)}
👕 *Vestimenta:* ${bolo.vestimenta || 'Per confirmar'}
📂 *Partitures:* ${bolo.partitures || 'Per confirmar'}
🗺️ *Ubicació:* ${bolo.ubicacio_detallada || 'Per confirmar'}
🏁 *Punt d'inici:* ${bolo.ubicacio_inici || 'Per confirmar'}
${bolo.maps_inici ? `🗺️ *MAPS Inici:* ${bolo.maps_inici}\n` : ''}📦 *Fundes:* ${bolo.notes_fundes || 'Per confirmar'}
${bolo.maps_fundes ? `🗺️ *MAPS Fundes:* ${bolo.maps_fundes}\n` : ''}
📝 *Notes:* ${bolo.notes || 'Cap nota addicional'}

_Es prega confirmació el més aviat possible!_ 🎺🥁`;

        setConvocatoriaText(text);
        setSelectedBoloForConvocatoria(bolo);
    };

    const copyConvocatoria = () => {
        navigator.clipboard.writeText(convocatoriaText);
        alert('Text copiat correctament! Ara el pots enganxar a WhatsApp.');
    };

    // Persistence and Scroll Restoration
    useEffect(() => {
        // Restore filters
        const savedFilters = sessionStorage.getItem('bolos_filters');
        if (savedFilters) {
            try {
                const parsed = JSON.parse(savedFilters);
                setSearchTerm(parsed.searchTerm || '');
                setFilterEstat(parsed.filterEstat || []);
                setFilterTipusIngres(parsed.filterTipusIngres || []);
                setFilterAny(parsed.filterAny || 'tots');
                setFilterTipusActuacio(parsed.filterTipusActuacio || []);
                setFilterCurrentMonth(parsed.filterCurrentMonth || false);
                setSortBy(parsed.sortBy || 'data-desc');
            } catch (e) {
                console.error('Error restoring filters:', e);
            }
        }

        const handleScroll = () => {
            sessionStorage.setItem('bolos_scroll', window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Restoration of scroll after loading
    useEffect(() => {
        if (!loading && bolos.length > 0) {
            const savedScroll = sessionStorage.getItem('bolos_scroll');
            if (savedScroll) {
                setTimeout(() => {
                    window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
                }, 100);
            }
        }
    }, [loading]);

    // Save filters whenever they change
    useEffect(() => {
        const filters = {
            searchTerm,
            filterEstat,
            filterTipusIngres,
            filterAny,
            filterTipusActuacio,
            filterCurrentMonth,
            sortBy
        };
        sessionStorage.setItem('bolos_filters', JSON.stringify(filters));
    }, [searchTerm, filterEstat, filterTipusIngres, filterAny, filterTipusActuacio, filterCurrentMonth, sortBy]);

    useEffect(() => {
        fetchBolos();
    }, []);

    const fetchBolos = async (silent = false) => {
        if (!silent) setLoading(true);
        const { data, error } = await supabase
            .from('bolos')
            .select('*, client:clients(nom, id)')
            .order('data_bolo', { ascending: false });

        if (error) {
            console.error('Error fetching bolos:', error);
        } else {
            setBolos(data || []);

            // Extract years
            const years = Array.from(new Set((data || []).map((b: Bolo) => new Date(b.data_bolo).getFullYear().toString()))).sort().reverse();
            setAvailableYears(years as string[]);

            // Extract unique act types
            const types = Array.from(new Set((data as any[] || []).map((b: any) => b.tipus_actuacio).filter((t: any) => !!t)));
            const baseTypes = ['Festa Major', 'Cercavila', 'Concert', 'Correfoc', 'Privat', 'Casament'];
            const allTypes = Array.from(new Set([...baseTypes, ...types as string[]])).sort();
            setActuacioOptions(allTypes.map(t => ({ value: t, label: t })));

            // Fetch Pot Stats silently
            fetchPotStats(data || []);
        }
        setLoading(false);
    };

    const fetchPotStats = async (allBolos: any[]) => {
        const cutoffDate = '2025-01-01';
        const potBase = 510;

        // 1. Manual Movements
        const { data: allMovements } = await supabase
            .from('despeses_ingressos')
            .select('*')
            .gte('data', cutoffDate);

        // 2. Advances
        const { data: allAdvances } = await supabase
            .from('pagaments_anticipats')
            .select('*, bolos(estat, data_bolo)')
            .gte('data_pagament', cutoffDate);

        const bolos2025 = allBolos.filter((b: any) => b.data_bolo >= cutoffDate);
        const manualBalance = (allMovements || []).reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

        const potRealValue = bolos2025
            .filter((b: any) => b.cobrat && b.pagaments_musics_fets)
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        const dinersDispoValue = bolos2025
            .filter((b: any) => b.cobrat)
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        const pendingAdvancesValue = (allAdvances || [])
            .filter((p: any) => !['Tancat', 'Tancades'].includes((p.bolos as any)?.estat))
            .reduce((sum: number, p: any) => sum + (p.import || 0), 0);

        const real = potBase + manualBalance + potRealValue - pendingAdvancesValue;
        const dispo = potBase + manualBalance + dinersDispoValue - pendingAdvancesValue;

        setPotStats({ real, dispo });

        // Ledger for the registry view
        const manualLedgerEntries = (allMovements || []).map((m: any) => ({
            date: m.data,
            description: m.descripcio,
            amount: m.tipus === 'ingrés' ? m.import : -m.import,
            type: 'manual'
        }));
        const boloLedgerEntries = bolos2025
            .filter((b: any) => b.cobrat && b.pagaments_musics_fets)
            .map((b: any) => ({
                date: b.data_bolo,
                description: `Bolo: ${b.nom_poble}`,
                amount: b.pot_delta_final || 0,
                type: 'bolo'
            }));
        const sorted = [...manualLedgerEntries, ...boloLedgerEntries].sort((a, b) => a.date.localeCompare(b.date));
        let cur = potBase;
        const withBalance = sorted.map(e => {
            const before = cur;
            cur += e.amount;
            return { ...e, before, after: cur };
        });
        setPotLedger(withBalance.reverse().slice(0, 10)); // Just last 10 for the bolos page
    };

    // Filter logic
    const filteredBolos = bolos.filter((bolo: Bolo) => {
        const searchLower = searchTerm.toLowerCase();
        const clientNom = bolo.client?.nom || '';
        const titol = bolo.titol || '';
        const matchesSearch =
            bolo.nom_poble.toLowerCase().includes(searchLower) ||
            titol.toLowerCase().includes(searchLower) ||
            clientNom.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        if (filterEstat.length > 0 && !filterEstat.includes('tots')) {
            if (!filterEstat.includes(bolo.estat)) return false;
        }

        if (filterTipusIngres.length > 0 && !filterTipusIngres.includes('tots')) {
            if (!filterTipusIngres.includes(bolo.tipus_ingres)) return false;
        }

        if (filterCurrentMonth) {
            // No hide, just highlight? User said "et porti al mes actual pero que no toculti els altres"
            // So if filterCurrentMonth is ON, we don't return false here, we use it for scrolling logic elsewhere
            // But if they "deixar marcada", maybe they want to see only those?
            // "Osigui el que vull que faci aquest boto es que et porti al mes actual pero que no toculti elsa ltres, sino que et situi a sobre del mes actual."
            // Okay, so filter logic remains same.
        }

        if (filterAny !== 'tots') {
            const year = new Date(bolo.data_bolo).getFullYear().toString();
            if (year !== filterAny) return false;
        }

        if (filterTipusActuacio.length > 0 && !filterTipusActuacio.includes('tots')) {
            if (!filterTipusActuacio.includes(bolo.tipus_actuacio || '')) return false;
        }

        return true;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'poble-asc':
                return a.nom_poble.localeCompare(b.nom_poble);
            case 'poble-desc':
                return b.nom_poble.localeCompare(a.nom_poble);
            case 'preu-desc':
                return (b.import_total || 0) - (a.import_total || 0);
            case 'preu-asc':
                return (a.import_total || 0) - (b.import_total || 0);
            case 'tipus-asc':
                return (a.tipus_actuacio || '').localeCompare(b.tipus_actuacio || '');
            case 'data-asc':
                return new Date(a.data_bolo).getTime() - new Date(b.data_bolo).getTime();
            case 'data-desc':
            default:
                return new Date(b.data_bolo).getTime() - new Date(a.data_bolo).getTime();
        }
    });

    // Scroll to current month when button is clicked or on load if active
    useEffect(() => {
        if (filterCurrentMonth && bolos.length > 0) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const element = document.getElementById(`month-${year}-${month}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [filterCurrentMonth, bolos]);

    const handleDelete = async (e: React.MouseEvent, id: string | number) => {
        e.preventDefault();
        if (!confirm('⚠️ ATENCIÓ: Segur que vols eliminar aquest bolo?')) return;
        if (!confirm('❗ CONFIRMACIÓ FINAL: Es perdran totes les dades del bolo. No es pot desfer.')) return;

        try {
            const { error } = await supabase
                .from('bolos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBolos(bolos.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting bolo:', error);
            alert('Error al eliminar el bolo');
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestió de bolos</h1>
                    <div className="flex items-center gap-6 mt-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg shadow-sm border border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pot Real</span>
                            <span className="font-mono font-black text-sm">{potStats.real.toFixed(2)}€</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950 text-white rounded-lg shadow-sm border border-emerald-900">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">En disposició</span>
                            <span className="font-mono font-black text-sm">{potStats.dispo.toFixed(2)}€</span>
                        </div>
                        <button
                            onClick={() => setShowPotRegistry(!showPotRegistry)}
                            className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-icons-outlined text-sm">history</span>
                            Registre
                        </button>
                    </div>
                </div>
                <Link
                    href="/bolos/new"
                    className="btn-primary"
                >
                    <span className="material-icons-outlined">add</span>
                    <span>Afegir nou bolo</span>
                </Link>
            </div>

            {/* Pot Registry View */}
            {showPotRegistry && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                            <span className="material-icons-outlined text-sm">account_balance</span>
                            Últims moviments de Pot (Real)
                        </h3>
                        <Link href="/pot" className="text-[10px] font-bold text-primary hover:underline">Veure tot l'historial</Link>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-100 italic text-slate-400">
                                <tr>
                                    <th className="p-3 font-medium">Data</th>
                                    <th className="p-3 font-medium">Concepte</th>
                                    <th className="p-3 text-right font-medium">Anterior</th>
                                    <th className="p-3 text-right font-medium">Diferència</th>
                                    <th className="p-3 text-right font-medium">Nou</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {potLedger.map((m, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3 font-mono text-slate-400">
                                            {new Date(m.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
                                        </td>
                                        <td className="p-3 font-bold text-slate-700">{m.description}</td>
                                        <td className="p-3 text-right text-slate-400 font-mono">{m.before.toFixed(2)}€</td>
                                        <td className={`p-3 text-right font-mono font-black ${m.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {m.amount >= 0 ? '+' : ''}{m.amount.toFixed(2)}€
                                        </td>
                                        <td className="p-3 text-right font-mono font-black text-slate-900">{m.after.toFixed(2)}€</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Filters Area */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                {/* Row 1: Search & Main Filters */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Search */}
                    <div className="lg:col-span-4">
                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 ml-1">Cerca Poble o Client</label>
                        <div className="relative group">
                            <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Cerca per municipi, poble o client..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Temporary Filter (Year + Month Toggle) */}
                    <div className="lg:col-span-4">
                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 ml-1">Filtre Temporal</label>
                        <div className="flex gap-2">
                            <select
                                className={`flex-1 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm h-[44px] ${filterCurrentMonth ? 'opacity-40 pointer-events-none' : ''}`}
                                value={filterAny}
                                onChange={(e) => setFilterAny(e.target.value)}
                            >
                                <option value="tots">Tots els anys</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setFilterCurrentMonth(!filterCurrentMonth)}
                                className={`px-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border shrink-0 h-[44px] ${filterCurrentMonth
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary hover:text-primary'
                                    }`}
                                title="Situa't sobre els bolos del mes actual"
                            >
                                Mes Actual
                            </button>
                        </div>
                    </div>

                    {/* Sorting */}
                    <div className="lg:col-span-4">
                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 ml-1">Ordenar per</label>
                        <select
                            className="w-full bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm h-[44px]"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="data-desc">🗓️ Data (més recent)</option>
                            <option value="data-asc">🗓️ Data (antic primer)</option>
                            <option value="poble-asc">🏘️ Poble (A-Z)</option>
                            <option value="poble-desc">🏘️ Poble (Z-A)</option>
                            <option value="preu-desc">💰 Preu (més car)</option>
                            <option value="preu-asc">💰 Preu (més barat)</option>
                            <option value="tipus-asc">🏷️ Tipus actuació</option>
                        </select>
                    </div>
                </div>

                {/* Row 2: Multi-select Tags */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div>
                        <MultiSelectFilter
                            label="Estat"
                            options={STATUS_OPTIONS}
                            selected={filterEstat}
                            onChange={setFilterEstat}
                        />
                    </div>
                    <div>
                        <MultiSelectFilter
                            label="Tipus d'ingrés"
                            options={[
                                { value: 'Efectiu', label: 'Efectiu' },
                                { value: 'Factura', label: 'Factura' },
                                { value: 'Altres', label: 'Altres' }
                            ]}
                            selected={filterTipusIngres}
                            onChange={setFilterTipusIngres}
                        />
                    </div>
                    <div>
                        <MultiSelectFilter
                            label="Tipus d'actuació"
                            options={actuacioOptions}
                            selected={filterTipusActuacio}
                            onChange={setFilterTipusActuacio}
                            allowAdd
                            onAddOption={(newType) => {
                                setActuacioOptions(prev => {
                                    if (prev.find(o => o.value === newType)) return prev;
                                    return [...prev, { value: newType, label: newType }].sort((a, b) => a.label.localeCompare(b.label));
                                });
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading && bolos.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-gray-100">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Carregant bolos...</p>
                    </div>
                ) : filteredBolos.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-2xl border border-gray-100">
                        <span className="material-icons-outlined text-4xl text-gray-300 mb-2">event_busy</span>
                        <p className="text-gray-500 font-medium">No s'han trobat bolos amb aquests filtres.</p>
                    </div>
                ) : (
                    filteredBolos.map((bolo, index) => {
                        const date = new Date(bolo.data_bolo);
                        const day = date.getDate();
                        const month = date.toLocaleDateString('ca-ES', { month: 'short' }).toUpperCase();

                        const prevBolo = index > 0 ? filteredBolos[index - 1] : null;
                        const prevDate = prevBolo ? new Date(prevBolo.data_bolo) : null;
                        const showSeparator = !prevDate ||
                            date.getMonth() !== prevDate.getMonth() ||
                            date.getFullYear() !== prevDate.getFullYear();

                        return (
                            <div key={bolo.id} className="space-y-4">
                                {showSeparator && (
                                    <div
                                        id={`month-${date.getFullYear()}-${date.getMonth()}`}
                                        className="flex items-center gap-4 pt-8 pb-2 first:pt-0 scroll-mt-20"
                                    >
                                        <h2 className="text-sm font-black text-primary uppercase tracking-[0.2em] whitespace-nowrap">
                                            {date.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
                                        </h2>
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                    </div>
                                )}

                                <Link
                                    href={`/bolos/${bolo.id}`}
                                    className="group block"
                                >
                                    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center gap-6">
                                            {/* Date Square */}
                                            <div className="flex-shrink-0 text-center w-16 h-16 bg-gray-50 rounded-xl flex flex-col justify-center border border-gray-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                                                <div className="text-2xl font-black text-gray-900 leading-none">{day}</div>
                                                <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">{month}</div>
                                            </div>

                                            {/* Main Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors truncate">
                                                            {bolo.titol || bolo.nom_poble}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                                            {/* Població */}
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                                                <span className="material-icons-outlined text-sm">location_on</span>
                                                                <span className="font-bold">{bolo.nom_poble}</span>
                                                            </div>

                                                            {bolo.client?.nom && (
                                                                <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                                    <span className="material-icons-outlined text-sm">business</span>
                                                                    <span className="font-bold truncate max-w-[150px]">{bolo.client.nom}</span>
                                                                </div>
                                                            )}
                                                            {bolo.concepte && (
                                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 italic">
                                                                    <span className="material-icons-outlined text-sm">info</span>
                                                                    <span className="truncate">"{bolo.concepte}"</span>
                                                                </div>
                                                            )}
                                                            {bolo.notes && (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 w-full sm:w-auto mt-1 sm:mt-0 shadow-sm font-medium">
                                                                    <span className="material-icons-outlined text-xs">notes</span>
                                                                    <span className="truncate max-w-[250px]">{bolo.notes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Price / Subinfo */}
                                                    <div className="text-right hidden sm:block">
                                                        <div className="text-sm font-black text-gray-900">
                                                            {bolo.import_total ? `${bolo.import_total.toFixed(2)} €` : 'N/D'}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                            {bolo.tipus_ingres || 'Efectiu'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Badge & Meta */}
                                            <div className="flex items-center gap-4">
                                                <span className={`hidden sm:inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm transition-transform group-hover:scale-105 ${bolo.estat === 'Nova' ? 'bg-red-600 text-white' :
                                                    bolo.estat === 'Pendent de confirmació' ? 'bg-orange-500 text-white' :
                                                        bolo.estat === 'Confirmada' ? 'bg-emerald-500 text-white' :
                                                            bolo.estat === 'Pendents de cobrar' ? 'bg-yellow-400 text-gray-900' :
                                                                bolo.estat === 'Per pagar' ? 'bg-lime-500 text-gray-900' :
                                                                    bolo.estat === 'Tancades' ? 'bg-red-900 text-white' :
                                                                        bolo.estat === 'Cancel·lats' ? 'bg-red-500 text-white' :
                                                                            'bg-slate-400 text-white'
                                                    }`}>
                                                    {bolo.estat}
                                                </span>

                                                {/* Convo Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        generateConvocatoria(bolo);
                                                    }}
                                                    className="p-2 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                    title="Sol·licitar Convocatòria"
                                                >
                                                    <span className="material-icons-outlined">chat</span>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={(e) => handleDelete(e, bolo.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Eliminar bolo"
                                                >
                                                    <span className="material-icons-outlined">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>
            {/* Convocatoria Modal */}
            {selectedBoloForConvocatoria && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-green-600 p-6 flex justify-between items-center text-white">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <span className="material-icons-outlined">chat</span>
                                Sol·licitar Convocatòria
                            </h2>
                            <button onClick={() => setSelectedBoloForConvocatoria(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                <span className="material-icons-outlined text-2xl">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-500 font-medium italic">
                                Aquest és el model de convocatòria. Pots editar-lo aquí mateix abans de copiar-lo per WhatsApp.
                            </p>
                            <textarea
                                className="w-full h-80 p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 font-mono text-sm focus:border-green-500 focus:outline-none transition-colors"
                                value={convocatoriaText}
                                onChange={(e) => setConvocatoriaText(e.target.value)}
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSelectedBoloForConvocatoria(null)}
                                    className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                                >
                                    Tancar
                                </button>
                                <button
                                    onClick={copyConvocatoria}
                                    className="flex-1 py-4 rounded-2xl bg-green-600 text-white font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-outlined text-base">content_copy</span>
                                    Copiar Text
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
