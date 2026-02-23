import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * LLISTA COMPLETA D'ESTATS D'ÈXIT
 * Unifiquem totes les variants possibles per garantir que cap bolo (2023-2026) quedi fora.
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

    // Filtres
    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const towns = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const paymentType = searchParams.get('paymentType') || 'tots';
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const timeline = searchParams.get('timeline') || 'realitzats';
    const isDebug = searchParams.get('debug') === 'true';

    try {
        // 1. OBTENIR TOTS ELS BOLOS QUE COMPLETEN ELS FILTRES
        let bQuery = adminClient.from('bolos').select('id, data_bolo, estat, nom_poble, import_total, tipus_ingres, tipus_actuacio, cost_total_musics, pot_delta_final').limit(50000);

        // Filtre d'anys (si n'hi ha)
        if (years.length > 0) {
            const startYear = Math.min(...years.map(y => parseInt(y)));
            const endYear = Math.max(...years.map(y => parseInt(y)));
            bQuery = bQuery.gte('data_bolo', `${startYear}-01-01`).lte('data_bolo', `${endYear}-12-31`);
        } else {
            // Per defecte, si no hi ha d'anys, agafem des de l'històric (2023)
            bQuery = bQuery.gte('data_bolo', '2023-01-01');
        }

        const { data: rawBolos, error: bError } = await bQuery;
        if (bError) throw bError;

        // 2. FILTRATGE JS (MOLT ROBUST)
        const now = new Date().toISOString().split('T')[0];
        let filteredBolos = (rawBolos || []).filter(b => {
            // Estats que sumen
            const isConfirmed = SUCCESS_STATUSES.includes(b.estat);
            if (!isConfirmed) return false;

            // Filtre de Timeline (Per defecte 'realitzats' = passat + avui)
            if (timeline === 'realitzats') return b.data_bolo <= now;
            // 'confirmats' inclou passat, present i futur
            return true;
        });

        // Aplicar filtres de UI
        if (towns.length > 0) filteredBolos = filteredBolos.filter(b => towns.includes(b.nom_poble));
        if (minPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) >= minPrice);
        if (maxPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) <= maxPrice);
        if (paymentType !== 'tots') filteredBolos = filteredBolos.filter(b => b.tipus_ingres === paymentType);
        if (types.length > 0) filteredBolos = filteredBolos.filter(b => types.includes(b.tipus_actuacio));

        const boloIds = filteredBolos.map(b => b.id);

        // 3. RECUPERAR ASSISTÈNCIES (Processament per blocs)
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

        // 4. GENERAR RÀNQUING (Grouping by name for maximum compatibility with user SQL)
        // Usarem un mapa per nom per sumar tots els que es diguin igual (si calgués)
        const musicianMap = new Map<string, { nom: string; instrument: string; tipus: string; count: number }>();

        attendance.forEach(row => {
            if (!row.musics) return;
            const name = row.musics.nom || 'Desconegut';
            if (!musicianMap.has(name)) {
                musicianMap.set(name, {
                    nom: name,
                    instrument: row.musics.instruments || '',
                    tipus: row.musics.tipus || 'titular',
                    count: 0
                });
            }
            musicianMap.get(name)!.count += 1;
        });

        const elevenGala = Array.from(musicianMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 11)
            .map(m => ({
                name: m.nom,
                count: m.count,
                instrument: m.instrument,
                type: m.tipus,
                percentage: filteredBolos.length > 0 ? (m.count / filteredBolos.length) * 100 : 0
            }));

        // 5. KPIs I ALTRES DADES
        const totalIncome = filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0);
        const netProfit = filteredBolos.reduce((s, b) => s + (b.pot_delta_final || 0), 0);
        const totalExpenses = filteredBolos.reduce((s, b) => s + (b.cost_total_musics || 0), 0);

        // Monthly chart
        const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
        filteredBolos.forEach(b => {
            const m = b.data_bolo.substring(0, 7);
            if (!monthlyMap[m]) monthlyMap[m] = { month: m, income: 0, count: 0 };
            monthlyMap[m].income += (b.import_total || 0);
            monthlyMap[m].count++;
        });

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
                towns: [],
                payments: [
                    { name: 'Facturat', value: filteredBolos.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0) },
                    { name: 'Efectiu', value: filteredBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0) },
                ],
                prices: [],
                types: []
            },
            rankings: { elevenGala, topSections: [] }
        }, {
            headers: { 'Cache-Control': 'no-store, must-revalidate' }
        });

    } catch (e: any) {
        console.error('Stats Nuclear Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
