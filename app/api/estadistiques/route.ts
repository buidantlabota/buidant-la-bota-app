import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Estats que computen com a actuació realitzada/confirmada amb èxit
const SUCCESS_STATUSES = [
    'Tancat', 'Tancada', 'Tancats', 'Tancades', 'tancat', 'tancada', 'tancats', 'tancades',
    'Confirmada', 'Confirmat', 'confirmada', 'confirmat', 'Confirmats', 'Confirmades',
    'Realitzat', 'Realitzada', 'Realitzats', 'Realitzades', 'realitzat', 'realitzada',
    'Finalitzat', 'Finalitzada', 'Finalitzats', 'Finalitzades',
    'Pendents de cobrar', 'Pendent de cobrar', 'Per pagar', 'Pagar', 'Cobrat', 'Cobrada', 'Cobrats', 'Cobrades',
    'Facturat', 'Facturada', 'Facturats', 'Facturades', 'Pagat', 'Pagada', 'Pagats', 'Pagades',
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
    const timeline = searchParams.get('timeline') || 'realitzats';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const typesParams = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const paymentType = searchParams.get('paymentType') || 'tots';

    try {
        // 1. OBTENCIÓ MASSIVA DE BOLOS (Bypass RLS + Limits de 50k)
        const { data: allBolos, error: bErr } = await adminClient
            .from('bolos')
            .select('*')
            .gte('data_bolo', '2023-01-01')
            .limit(50000);
        if (bErr) throw bErr;

        // 2. FILTRATGE JS DISCRET (Solució a la incoherència de sumes)
        const now = new Date().toISOString().split('T')[0];
        const filteredBolos = (allBolos || []).filter(b => {
            const bYear = b.data_bolo.split('-')[0];

            // Filtre d'Estat
            if (!SUCCESS_STATUSES.includes(b.estat)) return false;
            // Filtre d'Any (Discret per evitar solapaments)
            if (years.length > 0 && !years.includes(bYear)) return false;
            // Filtre de Timeline
            if (timeline === 'realitzats' && b.data_bolo > now) return false;
            // Filtres auxiliars
            if (townsParam.length > 0 && !townsParam.includes(b.nom_poble)) return false;
            if (minPrice !== null && (b.import_total || 0) < minPrice) return false;
            if (maxPrice !== null && (b.import_total || 0) > maxPrice) return false;
            if (paymentType !== 'tots' && b.tipus_ingres !== paymentType) return false;
            if (typesParams.length > 0 && !typesParams.includes(b.tipus_actuacio)) return false;

            return true;
        });

        const filteredBoloIds = new Set(filteredBolos.map(b => b.id));

        // 3. OBTENCIÓ DE PARTICIPACIONS (Límit de 50k per evitar el tall de Supabase)
        const { data: allAttendance, error: aErr } = await adminClient
            .from('bolo_musics')
            .select('bolo_id, music_id, musics(nom, instruments, tipus)')
            .ilike('estat', 'confirmat')
            .limit(50000);
        if (aErr) throw aErr;

        // 4. GENERACIÓ DEL RÀNQUING (Basat en la teva query SQL: bm.id)
        const rankingMap = new Map();
        (allAttendance || []).forEach(row => {
            const musics = row.musics as { nom?: string; instruments?: string; tipus?: string } | null;
            if (filteredBoloIds.has(row.bolo_id) && musics) {
                const name = (musics.nom || 'Desconegut').trim();
                if (!rankingMap.has(name)) {
                    rankingMap.set(name, {
                        name,
                        instrument: musics.instruments || '',
                        type: musics.tipus || 'titular',
                        count: 0
                    });
                }
                (rankingMap.get(name) as { count: number }).count += 1;
            }
        });

        type RankEntry = { name: string; instrument: string; type: string; count: number };
        const elevenGala = (Array.from(rankingMap.values()) as RankEntry[])
            .sort((a, b) => b.count - a.count)
            .slice(0, 11)
            .map(m => ({
                name: m.name,
                count: m.count,
                instrument: m.instrument,
                type: m.type,
                percentage: filteredBolos.length > 0 ? (m.count / filteredBolos.length) * 100 : 0
            }));

        // 5. DATA PER KPIS, MAPA I GRÀFICS
        const townMap: Record<string, { name: string, income: number, count: number }> = {};
        const monthlyMap: Record<string, { month: string, income: number, count: number }> = {};

        filteredBolos.forEach(b => {
            const p = b.nom_poble || 'Desconegut';
            if (!townMap[p]) townMap[p] = { name: p, income: 0, count: 0 };
            townMap[p].income += (b.import_total || 0);
            townMap[p].count++;

            const m = b.data_bolo.substring(0, 7);
            if (!monthlyMap[m]) monthlyMap[m] = { month: m, income: 0, count: 0 };
            monthlyMap[m].income += (b.import_total || 0);
            monthlyMap[m].count++;
        });

        const { data: coords } = await adminClient.from('municipis').select('nom, lat, lng').in('nom', Object.keys(townMap)).limit(50000);
        const mapPins = (coords || []).map(c => ({
            municipi: c.nom, lat: c.lat, lng: c.lng,
            total_bolos: townMap[c.nom]?.count || 0,
            total_ingressos: townMap[c.nom]?.income || 0
        })).filter(p => p.lat && p.lng);

        return NextResponse.json({
            kpis: {
                totalIncome: filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0),
                count: filteredBolos.length,
                pendingCount: (allBolos?.length || 0) - filteredBolos.length,
                avgPrice: filteredBolos.length > 0 ? filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0) / filteredBolos.length : 0,
                netProfit: filteredBolos.reduce((s, b) => s + (b.pot_delta_final || 0), 0),
                totalExpenses: filteredBolos.reduce((s, b) => s + (b.cost_total_musics || 0), 0),
                acceptanceRate: allBolos && allBolos.length > 0 ? (filteredBolos.length / allBolos.length) * 100 : 0
            },
            charts: {
                monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
                towns: Object.values(townMap).sort((a, b) => b.income - a.income).slice(0, 10),
                map: mapPins,
                payments: [
                    { name: 'Facturat', value: filteredBolos.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0) },
                    { name: 'Efectiu', value: filteredBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0) }
                ],
                prices: [
                    { range: '< 300€', count: filteredBolos.filter(b => (b.import_total || 0) < 300).length },
                    { range: '300-600€', count: filteredBolos.filter(b => (b.import_total || 0) >= 300 && (b.import_total || 0) < 600).length },
                    { range: '600-1000€', count: filteredBolos.filter(b => (b.import_total || 0) >= 600 && (b.import_total || 0) < 1000).length },
                    { range: '> 1000€', count: filteredBolos.filter(b => (b.import_total || 0) >= 1000).length }
                ]
            },
            rankings: { elevenGala, topSections: [] }
        }, { headers: { 'Cache-Control': 'no-store, must-revalidate' } });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
