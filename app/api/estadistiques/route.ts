import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * LLISTA DEFINITIVA D'ESTATS QUE COMPUTEN COM A ÈXIT (2023-2026)
 */
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
    const typesParams = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const timeline = searchParams.get('timeline') || 'realitzats';

    try {
        // 1. FETCH BASE (Optimitzat: recuperem per SQL el rang i filtrem discretament en JS per coherència total)
        let bQuery = adminClient.from('bolos').select('*').limit(50000);

        if (years.length > 0) {
            const minYear = Math.min(...years.map(y => parseInt(y)));
            const maxYear = Math.max(...years.map(y => parseInt(y)));
            bQuery = bQuery.gte('data_bolo', `${minYear}-01-01`).lte('data_bolo', `${maxYear}-12-31`);
        } else {
            bQuery = bQuery.gte('data_bolo', '2023-01-01');
        }

        const { data: rawBolos, error: bError } = await bQuery;
        if (bError) throw bError;

        // 2. FILTRATGE JS DISCRET (Això soluciona que els números no baixin quan deselecciones un any)
        const now = new Date().toISOString().split('T')[0];

        let filteredBolos = (rawBolos || []).filter(b => {
            if (!SUCCESS_STATUSES.includes(b.estat)) return false;

            // Filtre d'any discret (imprescindible per la coherència dels filtres!)
            const bYear = b.data_bolo.split('-')[0];
            if (years.length > 0 && !years.includes(bYear)) return false;

            // Timeline: 'realitzats' inclou passat i avui (<= now)
            if (timeline === 'realitzats' && b.data_bolo > now) return false;

            // Altres filtres
            if (townsParam.length > 0 && !townsParam.includes(b.nom_poble)) return false;
            if (minPrice !== null && (b.import_total || 0) < minPrice) return false;
            if (maxPrice !== null && (b.import_total || 0) > maxPrice) return false;
            if (paymentType !== 'tots' && b.tipus_ingres !== paymentType) return false;
            if (typesParams.length > 0 && !typesParams.includes(b.tipus_actuacio)) return false;

            return true;
        });

        const boloIds = filteredBolos.map(b => b.id);

        // 3. GENERACIÓ DE DADES PER GRÀFICS
        const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
        const townMap: Record<string, { name: string; income: number; count: number }> = {};

        filteredBolos.forEach(b => {
            // Mensual
            const m = b.data_bolo.substring(0, 7);
            if (!monthlyMap[m]) monthlyMap[m] = { month: m, income: 0, count: 0 };
            monthlyMap[m].income += (b.import_total || 0);
            monthlyMap[m].count++;

            // Poblacions
            const p = b.nom_poble || 'Desconegut';
            if (!townMap[p]) townMap[p] = { name: p, income: 0, count: 0 };
            townMap[p].income += (b.import_total || 0);
            townMap[p].count++;
        });

        // 4. RECUPERACIÓ D'ASSISTÈNCIES (RANKINGS)
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
            .map(m => ({
                ...m,
                percentage: filteredBolos.length > 0 ? (m.count / filteredBolos.length) * 100 : 0
            }));

        // 5. DATA PER MAPA
        const { data: coordsData } = await adminClient.from('municipis')
            .select('nom, lat, lng')
            .in('nom', Object.keys(townMap));
        const mapPins = (coordsData || []).map(c => ({
            municipi: c.nom,
            lat: c.lat,
            lng: c.lng,
            total_bolos: townMap[c.nom]?.count || 0,
            total_ingressos: townMap[c.nom]?.income || 0
        })).filter(p => p.lat && p.lng);

        // Resultat Final
        return NextResponse.json({
            kpis: {
                totalIncome: filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0),
                count: filteredBolos.length,
                confirmedCount: filteredBolos.length,
                pendingCount: (rawBolos?.length || 0) - filteredBolos.length,
                avgPrice: filteredBolos.length > 0 ? filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0) / filteredBolos.length : 0,
                netProfit: filteredBolos.reduce((s, b) => s + (b.pot_delta_final || 0), 0),
                totalExpenses: filteredBolos.reduce((s, b) => s + (b.cost_total_musics || 0), 0),
                acceptanceRate: rawBolos && rawBolos.length > 0 ? (filteredBolos.length / rawBolos.length) * 100 : 0
            },
            charts: {
                monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
                towns: Object.values(townMap).sort((a, b) => b.income - a.income).slice(0, 10),
                payments: [
                    { name: 'Facturat', value: filteredBolos.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0) },
                    { name: 'Efectiu', value: filteredBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0) }
                ],
                map: mapPins,
                prices: [
                    { range: '< 300€', count: filteredBolos.filter(b => (b.import_total || 0) < 300).length },
                    { range: '300-600€', count: filteredBolos.filter(b => (b.import_total || 0) >= 300 && (b.import_total || 0) < 600).length },
                    { range: '600-1000€', count: filteredBolos.filter(b => (b.import_total || 0) >= 600 && (b.import_total || 0) < 1000).length },
                    { range: '> 1000€', count: filteredBolos.filter(b => (b.import_total || 0) >= 1000).length }
                ]
            },
            rankings: { elevenGala, topSections: [] }
        }, {
            headers: { 'Cache-Control': 'no-store, must-revalidate' }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
