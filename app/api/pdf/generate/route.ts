import { NextResponse } from 'next/server';
import { getHTMLTemplate, TemplateData } from '@/lib/pdf/templates';
import { registerInvoice, registerQuote } from '@/lib/billing-utils';
import { createAdminClient } from '@/utils/supabase/admin';
import path from 'path';
import fs from 'fs';

// Funció per convertir imatge a base64
function getLogoBase64() {
    try {
        const logoPath = path.join(process.cwd(), 'public', 'blb-logo.jpg');
        const logoBuffer = fs.readFileSync(logoPath);
        return logoBuffer.toString('base64');
    } catch (error) {
        console.error('Error reading logo:', error);
        return '';
    }
}

export async function POST(request: Request) {
    try {
        const data: TemplateData = await request.json();
        const logoBase64 = getLogoBase64();

        // Generar HTML amb el logo injectat
        let html = getHTMLTemplate(data);
        html = html.replace('LOGO_PLACEHOLDER', logoBase64);

        // Importar puppeteer i chromium dinàmicament per a Vercel
        const puppeteer = await import('puppeteer-core');
        const chromium = await import('@sparticuz/chromium') as any;

        // Configuració de chromium
        const executablePath = await chromium.executablePath || await chromium.default.executablePath();

        const browser = await puppeteer.default.launch({
            args: chromium.args || chromium.default.args,
            defaultViewport: chromium.defaultViewport || chromium.default.defaultViewport,
            executablePath: executablePath || '/usr/bin/google-chrome', // Fallback local
            headless: chromium.headless || chromium.default.headless,
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        await browser.close();

        // 1. Guardar metadades a la base de dades
        const supabase = createAdminClient();

        // Extract bolo_id and client_id from the payload if available
        let boloId: number | undefined;
        let clientId: string | undefined;

        // Try to find client_id by name if not provided
        if (data.client?.nom) {
            const { data: clientData } = await supabase
                .from('clients')
                .select('id')
                .eq('nom', data.client.nom)
                .maybeSingle();
            clientId = clientData?.id;
        }

        // Extract bolo_id from payload (we'll need to pass this from frontend)
        if ((data as any).bolo_id) {
            boloId = (data as any).bolo_id;
        }

        if (data.type === 'factura') {
            await registerInvoice({
                invoice_number: data.number,
                client_name: data.client.nom,
                client_id: clientId,
                bolo_id: boloId,
                total_amount: data.total,
                articles: data.articles,
                paid: false,
                notes: data.descriptionText,
                status: 'sent'
            });
        } else {
            await registerQuote({
                quote_number: data.number,
                client_name: data.client.nom,
                client_id: clientId,
                bolo_id: boloId,
                total_amount: data.total,
                articles: data.articles,
                notes: data.descriptionText,
                status: 'sent'
            });
        }

        // Verificar que la clau de servei existeix (Server-side check)
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('CONFIG_ERROR: La clau SUPABASE_SERVICE_ROLE_KEY no està configurada a Vercel.');
        }

        const bucket = data.type === 'factura' ? 'factures' : 'pressupostos';
        const fileName = `${data.number.replace('/', '-')}_${Date.now()}.pdf`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading to storage:', uploadError);
            throw new Error(`STORAGE_ERROR: No s'ha pogut pujar al bucket '${bucket}'. Detall: ${uploadError.message}`);
        }

        // Retornar el PDF com a resposta
        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${data.type}_${data.number.replace('/', '-')}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ error: 'Error en generar el PDF', details: error.message }, { status: 500 });
    }
}
