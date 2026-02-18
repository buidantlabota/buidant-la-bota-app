'use client';

import { useState, useEffect } from 'react';
import {
    X,
    ChevronDown,
    Filter,
    Calendar,
    MapPin,
    Tag,
    Activity,
    Euro,
    CreditCard,
    RotateCcw
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

export default function FilterPanel({ onFilterChange, availableData }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState({
        years: [] as string[],
        towns: [] as string[],
        types: [] as string[],
        status: 'tots',
        paymentType: 'tots',
        minPrice: '',
        maxPrice: ''
    });

    // Notify parent on change
    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const toggleMultiSelect = (key: 'years' | 'towns' | 'types', value: string) => {
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
            status: 'tots',
            paymentType: 'tots',
            minPrice: '',
            maxPrice: ''
        });
    };

    const FilterSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
        <div className="space-y-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Icon size={12} className="text-primary" />
                {title}
            </h5>
            <div className="flex flex-wrap gap-2">
                {children}
            </div>
        </div>
    );

    const Badge = ({ label, active, onClick, color = 'primary' }: { label: string, active: boolean, onClick: () => void, color?: string }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${active
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30 hover:text-primary'
                }`}
        >
            {label}
        </button>
    );

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-50 bg-primary text-white p-4 rounded-full shadow-2xl flex items-center gap-2 font-bold"
            >
                <Filter size={20} />
                Filtres
            </button>

            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Panel */}
            <motion.aside
                className={`fixed lg:sticky top-0 right-0 lg:left-0 h-screen w-80 bg-white border-l lg:border-l-0 lg:border-r border-gray-100 z-[101] lg:z-0 flex flex-col shadow-2xl lg:shadow-none overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                    } transition-transform duration-300`}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h4 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <Filter size={20} className="text-primary" />
                            Filtres
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Personalitza la teva anàlisi</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                    <FilterSection title="Anys" icon={Calendar}>
                        {availableData.years.map(year => (
                            <Badge
                                key={year}
                                label={year}
                                active={filters.years.includes(year)}
                                onClick={() => toggleMultiSelect('years', year)}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Estat" icon={Activity}>
                        {['tots', 'acceptat', 'rebutjat', 'pendent'].map(s => (
                            <Badge
                                key={s}
                                label={s.charAt(0).toUpperCase() + s.slice(1)}
                                active={filters.status === s}
                                onClick={() => setFilters(prev => ({ ...prev, status: s }))}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Forma de Pagament" icon={CreditCard}>
                        {['tots', 'Factura', 'Efectiu'].map(p => (
                            <Badge
                                key={p}
                                label={p === 'tots' ? 'Tots' : p}
                                active={filters.paymentType === p}
                                onClick={() => setFilters(prev => ({ ...prev, paymentType: p }))}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Tipus Actuació" icon={Tag}>
                        {availableData.types.slice(0, 10).map(type => (
                            <Badge
                                key={type}
                                label={type}
                                active={filters.types.includes(type)}
                                onClick={() => toggleMultiSelect('types', type)}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Pobles" icon={MapPin}>
                        {availableData.towns.slice(0, 15).map(town => (
                            <Badge
                                key={town}
                                label={town}
                                active={filters.towns.includes(town)}
                                onClick={() => toggleMultiSelect('towns', town)}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Preu (€)" icon={Euro}>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minPrice}
                                onChange={e => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                className="w-full bg-gray-50 border-none rounded-xl text-xs font-bold p-3 focus:ring-2 focus:ring-primary/20"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.maxPrice}
                                onChange={e => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                className="w-full bg-gray-50 border-none rounded-xl text-xs font-bold p-3 focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </FilterSection>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={resetFilters}
                        className="w-full py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group shadow-sm"
                    >
                        <RotateCcw size={14} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
                        Reset Filtres
                    </button>
                </div>
            </motion.aside>
        </>
    );
}
