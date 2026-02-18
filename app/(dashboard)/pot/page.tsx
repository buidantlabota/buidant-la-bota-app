'use client';

import { useState, useEffect } from 'react';
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

export default function GestioPotPage() {
    const supabase = createClient();
    const [movements, setMovements] = useState<DespesaIngres[]>([]);
    const [activeAdvances, setActiveAdvances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState({
        totalPotReal: 0,      // Money actually in the box
        totalACobrar: 0,      // Projected income from uncollected bolos
        totalAPagar: 0,       // Projected debt to musicians
        totalProjectat: 0,    // Real + ACobrar - APagar
        yearBoloPot: 0,
        yearExtraPot: 0,
        yearIngressos: 0,
        yearDespeses: 0
    });

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
            .select('id, estat, import_total, cost_total_musics, pot_delta_final, data_bolo, cobrat, pagaments_musics_fets');

        // 3. All Manual Movements for global balance
        const { data: allMovements } = await supabase.from('despeses_ingressos').select('import, tipus');

        // 4. All Advance Payments with Bolo status
        const { data: allAdvances } = await supabase
            .from('pagaments_anticipats')
            .select('*, bolos(estat, nom_poble, data_bolo)');

        // CALCULATIONS

        const potBase = 510;
        const cutoffDate = '2025-01-01';

        // A. Pot Real (Money in hand)
        // Manual balance (since cutoff)
        const totalManualBalance = (allMovements || [])
            .filter((m: any) => m.data >= cutoffDate || !m.data)
            .reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

        // Closed bolos net profit (since cutoff)
        const closedBolosPot = (allBolos || [])
            .filter((b: any) => (b.estat === 'Tancades' || b.estat === 'Tancat') && b.data_bolo >= cutoffDate)
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        // Pending advances that ALREADY left the box (since cutoff)
        const pendingAdvances = (allAdvances || [])
            .filter((p: any) => (p.bolos as any)?.estat !== 'Tancades' && (p.bolos as any)?.estat !== 'Tancat' && p.data_pagament >= cutoffDate)
            .reduce((sum: number, p: any) => sum + (p.import || 0), 0);

        const potReal = potBase + totalManualBalance + closedBolosPot - pendingAdvances;

        // B. Pending entries (A cobrar)
        // Sum of import_total of bolos not collected (since cutoff)
        const aCobrar = (allBolos || [])
            .filter((b: any) => !['Tancades', 'Tancat', 'Cancel·lats', 'Cancel·lat'].includes(b.estat) && !b.cobrat && b.data_bolo >= cutoffDate)
            .reduce((sum: number, b: any) => {
                const income = b.import_total || 0;
                const advancesReceived = (allAdvances || [])
                    .filter((p: any) => p.bolo_id === b.id)
                    .reduce((acc: number, p: any) => acc + (p.import || 0), 0);
                return sum + (income - advancesReceived);
            }, 0);

        // C. Pending departures (A pagar)
        // Sum of remaining cost of musicians for bolos not fully paid (since cutoff)
        const aPagar = (allBolos || [])
            .filter((b: any) => !['Tancades', 'Tancat', 'Cancel·lats', 'Cancel·lat'].includes(b.estat) && !b.pagaments_musics_fets && b.data_bolo >= cutoffDate)
            .reduce((sum: number, b: any) => {
                const totalCost = b.cost_total_musics || 0;
                // Subtract advances already paid for this bolo
                const advancesForThisBolo = (allAdvances || [])
                    .filter((p: any) => p.bolo_id === b.id)
                    .reduce((acc: number, p: any) => acc + (p.import || 0), 0);
                return sum + (totalCost - advancesForThisBolo);
            }, 0);

        // D. Annual Metrics
        const yearBoloPot = (allBolos || [])
            .filter((b: any) => b.data_bolo >= start && b.data_bolo <= end && !['Cancel·lats', 'Cancel·lat'].includes(b.estat))
            .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        const yearIng = (yearData || []).filter((m: any) => m.tipus === 'ingrés').reduce((sum: number, m: any) => sum + m.import, 0);
        const yearDesp = (yearData || []).filter((m: any) => m.tipus === 'despesa').reduce((sum: number, m: any) => sum + m.import, 0);

        setMovements(yearData || []);
        setActiveAdvances((allAdvances || []).filter((p: any) => !['Tancades', 'Tancat'].includes((p.bolos as any)?.estat)));

        setStats({
            totalPotReal: potReal,
            totalACobrar: aCobrar,
            totalAPagar: aPagar,
            totalProjectat: potReal + aCobrar - aPagar,
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
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">Gestió Econòmica</h1>
                    <p className="text-text-secondary mt-1 font-medium">Control del pot reial i previsions de futur</p>
                </div>
                <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                    <button onClick={() => setYear(prev => prev - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><span className="material-icons-outlined">chevron_left</span></button>
                    <span className="px-6 text-xl font-black font-mono">{year}</span>
                    <button onClick={() => setYear(prev => prev + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><span className="material-icons-outlined">chevron_right</span></button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                {/* 1. POT REIAL */}
                <div className="bg-gradient-to-br from-primary to-red-900 text-white p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[180px] max-w-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-icons-outlined text-9xl">payments</span>
                    </div>
                    <div>
                        <p className="text-white/70 text-sm font-black uppercase tracking-[0.2em] mb-1">Diners en Caixa (Real)</p>
                        <p className="text-5xl font-black font-mono tracking-tighter">{stats.totalPotReal.toFixed(2)}€</p>
                    </div>
                    <p className="text-white/60 text-[10px] font-bold mt-4 italic">Inclou bolos tancats i despeses manuals.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manual Movements List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-primary">receipt_long</span>
                            Moviments Manuals {year}
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary hover:bg-red-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md"
                        >
                            <span className="material-icons-outlined text-sm">add</span>
                            Afegir
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 italic">
                                    <tr className="text-[10px] text-gray-400 uppercase tracking-[0.1em]">
                                        <th className="p-4">Data</th>
                                        <th className="p-4">Concepte</th>
                                        <th className="p-4 text-right">Import</th>
                                        <th className="p-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {movements.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-xs font-mono text-gray-500">
                                                {new Date(m.data).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-gray-700">{m.descripcio}</div>
                                                <div className="text-[10px] text-gray-400 uppercase font-black">{m.categoria}</div>
                                            </td>
                                            <td className={`p-4 text-right font-mono font-black ${m.tipus === 'ingrés' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {m.tipus === 'ingrés' ? '+' : '-'}{m.import.toFixed(2)}€
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDelete(m.id)} className="text-gray-200 hover:text-red-500 transition-colors">
                                                    <span className="material-icons-outlined text-lg">close</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {movements.length === 0 && (
                                        <tr><td colSpan={4} className="p-12 text-center text-gray-400">Cap moviment registrat aquest any.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Active Advances List */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <span className="material-icons-outlined text-orange-500">priority_high</span>
                        Pagaments Anticipats (Actius)
                    </h3>
                    <div className="bg-orange-50/50 rounded-2xl border border-orange-100 p-6">
                        <p className="text-xs text-orange-800 font-medium mb-4 leading-relaxed bg-white border border-orange-100 p-3 rounded-lg">
                            ⚠️ Aquests pagaments ja han sortit de la caixa i es resten automàticament del Pot Reial.
                            Desapareixeran d'aquesta llista quan el bolo corresponent es marqui com a <strong>Tancat</strong>.
                        </p>

                        <div className="space-y-3">
                            {activeAdvances.length > 0 ? (
                                activeAdvances.map(adv => (
                                    <div key={adv.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-orange-600 uppercase tracking-tighter">
                                                {(adv.bolos as any)?.nom_poble}
                                            </p>
                                            <p className="text-sm font-bold text-gray-700 truncate">
                                                {adv.notes || 'Avançament de sou'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 italic">
                                                {new Date(adv.data_pagament).toLocaleDateString('ca-ES')}
                                            </p>
                                        </div>
                                        <div className="text-xl font-mono font-black text-orange-700">
                                            -{adv.import.toFixed(2)}€
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-orange-300 italic text-sm">No hi ha avançaments actius.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black mb-6 text-gray-900">Nou Moviment</h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl">
                                <button
                                    onClick={() => setNewMovement({ ...newMovement, tipus: 'despesa' })}
                                    className={`py-2 px-4 rounded-lg font-bold text-sm transition-all ${newMovement.tipus === 'despesa' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Despesa
                                </button>
                                <button
                                    onClick={() => setNewMovement({ ...newMovement, tipus: 'ingrés' })}
                                    className={`py-2 px-4 rounded-lg font-bold text-sm transition-all ${newMovement.tipus === 'ingrés' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Ingrés
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Data</label>
                                <input type="date" value={newMovement.data} onChange={e => setNewMovement({ ...newMovement, data: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium text-gray-700" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Import (€)</label>
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
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Descripció</label>
                                <input type="text" value={newMovement.descripcio} onChange={e => setNewMovement({ ...newMovement, descripcio: e.target.value })} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Ex: Compra de material..." />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancel·lar</button>
                            <button onClick={handleAdd} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-black transition-all">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

