import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
    }

    // Parse filters
    const years = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const towns = searchParams.get('towns')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;
    const paymentType = searchParams.get('paymentType') || 'tots';
    const status = searchParams.get('status') || 'tots';
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];

    try {
        // Base query for bolos
        let query = supabase.from('bolos').select(`
            id, 
            data_bolo, 
            nom_poble, 
            import_total, 
            tipus_ingres, 
            estat, 
            tipus_actuacio,
            cost_total_musics,
            ajust_pot_manual,
            pot_delta_final
        `);

        // Apply filters
        if (years.length > 0) {
            // Filter by year strings
            const filters = years.map(y => `data_bolo.gte.${y}-01-01,data_bolo.lte.${y}-12-31`);
            // This is complex for multiple years in a single gte/lte, better use a or filter
            // Or just fetch and filter in JS if the volume is manageable, but user asked for server side.
            // For Postgres, we can do OR matches
            const startYear = Math.min(...years.map(y => parseInt(y)));
            const endYear = Math.max(...years.map(y => parseInt(y)));
            query = query.gte('data_bolo', `${startYear}-01-01`).lte('data_bolo', `${endYear}-12-31`);
        }

        if (towns.length > 0) {
            query = query.in('nom_poble', towns);
        }

        if (minPrice !== null) {
            query = query.gte('import_total', minPrice);
        }

        if (maxPrice !== null) {
            query = query.lte('import_total', maxPrice);
        }

        if (paymentType !== 'tots') {
            query = query.eq('tipus_ingres', paymentType);
        }

        if (status !== 'tots') {
            // Map common status filters or use direct value
            if (status === 'acceptat') {
                query = query.in('estat', ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Tancat']);
            } else if (status === 'rebutjat') {
                query = query.in('estat', ['Cancel·lat', 'Cancel·lats', 'rebutjat', 'rebutjats']);
            } else if (status === 'pendent') {
                query = query.in('estat', ['Nova', 'Pendent de confirmació', 'Sol·licitat']);
            } else {
                // Direct status match
                query = query.eq('estat', status);
            }
        }

        if (types.length > 0) {
            query = query.in('tipus_actuacio', types);
        }

        const { data: bolos, error: bolosError } = await query;

        if (bolosError) throw bolosError;

        if (!bolos || bolos.length === 0) {
            return NextResponse.json({
                kpis: { totalIncome: 0, count: 0, avgPrice: 0, medianPrice: 0, acceptanceRate: 0, rejectionRate: 0, cashIncome: 0, invoiceIncome: 0, totalExpenses: 0, netProfit: 0 },
                charts: { monthly: [], towns: [], payments: [], prices: [], types: [] },
                rankings: { elevenGala: [], topSections: [] }
            });
        }

        // Post-processing years in JS if they were non-contiguous
        let filteredBolos = bolos;
        if (years.length > 0) {
            filteredBolos = bolos.filter((b: any) => {
                const y = new Date(b.data_bolo).getFullYear().toString();
                return years.includes(y);
            });
        }

        const confirmedStates = ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Tancat'];
        const rejectedStates = ['Cancel·lat', 'Cancel·lats', 'rebutjat', 'rebutjats'];

        const confirmedBolos = filteredBolos.filter(b => confirmedStates.includes(b.estat));
        const rejectedBolos = filteredBolos.filter(b => rejectedStates.includes(b.estat));

        // KPIs calculation
        const totalIncome = confirmedBolos.reduce((acc, b) => acc + (b.import_total || 0), 0);
        const cashIncome = confirmedBolos.filter(b => b.tipus_ingres === 'Efectiu').reduce((acc, b) => acc + (b.import_total || 0), 0);
        const invoiceIncome = confirmedBolos.filter(b => b.tipus_ingres === 'Factura').reduce((acc, b) => acc + (b.import_total || 0), 0);
        const totalExpenses = confirmedBolos.reduce((acc, b) => acc + (b.cost_total_musics || 0), 0);
        const netProfit = confirmedBolos.reduce((acc, b) => acc + (b.pot_delta_final || 0), 0);

        const sortedPrices = confirmedBolos.map(b => b.import_total || 0).sort((a, b) => a - b);
        const medianPrice = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0;

        const kpis = {
            totalIncome,
            count: filteredBolos.length,
            confirmedCount: confirmedBolos.length,
            rejectedCount: rejectedBolos.length,
            pendingCount: filteredBolos.length - confirmedBolos.length - rejectedBolos.length,
            avgPrice: confirmedBolos.length > 0 ? totalIncome / confirmedBolos.length : 0,
            medianPrice,
            acceptanceRate: filteredBolos.length > 0 ? (confirmedBolos.length / filteredBolos.length) * 100 : 0,
            rejectionRate: filteredBolos.length > 0 ? (rejectedBolos.length / filteredBolos.length) * 100 : 0,
            cashIncome,
            invoiceIncome,
            totalExpenses,
            netProfit
        };

        // Monthly Evolution (Last 12 selected months)
        const monthlyMap: Record<string, { month: string, income: number, count: number }> = {};
        confirmedBolos.forEach(b => {
            const date = new Date(b.data_bolo);
            const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, count: 0 };
            monthlyMap[key].income += (b.import_total || 0);
            monthlyMap[key].count += 1;
        });
        const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

        // Price Buckets
        const priceBuckets = [
            { range: '< 300€', count: confirmedBolos.filter(b => b.import_total < 300).length },
            { range: '300-600€', count: confirmedBolos.filter(b => b.import_total >= 300 && b.import_total < 600).length },
            { range: '600-1000€', count: confirmedBolos.filter(b => b.import_total >= 600 && b.import_total < 1000).length },
            { range: '> 1000€', count: confirmedBolos.filter(b => b.import_total >= 1000).length },
        ];

        // Top Towns
        const townMap: Record<string, { name: string, income: number, count: number }> = {};
        confirmedBolos.forEach(b => {
            if (!townMap[b.nom_poble]) townMap[b.nom_poble] = { name: b.nom_poble, income: 0, count: 0 };
            townMap[b.nom_poble].income += (b.import_total || 0);
            townMap[b.nom_poble].count += 1;
        });
        const townData = Object.values(townMap).sort((a, b) => b.income - a.income).slice(0, 10);

        // Performance Types
        const typeMap: Record<string, number> = {};
        confirmedBolos.forEach(b => {
            const t = b.tipus_actuacio || 'Altres';
            typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const typeData = Object.entries(typeMap).map(([name, count]) => ({ name, value: count }));

        // Eleven of Gala (Top persistent musicians)
        const boloIds = confirmedBolos.map(b => b.id);
        const { data: attendanceData } = await supabase
            .from('bolo_musics')
            .select('music_id, musics(nom, instruments, tipus)')
            .in('bolo_id', boloIds)
            .eq('estat', 'confirmat');

        const musicianMap: Record<string, { name: string, count: number, instrument: string, type: string }> = {};
        (attendanceData || []).forEach((row: any) => {
            const mid = row.music_id;
            const m = row.musics;
            if (!musicianMap[mid]) musicianMap[mid] = { name: m?.nom || 'Desconegut', count: 0, instrument: m?.instruments || '', type: m?.tipus || '' };
            musicianMap[mid].count += 1;
        });

        const elevenGala = Object.values(musicianMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 11)
            .map(m => ({ ...m, percentage: confirmedBolos.length > 0 ? (m.count / confirmedBolos.length) * 100 : 0 }));

        // Top Sections
        const sectionMap: Record<string, number> = {};
        (attendanceData || []).forEach((row: any) => {
            const inst = row.musics?.instruments || 'Altres';
            const firstInst = inst.split(',')[0].trim();
            sectionMap[firstInst] = (sectionMap[firstInst] || 0) + 1;
        });
        const topSections = Object.entries(sectionMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

        return NextResponse.json({
            kpis,
            charts: {
                monthly: monthlyData,
                towns: townData,
                payments: [
                    { name: 'Facturat', value: invoiceIncome },
                    { name: 'Efectiu', value: cashIncome }
                ],
                prices: priceBuckets,
                types: typeData
            },
            rankings: {
                elevenGala,
                topSections
            }
        });

    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
