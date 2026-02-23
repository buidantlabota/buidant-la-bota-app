import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Forçat dinàmic i sense cache per garantir dades 100% reals a cada refresc
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * CONFIGURACIÓ CENTRAL D'ESTATS (SUCCESS_STATUSES)
 * Llista exhaustiva per incloure totes les variants trobades a la BD (2023-2026).
 */
const SUCCESS_STATUSES = [
    'Tancat', 'Tancada', 'Tancats', 'Tancades', 'tancat', 'tancada', 'tancats', 'tancades',
    'Confirmada', 'Confirmat', 'confirmada', 'confirmat',
    'Pendents de cobrar', 'Pendent de cobrar', 'Per pagar', 'Pagar',
    'Facturada', 'Facturat', 'Facturades', 'Facturats',
    'Cobrada', 'Cobrat', 'Cobrades', 'Cobrats',
    'Pagat', 'Pagada', 'Pagats', 'Pagades',
    'Acceptat', 'Acceptada', 'ACCEPTAT', 'ACCEPTADA',
    'Sol·licitat', 'Sol·licitada'
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
        // 1. RECUPERACIÓ DE BOLOS
        let bQuery = adminClient.from('bolos').select(
            'id, data_bolo, nom_poble, import_total, tipus_ingres, estat, tipus_actuacio, cost_total_musics, pot_delta_final'
        ).limit(50000);

        if (years.length > 0) {
            const start = Math.min(...years.map(y => parseInt(y)));
            const end = Math.max(...years.map(y => parseInt(y)));
            bQuery = bQuery.gte('data_bolo', `${start}-01-01`).lte('data_bolo', `${end}-12-31`);
        }

        const { data: allBolos, error: bolosError } = await bQuery;
        if (bolosError) throw bolosError;

        // 2. FILTRATGE DE TIMELINE
        const nowStr = new Date().toISOString().split('T')[0];
        let filteredBolos = (allBolos || []).filter(b => {
            const isSuccess = SUCCESS_STATUSES.includes(b.estat);
            if (!isSuccess) return false;
            if (timeline === 'realitzats') return b.data_bolo <= nowStr;
            return true;
        });

        // Filtres addicionals de UI
        if (towns.length > 0) filteredBolos = filteredBolos.filter(b => towns.includes(b.nom_poble));
        if (minPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) >= minPrice);
        if (maxPrice !== null) filteredBolos = filteredBolos.filter(b => (b.import_total || 0) <= maxPrice);
        if (paymentType !== 'tots') filteredBolos = filteredBolos.filter(b => b.tipus_ingres === paymentType);
        if (types.length > 0) filteredBolos = filteredBolos.filter(b => types.includes(b.tipus_actuacio));

        const boloIds = filteredBolos.map(b => b.id);

        // 3. RECUPERACIÓ D'ASSISTÈNCIES (Participacions)
        let attendanceData: any[] = [];
        if (boloIds.length > 0) {
            const chunkSize = 200;
            for (let i = 0; i < boloIds.length; i += chunkSize) {
                const chunk = boloIds.slice(i, i + chunkSize);
                const { data } = await adminClient.from('bolo_musics')
                    .select('id, bolo_id, music_id, musics(nom, instruments, tipus)')
                    .in('bolo_id', chunk)
                    .ilike('estat', 'confirmat')
                    .limit(20000);
                if (data) attendanceData = [...attendanceData, ...data];
            }
        }

        // 4. CÀLCUL DEL RÀNQUING (L'Onze de Gala)
        // ALERTA: Per petició de l'usuari, comptem participacions TOTALS (bm.id), 
        // no restringim a un sol bolo per músic si hi hagués duplicats.
        const musicianMap = new Map<string, { name: string; instrument: string; type: string; count: number }>();

        attendanceData.forEach(row => {
            if (!row.music_id || !row.musics) return;
            const mid = row.music_id;
            if (!musicianMap.has(mid)) {
                musicianMap.set(mid, {
                    name: row.musics.nom || '?',
                    instrument: row.musics.instruments || '',
                    type: row.musics.tipus || 'titular',
                    count: 0
                });
            }
            musicianMap.get(mid)!.count += 1; // Sumem cada entrada bm.id
        });

        const elevenGala = Array.from(musicianMap.entries())
            .map(([id, data]) => ({
                id,
                name: data.name,
                instrument: data.instrument,
                type: data.type,
                count: data.count,
                percentage: filteredBolos.length > 0 ? (data.count / filteredBolos.length) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 11);

        // 5. SECCIONS I KPIs
        const sectionMap: Record<string, number> = {};
        attendanceData.forEach(row => {
            const inst = row.musics?.instruments || 'Altres';
            const first = inst.split(',')[0].trim();
            sectionMap[first] = (sectionMap[first] || 0) + 1;
        });
        const topSections = Object.entries(sectionMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const totalIncome = filteredBolos.reduce((s, b) => s + (b.import_total || 0), 0);
        const netProfit = filteredBolos.reduce((s, b) => s + (b.pot_delta_final || 0), 0);
        const totalExpenses = filteredBolos.reduce((s, b) => s + (b.cost_total_musics || 0), 0);
        const cashIncome = filteredBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((s, b) => s + (b.import_total || 0), 0);
        const invoiceIncome = filteredBolos.filter(b => b.tipus_ingres === 'Factura').reduce((s, b) => s + (b.import_total || 0), 0);

        // Monthly
        const monthlyMap: Record<string, { month: string; income: number; count: number }> = {};
        filteredBolos.forEach(b => {
            const d = b.data_bolo.substring(0, 7);
            if (!monthlyMap[d]) monthlyMap[d] = { month: d, income: 0, count: 0 };
            monthlyMap[d].income += (b.import_total || 0);
            monthlyMap[d].count++;
        });

        return NextResponse.json({
            debug: isDebug ? { filtered_bolos: filteredBolos.length, attendance_rows: attendanceData.length } : undefined,
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
                payments: [
                    { name: 'Facturat', value: invoiceIncome },
                    { name: 'Efectiu', value: cashIncome }
                ],
                towns: [],
                types: []
            },
            rankings: { elevenGala, topSections }
        }, {
            headers: { 'Cache-Control': 'no-store, must-revalidate' }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
