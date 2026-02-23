'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Filter,
    Calendar,
    MapPin,
    Tag,
    Activity,
    Euro,
    CreditCard,
    RotateCcw,
    ChevronDown,
    Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterPanelProps {
    onFilterChange: (filters: any) => void;
    availableData: {
        years: string[];
        towns: string[];
        types: string[];
    };
}

const STATUS_OPTIONS = [
    { value: 'tots', label: 'Tots els estats' },
    { value: 'Nova', label: 'Nova' },
    { value: 'Pendent de confirmació', label: 'Pendent' },
    { value: 'Confirmada', label: 'Confirmada' },
    { value: 'Pendents de cobrar', label: 'De cobrar' },
    { value: 'Per pagar', label: 'Per pagar' },
    { value: 'Tancades', label: 'Tancades' },
    { value: 'Cancel·lats', label: 'Cancel·lats' },
];

export default function FilterPanel({ onFilterChange, availableData }: FilterPanelProps) {
    const [filters, setFilters] = useState({
        years: [new Date().getFullYear().toString()] as string[],
        towns: [] as string[],
        types: [] as string[],
        status: [] as string[],
        paymentType: 'tots',
        timeline: 'realitzats',
        minPrice: '',
        maxPrice: ''
    });

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [townSearch, setTownSearch] = useState('');

    // Notify parent on change
    useEffect(() => {
        const timeout = setTimeout(() => {
            onFilterChange(filters);
        }, 300); // Debounce to avoid "weird bugs" during rapid clicks
        return () => clearTimeout(timeout);
    }, [filters, onFilterChange]);

    const toggleMultiSelect = (key: 'years' | 'towns' | 'types' | 'status', value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter(v => v !== value)
                : [...prev[key], value]
        }));
    };

    const resetFilters = () => {
        setFilters({
            years: [],
            towns: [],
            types: [],
            status: [],
            paymentType: 'tots',
            timeline: 'realitzats',
            minPrice: '',
            maxPrice: ''
        });
        setActiveDropdown(null);
        setTownSearch('');
    };

    const Dropdown = ({ id, label, icon: Icon, children, count }: { id: string, label: string, icon: any, children: React.ReactNode, count?: number }) => (
        <div className="relative">
            <button
                onClick={() => setActiveDropdown(activeDropdown === id ? null : id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${activeDropdown === id
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : (count && count > 0)
                        ? 'bg-primary/5 text-primary border-primary/20'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 shadow-sm'
                    }`}
            >
                <Icon size={14} className={activeDropdown === id ? 'text-white' : 'text-primary'} />
                <span>{label}</span>
                {count && count > 0 ? (
                    <span className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${activeDropdown === id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                        {count}
                    </span>
                ) : (
                    <ChevronDown size={14} className={`ml-1 transition-transform ${activeDropdown === id ? 'rotate-180' : ''}`} />
                )}
            </button>

            <AnimatePresence>
                {activeDropdown === id && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveDropdown(null)}
                            className="fixed inset-0 z-[90]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-3xl border border-gray-100 shadow-2xl z-[100] max-h-80 overflow-y-auto p-4 scrollbar-thin"
                        >
                            <div className="flex flex-col gap-1">
                                {children}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    const Option = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-left text-[11px] font-bold transition-all ${active
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
        >
            <span>{label}</span>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
    );

    const TIMELINE_OPTIONS = [
        { value: 'realitzats', label: 'Ja realitzats', sub: 'Confirmats + passats' },
        { value: 'confirmats', label: 'Tots els confirmats', sub: 'Incloent futurs' },
        { value: 'all', label: 'Absolutament tots', sub: 'Incloent cancel·lats' },
    ];

    return (
        <div className="w-full bg-white/50 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 px-4 md:px-10 py-4">
            <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 mr-4 border-r border-gray-100 pr-6 hidden xl:flex">
                    <div className="bg-primary text-white p-2 rounded-xl">
                        <Filter size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Filtres</p>
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter mt-0.5">Configuració d'anàlisi</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Dropdown id="timeline" label="Enfocament" icon={Activity} count={filters.timeline !== 'realitzats' ? 1 : 0}>
                        {TIMELINE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilters(prev => ({ ...prev, timeline: opt.value }))}
                                className={`flex flex-col px-3 py-2.5 rounded-xl text-left transition-all ${filters.timeline === opt.value
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-[11px] font-black uppercase tracking-wider">{opt.label}</span>
                                <span className="text-[9px] font-bold text-gray-400 opacity-70 italic">{opt.sub}</span>
                            </button>
                        ))}
                    </Dropdown>

                    <Dropdown id="years" label="Anys" icon={Calendar} count={filters.years.length}>
                        <Option
                            label="Des de l'inici"
                            active={filters.years.length === 0}
                            onClick={() => setFilters(prev => ({ ...prev, years: [] }))}
                        />
                        <div className="h-px bg-gray-50 my-1" />
                        {availableData.years.map(year => (
                            <Option
                                key={year}
                                label={year}
                                active={filters.years.includes(year)}
                                onClick={() => toggleMultiSelect('years', year)}
                            />
                        ))}
                    </Dropdown>

                    <Dropdown id="status" label="Estat" icon={Activity} count={filters.status.length}>
                        {STATUS_OPTIONS.filter(s => s.value !== 'tots').map(s => (
                            <Option
                                key={s.value}
                                label={s.label}
                                active={filters.status.includes(s.value)}
                                onClick={() => toggleMultiSelect('status', s.value)}
                            />
                        ))}
                    </Dropdown>

                    <Dropdown id="payments" label="Pagament" icon={CreditCard} count={filters.paymentType !== 'tots' ? 1 : 0}>
                        {['tots', 'Factura', 'Efectiu'].map(p => (
                            <Option
                                key={p}
                                label={p === 'tots' ? 'Tots els mètodes' : p}
                                active={filters.paymentType === p}
                                onClick={() => setFilters(prev => ({ ...prev, paymentType: p }))}
                            />
                        ))}
                    </Dropdown>

                    <Dropdown id="types" label="Tipus" icon={Tag} count={filters.types.length}>
                        {availableData.types.map(type => (
                            <Option
                                key={type}
                                label={type}
                                active={filters.types.includes(type)}
                                onClick={() => toggleMultiSelect('types', type)}
                            />
                        ))}
                    </Dropdown>

                    <Dropdown id="towns" label="Pobles" icon={MapPin} count={filters.towns.length}>
                        <div className="px-2 pb-2 sticky top-0 bg-white z-20">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Cerca poble..."
                                    value={townSearch}
                                    onChange={e => setTownSearch(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-xl text-[11px] font-bold pl-9 pr-3 py-2.5 focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            {availableData.towns
                                .filter(t => t.toLowerCase().includes(townSearch.toLowerCase()))
                                .map(town => (
                                    <Option
                                        key={town}
                                        label={town}
                                        active={filters.towns.includes(town)}
                                        onClick={() => toggleMultiSelect('towns', town)}
                                    />
                                ))
                            }
                        </div>
                    </Dropdown>

                    <Dropdown id="price" label="Preu" icon={Euro} count={!!filters.minPrice || !!filters.maxPrice ? 1 : 0}>
                        <div className="p-2 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Rang d'import (€)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Mínim"
                                        value={filters.minPrice}
                                        onChange={e => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                        className="w-full bg-gray-50 border-none rounded-xl text-[11px] font-bold p-2.5 focus:ring-1 focus:ring-primary/30"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Màxim"
                                        value={filters.maxPrice}
                                        onChange={e => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                        className="w-full bg-gray-50 border-none rounded-xl text-[11px] font-bold p-2.5 focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveDropdown(null)}
                                className="w-full py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-colors"
                            >
                                Aplicar
                            </button>
                        </div>
                    </Dropdown>

                    <button
                        onClick={resetFilters}
                        className="p-2.5 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-primary transition-all group"
                        title="Reset filtres"
                    >
                        <RotateCcw size={18} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
                    </button>
                </div>

                <div className="ml-auto hidden lg:block">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Dades en temps real</p>
                </div>
            </div>
        </div>
    );
}
