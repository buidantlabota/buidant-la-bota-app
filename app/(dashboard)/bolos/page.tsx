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
    const [filterTipusIngres, setFilterTipusIngres] = useState<string[]>([]);
    const [filterAny, setFilterAny] = useState('tots');
    const [filterTipusActuacio, setFilterTipusActuacio] = useState<string[]>([]);
    const [filterCurrentMonth, setFilterCurrentMonth] = useState(false);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<string>('data-desc');
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

        // Restore scroll position after a short delay to allow content to render
        const savedScroll = sessionStorage.getItem('bolos_scroll');
        if (savedScroll) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScroll));
            }, 100);
        }

        const handleScroll = () => {
            sessionStorage.setItem('bolos_scroll', window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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

                    {/* Any Filter & Month Toggle */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:contents">
                        <div className="flex flex-col">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Filtre Temporal</label>
                            <div className="flex gap-2 h-[42px]">
                                <select
                                    className={`flex-1 ${filterCurrentMonth ? 'opacity-50 pointer-events-none' : ''}`}
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
                                    className={`px-4 rounded-xl font-bold text-xs transition-all border shrink-0 ${filterCurrentMonth
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white text-gray-500 border-gray-300 hover:border-primary hover:text-primary shadow-sm'
                                        }`}
                                    title="Situa't sobre els bolos del mes actual"
                                >
                                    Mes Actual
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Ordenar per</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="data-desc">Data (més recent)</option>
                                <option value="data-asc">Data (antic primer)</option>
                                <option value="poble-asc">Poble (A-Z)</option>
                                <option value="poble-desc">Poble (Z-A)</option>
                                <option value="preu-desc">Preu (més car)</option>
                                <option value="preu-asc">Preu (més barat)</option>
                                <option value="tipus-asc">Tipus actuació</option>
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

                    {/* Tipus Actuació Filter */}
                    <div>
                        <MultiSelectFilter
                            label="Tipus d'actuació"
                            options={[
                                { value: 'Festa Major', label: 'Festa Major' },
                                { value: 'Cercavila', label: 'Cercavila' },
                                { value: 'Correbars', label: 'Correbars' },
                                { value: 'Casament', label: 'Casament' },
                                { value: 'Privat', label: 'Privat' },
                                { value: 'Altres', label: 'Altres' }
                            ]}
                            selected={filterTipusActuacio}
                            onChange={setFilterTipusActuacio}
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
