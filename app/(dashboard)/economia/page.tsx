'use client';

import { useState, useEffect, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ViewBolosResumAny } from '@/types';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Extend ViewBolosResumAny or create interface for the detailed view
interface EconomiaBolo {
    bolo_id: number;
    nom_poble: string;
    data_bolo: string;
    import_total: number;
    cost_total_musics: number;
    num_musics: number;
    pot_delta: number;
    ajust_pot_manual: number;
    pot_delta_final: number;
    estat_cobrament: string;
    tipus_ingres: string;
    cobrat: boolean;
    pagaments_musics_fets: boolean;
}

export default function EconomiaPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<EconomiaBolo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showCurrentMonth, setShowCurrentMonth] = useState(false);
    const [filterTipusIngres, setFilterTipusIngres] = useState<string>('tots');
    const [stats, setStats] = useState({
        ingressos: 0,
        ingressosEfectiu: 0,
        ingressosFactura: 0,
        despeses_musics: 0,
        pot: 0,
        globalPotReal: 0,
        globalDinersDispo: 0,
        aCobrar: 0,
        aPagar: 0
    });

    const [distribution, setDistribution] = useState<{ name: string, amount: number }[]>([]);
    const [isDistModalOpen, setIsDistModalOpen] = useState(false);
    const [newDistItem, setNewDistItem] = useState({ name: '', amount: 0 });

    const fetchEconomia = async () => {
        setLoading(true);

        const now = new Date();
        let startDate, endDate;

        if (showCurrentMonth) {
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
        } else {
            startDate = `${selectedYear}-01-01`;
            endDate = `${selectedYear}-12-31`;
        }

        let query = supabase
            .from('bolos')
            .select(`
                bolo_id:id,
                nom_poble,
                data_bolo,
                import_total,
                cost_total_musics,
                num_musics,
                pot_delta,
                ajust_pot_manual,
                pot_delta_final,
                estat_cobrament,
                tipus_ingres,
                cobrat,
                pagaments_musics_fets,
                estat
            `)
            .gte('data_bolo', startDate)
            .lte('data_bolo', endDate)
            .not('estat', 'in', '("Cancel·lat","Cancel·lats","rebutjat","rebutjats")')
            .order('data_bolo', { ascending: false });

        if (filterTipusIngres !== 'tots') {
            query = query.eq('tipus_ingres', filterTipusIngres);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching economia:', error);
        } else {
            setBolos(data || []);

            // Calc stats locally from fetched data
            const ing = (data || []).reduce((acc: number, b: any) => acc + (b.import_total || 0), 0);
            const cost = (data || []).reduce((acc: number, b: any) => acc + (b.cost_total_musics || 0), 0);
            const p = (data || []).reduce((acc: number, b: any) => acc + (b.pot_delta_final || 0), 0);

            const ingEfectiu = (data || []).filter((b: any) => b.tipus_ingres === 'Efectiu').reduce((acc: number, b: any) => acc + (b.import_total || 0), 0);
            const ingFactura = (data || []).filter((b: any) => b.tipus_ingres === 'Factura').reduce((acc: number, b: any) => acc + (b.import_total || 0), 0);



            // Calculate Global Pot (2026+)
            const cutoffDate = '2026-01-01';
            const potBase = 4560.21;

            // 1. All Bolos since 2026
            const { data: allBolos } = await supabase
                .from('bolos')
                .select('import_total, cost_total_musics, ajust_pot_manual, pot_delta_final, data_bolo, cobrat, pagaments_musics_fets, estat')
                .gte('data_bolo', cutoffDate)
                .not('estat', 'in', '("Cancel·lat","Cancel·lats","rebutjat","rebutjats")');

            // 2. All Manual Movements since 2026
            const { data: allMovements } = await supabase
                .from('despeses_ingressos')
                .select('import, tipus, data')
                .gte('data', cutoffDate);

            // 3. All Advance Payments
            const { data: allAdvances } = await supabase
                .from('pagaments_anticipats')
                .select('import, data_pagament, bolos(estat, data_bolo, cobrat, pagaments_musics_fets)')
                .gte('data_pagament', cutoffDate);

            const manualBalance = (allMovements || []).reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

            const potRealCount = (allBolos || [])
                .filter((b: any) => b.data_bolo >= cutoffDate && b.cobrat && b.pagaments_musics_fets)
                .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

            let dinersDispoImpact = 0;
            (allBolos || []).filter((b: any) => b.data_bolo >= cutoffDate).forEach((b: any) => {
                if (b.cobrat) {
                    dinersDispoImpact += (b.import_total || 0) + (b.ajust_pot_manual || 0);
                }
                if (b.pagaments_musics_fets) {
                    dinersDispoImpact -= (b.cost_total_musics || 0);
                }
            });

            const pendingAdvancesForPotReal = (allAdvances || [])
                .filter((a: any) => {
                    const b = a.bolos;
                    return !(b?.cobrat && b?.pagaments_musics_fets);
                })
                .reduce((sum: number, a: any) => sum + (a.import || 0), 0);

            const pendingAdvancesForDispo = (allAdvances || [])
                .filter((a: any) => {
                    const b = a.bolos;
                    return !b?.pagaments_musics_fets;
                })
                .reduce((sum: number, a: any) => sum + (a.import || 0), 0);

            // 4. Pending totals
            const aCobrarCount = (allBolos || [])
                .filter((b: any) => !b.cobrat)
                .reduce((sum: number, b: any) => sum + (b.import_total || 0), 0);

            const aPagarCount = (allBolos || [])
                .filter((b: any) => !b.pagaments_musics_fets)
                .reduce((sum: number, b: any) => sum + (b.cost_total_musics || 0), 0);

            const finalPotReal = potBase + manualBalance + potRealCount - pendingAdvancesForPotReal;
            const finalDinersDispo = potBase + manualBalance + dinersDispoImpact - pendingAdvancesForDispo;

            setStats({
                ingressos: ing,
                ingressosEfectiu: ingEfectiu,
                ingressosFactura: ingFactura,
                despeses_musics: cost,
                pot: p,
                globalPotReal: finalPotReal,
                globalDinersDispo: finalDinersDispo,
                aCobrar: aCobrarCount,
                aPagar: aPagarCount
            });

            // Fetch Distribution Config
            const { data: configData } = await supabase
                .from('app_config')
                .select('value')
                .eq('key', 'pot_distribution')
                .single();

            if (configData) {
                setDistribution((configData.value as any).items || []);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEconomia();
    }, [selectedYear, showCurrentMonth, filterTipusIngres]);

    const handleUpdate = async (id: number, field: string, value: any) => {
        // Optimistic update for UI responsiveness
        setBolos(prev => prev.map(b => b.bolo_id === id ? { ...b, [field]: value } : b));

        const { error } = await supabase
            .from('bolos')
            .update({ [field]: value })
            .eq('id', id);

        if (error) {
            console.error('Error updating bolo:', error);
            fetchEconomia(); // Re-fetch to sync
        } else {
            // Briefly wait for DB trigger to calc new pot/cost if import changed
            setTimeout(() => {
                fetchEconomia();
            }, 500);
        }
    };

    const handleSaveDist = async (items: { name: string, amount: number }[]) => {
        const { error } = await supabase
            .from('app_config')
            .upsert({ key: 'pot_distribution', value: { items } });
        if (!error) {
            setDistribution(items);
            setIsDistModalOpen(false);
        }
    };

    const [expandedBolo, setExpandedBolo] = useState<number | null>(null);
    const [boloMusics, setBoloMusics] = useState<any[]>([]);
    const [loadingMusics, setLoadingMusics] = useState(false);

    const toggleExpand = async (boloId: number) => {
        if (expandedBolo === boloId) {
            setExpandedBolo(null);
            setBoloMusics([]);
            return;
        }

        setExpandedBolo(boloId);
        setLoadingMusics(true);

        // Fetch musicians for this bolo
        const { data, error } = await supabase
            .from('bolo_musics')
            .select(`
                *,
                musics (nom, instruments)
            `)
            .eq('bolo_id', boloId);

        if (!error && data) {
            setBoloMusics(data);
        }
        setLoadingMusics(false);
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-text-primary">
                        Resum Econòmic
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Month Toggle */}
                    <button
                        onClick={() => setShowCurrentMonth(!showCurrentMonth)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm border ${showCurrentMonth
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-text-secondary border-border hover:bg-gray-50'
                            }`}
                    >
                        <span className="material-icons-outlined text-sm">calendar_month</span>
                        <span>Mes Actual</span>
                        {showCurrentMonth && <span className="material-icons-outlined text-sm ml-1">check_circle</span>}
                    </button>

                    {/* Year Selector */}
                    <div className={`flex items-center space-x-2 transition-opacity ${showCurrentMonth ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <button
                            onClick={() => setSelectedYear(prev => prev - 1)}
                            className="p-2 rounded hover:bg-gray-100 text-text-primary"
                        >
                            <span className="material-icons-outlined">chevron_left</span>
                        </button>
                        <span className="text-xl font-bold text-text-primary font-mono">
                            {selectedYear}
                        </span>
                        <button
                            onClick={() => setSelectedYear(prev => prev + 1)}
                            className="p-2 rounded hover:bg-gray-100 text-text-primary"
                        >
                            <span className="material-icons-outlined">chevron_right</span>
                        </button>
                    </div>

                    {/* Tipus Ingrés Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipus:</span>
                        <select
                            value={filterTipusIngres}
                            onChange={(e) => setFilterTipusIngres(e.target.value)}
                            className="bg-white border border-border rounded-xl px-3 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="tots">Tots els ingressos</option>
                            <option value="Factura">Factures</option>
                            <option value="Efectiu">Efectiu</option>
                            <option value="Altres">Altres</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Cards Section */}
            <div className="space-y-6">
                {/* Global Core Metrics (Row 1 - Large) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[160px] group hover:scale-[1.01] transition-transform duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <span className="material-icons-outlined text-9xl">savings</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Estat Global</span>
                                <div className="h-px flex-1 bg-white/10"></div>
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-white/70 mb-1">Pot Real (Al Banc)</h3>
                                    <p className="text-4xl font-black font-mono tracking-tighter tabular-nums text-white">
                                        {stats.globalPotReal.toFixed(2)}€
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Pendent de pagar</div>
                                    <div className="text-sm font-mono font-bold text-red-400">-{stats.aPagar.toFixed(0)}€</div>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tight mt-4 relative z-10">Consolidat al banc + despeses manuals</p>
                    </div>

                    <div className="bg-emerald-950 text-white p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[160px] group hover:scale-[1.01] transition-transform duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <span className="material-icons-outlined text-9xl">payments</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">Liquidesa</span>
                                <div className="h-px flex-1 bg-white/10"></div>
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-400/80 mb-1">Diners a disposició</h3>
                                    <p className="text-4xl font-black font-mono tracking-tighter tabular-nums text-emerald-50">
                                        {stats.globalDinersDispo.toFixed(2)}€
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-emerald-400/60 uppercase">Pendent de cobrar</div>
                                    <div className="text-sm font-mono font-bold text-emerald-400">+{stats.aCobrar.toFixed(0)}€</div>
                                </div>
                            </div>
                        </div>
                        <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-tight mt-4 relative z-10">Marges de bolos cobrats (Pendents de pagar)</p>

                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2 relative z-10">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-emerald-400/50">Distribució Real</span>
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
                                        <span className={Math.abs(stats.globalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)) > 0.1 ? 'text-red-400' : 'text-emerald-400'}>
                                            {(stats.globalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)).toFixed(2)}€
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Annual Performance Metrics (Row 2 - Secondary) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Ingressos Year */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow duration-300">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ingressos {selectedYear}</span>
                                <span className="material-icons-outlined text-emerald-500 text-lg group-hover:scale-110 transition-transform">trending_up</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-emerald-600 transition-colors">
                                {stats.ingressos.toFixed(2)}€
                            </p>
                        </div>
                        {filterTipusIngres === 'tots' && (
                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4 text-[10px] font-bold text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>FACTURA: {stats.ingressosFactura.toFixed(0)}€</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    <span>EFECTIU: {stats.ingressosEfectiu.toFixed(0)}€</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cost Músics Year */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow duration-300">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cost Músics {selectedYear}</span>
                                <span className="material-icons-outlined text-red-500 text-lg group-hover:scale-110 transition-transform">group</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight group-hover:text-red-500 transition-colors">
                                {stats.despeses_musics.toFixed(2)}€
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter italic">Suma de pagaments previstos i fets</p>
                        </div>
                    </div>

                    {/* Marge Bolos Year (Renamed) */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm ring-2 ring-primary/5 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Rendiment {selectedYear}</span>
                                <span className="material-icons-outlined text-primary text-lg animate-pulse-slow">account_balance_wallet</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-500 mb-1">Marge directe dels bolos</h3>
                            <p className={`text-3xl font-black font-mono tracking-tight ${stats.pot >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                {stats.pot.toFixed(2)}€
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-primary/10">
                            <p className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter italic">Som la polla (Marge net anual)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card-bg rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-xs uppercase text-text-primary border-b border-border font-semibold">
                                <th className="p-4 w-10"></th>
                                <th className="p-4 font-bold tracking-wider">Data / Bolo</th>
                                <th className="p-4 font-bold tracking-wider text-right">Import Total</th>
                                <th className="p-4 font-bold tracking-wider text-center">Músics</th>
                                <th className="p-4 font-bold tracking-wider text-right">Cost Músics</th>
                                <th className="p-4 font-bold tracking-wider text-right">Ajust Pot</th>
                                <th className="p-4 font-bold tracking-wider text-right">Pot Final</th>
                                <th className="p-4 font-bold tracking-wider text-center">Cobrat</th>
                                <th className="p-4 font-bold tracking-wider text-center">Pagat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-text-secondary">Carregant dades...</td>
                                </tr>
                            ) : bolos.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-text-secondary">Cap bolo trobat per {showCurrentMonth ? 'el mes actual' : `l'any ${selectedYear}`}.</td>
                                </tr>
                            ) : (
                                bolos.map((bolo) => (
                                    <Fragment key={bolo.bolo_id}>
                                        <tr className={`hover:bg-gray-100 transition-colors group ${expandedBolo === bolo.bolo_id ? 'bg-gray-100' : ''}`}>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => toggleExpand(bolo.bolo_id)}
                                                    className="text-text-secondary hover:text-primary transition-colors"
                                                >
                                                    <span className="material-icons-outlined transform transition-transform duration-200" style={{ transform: expandedBolo === bolo.bolo_id ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                        chevron_right
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-text-primary flex items-center gap-2 group">
                                                    <Link href={`/bolos/${bolo.bolo_id}`} className="hover:underline flex items-center gap-1">
                                                        {bolo.nom_poble}
                                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                                    </Link>
                                                </div>
                                                <div className="text-xs text-text-secondary">
                                                    {new Date(bolo.data_bolo).toLocaleDateString('ca-ES')}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <input
                                                    type="number"
                                                    className="w-24 text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-text-primary font-mono"
                                                    value={bolo.import_total}
                                                    onChange={(e) => handleUpdate(bolo.bolo_id, 'import_total', parseFloat(e.target.value) || 0)}
                                                />
                                                <span className="text-xs text-text-secondary ml-1">€</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="badge px-2 py-1 rounded bg-white border border-border text-text-primary font-mono">
                                                    {bolo.num_musics}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-red-600">
                                                {bolo.cost_total_musics !== undefined ? bolo.cost_total_musics.toFixed(2) : '0.00'}€
                                            </td>
                                            <td className="p-4 text-right">
                                                <input
                                                    type="number"
                                                    className="w-20 text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-text-secondary font-mono text-xs"
                                                    value={bolo.ajust_pot_manual}
                                                    onChange={(e) => handleUpdate(bolo.bolo_id, 'ajust_pot_manual', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className={`p-4 text-right font-mono font-bold flex items-center justify-end gap-1 ${bolo.pot_delta_final >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {bolo.pot_delta_final >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                {bolo.pot_delta_final !== undefined ? bolo.pot_delta_final.toFixed(2) : '0.00'}€
                                            </td>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={bolo.cobrat || false}
                                                    onChange={(e) => handleUpdate(bolo.bolo_id, 'cobrat', e.target.checked)}
                                                    className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={bolo.pagaments_musics_fets || false}
                                                    onChange={(e) => handleUpdate(bolo.bolo_id, 'pagaments_musics_fets', e.target.checked)}
                                                    className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                        {expandedBolo === bolo.bolo_id && (
                                            <tr className="bg-white">
                                                <td colSpan={9} className="p-4 pl-12">
                                                    <div className="bg-white rounded border border-border p-4 shadow-inner">
                                                        <h4 className="text-sm font-bold mb-2 text-text-primary">Músics Assignats</h4>
                                                        {loadingMusics ? (
                                                            <p className="text-xs">Carregant músics...</p>
                                                        ) : boloMusics.length === 0 ? (
                                                            <p className="text-xs italic text-text-secondary">No hi ha músics assignats.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {boloMusics.map((bm: any) => (
                                                                    <div key={bm.id} className="text-xs flex justify-between items-center p-2 rounded bg-background border border-border">
                                                                        <div>
                                                                            <span className="font-semibold">{bm.musics.nom}</span>
                                                                            <span className="text-text-secondary ml-1">({bm.musics.instruments})</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${bm.estat === 'confirmat' ? 'bg-green-100 text-green-800' :
                                                                                bm.estat === 'no' || bm.estat === 'baixa' ? 'bg-red-100 text-red-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                                }`}>{bm.estat}</span>
                                                                            {bm.import_assignat > 0 && <span className="font-mono">{bm.import_assignat}€</span>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-white border-t-2 border-border font-bold text-text-primary">
                            <tr>
                                <td className="p-4"></td>
                                <td className="p-4">TOTALS</td>
                                <td className="p-4 text-right font-mono">{stats.ingressos.toFixed(2)}€</td>
                                <td className="p-4 text-center">-</td>
                                <td className="p-4 text-right font-mono text-red-600">{stats.despeses_musics.toFixed(2)}€</td>
                                <td className="p-4 text-right">-</td>
                                <td className={`p-4 text-right font-mono ${stats.pot >= 0 ? 'text-primary' : 'text-red-500'}`}>{stats.pot.toFixed(2)}€</td>
                                <td className="p-4"></td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Distribució Modal */}
            {isDistModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl scale-in-center">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black tracking-tight text-slate-800">Distribució de Diners a Disposició</h2>
                            <button onClick={() => setIsDistModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-6 font-medium italic">Distribueix mentalment els calers que tens ingressats (i encara no pagats) per saber què hi ha a cada compte bancari o associació.</p>

                        <div className="space-y-3">
                            {distribution.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-none text-xs font-bold text-gray-700 focus:ring-0"
                                        value={item.name}
                                        onChange={(e) => {
                                            const newDist = [...distribution];
                                            newDist[index].name = e.target.value;
                                            setDistribution(newDist);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        className="w-24 text-right bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-700 px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={item.amount || ''}
                                        onChange={(e) => {
                                            const newDist = [...distribution];
                                            newDist[index].amount = parseFloat(e.target.value) || 0;
                                            setDistribution(newDist);
                                        }}
                                    />
                                    <button
                                        onClick={() => setDistribution(distribution.filter((_, i) => i !== index))}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <span className="material-icons-outlined text-sm">delete</span>
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
                            <span className={Math.abs(stats.globalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)) > 0.1 ? 'text-red-500' : 'text-emerald-600'}>
                                {(stats.globalDinersDispo - distribution.reduce((s, x) => s + x.amount, 0)).toFixed(2)}€
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
