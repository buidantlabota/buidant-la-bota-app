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
    type: 'bolo' | 'manual';
    originalId: string | number;
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
            .select('id, estat, nom_poble, import_total, cost_total_musics, pot_delta_final, data_bolo, cobrat, pagaments_musics_fets')
            .not('estat', 'in', '("Cancel·lat","Cancel·lats","rebutjat","rebutjats")');

        // 3. All Manual Movements for global balance
        const { data: allMovements } = await supabase.from('despeses_ingressos').select('*');

        // 4. All Advance Payments
        const { data: allAdvances } = await supabase
            .from('pagaments_anticipats')
            .select('*, bolos(estat, nom_poble, data_bolo)');

        // CALCULATIONS
        const potBase = 510;
        const cutoffDate = '2025-01-01';

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

        const pendingAdvancesValue = (allAdvances || [])
            .filter((p: any) => !['Tancat', 'Tancades'].includes((p.bolos as any)?.estat) && p.data_pagament >= cutoffDate)
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

        // D. Create Chronological Ledger
        // 1. Manual Movements
        const manualLedgerEntries = manualMovements2025.map((m: any) => ({
            date: m.data,
            description: m.descripcio,
            amount: m.tipus === 'ingrés' ? m.import : -m.import,
            type: 'manual' as const,
            originalId: m.id
        }));

        // 2. Closed Bolos
        const boloLedgerEntries = bolos2025
            .filter((b: any) => b.cobrat && b.pagaments_musics_fets)
            .map((b: any) => ({
                date: b.data_bolo,
                description: `Bolo: ${b.nom_poble}`,
                amount: b.pot_delta_final || 0,
                type: 'bolo' as const,
                originalId: b.id
            }));

        // Combine and Sort
        const sortedEntries = [...manualLedgerEntries, ...boloLedgerEntries].sort((a, b) => a.date.localeCompare(b.date));

        // Calculate running balance
        let currentBalance = potBase;
        const ledgerWithBalance: LedgerMovement[] = sortedEntries.map(entry => {
            const balanceBefore = currentBalance;
            currentBalance += entry.amount;
            return {
                ...entry,
                balanceBefore,
                balanceAfter: currentBalance
            };
        });

        setLedger(ledgerWithBalance.reverse()); // Newest first for display
        setMovements(yearData || []);
        setActiveAdvances((allAdvances || []).filter((p: any) => !['Tancat', 'Tancades'].includes((p.bolos as any)?.estat)));

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
                    <p className="text-text-secondary mt-1 font-medium italic">Control del pot real i historial de moviments (Des de 2025)</p>
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
                                                <div className="text-[8px] text-gray-400 uppercase font-black tracking-widest">{m.type === 'bolo' ? 'Bolo Tancat' : 'Manual'}</div>
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
        </div>
    );
}
