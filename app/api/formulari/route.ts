
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Solicitud } from '@/types';

/**
 * CORS Utility
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Helper to parse DD-MM-YYYY to YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateStr.match(regex);
    if (!match) return null;
    const [_, day, month, year] = match;
    // Basic date validity check
    const d = new Date(`${year}-${month}-${day}`);
    if (isNaN(d.getTime())) return null;
    return `${year}-${month}-${day}`;
}

/**
 * POST /api/formulari
 * Entrada de dades del formulari públic cap a la taula 'solicituds'
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Extract real IP address
        const forwarded = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');
        let ip = '0.0.0.0';
        if (forwarded) {
            ip = forwarded.split(',')[0].trim();
        } else if (realIp) {
            ip = realIp;
        }

        // 2. Anti-Spam: Honeypot
        if (body.honeypot && body.honeypot.trim() !== "") {
            console.warn(`Spam detectat via honeypot de la IP: ${ip} (SILENT REJECTION)`);
            return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
        }

        // 3. Rate Limiting: Max 3 requests per hour per IP
        const supabase = createAdminClient();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { count, error: countError } = await supabase
            .from('solicituds')
            .select('*', { count: 'exact', head: true })
            .eq('ip_address', ip)
            .gte('created_at', oneHourAgo);

        if (!countError && count !== null && count >= 5) {
            console.warn(`Rate limit excedit per la IP: ${ip}`);
            return NextResponse.json({
                ok: false,
                error: "Massa sol·licituds. Intenta-ho més tard."
            }, { status: 429, headers: corsHeaders });
        }

        // 4. Validacions Obligatòries
        const errors: string[] = [];
        if (!body.concepte?.trim()) errors.push('El concepte és obligatori.');
        const isoDate = parseDate(body.data_actuacio);
        if (!isoDate) errors.push('La data d\'actuació ha de ser en format DD-MM-YYYY.');
        if (!body.municipi?.trim()) errors.push('El municipi és obligatori.');
        if (!body.contacte_nom?.trim()) errors.push('El nom de contacte és obligatori.');
        if (!body.contacte_email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contacte_email)) {
            errors.push('L\'email no és vàlid.');
        }
        if (!body.contacte_telefon?.trim()) errors.push('El telèfon de contacte és obligatori.');

        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (body.hora_inici && !timeRegex.test(body.hora_inici)) errors.push('L\'hora d\'inici ha de ser HH:MM.');
        if (body.hora_fi && !timeRegex.test(body.hora_fi)) errors.push('L\'hora de fi ha de ser HH:MM.');

        if (errors.length > 0) {
            return NextResponse.json({ ok: false, errors }, { status: 400, headers: corsHeaders });
        }

        // 5. Mapeig de dades (Normalització)
        const solicitationData = {
            estat: 'NOVA',
            concepte: body.concepte.trim(),
            tipus_actuacio: body.tipus_actuacio || null,
            data_actuacio: isoDate,
            hora_inici: body.hora_inici || null,
            hora_fi: body.hora_fi || null,
            municipi: body.municipi.trim(),
            ubicacio: body.ubicacio || null,
            aparcament: !!body.aparcament,
            espai_fundes: !!body.espai_fundes,
            altres_acte: body.altres_acte || body.missatge || null,
            contacte_nom: body.contacte_nom.trim(),
            contacte_email: body.contacte_email.toLowerCase().trim(),
            contacte_telefon: body.contacte_telefon.trim(),
            responsable_pagament: body.responsable_pagament || null,
            forma_pagament: body.forma_pagament || null,
            requereix_factura: !!body.requereix_factura,
            necessita_pressupost: !!body.necessita_pressupost,
            fact_nom: body.fact_nom || null,
            fact_nif: body.fact_nif || null,
            fact_rao_social: body.fact_rao_social || null,
            fact_direccio: body.fact_direccio || null,
            fact_poblacio: body.fact_poblacio || null,
            fact_cp: body.fact_cp || null,
            com_ens_has_conegut: body.com_ens_has_conegut || null,
            raw_payload: body,
            ip_address: ip // Guardem la IP
        };

        // 6. Inserció a Supabase
        const { data: dataInserted, error: insertError } = await supabase
            .from('solicituds')
            .insert([solicitationData])
            .select()
            .single();

        if (insertError) {
            console.error('Database Error:', insertError);
            return NextResponse.json({ ok: false, error: 'Database insertion failed' }, { status: 500, headers: corsHeaders });
        }

        const solicitud = dataInserted as Solicitud;

        // 7. Notificacions (Email) - Non-blocking
        try {
            const { sendClientConfirmation, sendInternalNotification } = await import('@/lib/email');
            const [clientRes, internalRes] = await Promise.allSettled([
                sendClientConfirmation(solicitud),
                sendInternalNotification(solicitud)
            ]);

            const emailUpdates: any = {};
            let emailErrors: string[] = [];

            if (clientRes.status === 'fulfilled' && !clientRes.value.error) {
                emailUpdates.client_email_sent_at = new Date().toISOString();
            } else {
                emailErrors.push(`Client email failed: ${clientRes.status === 'rejected' ? clientRes.reason : JSON.stringify((clientRes.value as any).error)}`);
            }

            if (internalRes.status === 'fulfilled' && !internalRes.value.error) {
                emailUpdates.internal_email_sent_at = new Date().toISOString();
            } else {
                emailErrors.push(`Internal email failed: ${internalRes.status === 'rejected' ? internalRes.reason : JSON.stringify((internalRes.value as any).error)}`);
            }

            if (emailErrors.length > 0) {
                emailUpdates.email_error = emailErrors.join(' | ');
                console.error('Email errors:', emailErrors);
            }

            if (Object.keys(emailUpdates).length > 0) {
                await supabase.from('solicituds').update(emailUpdates).eq('id', solicitud.id);
            }
        } catch (emailErr) {
            console.error('Critical email logic error:', emailErr);
        }

        return NextResponse.json({
            ok: true,
            id: solicitud.id,
            message: 'Sol·licitud rebuda correctament'
        }, { status: 201, headers: corsHeaders });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ ok: false, error: 'Request malformed' }, { status: 400, headers: corsHeaders });
    }
}
