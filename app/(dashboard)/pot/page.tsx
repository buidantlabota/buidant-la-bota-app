'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo } from '@/types';

interface DespesaIngres {
    id: string;
    data: string;
    descripcio: string;
    tipus: 'ingrés' | 'despesa';
    categoria: string | null;
    import: number;
    actuacio_id: number | null;
    any_pot: number | null;
}

interface LedgerMovement {
    date: string;
    description: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    type: 'bolo' | 'manual' | 'advance';
    originalId: string | number;
    timestamp?: string;
}

export default function GestioPotPage() {
    const supabase = createClient();
    const [movements, setMovements] = useState<DespesaIngres[]>([]);
    const [activeAdvances, setActiveAdvances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState({
        totalPotReal: 0,      // Money actually in the box
        totalDinersDispo: 0,  // Margin of collected bolos
        totalACobrar: 0,      // Projected income from uncollected bolos
        totalAPagar: 0,       // Projected debt to musicians
        totalProjectat: 0,    // Real + ACobrar - APagar
        yearBoloPot: 0,
        yearExtraPot: 0,
        yearIngressos: 0,
        yearDespeses: 0
    });

    const [ledger, setLedger] = useState<LedgerMovement[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newMovement, setNewMovement] = useState<Partial<DespesaIngres>>({
        data: new Date().toISOString().split('T')[0],
        tipus: 'despesa',
        import: 0,
        descripcio: '',
        categoria: 'Altres'
    });
    const [amountStr, setAmountStr] = useState('');

    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [distribution, setDistribution] = useState<{ name: string, amount: number }[]>([]);
    const [isDistModalOpen, setIsDistModalOpen] = useState(false);
    const [newDistItem, setNewDistItem] = useState({ name: '', amount: 0 });

    const fetchPot = async () => {
        setLoading(true);
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        // 1. Manual Movements for the table
        const { data: yearData } = await supabase
            .from('despeses_ingressos')
            .select('*')
            .gte('data', start)
            .lte('data', end)
            .order('data', { ascending: false });

        // 2. All Bolos for calculations
        const { data: allBolos } = await supabase
            .from('bolos')
            .select('id, estat, nom_poble, import_total, cost_total_musics, pot_delta_final, data_bolo, cobrat, pagaments_musics_fets, updated_at')
            .not('estat', 'in', '("Cancel·lat","Cancel·lats","rebutjat","rebutjats")');

        // 3. All Manual Movements for global balance
        const { data: allMovements } = await supabase
            .from('despeses_ingressos')
            .select('*');

        // 4. All Advance Payments
        const { data: allAdvances } = await supabase
            .from('pagaments_anticipats')
            .select('*, bolos(estat, nom_poble, data_bolo)');

        // CALCULATIONS
        const potBase = 4560.21;
        const cutoffDate = '2026-01-01';

        // Filters for stats (2025+)
        const manualMovements2025 = (allMovements || []).filter((m: any) => m.data >= cutoffDate || !m.data);
        const bolos2025 = (allBolos || []).filter((b: any) => b.data_bolo >= cutoffDate);
        const advances2025 = (allAdvances || []).filter((p: any) => p.data_pagament >= cutoffDate);

        // A. Calc Pot Real and Diners Dispo
        const manualBalance = manualMovements2025.reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

        const potRealValue = bolos2025
            .filter((b: any) => b.cobrat && b.pagaments_musics_fets)
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        const dinersDispoValue = bolos2025
            .filter((b: any) => b.cobrat)
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        // Subtracted from BOTH Metrics: Any advance payment NOT yet "closed" by its bolo status
        const pendingAdvancesValue = (allAdvances || [])
            .filter((p: any) => !['Tancat', 'Tancades'].includes((p.bolos as any)?.estat))
            .reduce((sum: number, p: any) => sum + (p.import || 0), 0);

        const totalPotReal = potBase + manualBalance + potRealValue - pendingAdvancesValue;
        const totalDinersDispo = potBase + manualBalance + dinersDispoValue - pendingAdvancesValue;

        // B. Pending entries (A cobrar / A pagar)
        const aCobrar = bolos2025
            .filter((b: any) => !b.cobrat)
            .reduce((sum: number, b: any) => sum + (b.import_total || 0), 0);

        const aPagar = bolos2025
            .filter((b: any) => !b.pagaments_musics_fets)
            .reduce((sum: number, b: any) => sum + (b.cost_total_musics || 0), 0);

        // C. Annual Metrics (requested year)
        const yearBoloPot = (allBolos || [])
            .filter((b: any) => b.data_bolo >= start && b.data_bolo <= end)
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);
        const yearIng = (yearData || []).filter((m: any) => m.tipus === 'ingrés').reduce((sum: number, m: any) => sum + m.import, 0);
        const yearDesp = (yearData || []).filter((m: any) => m.tipus === 'despesa').reduce((sum: number, m: any) => sum + m.import, 0);

        // D. Create Chronological Ledger (by transaction time)
        // 1. Manual Movements
        const manualLedgerEntries = manualMovements2025.map((m: any) => ({
            date: m.data,
            timestamp: m.updated_at || m.created_at || m.data,
            description: m.descripcio,
            amount: m.tipus === 'ingrés' ? m.import : -m.import,
            type: 'manual' as const,
            originalId: m.id
        }));

        // 2. All 2025+ Bolos (when marked as paid/closed)
        const boloLedgerEntries = bolos2025
            .filter((b: any) => b.cobrat && b.pagaments_musics_fets)
            .map((b: any) => ({
                date: b.data_bolo,
                timestamp: b.updated_at || b.created_at || b.data_bolo,
                description: `Bolo: ${b.nom_poble}`,
                amount: b.pot_delta_final || 0,
                type: 'bolo' as const,
                originalId: b.id
            }));

        // 3. Advance Payments (count as they are paid)
        const advanceLedgerEntries = (allAdvances || [])
            .filter((p: any) => p.data_pagament >= cutoffDate)
            .map((p: any) => ({
                date: p.data_pagament,
                timestamp: p.updated_at || p.created_at || p.creat_at || p.data_pagament,
                description: `Anticipat: ${p.bolos?.nom_poble || 'Músic'}`,
                amount: -p.import,
                type: 'advance' as const,
                originalId: p.id
            }));

        // Combine and Sort all history by TRANSACTION TIME (timestamp)
        // We use updated_at if available, fallback to created_at
        const allSortedEntries = [...manualLedgerEntries, ...boloLedgerEntries, ...advanceLedgerEntries]
            .map(e => ({
                ...e,
                sortTime: new Date(e.timestamp || e.date).getTime()
            }))
            .sort((a, b) => a.sortTime - b.sortTime);

        const baseEntry = {
            date: '2025-12-31',
            description: 'Tancament Pot 2025',
            amount: 0,
            type: 'manual' as const,
            originalId: '2025-base',
            balanceBefore: 0,
            balanceAfter: potBase,
            timestamp: '2025-12-31T23:59:59.999Z'
        };

        // Calculate continuous running balance starting from the 2025 base
        let runningBalance = potBase;
        const fullLedger: any[] = allSortedEntries.map(entry => {
            const balanceBefore = runningBalance;
            runningBalance += entry.amount;
            return {
                ...entry,
                balanceBefore,
                balanceAfter: runningBalance
            };
        });

        // Current Year's Starting Balance for the header/footer if needed
        const yearStartBalance = fullLedger.find(e => e.date >= start)?.balanceBefore ?? (year >= 2026 ? potBase : 0);

        // Filter the ledger JUST for the selected year
        const yearLedger = fullLedger.filter(e => e.date >= start && e.date <= end);

        // If year is 2025, we might want to show the base entry
        if (year === 2025) {
            yearLedger.push(baseEntry);
        }

        setLedger(yearLedger.reverse()); // Newest first for display
        setMovements(yearData || []);
        setActiveAdvances((allAdvances || []).filter((p: any) => !['Tancat', 'Tancades'].includes((p.bolos as any)?.estat)));

        // Fetch Distribution from app_config
        const { data: configData } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'pot_distribution')
            .single();

        if (configData) {
            setDistribution((configData.value as any).items || []);
        }

        setStats({
            totalPotReal,
            totalDinersDispo,
            totalACobrar: aCobrar,
            totalAPagar: aPagar,
            totalProjectat: totalPotReal + aCobrar - aPagar,
            yearBoloPot,
            yearExtraPot: yearIng - yearDesp,
            yearIngressos: yearIng,
            yearDespeses: yearDesp
        });
        setLoading(false);
    };

    useEffect(() => {
        fetchPot();
        supabase.from('bolos').select('id, nom_poble, data_bolo').order('data_bolo', { ascending: false }).limit(20)
            .then(({ data }: { data: any }) => setBolos(data || []));
    }, [year]);

    const handleSaveDist = async (items: { name: string, amount: number }[]) => {
        const { error } = await supabase
            .from('app_config')
            .upsert({ key: 'pot_distribution', value: { items } });
        if (!error) {
            setDistribution(items);
            setIsDistModalOpen(false);
        }
    };

    const handleAdd = async () => {
        if (!newMovement.import || !newMovement.descripcio) return;
        const { error } = await supabase.from('despeses_ingressos').insert([newMovement]);
        if (error) {
            console.error(error);
            alert('Error al guardar');
        } else {
            setIsModalOpen(false);
            setNewMovement({ data: new Date().toISOString().split('T')[0], tipus: 'despesa', import: 0, descripcio: '', categoria: 'Altres' });
            setAmountStr('');
            fetchPot();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Segur que vols esborrar aquest moviment?')) return;
        const { error } = await supabase.from('despeses_ingressos').delete().eq('id', id);
        if (!error) fetchPot();
    };

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-text-primary tracking-tight font-outfit uppercase italic">Gestió de Pot</h1>
                    <p className="text-text-secondary mt-1 font-medium italic">Control del pot real i historial de moviments</p>
                </div>
                <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                    <button onClick={() => setYear(prev => prev - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><span className="material-icons-outlined">chevron_left</span></button>
                    <span className="px-6 text-xl font-black font-mono">{year}</span>
                    <button onClick={() => setYear(prev => prev + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><span className="material-icons-outlined">chevron_right</span></button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. POT REAL */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-icons-outlined text-9xl">savings</span>
                    </div>
                    <div>
                        <p className="text-white/70 text-sm font-black uppercase tracking-[0.2em] mb-1">Pot Real (Cobrat + Pagat)</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{stats.totalPotReal.toFixed(2)}€</p>
                    </div>
                    <p className="text-white/60 text-[10px] font-bold mt-4 italic">Inclou bolos tancats i despeses manuals.</p>
                </div>

                {/* 2. DINERS A DISPOSICIÓ */}
                <div className="bg-emerald-950 text-white p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-icons-outlined text-9xl">payments</span>
                    </div>
                    <div>
                        <p className="text-emerald-400/70 text-sm font-black uppercase tracking-[0.2em] mb-1">Diners a disposició</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{stats.totalDinersDispo.toFixed(2)}€</p>
                    </div>
                    <p className="text-emerald-400/60 text-[10px] font-bold mt-4 italic">Inclou bolos cobrats (marge organització disponible).</p>

                    {/* Distribution Summary */}
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-emerald-400/50">Distribució</span>
                            <button onClick={() => setIsDistModalOpen(true)} className="text-[10px] font-bold text-white hover:underline flex items-center gap-1">
                                <span className="material-icons-outlined text-xs">edit</span> Editar
                            </button>
                        </div>
                        <div className="space-y-1">
                            {distribution.map((d, i) => (
                                <div key={i} className="flex justify-between items-center text-xs font-mono">
                                    <span className="opacity-70">{d.name}</span>
                                    <span className="font-bold">{d.amount.toFixed(2)}€</span>
                                </div>
                            ))}
                            {distribution.length > 0 && (
                                <div className="flex justify-between items-center text-[10px] font-bold border-t border-white/5 pt-1 mt-1">
                                    <span className="opacity-50 uppercase tracking-tighter">Resta per assignar</span>
                                    <span className={Math.abs(stats.totalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)) > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                                        {(stats.totalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)).toFixed(2)}€
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Ledger (Bank Statement style) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-primary">account_balance</span>
                            Historial de Moviments (Pot Real)
                        </h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 italic">
                                    <tr className="text-[10px] text-gray-400 uppercase tracking-[0.1em]">
                                        <th className="p-4">Data</th>
                                        <th className="p-4">Concepte</th>
                                        <th className="p-4 text-right">Valor Inicial</th>
                                        <th className="p-4 text-right">Moviment</th>
                                        <th className="p-4 text-right">Nou Nivell</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {ledger.map((m, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                                                {new Date(m.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-gray-700">{m.description}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] px-1 rounded font-black uppercase tracking-widest ${m.type === 'bolo' ? 'bg-indigo-100 text-indigo-700' :
                                                        m.type === 'advance' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {m.type === 'bolo' ? 'Bolo Tancat' : m.type === 'advance' ? 'Pagament Anticipat' : 'Manual'}
                                                    </span>
                                                    {m.timestamp && String(m.timestamp).includes('T') && String(m.timestamp).split('T')[0] !== m.date && (
                                                        <span className="text-[8px] text-gray-400 font-bold italic">
                                                            (Registrat: {new Date(m.timestamp).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-xs text-gray-400">
                                                {m.balanceBefore.toFixed(2)}€
                                            </td>
                                            <td className={`p-4 text-right font-mono font-black ${m.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {m.amount >= 0 ? '+' : ''}{m.amount.toFixed(2)}€
                                            </td>
                                            <td className="p-4 text-right font-mono font-black text-gray-900 bg-gray-50/50">
                                                {m.balanceAfter.toFixed(2)}€
                                            </td>
                                        </tr>
                                    ))}
                                    {ledger.length === 0 && !loading && (
                                        <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">No hi ha moviments registrats des de 2025.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 2. Side Lists (Advances and Manual Controls) */}
                <div className="space-y-8">
                    {/* Manual Movements Controls */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest">Controls Manuals</h3>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-primary hover:bg-red-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                            >
                                <span className="material-icons-outlined text-xs">add</span>
                                Nou
                            </button>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed italic">
                            Utilitza els controls manuals per ingressar diners de la "butxaca" a la caixa o per registrar despeses directes.
                        </p>
                    </div>

                    {/* Active Advances List */}
                    <div className="bg-orange-50/50 rounded-2xl border border-orange-100 p-6 flex flex-col h-fit">
                        <h3 className="text-sm font-black uppercase text-orange-600 tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-icons-outlined text-base">priority_high</span>
                            Avançaments Actius
                        </h3>
                        <div className="space-y-3">
                            {activeAdvances.length > 0 ? (
                                activeAdvances.map(adv => (
                                    <div key={adv.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">
                                                {(adv.bolos as any)?.nom_poble}
                                            </p>
                                            <p className="text-xs font-bold text-gray-700 truncate">
                                                {adv.notes || 'Avançament'}
                                            </p>
                                        </div>
                                        <div className="text-sm font-mono font-black text-orange-700">
                                            -{adv.import.toFixed(2)}€
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-orange-300 italic text-xs">No hi ha avançaments actius.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
                        <h3 className="text-2xl font-black mb-6 text-gray-900 uppercase italic tracking-tighter">Nou Moviment Directe</h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                <button
                                    onClick={() => setNewMovement({ ...newMovement, tipus: 'despesa' })}
                                    className={`py-2 px-4 rounded-lg font-bold text-xs uppercase transition-all ${newMovement.tipus === 'despesa' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Despesa
                                </button>
                                <button
                                    onClick={() => setNewMovement({ ...newMovement, tipus: 'ingrés' })}
                                    className={`py-2 px-4 rounded-lg font-bold text-xs uppercase transition-all ${newMovement.tipus === 'ingrés' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Ingrés
                                </button>
                            </div>

                            <div>
                                <label className="block text-[8px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Data del moviment</label>
                                <input type="date" value={newMovement.data} onChange={e => setNewMovement({ ...newMovement, data: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-700" />
                            </div>

                            <div>
                                <label className="block text-[8px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Import exacte (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amountStr}
                                    onChange={e => {
                                        setAmountStr(e.target.value);
                                        setNewMovement({ ...newMovement, import: parseFloat(e.target.value) || 0 });
                                    }}
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-xl"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-[8px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Descripció del concepte</label>
                                <input type="text" value={newMovement.descripcio} onChange={e => setNewMovement({ ...newMovement, descripcio: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Ex: Compra instruments..." />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancel·lar</button>
                            <button onClick={handleAdd} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-gray-200 hover:bg-green-600 transition-all">Registrar Moviment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Distribution Modal */}
            {isDistModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-8 sm:p-10 relative animate-in zoom-in duration-300">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Editar Distribució</h2>
                        <p className="text-slate-400 text-sm italic mb-8">Reparteix els {stats.totalDinersDispo.toFixed(2)}€ entre el banc i efectiu.</p>

                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                            {distribution.map((d, i) => (
                                <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl group">
                                    <input
                                        type="text"
                                        value={d.name}
                                        onChange={e => {
                                            const newD = [...distribution];
                                            newD[i].name = e.target.value;
                                            setDistribution(newD);
                                        }}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold"
                                        placeholder="Nom (Ex: Banc, En Pere...)"
                                    />
                                    <input
                                        type="number"
                                        value={d.amount}
                                        onChange={e => {
                                            const newD = [...distribution];
                                            newD[i].amount = parseFloat(e.target.value) || 0;
                                            setDistribution(newD);
                                        }}
                                        className="w-24 bg-transparent border-none focus:ring-0 text-sm font-mono font-bold text-right"
                                    />
                                    <button onClick={() => setDistribution(distribution.filter((_, idx) => idx !== i))} className="p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-icons-outlined text-sm">remove_circle</span>
                                    </button>
                                </div>
                            ))}

                            <div className="flex gap-2 p-2 rounded-xl border-2 border-dashed border-gray-100 italic text-gray-400 hover:border-gray-200 transition-colors">
                                <input
                                    type="text"
                                    placeholder="Nou responsable..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs"
                                    value={newDistItem.name}
                                    onChange={e => setNewDistItem({ ...newDistItem, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-20 bg-transparent border-none focus:ring-0 text-xs font-mono"
                                    value={newDistItem.amount || ''}
                                    onChange={e => setNewDistItem({ ...newDistItem, amount: parseFloat(e.target.value) || 0 })}
                                />
                                <button
                                    onClick={() => {
                                        if (newDistItem.name) {
                                            setDistribution([...distribution, newDistItem]);
                                            setNewDistItem({ name: '', amount: 0 });
                                        }
                                    }}
                                    className="p-1 text-primary"
                                >
                                    <span className="material-icons-outlined text-sm">add_circle</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-400 uppercase">Faltaria per assignar:</span>
                            <span className={Math.abs(stats.totalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)) > 0.1 ? 'text-red-500' : 'text-emerald-600'}>
                                {(stats.totalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)).toFixed(2)}€
                            </span>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsDistModalOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-400">Tancar</button>
                            <button onClick={() => handleSaveDist(distribution)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs shadow-xl shadow-gray-200">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
