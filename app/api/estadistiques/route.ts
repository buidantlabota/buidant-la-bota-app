import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// FORÇAR QUE NO HI HAGI CACHE DE CAP TIPUS A NIVELL DE VERCEL/NEXT
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Llista exhaustiva d'estats que considerem "vàlids" per comptar al rànquing
const CONFIRMED = [
    'Confirmada', 'Confirmat', 'confirmada', 'confirmat',
    'Pendents de cobrar', 'Pendent de cobrar', 'Per pagar',
    'Tancades', 'Tancat', 'Tancada', 'tancat', 'tancada',
    'Facturada', 'Facturat', 'Cobrada', 'Cobrat', 'Pagat', 'Pagada'
];
const REJECTED = ['Cancel·lat', 'Cancel·lats', 'rebutjat', 'rebutjats', 'REBUTJADA', 'REBUTJADES', 'REBUTJAT'];

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

    const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
    confirmed.forEach(b => {
        const d = new Date(b.data_bolo);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, count: 0 };
        monthlyMap[key].income += (b.import_total || 0);
        monthlyMap[key].count += 1;
    });

    const townMap: Record<string, { name: string; income: number; count: number }> = {};
    confirmed.forEach(b => {
        const p = b.nom_poble || 'Desconegut';
        if (!townMap[p]) townMap[p] = { name: p, income: 0, count: 0 };
        townMap[p].income += (b.import_total || 0);
        townMap[p].count += 1;
    });

    const typeMap: Record<string, number> = {};
    confirmed.forEach(b => {
        const t = b.tipus_actuacio || 'Altres';
        typeMap[t] = (typeMap[t] || 0) + 1;
    });

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

    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const towns = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const paymentType = searchParams.get('paymentType') || 'tots';
    const statusParam = searchParams.get('status') || 'tots';
    const statuses = statusParam === 'tots' ? [] : statusParam.split(',').filter(Boolean);
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const timeline = searchParams.get('timeline') || 'realitzats';

    try {
        // 1. Fetch Bolos (sense cache i amb límit ampli)
        let bQuery = supabase.from('bolos').select(
            'id, data_bolo, nom_poble, import_total, tipus_ingres, estat, tipus_actuacio, cost_total_musics, ajust_pot_manual, pot_delta_final'
        ).limit(50000);

        if (years.length > 0) {
            const start = Math.min(...years.map(y => parseInt(y)));
            const end = Math.max(...years.map(y => parseInt(y)));
            bQuery = bQuery.gte('data_bolo', `${start}-01-01`).lte('data_bolo', `${end}-12-31`);
        }
        if (towns.length > 0) bQuery = bQuery.in('nom_poble', towns);
        if (minPrice !== null) bQuery = bQuery.gte('import_total', minPrice);
        if (maxPrice !== null) bQuery = bQuery.lte('import_total', maxPrice);
        if (paymentType !== 'tots') bQuery = bQuery.eq('tipus_ingres', paymentType);
        if (types.length > 0) bQuery = bQuery.in('tipus_actuacio', types);

        const { data: rawBolos, error: bolosError } = await bQuery;
        if (bolosError) throw bolosError;

        // 2. JS filtering (Molt important: incloem el debug de data)
        const now = new Date().toISOString().split('T')[0];
        let bolos = rawBolos || [];

        if (timeline === 'realitzats') {
            bolos = bolos.filter((b: any) => CONFIRMED.includes(b.estat) && b.data_bolo <= now);
        } else if (timeline === 'confirmats') {
            bolos = bolos.filter((b: any) => CONFIRMED.includes(b.estat));
        }

        // JS status filter if provided
        if (statuses.length > 0) {
            const s = statuses[0];
            if (s === 'acceptat') bolos = bolos.filter(b => CONFIRMED.includes(b.estat));
            else if (s === 'rebutjat') bolos = bolos.filter(b => REJECTED.includes(b.estat));
            else if (s === 'pendent') bolos = bolos.filter(b => ['Nova', 'Pendent de confirmació', 'Sol·licitat'].includes(b.estat));
        }

        const agg = aggregate(bolos);
        const boloIds = agg.confirmed.map((b: any) => b.id);

        // 3. Fetch Musician Attendance (Chunking robust de 100 en 100)
        let attendanceData: any[] = [];
        if (boloIds.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < boloIds.length; i += chunkSize) {
                const chunk = boloIds.slice(i, i + chunkSize);
                const { data, error } = await supabase.from('bolo_musics')
                    .select('music_id, musics(nom, instruments, tipus)')
                    .in('bolo_id', chunk)
                    .ilike('estat', 'confirmat')
                    .limit(10000);
                if (data) attendanceData = [...attendanceData, ...data];
                if (error) console.error("Error in attendance chunk:", error);
            }
        }

        // 4. Fetch Towns Coords i Músics rànkings
        const { data: coordsData } = await supabase.from('municipis')
            .select('nom, lat, lng')
            .in('nom', Object.keys(agg.allTowns))
            .limit(10000);

        const musicianMap: Record<string, { name: string; count: number; instrument: string; type: string }> = {};
        attendanceData.forEach((row: any) => {
            const mid = row.music_id;
            const m = row.musics;
            if (!mid || !m) return;
            if (!musicianMap[mid]) musicianMap[mid] = { name: m.nom || 'Desconegut', count: 0, instrument: m.instruments || '', type: m.tipus || '' };
            musicianMap[mid].count += 1;
        });

        const elevenGala = Object.values(musicianMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 11)
            .map(m => ({ ...m, percentage: agg.confirmedCount > 0 ? (m.count / agg.confirmedCount) * 100 : 0 }));

        const sectionMap: Record<string, number> = {};
        attendanceData.forEach((row: any) => {
            const inst = row.musics?.instruments || 'Altres';
            const firstIn = inst.split(',')[0].trim();
            sectionMap[firstIn] = (sectionMap[firstIn] || 0) + 1;
        });
        const topSections = Object.entries(sectionMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const coordsMap = new Map<string, { lat: number; lng: number }>();
        (coordsData || []).forEach((c: any) => coordsMap.set(c.nom, { lat: c.lat, lng: c.lng }));

        const mapData = Object.values(agg.allTowns).map(t => {
            const coords = coordsMap.get(t.name);
            if (!coords?.lat || !coords?.lng) return null;
            return { municipi: t.name, lat: coords.lat, lng: coords.lng, total_bolos: t.count, total_ingressos: t.income };
        }).filter(Boolean);

        return NextResponse.json({
            debug: {
                timestamp: new Date().toISOString(),
                bolos_total: rawBolos?.length,
                bolos_filtrats: bolos.length,
                assistencies_total: attendanceData.length
            },
            kpis: {
                totalIncome: agg.totalIncome,
                count: agg.count,
                confirmedCount: agg.confirmedCount,
                rejectedCount: agg.rejectedCount,
                pendingCount: agg.count - agg.confirmedCount - agg.rejectedCount,
                avgPrice: agg.confirmedCount > 0 ? agg.totalIncome / agg.confirmedCount : 0,
                medianPrice: agg.medianPrice,
                acceptanceRate: agg.count > 0 ? (agg.confirmedCount / agg.count) * 100 : 0,
                rejectionRate: agg.count > 0 ? (agg.rejectedCount / agg.count) * 100 : 0,
                cashIncome: agg.cashIncome,
                invoiceIncome: agg.invoiceIncome,
                totalExpenses: agg.totalExpenses,
                netProfit: agg.netProfit,
            },
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
        }, {
            headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
        });

    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
