import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

/**
 * API de Rankings de la Gala
 * Fa la suma any per any al servidor per garantir exactitud matemàtica.
 * ?years=2023,2024,2025,2026  (o buit per tots des del 2023)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const yearsParam = searchParams.get('years')?.split(',').filter(Boolean) || [];
    const now = new Date().toISOString().split('T')[0];

    // Si no s'especifiquen anys, usem tots des del 2023
    const yearsToProcess = yearsParam.length > 0
        ? yearsParam
        : ['2023', '2024', '2025', '2026'];

    // Acumulador: nom -> { count, instrument, type }
    const accum: Record<string, { name: string; instrument: string; type: string; count: number }> = {};

    // Processem CADA ANY PER SEPARAT al servidor (igual que tu feies manualment)
    for (const year of yearsToProcess) {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;

        // 1. Obtenir bolos d'aquest any amb estado d'èxit i data passada
        const { data: bolos } = await admin
            .from('bolos')
            .select('id')
            .gte('data_bolo', yearStart)
            .lte('data_bolo', yearEnd)
            .lte('data_bolo', now)   // Només realitzats (fins avui)
            .in('estat', SUCCESS_STATUSES)
            .limit(50000);

        if (!bolos || bolos.length === 0) continue;

        const boloIds = bolos.map(b => b.id);

        // 2. Obtenir participacions d'aquests bolos (per blocs per evitar límits)
        const chunkSize = 150;
        for (let i = 0; i < boloIds.length; i += chunkSize) {
            const chunk = boloIds.slice(i, i + chunkSize);

            const { data: rows } = await admin
                .from('bolo_musics')
                .select('musics(nom, instruments, tipus)')
                .in('bolo_id', chunk)
                .ilike('estat', 'confirmat')
                .limit(50000);

            if (!rows) continue;

            for (const row of rows) {
                const musics = row.musics as { nom?: string; instruments?: string; tipus?: string } | null;
                if (!musics?.nom) continue;
                const name = musics.nom.trim();

                if (accum[name]) {
                    accum[name].count += 1;
                } else {
                    accum[name] = {
                        name,
                        instrument: musics.instruments || '',
                        type: musics.tipus || 'titular',
                        count: 1
                    };
                }
            }
        }
    }

    // Ordenar per count descendent
    const sorted = Object.values(accum).sort((a, b) => b.count - a.count);
    const maxCount = sorted[0]?.count || 1;

    const rankings = sorted.map(m => ({
        name: m.name,
        count: m.count,
        instrument: m.instrument,
        type: m.type,
        percentage: (m.count / maxCount) * 100
    }));

    return NextResponse.json(
        { rankings, debug: { yearsProcessed: yearsToProcess, totalMusicians: rankings.length } },
        { headers: { 'Cache-Control': 'no-store' } }
    );
}
