import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ── Types ────────────────────────────────────────────────
interface StatFilters {
    years?: string[];
    towns?: string[];
    types?: string[];
    statuses?: string[];
    paymentType?: string;
    minPrice?: number | null;
    maxPrice?: number | null;
    // compare-specific overrides
    overrideTowns?: string[];
    overrideTypes?: string[];
    overrideYears?: string[];
    overridePayment?: string;
}

// ── Helper: all confirmed states ─────────────────────────
const CONFIRMED = ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Tancat'];
const REJECTED = ['Cancel·lat', 'Cancel·lats', 'rebutjat', 'rebutjats'];

// ── Core aggregation (pure JS, runs on already-fetched rows) ──
function computeStats(bolos: any[]) {
    const confirmed = bolos.filter(b => CONFIRMED.includes(b.estat));
    const rejected = bolos.filter(b => REJECTED.includes(b.estat));

    const totalIncome = confirmed.reduce((s, b) => s + (b.import_total || 0), 0);
    const cashIncome = confirmed.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0);
    const invoiceIncome = confirmed.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0);
    const totalExpenses = confirmed.reduce((s, b) => s + (b.cost_total_musics || 0), 0);
    const netProfit = confirmed.reduce((s, b) => s + (b.pot_delta_final || 0), 0);
    const sorted = confirmed.map(b => b.import_total || 0).sort((a, b) => a - b);
    const medianPrice = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

    // Monthly breakdown
    const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
    confirmed.forEach(b => {
        const d = new Date(b.data_bolo);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, count: 0 };
        monthlyMap[key].income += (b.import_total || 0);
        monthlyMap[key].count += 1;
    });

    return {
        totalIncome,
        count: bolos.length,
        confirmedCount: confirmed.length,
        rejectedCount: rejected.length,
        pendingCount: bolos.length - confirmed.length - rejected.length,
        avgPrice: confirmed.length > 0 ? totalIncome / confirmed.length : 0,
        medianPrice,
        acceptanceRate: bolos.length > 0 ? (confirmed.length / bolos.length) * 100 : 0,
        cashIncome,
        invoiceIncome,
        totalExpenses,
        netProfit,
        monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
    };
}

// ── Delta computation ─────────────────────────────────────
function computeDelta(a: ReturnType<typeof computeStats>, b: ReturnType<typeof computeStats>) {
    const pct = (vA: number, vB: number) =>
        vA === 0 ? (vB > 0 ? Infinity : 0) : ((vB - vA) / vA) * 100;

    return {
        totalIncome: { diff: b.totalIncome - a.totalIncome, pct: pct(a.totalIncome, b.totalIncome) },
        count: { diff: b.count - a.count, pct: pct(a.count, b.count) },
        confirmedCount: { diff: b.confirmedCount - a.confirmedCount, pct: pct(a.confirmedCount, b.confirmedCount) },
        avgPrice: { diff: b.avgPrice - a.avgPrice, pct: pct(a.avgPrice, b.avgPrice) },
        netProfit: { diff: b.netProfit - a.netProfit, pct: pct(a.netProfit, b.netProfit) },
        acceptanceRate: { diff: b.acceptanceRate - a.acceptanceRate, pct: pct(a.acceptanceRate, b.acceptanceRate) },
    };
}

// ── GET handler ───────────────────────────────────────────
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });

    // ── Common filters ──
    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const towns = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const paymentType = searchParams.get('paymentType') || 'tots';
    const statusParam = searchParams.get('status') || 'tots';
    const statuses = statusParam === 'tots' ? [] : statusParam.split(',').filter(Boolean);
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;

    // ── Compare axis ──
    const axis = searchParams.get('axis') || 'any'; // 'any' | 'poble' | 'tipus' | 'pagament'
    const valA = searchParams.get('a') || '';
    const valB = searchParams.get('b') || '';

    try {
        // ── Fetch base dataset (apply common filters except the compare axis) ──
        let query = supabase.from('bolos').select(`
            id, data_bolo, nom_poble, import_total,
            tipus_ingres, estat, tipus_actuacio,
            cost_total_musics, pot_delta_final
        `);

        // Common filters (excluding the axis dimension)
        if (axis !== 'poble' && towns.length > 0) query = query.in('nom_poble', towns);
        if (axis !== 'tipus' && types.length > 0) query = query.in('tipus_actuacio', types);
        if (axis !== 'pagament' && paymentType !== 'tots') query = query.eq('tipus_ingres', paymentType);
        if (minPrice !== null) query = query.gte('import_total', minPrice);
        if (maxPrice !== null) query = query.lte('import_total', maxPrice);

        // Status filter
        if (statuses.length > 0) {
            if (statuses.length === 1) {
                const s = statuses[0];
                if (s === 'acceptat') query = query.in('estat', CONFIRMED);
                else if (s === 'rebutjat') query = query.in('estat', REJECTED);
                else if (s === 'pendent') query = query.in('estat', ['Nova', 'Pendent de confirmació', 'Sol·licitat']);
                else query = query.in('estat', statuses);
            } else {
                query = query.in('estat', statuses);
            }
        }

        // Year filter: for 'any' axis we need both A and B years; otherwise apply common years
        if (axis === 'any') {
            const yearsNeeded = [valA, valB].filter(Boolean);
            if (yearsNeeded.length > 0) {
                // fetch the year range that covers A and B
                const all = [...years, ...yearsNeeded];
                const start = Math.min(...all.map(y => parseInt(y)));
                const end = Math.max(...all.map(y => parseInt(y)));
                query = query.gte('data_bolo', `${start}-01-01`).lte('data_bolo', `${end}-12-31`);
            }
        } else if (years.length > 0) {
            const start = Math.min(...years.map(y => parseInt(y)));
            const end = Math.max(...years.map(y => parseInt(y)));
            query = query.gte('data_bolo', `${start}-01-01`).lte('data_bolo', `${end}-12-31`);
        }

        const { data: allBolos, error } = await query;
        if (error) throw error;

        // ── Segment into A and B ──
        let bolosA: any[] = [];
        let bolosB: any[] = [];

        if (axis === 'any') {
            bolosA = (allBolos || []).filter(b => new Date(b.data_bolo).getFullYear().toString() === valA);
            bolosB = (allBolos || []).filter(b => new Date(b.data_bolo).getFullYear().toString() === valB);
        } else if (axis === 'poble') {
            bolosA = (allBolos || []).filter(b => b.nom_poble === valA);
            bolosB = (allBolos || []).filter(b => b.nom_poble === valB);
        } else if (axis === 'tipus') {
            bolosA = (allBolos || []).filter(b => b.tipus_actuacio === valA);
            bolosB = (allBolos || []).filter(b => b.tipus_actuacio === valB);
        } else if (axis === 'pagament') {
            bolosA = (allBolos || []).filter(b => b.tipus_ingres === 'Factura');
            bolosB = (allBolos || []).filter(b => b.tipus_ingres === 'Efectiu');
        }

        // Apply JS year filter if extra years were present in common filters
        if (axis !== 'any' && years.length > 0) {
            bolosA = bolosA.filter(b => years.includes(new Date(b.data_bolo).getFullYear().toString()));
            bolosB = bolosB.filter(b => years.includes(new Date(b.data_bolo).getFullYear().toString()));
        }

        const statsA = computeStats(bolosA);
        const statsB = computeStats(bolosB);
        const diff = computeDelta(statsA, statsB);

        return NextResponse.json({ a: statsA, b: statsB, diff, axis, valA, valB });

    } catch (err: any) {
        console.error('Compare API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
