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
        globalDinersDispo: 0
    });

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

            setStats({
                ingressos: ing,
                ingressosEfectiu: ingEfectiu,
                ingressosFactura: ingFactura,
                despeses_musics: cost,
                pot: p,
                globalPotReal: 0, // Will be set below
                globalDinersDispo: 0
            });

            // Calculate Global Pot (2026+)
            const cutoffDate = '2026-01-01';
            const potBase = 4560.21;

            // 1. All Bolos since 2026
            const { data: allBolos } = await supabase
                .from('bolos')
                .select('pot_delta_final, data_bolo, cobrat, pagaments_musics_fets, estat')
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
                .select('import, data_pagament, bolos(estat, data_bolo)')
                .gte('data_pagament', cutoffDate);

            const manualBalance = (allMovements || []).reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

            const pendingAdvancesValue = (allAdvances || [])
                .filter((p: any) => !['Tancat', 'Tancades'].includes((p.bolos as any)?.estat))
                .reduce((sum: number, p: any) => sum + (p.import || 0), 0);

            const potRealCount = (allBolos || [])
                .filter((b: any) => b.cobrat && b.pagaments_musics_fets)
                .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

            const dinersDispoCount = (allBolos || [])
                .filter((b: any) => b.cobrat)
                .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

            const finalPotReal = potBase + manualBalance + potRealCount - pendingAdvancesValue;
            const finalDinersDispo = potBase + manualBalance + dinersDispoCount - pendingAdvancesValue;

            setStats(prev => ({
                ...prev,
                globalPotReal: finalPotReal,
                globalDinersDispo: finalDinersDispo
            }));
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card-bg p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-text-secondary font-medium mb-1">Total Ingressos</p>
                        <p className="text-3xl font-bold text-green-600 font-mono">
                            {stats.ingressos.toFixed(2)}€
                        </p>
                    </div>
                    {filterTipusIngres === 'tots' && (
                        <div className="mt-4 pt-4 border-t border-border space-y-1">
                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <span>Factura</span>
                                <span className="text-gray-900">{stats.ingressosFactura.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <span>Efectiu</span>
                                <span className="text-gray-900">{stats.ingressosEfectiu.toFixed(2)}€</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-card-bg p-6 rounded-xl border border-border shadow-sm">
                    <p className="text-sm text-text-secondary font-medium mb-1">Cost Músics</p>
                    <p className="text-3xl font-bold text-red-600 font-mono">
                        {stats.despeses_musics.toFixed(2)}€
                    </p>
                </div>
                <div className="bg-card-bg p-6 rounded-xl border border-border shadow-sm ring-1 ring-primary/10 flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-text-secondary font-medium mb-1">Pot Resultant (Marge {selectedYear})</p>
                        <p className={`text-3xl font-bold font-mono ${stats.pot >= 0 ? 'text-primary' : 'text-red-500'}`}>
                            {stats.pot.toFixed(2)}€
                        </p>
                    </div>
                </div>

                {/* Pot Real & Diners a disposició Cards */}
                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pot Real</span>
                        <span className="material-icons-outlined text-slate-500 text-xs">savings</span>
                    </div>
                    <p className="text-3xl font-black font-mono tracking-tighter text-white">
                        {stats.globalPotReal.toFixed(2)}€
                    </p>
                    <p className="text-[9px] text-slate-500 mt-2 font-medium uppercase tracking-tight">Cobrat + Pagat (+ Manuals)</p>
                </div>

                <div className="bg-emerald-950 text-white p-6 rounded-xl shadow-lg border border-emerald-900 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Diners a disposició</span>
                        <span className="material-icons-outlined text-emerald-500 text-xs">payments</span>
                    </div>
                    <p className="text-3xl font-black font-mono tracking-tighter text-white">
                        {stats.globalDinersDispo.toFixed(2)}€
                    </p>
                    <p className="text-[9px] text-emerald-500 mt-2 font-medium uppercase tracking-tight">Cobrat (A punt de gastar)</p>
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
        </div>
    );
}
