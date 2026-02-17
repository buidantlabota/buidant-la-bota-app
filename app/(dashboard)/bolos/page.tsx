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
    onChange
}: {
    label: string,
    options: { value: string, label: string }[],
    selected: string[],
    onChange: (values: string[]) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
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
                                ? options.find(o => o.value === selected[0])?.label
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
                <div className="absolute z-50 w-full min-w-[200px] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto">
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
    const [filterTipusIngres, setFilterTipusIngres] = useState('tots');
    const [filterAny, setFilterAny] = useState('tots');
    const [filterTipusActuacio, setFilterTipusActuacio] = useState('tots');
    const [availableYears, setAvailableYears] = useState<string[]>([]);

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
        }
        setLoading(false);
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

        if (filterTipusIngres !== 'tots') {
            if (bolo.tipus_ingres !== filterTipusIngres) return false;
        }

        if (filterAny !== 'tots') {
            const year = new Date(bolo.data_bolo).getFullYear().toString();
            if (year !== filterAny) return false;
        }

        if (filterTipusActuacio !== 'tots') {
            if (bolo.tipus_actuacio !== filterTipusActuacio) return false;
        }

        return true;
    });

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
                    <p className="text-gray-500 mt-1">Llista completa i seguiment d'actuacions</p>
                </div>
                <Link
                    href="/bolos/new"
                    className="btn-primary"
                >
                    <span className="material-icons-outlined">add</span>
                    <span>Afegir nou bolo</span>
                </Link>
            </div>

            {/* Filters Area */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Cerca Poble o Client</label>
                        <div className="relative">
                            <span className="material-icons-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Cerca per municipi, poble o client..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Any Filter */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:contents">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Any</label>
                            <select
                                value={filterAny}
                                onChange={(e) => setFilterAny(e.target.value)}
                            >
                                <option value="tots">Tots</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <MultiSelectFilter
                                label="Estat"
                                options={STATUS_OPTIONS}
                                selected={filterEstat}
                                onChange={setFilterEstat}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    {/* Tipus Ingrés Filter */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Tipus d'ingrés</label>
                        <select
                            value={filterTipusIngres}
                            onChange={(e) => setFilterTipusIngres(e.target.value)}
                        >
                            <option value="tots">Tots els tipus</option>
                            <option value="Efectiu">Efectiu</option>
                            <option value="Factura">Factura</option>
                            <option value="Altres">Altres</option>
                        </select>
                    </div>

                    {/* Tipus Actuació Filter */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Tipus d'actuació</label>
                        <select
                            value={filterTipusActuacio}
                            onChange={(e) => setFilterTipusActuacio(e.target.value)}
                        >
                            <option value="tots">Tots els tipus</option>
                            <option value="Festa Major">Festa Major</option>
                            <option value="Cercavila">Cercavila</option>
                            <option value="Correbars">Correbars</option>
                            <option value="Casament">Casament</option>
                            <option value="Privat">Privat</option>
                            <option value="Altres">Altres</option>
                        </select>
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
                                    <div className="flex items-center gap-4 pt-8 pb-2 first:pt-0">
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
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                            {/* Població - Always show if titol exists, or just show it anyway for context */}
                                                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                                <span className="material-icons-outlined text-base">location_on</span>
                                                                <span className="font-medium">{bolo.nom_poble}</span>
                                                            </div>

                                                            {bolo.client?.nom && (
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                                    <span className="material-icons-outlined text-base">business</span>
                                                                    <span className="font-medium truncate max-w-[150px]">{bolo.client.nom}</span>
                                                                </div>
                                                            )}
                                                            {bolo.concepte && (
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                                    <span className="material-icons-outlined text-base">info</span>
                                                                    <span className="truncate italic">"{bolo.concepte}"</span>
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
        </div>
    );
}
