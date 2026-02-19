'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Minus, Euro, BarChart3,
    ChevronDown, RefreshCw, GitCompare, ArrowRight
} from 'lucide-react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip as RTooltip, Legend, BarChart, Bar
} from 'recharts';
import { PrivacyMask } from '@/components/PrivacyMask';

// ── Types ────────────────────────────────────────────────
type Axis = 'any' | 'poble' | 'tipus' | 'pagament';

interface ComparePanelProps {
    baseFilters: {
        years: string[];
        towns: string[];
        types: string[];
        status: string[];
        paymentType: string;
        minPrice: string;
        maxPrice: string;
    };
    availableData: { years: string[]; towns: string[]; types: string[] };
}

interface CompareStats {
    totalIncome: number;
    count: number;
    confirmedCount: number;
    avgPrice: number;
    netProfit: number;
    acceptanceRate: number;
    monthly: { month: string; income: number; count: number }[];
}

interface DeltaEntry {
    diff: number;
    pct: number;
}

interface CompareResult {
    a: CompareStats;
    b: CompareStats;
    diff: Record<string, DeltaEntry>;
    axis: string;
    valA: string;
    valB: string;
}

// ── Small select component ────────────────────────────────
function SimpleSelect({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-2.5 pr-10 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    );
}

// ── Delta badge ───────────────────────────────────────────
function DeltaBadge({ diff, pct, isMoney = false }: { diff: number; pct: number; isMoney?: boolean }) {
    const isPositive = diff > 0;
    const isNeutral = diff === 0;
    const label = isMoney ? `${diff >= 0 ? '+' : ''}${Math.round(diff)}€` : `${diff >= 0 ? '+' : ''}${Math.round(diff)}`;
    const pctLabel = isFinite(pct) ? ` (${pct >= 0 ? '+' : ''}${Math.round(pct)}%)` : '';

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${isNeutral ? 'bg-gray-100 text-gray-500' :
            isPositive ? 'bg-emerald-50 text-emerald-700' :
                'bg-red-50 text-red-600'
            }`}>
            {isNeutral ? <Minus size={10} /> : isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {label}{pctLabel}
        </span>
    );
}

// ── KPI comparison card ───────────────────────────────────
function CompareKpiCard({ label, valA, valB, delta, isMoney = false, labelA, labelB }: {
    label: string; valA: number; valB: number; delta: DeltaEntry;
    isMoney?: boolean; labelA: string; labelB: string;
}) {
    const fmt = (v: number) => isMoney
        ? `${Math.round(v).toLocaleString('ca-ES')}€`
        : Math.round(v).toLocaleString('ca-ES');

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1 truncate">{labelA}</p>
                    <p className="text-lg font-black text-blue-700">{fmt(valA)}</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black text-amber-500 uppercase mb-1 truncate">{labelB}</p>
                    <p className="text-lg font-black text-amber-700">{fmt(valB)}</p>
                </div>
            </div>
            <div className="flex justify-center">
                <DeltaBadge diff={delta.diff} pct={delta.pct} isMoney={isMoney} />
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────
export default function ComparePanel({ baseFilters, availableData }: ComparePanelProps) {
    const [axis, setAxis] = useState<Axis>('any');
    const [valA, setValA] = useState('');
    const [valB, setValB] = useState('');
    const [result, setResult] = useState<CompareResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const abortRef = useRef<AbortController | null>(null);

    // Auto-select defaults when axis changes or available data loads
    useEffect(() => {
        if (axis === 'any') {
            const sorted = [...availableData.years].sort().reverse();
            setValA(sorted[1] || sorted[0] || '');
            setValB(sorted[0] || '');
        } else if (axis === 'poble') {
            setValA(availableData.towns[0] || '');
            setValB(availableData.towns[1] || '');
        } else if (axis === 'tipus') {
            setValA(availableData.types[0] || '');
            setValB(availableData.types[1] || '');
        } else if (axis === 'pagament') {
            setValA('Factura');
            setValB('Efectiu');
        }
    }, [axis, availableData]);

    const fetchCompare = useCallback(async () => {
        if (!valA || !valB) return;
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError('');
        try {
            const p = new URLSearchParams({ axis, a: valA, b: valB });
            if (baseFilters.years?.length) p.append('years', baseFilters.years.join(','));
            if (baseFilters.towns?.length) p.append('towns', baseFilters.towns.join(','));
            if (baseFilters.types?.length) p.append('types', baseFilters.types.join(','));
            if (baseFilters.status?.length) p.append('status', baseFilters.status.join(','));
            if (baseFilters.paymentType !== 'tots') p.append('paymentType', baseFilters.paymentType);
            if (baseFilters.minPrice) p.append('minPrice', baseFilters.minPrice);
            if (baseFilters.maxPrice) p.append('maxPrice', baseFilters.maxPrice);

            const res = await fetch(`/api/estadistiques/compare?${p}`, { signal: abortRef.current.signal });
            if (!res.ok) throw new Error('Error API');
            setResult(await res.json());
        } catch (e: any) {
            if (e.name !== 'AbortError') setError('Error carregant les comparatives.');
        } finally {
            setLoading(false);
        }
    }, [axis, valA, valB, baseFilters]);

    // Debounced auto-fetch
    useEffect(() => {
        const t = setTimeout(fetchCompare, 400);
        return () => clearTimeout(t);
    }, [fetchCompare]);

    // Labels for A and B
    const labelA = axis === 'pagament' ? 'Facturat' : (valA || 'A');
    const labelB = axis === 'pagament' ? 'Efectiu' : (valB || 'B');

    // Merge monthly data for chart
    const mergedMonthly = (() => {
        if (!result) return [];
        const map: Record<string, any> = {};
        result.a.monthly.forEach(m => {
            map[m.month] = { month: m.month, incomeA: m.income, countA: m.count };
        });
        result.b.monthly.forEach(m => {
            map[m.month] = { ...(map[m.month] || { month: m.month, incomeA: 0, countA: 0 }), incomeB: m.income, countB: m.count };
        });
        return Object.values(map).sort((a: any, b: any) => a.month.localeCompare(b.month));
    })();

    const AXIS_OPTIONS: { value: Axis; label: string }[] = [
        { value: 'any', label: 'Any vs Any' },
        { value: 'poble', label: 'Poble vs Poble' },
        { value: 'tipus', label: 'Tipus vs Tipus' },
        { value: 'pagament', label: 'Facturat vs Efectiu' },
    ];

    return (
        <div className="space-y-8">
            {/* Controls */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><GitCompare size={20} /></div>
                    <div>
                        <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Mode Compara</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Comparació d'intervals i segments</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Axis selector */}
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Comparar per</p>
                        <div className="flex flex-col gap-1.5">
                            {AXIS_OPTIONS.map(o => (
                                <button
                                    key={o.value}
                                    onClick={() => setAxis(o.value)}
                                    className={`text-left px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${axis === o.value
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* A selector */}
                    <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Opció A</p>
                        {axis === 'pagament' ? (
                            <div className="bg-blue-50 rounded-2xl px-4 py-3 font-black text-blue-700 text-sm">Factura</div>
                        ) : (
                            <SimpleSelect
                                value={valA}
                                onChange={setValA}
                                placeholder="Selecciona A..."
                                options={axis === 'any' ? availableData.years : axis === 'poble' ? availableData.towns : availableData.types}
                            />
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center items-end pb-3">
                        <div className="p-3 rounded-full bg-gray-100 text-gray-400">
                            <ArrowRight size={18} />
                        </div>
                    </div>

                    {/* B selector */}
                    <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Opció B</p>
                        {axis === 'pagament' ? (
                            <div className="bg-amber-50 rounded-2xl px-4 py-3 font-black text-amber-700 text-sm">Efectiu</div>
                        ) : (
                            <SimpleSelect
                                value={valB}
                                onChange={setValB}
                                placeholder="Selecciona B..."
                                options={axis === 'any' ? availableData.years : axis === 'poble' ? availableData.towns : availableData.types}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center gap-3 py-8 text-gray-400">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
                    <span className="text-xs font-black uppercase tracking-widest">Calculant comparativa…</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="text-center py-6 text-red-500 font-bold text-sm">{error}</div>
            )}

            {/* Results */}
            {result && !loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    {/* KPI grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <CompareKpiCard
                            label="Total Ingressos" isMoney
                            valA={result.a.totalIncome} valB={result.b.totalIncome}
                            delta={result.diff.totalIncome}
                            labelA={labelA} labelB={labelB}
                        />
                        <CompareKpiCard
                            label="Nº de Bolos"
                            valA={result.a.count} valB={result.b.count}
                            delta={result.diff.count}
                            labelA={labelA} labelB={labelB}
                        />
                        <CompareKpiCard
                            label="Confirmats"
                            valA={result.a.confirmedCount} valB={result.b.confirmedCount}
                            delta={result.diff.confirmedCount}
                            labelA={labelA} labelB={labelB}
                        />
                        <CompareKpiCard
                            label="Mitjana € / Bolo" isMoney
                            valA={result.a.avgPrice} valB={result.b.avgPrice}
                            delta={result.diff.avgPrice}
                            labelA={labelA} labelB={labelB}
                        />
                        <CompareKpiCard
                            label="Benefici Net" isMoney
                            valA={result.a.netProfit} valB={result.b.netProfit}
                            delta={result.diff.netProfit}
                            labelA={labelA} labelB={labelB}
                        />
                        <CompareKpiCard
                            label="% Acceptació"
                            valA={result.a.acceptanceRate} valB={result.b.acceptanceRate}
                            delta={result.diff.acceptanceRate}
                            labelA={labelA} labelB={labelB}
                        />
                    </div>

                    {/* Monthly evolution chart */}
                    {mergedMonthly.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-10">
                            <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-6">
                                Evolució d'Ingressos Mensual
                            </h4>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={mergedMonthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v)}€`} />
                                    <RTooltip formatter={((v: number, name: string) => [`${Math.round(v)}€`, name]) as any} />
                                    <Legend />
                                    <Line type="monotone" dataKey="incomeA" name={labelA} stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                                    <Line type="monotone" dataKey="incomeB" name={labelB} stroke="#f59e0b" strokeWidth={2.5} dot={false} strokeDasharray="5 4" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Volume chart */}
                    {mergedMonthly.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-10">
                            <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-6">
                                Volum de Bolos Mensual
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={mergedMonthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RTooltip />
                                    <Legend />
                                    <Bar dataKey="countA" name={labelA} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="countB" name={labelB} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
