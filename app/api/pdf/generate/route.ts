import { NextResponse } from 'next/server';
import { getHTMLTemplate, TemplateData } from '@/lib/pdf/templates';
import { registerInvoice, registerQuote } from '@/lib/billing-utils';
import { createAdminClient } from '@/utils/supabase/admin';
import { format } from 'date-fns';
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
        // Importar puppeteer i chromium dinàmicament per a Vercel
        const puppeteer = await import('puppeteer-core');
        const chromium = await import('@sparticuz/chromium') as any;

        // Configuració de chromium
        let executablePath: string | undefined;
        let chromiumError: any = null;

        try {
            // Intentar trobar el path correcte dels binaris en Vercel
            let binPath = undefined;
            if (process.env.VERCEL) {
                const possiblePaths = [
                    path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin'),
                    path.join(process.cwd(), '..', 'node_modules', '@sparticuz', 'chromium', 'bin'),
                ];

                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        binPath = p;
                        break;
                    }
                }
                if (binPath) console.log('Detected bin path for chromium:', binPath);
            }

            // Determine if we are using the default export or named export
            // Handle varying import structures (ESM vs CJS)
            let chromiumLib = chromium;
            if (chromium.default) {
                chromiumLib = chromium.default;
            }

            // Try to set graphics mode if available (optional)
            try {
                if (typeof chromiumLib.setGraphicsMode === 'function') {
                    chromiumLib.setGraphicsMode = false;
                }
            } catch (e) { /* Ignore if immutable or missing */ }


            // @sparticuz/chromium v123+ exports executablePath as a function
            if (typeof chromiumLib.executablePath === 'function') {
                executablePath = await chromiumLib.executablePath(binPath);
            } else {
                // Fallback for older versions or if it's a property
                executablePath = await chromiumLib.executablePath || chromiumLib.executablePath;
            }

        } catch (e: any) {
            console.error('Error getting chromium executable path:', e);
            chromiumError = e;
        }

        // If specific chromium path failed, check environment or common paths
        if (!executablePath) {
            if (process.env.CHROME_BIN) {
                executablePath = process.env.CHROME_BIN;
            } else {
                // Try standard local paths for dev if not in Vercel/Production optimized
                try {
                    const fs = await import('fs');
                    if (fs.existsSync('/usr/bin/google-chrome')) executablePath = '/usr/bin/google-chrome';
                    else if (fs.existsSync('/usr/bin/chromium')) executablePath = '/usr/bin/chromium';
                    else if (fs.existsSync('/usr/bin/chromium-browser')) executablePath = '/usr/bin/chromium-browser';
                    else if (process.platform === 'win32') {
                        // Check common Windows paths
                        const winPaths = [
                            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
                        ];
                        for (const p of winPaths) {
                            if (fs.existsSync(p)) {
                                executablePath = p;
                                break;
                            }
                        }
                    }
                } catch (err) { }
            }
        }

        // Final check
        if (!executablePath) {
            throw new Error(`Chromium executablePath could not be resolved. Original Error: ${chromiumError?.message || 'Unknown'}`);
        }

        console.log('Using executablePath:', executablePath);

        const browser = await puppeteer.default.launch({
            args: chromium.args || chromium.default?.args || ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
            defaultViewport: chromium.defaultViewport || chromium.default?.defaultViewport || { width: 1920, height: 1080 },
            executablePath: executablePath,
            headless: chromium.headless === 'new' ? 'new' : (chromium.headless || chromium.default?.headless || true),
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

        // Prepare storage info
        const bucket = data.type === 'factura' ? 'factures' : 'pressupostos';
        const dateFolder = format(new Date(), 'yyyy-MM');

        let fileName = "";
        const lloc = (data.bolo?.nom_poble || 'Buidantlabota').replace(/\s+/g, '_');
        const dataBolo = data.bolo?.data ? data.bolo.data.replace(/-/g, '_') : format(new Date(), 'yyyy_MM_dd');

        if (data.type === 'factura') {
            const num = data.number.replace(/\//g, '_'); // Using underscore for filename as suggested
            fileName = `${num}_${lloc}_FACTURABUIDANTLABOTA.pdf`;
        } else {
            fileName = `${dataBolo}_${lloc}_PRESSUPOSTBUIDANTLABOTA.pdf`;
        }

        const storagePath = `${dateFolder}/${fileName}`;

        let recordId: string | undefined;

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
                status: 'sent',
                pdf_storage_path: storagePath
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
                status: 'sent',
                pdf_storage_path: storagePath
            });
        }

        // Verificar que la clau de servei existeix (Server-side check)
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('CONFIG_ERROR: La clau SUPABASE_SERVICE_ROLE_KEY no està configurada a Vercel.');
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(storagePath, pdfBuffer, {
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
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ error: 'Error en generar el PDF', details: error.message }, { status: 500 });
    }
}
