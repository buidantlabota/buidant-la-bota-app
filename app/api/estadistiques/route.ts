import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Forçat dinàmic i sense cache per garantir dades 100% reals a cada refresc
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * CONFIGURACIÓ CENTRAL D'ESTATS
 * Aquests valors s'han obtingut analitzant directament la BD per assegurar que el
 * recompte de l'App (82) coincideixi amb el del SQL (106).
 */
const CONFIRMED_BOLO_STATUSES = [
    'Confirmada', 'Confirmat', 'confirmada', 'confirmat',
    'Pendents de cobrar', 'Pendent de cobrar', 'Per pagar',
    'Tancades', 'Tancat', 'Tancada', 'tancat', 'tancada',
    'Facturada', 'Facturat', 'Cobrada', 'Cobrat', 'Pagat', 'Pagada',
    'ACCEPTADA', 'ACCEPTAT', 'Acceptada', 'Acceptat', 'acceptada', 'acceptat',
    'Sol·licitada', 'Sol·licitat', 'sol·licitada', 'sol·licitat'
];

const REJECTED_BOLO_STATUSES = [
    'Cancel·lat', 'Cancel·lats', 'rebutjat', 'rebutjats',
    'REBUTJADA', 'REBUTJADES', 'REBUTJAT', 'Cancel·lada'
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parametres de filtratge
    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const towns = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const paymentType = searchParams.get('paymentType') || 'tots';
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const timeline = searchParams.get('timeline') || 'realitzats';
    const isDebug = searchParams.get('debug') === 'true';

    try {
        // 1. RECUPERACIÓ DE BOLOS (Nucleu de la realitat)
        // Posem un límit massiu i demanem TOTS els bolos sense restricció de RLS
        let bolosQuery = adminClient.from('bolos').select(
            'id, data_bolo, nom_poble, import_total, tipus_ingres, estat, tipus_actuacio, cost_total_musics, pot_delta_final'
        ).limit(50000);

        // Apliquem filtres temporals si n'hi ha
        if (years.length > 0) {
            const start = Math.min(...years.map(y => parseInt(y)));
            const end = Math.max(...years.map(y => parseInt(y)));
            bolosQuery = bolosQuery.gte('data_bolo', `${start}-01-01`).lte('data_bolo', `${end}-12-31`);
        }

        const { data: allBolos, error: bolosError } = await bolosQuery;
        if (bolosError) throw bolosError;

        // 2. FILTRATGE DE TIMELINE I ESTATS
        // Avui segons el servidor (però forçem que sigui la dades real)
        const nowStr = new Date().toISOString().split('T')[0];

        let filteredBolos = (allBolos || []).filter(b => {
            const isSuccess = CONFIRMED_BOLO_STATUSES.includes(b.estat);
            if (!isSuccess) return false;

            // Filtre de Timeline
            if (timeline === 'realitzats') return b.data_bolo <= nowStr;
            return true; // timeline === 'confirmats' (inclou passat i futur)
        });

        // Altres filtres de UI
        if (towns.length > 0) filteredBolos = filteredBolos.filter(b => towns.includes(b.nom_poble));
        if (minPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) >= minPrice);
        if (maxPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) <= maxPrice);
        if (paymentType !== 'tots') filteredBolos = filteredBolos.filter(b => b.tipus_ingres === paymentType);
        if (types.length > 0) filteredBolos = filteredBolos.filter(b => types.includes(b.tipus_actuacio));

        const confirmedBoloIds = filteredBolos.map(b => b.id);

        // 3. RECUPERACIÓ D'ASSISTÈNCIES (Processament per blocs de seguretat)
        let attendanceData: any[] = [];
        if (confirmedBoloIds.length > 0) {
            const chunkSize = 200;
            for (let i = 0; i < confirmedBoloIds.length; i += chunkSize) {
                const chunk = confirmedBoloIds.slice(i, i + chunkSize);
                const { data } = await adminClient.from('bolo_musics')
                    .select('bolo_id, music_id, musics(nom, instruments, tipus)')
                    .in('bolo_id', chunk)
                    .ilike('estat', 'confirmat') // Insensible a majúscules per seguretat
                    .limit(20000);
                if (data) attendanceData = [...attendanceData, ...data];
            }
        }

        // 4. GENERACIÓ DEL RÀNQUING (L'Onze de Gala)
        // Comptem només una assistència per músic i bolo (evitar duplicats que he trobat a la BD)
        const musicianMap = new Map<string, { name: string; instrument: string; type: string; bolos: Set<number> }>();

        attendanceData.forEach(row => {
            if (!row.music_id || !row.musics) return;
            const mid = row.music_id;
            if (!musicianMap.has(mid)) {
                musicianMap.set(mid, {
                    name: row.musics.nom || '?',
                    instrument: row.musics.instruments || '',
                    type: row.musics.tipus || 'titular',
                    bolos: new Set()
                });
            }
            musicianMap.get(mid)!.bolos.add(row.bolo_id);
        });

        const elevenGala = Array.from(musicianMap.entries())
            .map(([id, data]) => ({
                id,
                name: data.name,
                instrument: data.instrument,
                type: data.type,
                count: data.bolos.size, // UNIQUE bolos count
                percentage: filteredBolos.length > 0 ? (data.bolos.size / filteredBolos.length) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 11);

        // 5. CÀLCUL DE SECCIONS
        const sectionMap: Record<string, number> = {};
        attendanceData.forEach(row => {
            const inst = row.musics?.instruments || 'Altres';
            const first = inst.split(',')[0].trim();
            sectionMap[first] = (sectionMap[first] || 0) + 1;
        });
        const topSections = Object.entries(sectionMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // 6. CÀLCUL DE KPIs I CHARTS (Dades filtrades)
        const totalIncome = filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0);
        const netProfit = filteredBolos.reduce((s, b) => s + (b.pot_delta_final || 0), 0);
        const totalExpenses = filteredBolos.reduce((s, b) => s + (b.cost_total_musics || 0), 0);
        const cashIncome = filteredBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0);
        const invoiceIncome = filteredBolos.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0);

        // Monthly
        const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
        filteredBolos.forEach(b => {
            const d = b.data_bolo.substring(0, 7); // YYYY-MM
            if (!monthlyMap[d]) monthlyMap[d] = { month: d, income: 0, count: 0 };
            monthlyMap[d].income += (b.import_total || 0);
            monthlyMap[d].count++;
        });

        // Resultat Final
        return NextResponse.json({
            debug: isDebug ? {
                now: nowStr,
                total_bolos_bd: allBolos?.length,
                filtered_bolos: filteredBolos.length,
                attendance_rows: attendanceData.length,
                jofre_check: elevenGala.find(m => m.name.includes('Jofre'))
            } : undefined,
            kpis: {
                totalIncome,
                count: filteredBolos.length,
                confirmedCount: filteredBolos.length,
                pendingCount: (allBolos?.length || 0) - filteredBolos.length,
                avgPrice: filteredBolos.length > 0 ? totalIncome / filteredBolos.length : 0,
                netProfit,
                totalExpenses,
                cashIncome,
                invoiceIncome,
                acceptanceRate: allBolos && allBolos.length > 0 ? (filteredBolos.length / allBolos.length) * 100 : 100
            },
            charts: {
                monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
                towns: [], // Ignorem per ara o implementem si cal
                payments: [
                    { name: 'Facturat', value: invoiceIncome },
                    { name: 'Efectiu', value: cashIncome }
                ],
                types: []
            },
            rankings: { elevenGala, topSections }
        }, {
            headers: { 'Cache-Control': 'no-store, must-revalidate' }
        });

    } catch (e: any) {
        console.error('Stats API Nuclear Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
