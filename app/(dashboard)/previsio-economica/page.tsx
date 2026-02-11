'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, addDays, isBefore, parseISO } from 'date-fns';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
    DollarSign, Calendar, Plus, Trash2, Edit2, Save, X,
    ArrowRight
} from 'lucide-react';

// Interfaces
interface ForecastItem {
    id: string;
    type: 'expense' | 'investment';
    name: string;
    amount: number;
    date: string | null; // stored as YYYY-MM-DD
    category?: string;
    status?: string;
    is_active: boolean; // used for both active expenses and included investments
}

interface EconomySettings {
    id: string;
    reserve_min: number;
    default_horizon_days: number;
}

export default function ForecastPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    // Data State
    const [currentPot, setCurrentPot] = useState(0);
    const [expenses, setExpenses] = useState<ForecastItem[]>([]);
    const [investments, setInvestments] = useState<ForecastItem[]>([]);
    const [settings, setSettings] = useState<EconomySettings>({ id: '', reserve_min: 0, default_horizon_days: 90 });

    // UI State
    const [horizonDays, setHorizonDays] = useState(90);

    // --- 1. Fetch Data ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // A. Calculate Current Pot (Logic from Pot Page)
            const { data: boloData } = await supabase.from('bolos').select('pot_delta_final').not('pot_delta_final', 'is', null);
            const totalBoloPot = (boloData || []).reduce((sum, b) => sum + (b.pot_delta_final || 0), 0);

            const { data: allMovements } = await supabase.from('despeses_ingressos').select('import, tipus');
            const totalExtraPot = (allMovements || []).reduce((sum, m) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

            setCurrentPot(totalBoloPot + totalExtraPot);

            // B. Fetch Forecast Items
            const { data: items } = await supabase.from('forecast_items').select('*').order('date', { ascending: true });
            if (items) {
                setExpenses(items.filter(i => i.type === 'expense'));
                setInvestments(items.filter(i => i.type === 'investment'));
            }

            // C. Fetch Settings
            const { data: setts } = await supabase.from('economy_settings').select('*').single();
            if (setts) {
                setSettings(setts);
                setHorizonDays(setts.default_horizon_days || 90);
            }

        } catch (error) {
            console.error("Error fetching forecast data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- 2. Calculations ---
    const horizonDate = addDays(new Date(), horizonDays);

    const activeExpensesTotal = useMemo(() => {
        return expenses
            .filter(e => e.is_active)
            .filter(e => !e.date || isBefore(parseISO(e.date), horizonDate))
            .reduce((sum, e) => sum + (e.amount || 0), 0);
    }, [expenses, horizonDate]);

    const activeInvestmentsTotal = useMemo(() => {
        return investments
            .filter(i => i.is_active) // using 'is_active' as 'include_in_calc'
            .filter(i => !i.date || isBefore(parseISO(i.date), horizonDate))
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }, [investments, horizonDate]);

    const projectedPotAfterExpenses = currentPot - activeExpensesTotal;
    const finalProjectedPot = projectedPotAfterExpenses - activeInvestmentsTotal;

    const trafficLight = useMemo(() => {
        if (finalProjectedPot < 0) return 'red';
        if (finalProjectedPot < settings.reserve_min) return 'yellow';
        return 'green';
    }, [finalProjectedPot, settings.reserve_min]);

    // --- 3. Handlers ---

    // Generic Item Operations
    const handleAddItem = async (type: 'expense' | 'investment') => {
        const newItem = {
            type,
            name: type === 'expense' ? 'Nova Despesa' : 'Nova Inversió',
            amount: 0,
            is_active: type === 'expense', // Expenses active by default, Investments maybe not? Let's say yes for UX.
            date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
        };

        const { data, error } = await supabase.from('forecast_items').insert(newItem).select().single();
        if (data && !error) {
            if (type === 'expense') setExpenses([...expenses, data]);
            else setInvestments([...investments, data]);
        }
    };

    const handleUpdateItem = async (type: 'expense' | 'investment', id: string, changes: any) => {
        // Optimistic Update
        if (type === 'expense') {
            setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
        } else {
            setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i));
        }

        // DB Update (Debounce could be added for text inputs, but simplified here)
        await supabase.from('forecast_items').update(changes).eq('id', id);
    };

    const handleDeleteItem = async (type: 'expense' | 'investment', id: string) => {
        if (!confirm("Eliminar aquest ítem?")) return;

        if (type === 'expense') setExpenses(prev => prev.filter(e => e.id !== id));
        else setInvestments(prev => prev.filter(i => i.id !== id));

        await supabase.from('forecast_items').delete().eq('id', id);
    };

    const handleUpdateSettings = async (field: string, value: any) => {
        const newSettings = { ...settings, [field]: value };
        setSettings(newSettings);

        // If updating reserve, sync to DB
        // If settings row doesn't exist, we might need inserts? 
        // Migration ensured one row exists, but let's be safe.
        if (settings.id) {
            await supabase.from('economy_settings').update({ [field]: value }).eq('id', settings.id);
        } else {
            // First time maybe?
            const { data } = await supabase.from('economy_settings').insert(newSettings).select().single();
            if (data) setSettings(data);
        }
    };


    // --- 4. Render Components ---

    if (loading) return <div className="p-8 text-center text-gray-500">Carregant dades econòmiques...</div>;

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto font-sans text-gray-900">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                        Previsió Econòmica
                    </h1>
                    <p className="text-gray-500 font-medium">Analítica de viabilitat i projecció de flux de caixa.</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <span className="text-xs font-bold uppercase text-gray-400 pl-2">Horitzó:</span>
                    {[30, 60, 90, 180].map(days => (
                        <button
                            key={days}
                            onClick={() => setHorizonDays(days)}
                            className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${horizonDays === days
                                ? 'bg-black text-white'
                                : 'text-gray-400 hover:bg-gray-100'
                                }`}
                        >
                            {days}d
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* 1. Pot Actual */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Pot Actual</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-gray-900 font-mono tracking-tighter">
                            {currentPot.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-400 mt-1 font-medium">
                            Saldo real disponible avui
                        </div>
                    </div>
                </div>

                {/* 2. Despeses Previstes */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Despeses ({horizonDays}d)</span>
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-red-500 font-mono tracking-tighter">
                            -{activeExpensesTotal.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-400 mt-1 font-medium">
                            Només partides actives
                        </div>
                    </div>
                </div>

                {/* 3. Inversions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Inversions</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-purple-500 font-mono tracking-tighter">
                            -{activeInvestmentsTotal.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-400 mt-1 font-medium">
                            Projectes seleccionats
                        </div>
                    </div>
                </div>

                {/* 4. Resultat Projectat (SEMÀFOR) */}
                <div className={`
                    p-6 rounded-2xl shadow-md border flex flex-col justify-between h-40 relative overflow-hidden text-white
                    ${trafficLight === 'green' ? 'bg-emerald-600 border-emerald-500' :
                        trafficLight === 'yellow' ? 'bg-amber-500 border-amber-400' : 'bg-red-600 border-red-500'}
                 `}>
                    <div className="absolute top-0 right-0 p-6 opacity-20 transform scale-150">
                        {trafficLight === 'green' && <CheckCircle size={80} />}
                        {trafficLight === 'yellow' && <AlertTriangle size={80} />}
                        {trafficLight === 'red' && <AlertTriangle size={80} />}
                    </div>

                    <div className="relative z-10 flex justify-between items-start">
                        <span className="text-xs font-black uppercase tracking-widest text-white/80">Projecció Final</span>
                    </div>
                    <div className="relative z-10">
                        <div className="text-4xl font-black font-mono tracking-tighter">
                            {finalProjectedPot.toFixed(2)}€
                        </div>
                        <div className="text-xs text-white/80 mt-1 font-bold flex items-center gap-1">
                            {finalProjectedPot >= settings.reserve_min
                                ? `+${(finalProjectedPot - settings.reserve_min).toFixed(0)}€ sobre reserva`
                                : `${(finalProjectedPot - settings.reserve_min).toFixed(0)}€ sota reserva`
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Expenses & Config */}
                <div className="space-y-8">
                    {/* Reserve Config */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">Reserva de Seguretat</h3>
                            <p className="text-xs text-gray-500">Mínim líquid desitjat al banc.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-bold">€</span>
                            <input
                                type="number"
                                value={settings.reserve_min}
                                onChange={(e) => handleUpdateSettings('reserve_min', parseFloat(e.target.value) || 0)}
                                className="w-32 p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-right focus:bg-white focus:ring-2 ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Expenses List */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingDown size={18} className="text-red-500" />
                                    Despeses Fixes / Previstes
                                </h3>
                                <p className="text-xs text-gray-500">Pagaments recurrents o planificats.</p>
                            </div>
                            <button onClick={() => handleAddItem('expense')} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 shadow-sm transition-all active:scale-95">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {expenses.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">No hi ha despeses previstes.</p>}
                            {expenses.map(item => (
                                <ForecastRow
                                    key={item.id}
                                    item={item}
                                    onUpdate={(changes) => handleUpdateItem('expense', item.id, changes)}
                                    onDelete={() => handleDeleteItem('expense', item.id)}
                                    isExpense={true}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Investments */}
                <div className="space-y-8">
                    {/* Investments List */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-purple-500" />
                                    Inversions i Projectes
                                </h3>
                                <p className="text-xs text-gray-500">Simulador de noves adquisicions.</p>
                            </div>
                            <button onClick={() => handleAddItem('investment')} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 shadow-sm transition-all active:scale-95">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {investments.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">No hi ha inversions planificades.</p>}
                            {investments.map(item => (
                                <ForecastRow
                                    key={item.id}
                                    item={item}
                                    onUpdate={(changes) => handleUpdateItem('investment', item.id, changes)}
                                    onDelete={() => handleDeleteItem('investment', item.id)}
                                    isExpense={false}
                                />
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- Subcomponent for Row Editing ---
function ForecastRow({ item, onUpdate, onDelete, isExpense }: { item: ForecastItem, onUpdate: (c: any) => void, onDelete: () => void, isExpense: boolean }) {

    return (
        <div className={`p-4 hover:bg-gray-50 transition-colors group flex items-center gap-3 ${!item.is_active ? 'opacity-50 grayscale' : ''}`}>

            {/* Toggle Active */}
            <button
                onClick={() => onUpdate({ is_active: !item.is_active })}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${item.is_active
                    ? (isExpense ? 'bg-red-500 border-red-500 text-white' : 'bg-purple-500 border-purple-500 text-white')
                    : 'bg-white border-gray-300 text-transparent'}`}
            >
                <CheckCircle size={12} fill="currentColor" />
            </button>

            {/* Date */}
            <input
                type="date"
                value={item.date || ''}
                onChange={e => onUpdate({ date: e.target.value })}
                className="w-28 text-xs font-mono bg-transparent border-none p-0 focus:ring-0 text-gray-500"
            />

            {/* Description */}
            <input
                type="text"
                value={item.name}
                onChange={e => onUpdate({ name: e.target.value })}
                className="flex-1 font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300"
                placeholder="Nom..."
            />

            {/* Amount */}
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    value={item.amount}
                    onChange={e => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
                    className="w-20 text-right font-mono font-bold bg-transparent border-none p-0 focus:ring-0"
                />
                <span className="text-gray-400 text-xs font-bold">€</span>
            </div>

            {/* Delete */}
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2">
                <X size={16} />
            </button>

        </div>
    );
}
