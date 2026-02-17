'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, addDays, isBefore, parseISO } from 'date-fns';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
    DollarSign, Calendar, Plus, Trash2, Edit2, Save, X,
    ArrowRight
} from 'lucide-react';
import { PrivacyMask } from '@/components/PrivacyMask';
import Link from 'next/link';

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

interface BoloForecast {
    id: number;
    nom: string;
    data_bolo: string;
    estat: string;
    ingres_previst: number;
    despesa_prevista: number;
    marge_previst: number;
}

export default function ForecastPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    // Data State
    const [currentPot, setCurrentPot] = useState(0);
    const [potBreakdown, setPotBreakdown] = useState({ closedBolos: 0, movements: 0, advances: 0 });
    const [expenses, setExpenses] = useState<ForecastItem[]>([]);
    const [investments, setInvestments] = useState<ForecastItem[]>([]);
    const [projectedBolos, setProjectedBolos] = useState<BoloForecast[]>([]);
    const [settings, setSettings] = useState<EconomySettings>({ id: '', reserve_min: 0, default_horizon_days: 90 });

    // UI State
    const [horizonDays, setHorizonDays] = useState(90);
    const [showBreakdown, setShowBreakdown] = useState(false);

    // --- 1. Fetch Data ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // A. Calculate Current Pot
            // 1. Pot from Closed Bolos
            const { data: closedBolos } = await supabase
                .from('bolos')
                .select('pot_delta_final')
                .not('pot_delta_final', 'is', null);
            const totalClosed = (closedBolos || []).reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

            // 2. Manual Movements (Treasury)
            const { data: movements } = await supabase.from('despeses_ingressos').select('import, tipus');
            const totalMovements = (movements || []).reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

            // 3. Advances (Anticipats) from OPEN bolos
            const { data: openAdvances } = await supabase
                .from('pagaments_anticipats')
                .select('import, bolos!inner(pot_delta_final)');

            // Filter advances where bolo is not closed
            const validAdvances = (openAdvances || []).filter((a: any) => a.bolos?.pot_delta_final === null);
            const totalAdvances = validAdvances.reduce((sum: number, a: any) => sum + (a.import || 0), 0);

            setCurrentPot(totalClosed + totalMovements + totalAdvances);
            setPotBreakdown({ closedBolos: totalClosed, movements: totalMovements, advances: totalAdvances });

            // B. Active Bolos Forecast (Projected Income)
            const { data: activeBolosData } = await supabase
                .from('bolos')
                .select('id, nom, data_bolo, estat, import_total, cost_total_musics, preu_per_musica, num_musics, estat_rebuig')
                .is('pot_delta_final', null) // Only open bolos
                .neq('estat', 'Cancel·lat')
                .neq('estat', 'Cancel·lats')
                .is('estat_rebuig', null) // Ensure not rejected
                .order('data_bolo', { ascending: true });

            const projected = (activeBolosData || []).map((b: any) => {
                const income = b.import_total || 0;

                // Estimate cost if not explicitly calculated
                let cost = b.cost_total_musics || 0;
                if (cost === 0 && b.preu_per_musica && b.num_musics) {
                    cost = b.preu_per_musica * b.num_musics;
                }

                return {
                    id: b.id,
                    nom: b.nom,
                    data_bolo: b.data_bolo,
                    estat: b.estat,
                    ingres_previst: income,
                    despesa_prevista: cost,
                    marge_previst: income - cost
                };
            });
            setProjectedBolos(projected || []);

            // C. Fetch Forecast Items
            const { data: items } = await supabase.from('forecast_items').select('*').order('date', { ascending: true });
            if (items) {
                setExpenses(items.filter((i: ForecastItem) => i.type === 'expense'));
                setInvestments(items.filter((i: ForecastItem) => i.type === 'investment'));
            }

            // D. Fetch Settings
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

    // Bolos within horizon
    const activeBolosTotal = useMemo(() => {
        return projectedBolos
            .filter(b => isBefore(parseISO(b.data_bolo), horizonDate))
            .reduce((sum, b) => sum + b.marge_previst, 0);
    }, [projectedBolos, horizonDate]);

    const activeExpensesTotal = useMemo(() => {
        return expenses
            .filter(e => e.is_active)
            .filter(e => !e.date || isBefore(parseISO(e.date), horizonDate))
            .reduce((sum: number, e: ForecastItem) => sum + (e.amount || 0), 0);
    }, [expenses, horizonDate]);

    const activeInvestmentsTotal = useMemo(() => {
        return investments
            .filter(i => i.is_active)
            .filter(i => !i.date || isBefore(parseISO(i.date), horizonDate))
            .reduce((sum: number, i: ForecastItem) => sum + (i.amount || 0), 0);
    }, [investments, horizonDate]);

    const projectedPotAfterBolos = currentPot + activeBolosTotal;
    const projectedPotAfterExpenses = projectedPotAfterBolos - activeExpensesTotal;
    const finalProjectedPot = projectedPotAfterExpenses - activeInvestmentsTotal;

    const trafficLight = useMemo(() => {
        if (finalProjectedPot < 0) return 'red';
        if (finalProjectedPot < settings.reserve_min) return 'yellow';
        return 'green';
    }, [finalProjectedPot, settings.reserve_min]);

    // --- 3. Handlers ---
    const handleAddItem = async (type: 'expense' | 'investment') => {
        const newItem = {
            type,
            name: type === 'expense' ? 'Nova Despesa' : 'Nova Inversió',
            amount: 0,
            is_active: type === 'expense',
            date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
        };

        const { data, error } = await supabase.from('forecast_items').insert(newItem).select().single();
        if (data && !error) {
            if (type === 'expense') setExpenses([...expenses, data]);
            else setInvestments([...investments, data]);
        }
    };

    const handleUpdateItem = async (type: 'expense' | 'investment', id: string, changes: any) => {
        if (type === 'expense') {
            setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
        } else {
            setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i));
        }
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
        if (settings.id) {
            await supabase.from('economy_settings').update({ [field]: value }).eq('id', settings.id);
        } else {
            const { data } = await supabase.from('economy_settings').insert(newSettings).select().single();
            if (data) setSettings(data);
        }
    };

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
                    {[30, 60, 90, 180, 365].map(days => (
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* 1. Pot Actual */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pot Actual</span>
                        <DollarSign size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-900 font-mono tracking-tighter">
                            <PrivacyMask value={currentPot} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 font-medium">Disponible avui</div>
                    </div>
                </div>

                {/* 2. Bolos Previstos */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Marge Bolos ({horizonDays}d)</span>
                        <Calendar size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-emerald-500 font-mono tracking-tighter">
                            +<PrivacyMask value={activeBolosTotal} showEuro={false} />€
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 font-medium">{projectedBolos.length} actuacions</div>
                    </div>
                </div>

                {/* 3. Despeses */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Despeses ({horizonDays}d)</span>
                        <TrendingDown size={16} className="text-red-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-red-500 font-mono tracking-tighter">
                            -<PrivacyMask value={activeExpensesTotal} showEuro={false} />€
                        </div>
                    </div>
                </div>

                {/* 4. Inversions */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inversions</span>
                        <TrendingUp size={16} className="text-purple-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-purple-500 font-mono tracking-tighter">
                            -<PrivacyMask value={activeInvestmentsTotal} showEuro={false} />€
                        </div>
                    </div>
                </div>

                {/* 5. Resultat Projectat */}
                <div className={`p-4 rounded-2xl shadow-md border flex flex-col justify-between h-36 relative overflow-hidden text-white
                    ${trafficLight === 'green' ? 'bg-emerald-600 border-emerald-500' :
                        trafficLight === 'yellow' ? 'bg-amber-500 border-amber-400' : 'bg-red-600 border-red-500'}
                 `}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform scale-150">
                        {trafficLight === 'green' && <CheckCircle size={60} />}
                        {trafficLight === 'yellow' && <AlertTriangle size={60} />}
                        {trafficLight === 'red' && <AlertTriangle size={60} />}
                    </div>
                    <div className="relative z-10"><span className="text-[10px] font-black uppercase tracking-widest text-white/80">Projecció Final</span></div>
                    <div className="relative z-10">
                        <div className="text-3xl font-black font-mono tracking-tighter">
                            <PrivacyMask value={finalProjectedPot} />
                        </div>
                        <div className="text-[10px] text-white/80 mt-1 font-bold">
                            {finalProjectedPot >= settings.reserve_min
                                ? `+${(finalProjectedPot - settings.reserve_min).toFixed(0)}€ sobre reserva`
                                : `-${(settings.reserve_min - finalProjectedPot).toFixed(0)}€ sota reserva`
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Documentation: Flux de Caixa Summary */}
            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2">
                        <DollarSign size={18} className="text-blue-600" />
                        Conciliació i Resum de Flux de Caixa
                    </h3>
                    <button
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        {showBreakdown ? 'Amagar detall' : 'Veure detall de càlcul (Auditoria)'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Ingressos Pendents</span>
                        <div className="text-xl font-black text-blue-900">
                            <PrivacyMask value={projectedBolos.reduce((sum: number, b: BoloForecast) => sum + b.ingres_previst, 0)} />
                        </div>
                        <p className="text-[10px] text-blue-400">Total a cobrar bolos actius</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-red-400 tracking-widest">Pagaments Pendents</span>
                        <div className="text-xl font-black text-red-900">
                            <PrivacyMask value={projectedBolos.reduce((sum: number, b: BoloForecast) => sum + b.despesa_prevista, 0)} />
                        </div>
                        <p className="text-[10px] text-red-400">Total a pagar a músics</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Marge Operatiu</span>
                        <div className="text-xl font-black text-purple-900">
                            <PrivacyMask value={activeBolosTotal} />
                        </div>
                        <p className="text-[10px] text-purple-400">Impacte net en el pot ({horizonDays}d)</p>
                    </div>
                </div>

                {showBreakdown && (
                    <div className="mt-6 pt-6 border-t border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-white p-3 rounded-lg border border-blue-50">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bolos Tancats</span>
                            <div className="font-mono font-bold text-gray-700"><PrivacyMask value={potBreakdown.closedBolos} /></div>
                            <p className="text-[10px] text-gray-400 mt-1">Suma de "Pot Final" de tots els bolos tancats.</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-50">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tresoreria Manual</span>
                            <div className="font-mono font-bold text-gray-700"><PrivacyMask value={potBreakdown.movements} /></div>
                            <p className="text-[10px] text-gray-400 mt-1">Entrades/sortides de la pàgina d'Economia.</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-50">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Avançaments Bolos Actius</span>
                            <div className="font-mono font-bold text-gray-700"><PrivacyMask value={potBreakdown.advances} /></div>
                            <p className="text-[10px] text-gray-400 mt-1">Cobraments ja rebuts de bolos no tancats.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Actuacions Previstes Detail Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Calendar size={18} className="text-emerald-500" />
                            Actuacions Previstes ({projectedBolos.length})
                        </h3>
                        <p className="text-xs text-gray-500">Marge projectat dels bolos actius dins de l'horitzó.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Bolo</th>
                                <th className="p-4">Estat</th>
                                <th className="p-4 text-right">Ingrés Estimat</th>
                                <th className="p-4 text-right">Cost Estimat</th>
                                <th className="p-4 text-right">Marge Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {projectedBolos.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hi ha bolos actius previstos.</td></tr>
                            )}
                            {projectedBolos.map(bolo => {
                                const isIncluded = isBefore(parseISO(bolo.data_bolo), horizonDate);
                                return (
                                    <tr key={bolo.id} className={`hover:bg-gray-50 transition-colors ${!isIncluded ? 'opacity-40 grayscale' : ''}`}>
                                        <td className="p-4 font-mono text-xs">{format(parseISO(bolo.data_bolo), 'dd/MM/yyyy')}</td>
                                        <td className="p-4 font-bold text-gray-900">
                                            <Link href={`/bolos/${bolo.id}`} className="hover:text-blue-600 underline">
                                                {bolo.nom}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${bolo.estat === 'Confirmada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {bolo.estat}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-emerald-600">
                                            +<PrivacyMask value={bolo.ingres_previst} showEuro={false} />
                                        </td>
                                        <td className="p-4 text-right font-mono text-red-600">
                                            -<PrivacyMask value={bolo.despesa_prevista} showEuro={false} />
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold">
                                            <PrivacyMask value={bolo.marge_previst} className={bolo.marge_previst >= 0 ? 'text-gray-900' : 'text-red-500'} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Main Content Grid: Expenses & Config */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

function ForecastRow({ item, onUpdate, onDelete, isExpense }: { item: ForecastItem, onUpdate: (c: any) => void, onDelete: () => void, isExpense: boolean }) {
    return (
        <div className={`p-4 hover:bg-gray-50 transition-colors group flex items-center gap-3 ${!item.is_active ? 'opacity-50 grayscale' : ''}`}>
            <button
                onClick={() => onUpdate({ is_active: !item.is_active })}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${item.is_active
                    ? (isExpense ? 'bg-red-500 border-red-500 text-white' : 'bg-purple-500 border-purple-500 text-white')
                    : 'bg-white border-gray-300 text-transparent'}`}
            >
                <CheckCircle size={12} fill="currentColor" />
            </button>
            <input
                type="date"
                value={item.date || ''}
                onChange={e => onUpdate({ date: e.target.value })}
                className="w-28 text-xs font-mono bg-transparent border-none p-0 focus:ring-0 text-gray-500"
            />
            <input
                type="text"
                value={item.name}
                onChange={e => onUpdate({ name: e.target.value })}
                className="flex-1 font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300"
                placeholder="Nom..."
            />
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    value={item.amount}
                    onChange={e => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
                    className="w-20 text-right font-mono font-bold bg-transparent border-none p-0 focus:ring-0"
                />
                <span className="text-gray-400 text-xs font-bold">€</span>
            </div>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2">
                <X size={16} />
            </button>
        </div>
    );
}

