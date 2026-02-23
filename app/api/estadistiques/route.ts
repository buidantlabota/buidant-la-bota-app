import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ── In-memory cache (per worker, lives ~60s) ──────────────
const CACHE_TTL_MS = 60_000; // 60 seconds
const cache = new Map<string, { ts: number; data: any }>();

const CONFIRMED = ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Tancat'];
const REJECTED = ['Cancel·lat', 'Cancel·lats', 'rebutjat', 'rebutjats'];

// ── Aggregation helpers ───────────────────────────────────
function aggregate(bolos: any[]) {
    const confirmed = bolos.filter(b => CONFIRMED.includes(b.estat));
    const rejected = bolos.filter(b => REJECTED.includes(b.estat));

    const totalIncome = confirmed.reduce((s, b) => s + (b.import_total || 0), 0);
    const cashIncome = confirmed.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0);
    const invoiceIncome = confirmed.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0);
    const totalExpenses = confirmed.reduce((s, b) => s + (b.cost_total_musics || 0), 0);
    const netProfit = confirmed.reduce((s, b) => s + (b.pot_delta_final || 0), 0);
    const sorted = confirmed.map(b => b.import_total || 0).sort((a, b) => a - b);
    const medianPrice = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

    // Monthly map
    const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
    confirmed.forEach(b => {
        const d = new Date(b.data_bolo);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, count: 0 };
        monthlyMap[key].income += (b.import_total || 0);
        monthlyMap[key].count += 1;
    });

    // Town map
    const townMap: Record<string, { name: string; income: number; count: number }> = {};
    confirmed.forEach(b => {
        const p = b.nom_poble || 'Desconegut';
        if (!townMap[p]) townMap[p] = { name: p, income: 0, count: 0 };
        townMap[p].income += (b.import_total || 0);
        townMap[p].count += 1;
    });

    // Type map
    const typeMap: Record<string, number> = {};
    confirmed.forEach(b => {
        const t = b.tipus_actuacio || 'Altres';
        typeMap[t] = (typeMap[t] || 0) + 1;
    });

    // Price buckets
    const priceBuckets = [
        { range: '< 300€', count: confirmed.filter(b => b.import_total < 300).length },
        { range: '300-600€', count: confirmed.filter(b => b.import_total >= 300 && b.import_total < 600).length },
        { range: '600-1000€', count: confirmed.filter(b => b.import_total >= 600 && b.import_total < 1000).length },
        { range: '> 1000€', count: confirmed.filter(b => b.import_total >= 1000).length },
    ];

    return {
        confirmed, rejected,
        totalIncome, cashIncome, invoiceIncome, totalExpenses, netProfit, medianPrice,
        monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
        towns: Object.values(townMap).sort((a, b) => b.income - a.income).slice(0, 10),
        allTowns: townMap,
        types: Object.entries(typeMap).map(([name, count]) => ({ name, value: count })),
        priceBuckets,
        count: bolos.length,
        confirmedCount: confirmed.length,
        rejectedCount: rejected.length,
        pendingCount: bolos.length - confirmed.length - rejected.length,
    };
}

// ── GET handler ───────────────────────────────────────────
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });

    // Parse filters
    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const towns = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const paymentType = searchParams.get('paymentType') || 'tots';
    const statusParam = searchParams.get('status') || 'tots';
    const statuses = statusParam === 'tots' ? [] : statusParam.split(',').filter(Boolean);
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const timeline = searchParams.get('timeline') || 'realitzats';

    // Cache key
    const cacheKey = searchParams.toString();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json(cached.data, {
            headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=60' }
        });
    }

    try {
        // ── Bolos query (only needed columns) ─────────────
        let query = supabase.from('bolos').select(
            'id, data_bolo, nom_poble, import_total, tipus_ingres, estat, tipus_actuacio, cost_total_musics, ajust_pot_manual, pot_delta_final'
        ).limit(5000);

        // Date filter (DB-side)
        if (years.length > 0) {
            const start = Math.min(...years.map(y => parseInt(y)));
            const end = Math.max(...years.map(y => parseInt(y)));
            query = query.gte('data_bolo', `${start}-01-01`).lte('data_bolo', `${end}-12-31`);
        }

        if (towns.length > 0) query = query.in('nom_poble', towns);
        if (minPrice !== null) query = query.gte('import_total', minPrice);
        if (maxPrice !== null) query = query.lte('import_total', maxPrice);
        if (paymentType !== 'tots') query = query.eq('tipus_ingres', paymentType);
        if (types.length > 0) query = query.in('tipus_actuacio', types);

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

        const { data: bolos, error: bolosError } = await query;
        if (bolosError) throw bolosError;

        // ── JS filtering for timeline & date (complex logic) ──
        let filteredByTimeline = bolos || [];
        const now = new Date().toISOString().split('T')[0]; // Current date

        if (timeline === 'realitzats') {
            // Confirmats que ja han passat (o son avui)
            filteredByTimeline = filteredByTimeline.filter((b: any) =>
                CONFIRMED.includes(b.estat) && b.data_bolo <= now
            );
        } else if (timeline === 'confirmats') {
            // Tots els confirmats (passats i futurs)
            filteredByTimeline = filteredByTimeline.filter((b: any) =>
                CONFIRMED.includes(b.estat)
            );
        }
        // If 'all', no extra filter (already filtered by status if any, else everything)

        if (!filteredByTimeline || filteredByTimeline.length === 0) {
            const empty = {
                kpis: { totalIncome: 0, count: 0, confirmedCount: 0, rejectedCount: 0, pendingCount: 0, avgPrice: 0, medianPrice: 0, acceptanceRate: 0, rejectionRate: 0, cashIncome: 0, invoiceIncome: 0, totalExpenses: 0, netProfit: 0 },
                charts: { monthly: [], towns: [], payments: [], prices: [], types: [], map: [] },
                rankings: { elevenGala: [], topSections: [] }
            };
            return NextResponse.json(empty);
        }

        // JS year filter (for non-contiguous years)
        let filteredBolos = filteredByTimeline;
        if (years.length > 0) {
            filteredBolos = filteredByTimeline.filter((b: any) => years.includes(new Date(b.data_bolo).getFullYear().toString()));
        }

        const agg = aggregate(filteredBolos);

        const kpis = {
            totalIncome: agg.totalIncome,
            count: agg.count,
            confirmedCount: agg.confirmedCount,
            rejectedCount: agg.rejectedCount,
            pendingCount: agg.pendingCount,
            avgPrice: agg.confirmedCount > 0 ? agg.totalIncome / agg.confirmedCount : 0,
            medianPrice: agg.medianPrice,
            acceptanceRate: agg.count > 0 ? (agg.confirmedCount / agg.count) * 100 : 0,
            rejectionRate: agg.count > 0 ? (agg.rejectedCount / agg.count) * 100 : 0,
            cashIncome: agg.cashIncome,
            invoiceIncome: agg.invoiceIncome,
            totalExpenses: agg.totalExpenses,
            netProfit: agg.netProfit,
        };

        // ── Rankings: músics (in parallel with coord lookup) ──
        const boloIds = agg.confirmed.map((b: any) => b.id);

        const [attendanceRes, coordsRes] = await Promise.all([
            boloIds.length > 0
                ? supabase.from('bolo_musics')
                    .select('music_id, musics(nom, instruments, tipus)')
                    .in('bolo_id', boloIds)
                    .eq('estat', 'confirmat')
                    .limit(5000)
                : Promise.resolve({ data: [] }),

            supabase.from('municipis')
                .select('nom, lat, lng')
                .in('nom', Object.keys(agg.allTowns))
                .limit(5000),
        ]);

        // Musician rankings
        const musicianMap: Record<string, { name: string; count: number; instrument: string; type: string }> = {};
        (attendanceRes.data || []).forEach((row: any) => {
            const mid = row.music_id;
            const m = row.musics;
            if (!musicianMap[mid]) musicianMap[mid] = { name: m?.nom || 'Desconegut', count: 0, instrument: m?.instruments || '', type: m?.tipus || '' };
            musicianMap[mid].count += 1;
        });
        const elevenGala = Object.values(musicianMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 11)
            .map(m => ({ ...m, percentage: agg.confirmedCount > 0 ? (m.count / agg.confirmedCount) * 100 : 0 }));

        const sectionMap: Record<string, number> = {};
        (attendanceRes.data || []).forEach((row: any) => {
            const inst = row.musics?.instruments || 'Altres';
            const firstIn = inst.split(',')[0].trim();
            sectionMap[firstIn] = (sectionMap[firstIn] || 0) + 1;
        });
        const topSections = Object.entries(sectionMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Map data
        const coordsMap = new Map<string, { lat: number; lng: number }>();
        (coordsRes.data || []).forEach((c: any) => coordsMap.set(c.nom, { lat: c.lat, lng: c.lng }));

        const mapData = Object.values(agg.allTowns).map(t => {
            const coords = coordsMap.get(t.name);
            if (!coords?.lat || !coords?.lng) return null;
            return { municipi: t.name, lat: coords.lat, lng: coords.lng, total_bolos: t.count, total_ingressos: t.income };
        }).filter(Boolean);

        const result = {
            kpis,
            charts: {
                monthly: agg.monthly,
                towns: agg.towns,
                payments: [
                    { name: 'Facturat', value: agg.invoiceIncome },
                    { name: 'Efectiu', value: agg.cashIncome },
                ],
                prices: agg.priceBuckets,
                types: agg.types,
                map: mapData,
            },
            rankings: { elevenGala, topSections },
        };

        // Store in cache
        cache.set(cacheKey, { ts: Date.now(), data: result });

        return NextResponse.json(result, {
            headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=60' }
        });

    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
