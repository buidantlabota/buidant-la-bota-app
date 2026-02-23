import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUCCESS_STATUSES = [
    'Tancat', 'Tancada', 'Tancats', 'Tancades', 'tancat', 'tancada', 'tancats', 'tancades',
    'Confirmada', 'Confirmat', 'confirmada', 'confirmat',
    'Pendents de cobrar', 'Pendent de cobrar', 'Per pagar', 'Pagar',
    'Facturada', 'Facturat', 'Facturades', 'Facturats',
    'Cobrada', 'Cobrat', 'Cobrades', 'Cobrats',
    'Pagat', 'Pagada', 'Pagats', 'Pagades',
    'Acceptat', 'Acceptada', 'ACCEPTAT', 'ACCEPTADA', 'acceptat', 'acceptada',
    'Sol·licitat', 'Sol·licitada', 'sol·licitat', 'sol·licitada'
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const townsParam = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const paymentType = searchParams.get('paymentType') || 'tots';
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const timeline = searchParams.get('timeline') || 'realitzats';
    const isDebug = searchParams.get('debug') === 'true';

    try {
        // 1. RECUPERACIÓ DE BOLOS
        let bQuery = adminClient.from('bolos').select('*').limit(50000);

        if (years.length > 0) {
            const startYear = Math.min(...years.map(y => parseInt(y)));
            const endYear = Math.max(...years.map(y => parseInt(y)));
            bQuery = bQuery.gte('data_bolo', `${startYear}-01-01`).lte('data_bolo', `${endYear}-12-31`);
        }

        const { data: rawBolos, error: bError } = await bQuery;
        if (bError) throw bError;

        const now = new Date().toISOString().split('T')[0];
        let filteredBolos = (rawBolos || []).filter(b => {
            const isConfirmed = SUCCESS_STATUSES.includes(b.estat);
            if (!isConfirmed) return false;
            if (timeline === 'realitzats') return b.data_bolo <= now;
            return true;
        });

        // Aplicar filtres de UI
        if (townsParam.length > 0) filteredBolos = filteredBolos.filter(b => townsParam.includes(b.nom_poble));
        if (minPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) >= minPrice);
        if (maxPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) <= maxPrice);
        if (paymentType !== 'tots') filteredBolos = filteredBolos.filter(b => b.tipus_ingres === paymentType);
        if (types.length > 0) filteredBolos = filteredBolos.filter(b => types.includes(b.tipus_actuacio));

        const boloIds = filteredBolos.map(b => b.id);

        // 2. AGGREGACIÓ PER CHARTS I KPIS
        const totalIncome = filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0);
        const netProfit = filteredBolos.reduce((s, b) => s + (b.pot_delta_final || 0), 0);
        const totalExpenses = filteredBolos.reduce((s, b) => s + (b.cost_total_musics || 0), 0);
        const cashIncome = filteredBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0);
        const invoiceIncome = filteredBolos.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0);

        // Monthly Chart
        const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
        filteredBolos.forEach(b => {
            const m = b.data_bolo.substring(0, 7);
            if (!monthlyMap[m]) monthlyMap[m] = { month: m, income: 0, count: 0 };
            monthlyMap[m].income += (b.import_total || 0);
            monthlyMap[m].count++;
        });

        // Towns Analytics
        const townMap: Record<string, { name: string; income: number; count: number }> = {};
        filteredBolos.forEach(b => {
            const p = b.nom_poble || 'Desconegut';
            if (!townMap[p]) townMap[p] = { name: p, income: 0, count: 0 };
            townMap[p].income += (b.import_total || 0);
            townMap[p].count++;
        });

        // Price Ranges
        const priceBuckets = [
            { range: '< 300€', count: filteredBolos.filter(b => (b.import_total || 0) < 300).length },
            { range: '300-600€', count: filteredBolos.filter(b => (b.import_total || 0) >= 300 && (b.import_total || 0) < 600).length },
            { range: '600-1000€', count: filteredBolos.filter(b => (b.import_total || 0) >= 600 && (b.import_total || 0) < 1000).length },
            { range: '> 1000€', count: filteredBolos.filter(b => (b.import_total || 0) >= 1000).length },
        ];

        // 3. RECUPERACIÓ D'ASSISTÈNCIES I RANKINGS
        let attendance: any[] = [];
        if (boloIds.length > 0) {
            const chunkSize = 200;
            for (let i = 0; i < boloIds.length; i += chunkSize) {
                const chunk = boloIds.slice(i, i + chunkSize);
                const { data } = await adminClient.from('bolo_musics')
                    .select('id, bolo_id, music_id, musics(nom, instruments, tipus)')
                    .in('bolo_id', chunk)
                    .ilike('estat', 'confirmat')
                    .limit(20000);
                if (data) attendance = [...attendance, ...data];
            }
        }

        const musicianMap = new Map();
        attendance.forEach(row => {
            if (!row.musics) return;
            const name = row.musics.nom || 'Desconegut';
            if (!musicianMap.has(name)) {
                musicianMap.set(name, {
                    name,
                    instrument: row.musics.instruments || '',
                    type: row.musics.tipus || 'titular',
                    count: 0
                });
            }
            musicianMap.get(name).count += 1;
        });

        const elevenGala = Array.from(musicianMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 11)
            .map(m => ({ ...m, percentage: filteredBolos.length > 0 ? (m.count / filteredBolos.length) * 100 : 0 }));

        // 4. MAP DATA (Xinxetes)
        const { data: coordsData } = await adminClient.from('municipis')
            .select('nom, lat, lng')
            .in('nom', Object.keys(townMap))
            .limit(10000);
        const mapData = (coordsData || []).map(c => {
            const t = townMap[c.nom];
            return {
                municipi: c.nom,
                lat: c.lat,
                lng: c.lng,
                total_bolos: t?.count || 0,
                total_ingressos: t?.income || 0
            };
        }).filter(m => m.lat && m.lng);

        return NextResponse.json({
            kpis: {
                totalIncome,
                count: filteredBolos.length,
                confirmedCount: filteredBolos.length,
                pendingCount: (rawBolos?.length || 0) - filteredBolos.length,
                avgPrice: filteredBolos.length > 0 ? totalIncome / filteredBolos.length : 0,
                netProfit,
                totalExpenses,
                acceptanceRate: rawBolos && rawBolos.length > 0 ? (filteredBolos.length / rawBolos.length) * 100 : 100
            },
            charts: {
                monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
                towns: Object.values(townMap).sort((a, b) => b.income - a.income).slice(0, 10),
                payments: [
                    { name: 'Facturat', value: invoiceIncome },
                    { name: 'Efectiu', value: cashIncome }
                ],
                prices: priceBuckets,
                map: mapData
            },
            rankings: { elevenGala, topSections: [] }
        }, {
            headers: { 'Cache-Control': 'no-store, must-revalidate' }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
