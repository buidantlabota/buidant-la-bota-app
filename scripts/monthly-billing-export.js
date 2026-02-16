const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function runExport() {
    // 1. Configuració i Dates
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailTo = process.env.EMAIL_TO || 'buidantlabota@gmail.com';
    const emailFrom = process.env.EMAIL_FROM || 'Buidant la Bota <onboarding@resend.dev>';

    if (!supabaseUrl || !supabaseKey || !resendApiKey) {
        console.error('Falten secrets de configuració (SUPABASE o RESEND)');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    // Determinar mes i any (per defecte el mes anterior)
    let year, month;
    const args = process.argv.slice(2);
    const yearArg = args.find(a => a.startsWith('--year='))?.split('=')[1];
    const monthArg = args.find(a => a.startsWith('--month='))?.split('=')[1];

    if (yearArg && monthArg) {
        year = parseInt(yearArg);
        month = parseInt(monthArg);
    } else {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        year = d.getFullYear();
        month = d.getMonth() + 1;
    }

    const monthStr = month.toString().padStart(2, '0');
    const period = `${year}-${monthStr}`;
    const startDate = `${period}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${period}-${lastDay}`;

    console.log(`Iniciant exportació de factures i pressupostos pel període: ${period}`);

    const exportDir = path.join(process.cwd(), `export_${period}`);
    const dataDir = path.join(exportDir, 'data');
    const storageDir = path.join(exportDir, 'storage');
    const facturesDir = path.join(storageDir, 'factures');
    const pressupostosDir = path.join(storageDir, 'pressupostos');

    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);
    if (!fs.existsSync(facturesDir)) fs.mkdirSync(facturesDir);
    if (!fs.existsSync(pressupostosDir)) fs.mkdirSync(pressupostosDir);

    const zipFileName = `export_buidantlabota_${period}.zip`;

    try {
        // 2. Exportar dades de Postgres
        console.log('Baixant dades de la base de dades...');

        // Factures
        const { data: factures, error: fError } = await supabase
            .from('invoice_records')
            .select('*')
            .gte('creation_date', startDate)
            .lte('creation_date', endDate);

        if (fError) throw fError;

        fs.writeFileSync(
            path.join(dataDir, `factures_${period}.json`),
            JSON.stringify(factures, null, 2)
        );

        // Pressupostos
        const { data: pressupostos, error: pError } = await supabase
            .from('quote_records')
            .select('*')
            .gte('creation_date', startDate)
            .lte('creation_date', endDate);

        if (pError) throw pError;

        fs.writeFileSync(
            path.join(dataDir, `pressupostos_${period}.json`),
            JSON.stringify(pressupostos, null, 2)
        );

        console.log(`Trobades ${factures.length} factures i ${pressupostos.length} pressupostos.`);

        // 3. Exportar PDFs de Storage
        console.log('Baixant PDFs de Storage...');

        const downloadPDF = async (record, bucket, targetDir) => {
            const number = record.invoice_number || record.quote_number;
            let storagePath = record.pdf_storage_path;

            // Si no tenim el path guardat (registres antics), intentem buscar per prefix
            if (!storagePath) {
                console.log(`Buscant PDF per ${number} a storage (recollida manual)...`);
                const { data: files, error: listError } = await supabase.storage
                    .from(bucket)
                    .list('', { search: number.replace('/', '-') });

                if (!listError && files && files.length > 0) {
                    // Agafem el més recent si n'hi ha més d'un?
                    storagePath = files[0].name;
                }
            }

            if (storagePath) {
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .download(storagePath);

                if (error) {
                    console.warn(`Error descarregant PDF ${storagePath}: ${error.message}`);
                    return;
                }

                const fileName = path.basename(storagePath);
                fs.writeFileSync(path.join(targetDir, fileName), Buffer.from(await data.arrayBuffer()));
            } else {
                console.warn(`No s'ha trobat PDF per al document ${number}`);
            }
        };

        for (const f of factures) await downloadPDF(f, 'factures', facturesDir);
        for (const p of pressupostos) await downloadPDF(p, 'pressupostos', pressupostosDir);

        // 4. Crear ZIP
        console.log('Generant fitxer ZIP...');
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver('zip', { zlib: { level: 9 } });

        const zipPromise = new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
        });

        archive.pipe(output);
        archive.directory(exportDir, false);
        await archive.finalize();
        await zipPromise;

        const stats = fs.statSync(zipFileName);
        const sizeMB = stats.size / (1024 * 1024);
        console.log(`ZIP generat: ${zipFileName} (${sizeMB.toFixed(2)} MB)`);

        // 5. Enviar Email
        console.log('Preparant enviament d\'email...');

        let attachments = [];
        let bodyExtra = '';

        if (sizeMB < 20) {
            const fileContent = fs.readFileSync(zipFileName);
            attachments.push({
                filename: zipFileName,
                content: fileContent.toString('base64'),
            });
            bodyExtra = `<p>S'ha adjuntat el fitxer ZIP amb les dades i els PDFs.</p>`;
        } else {
            bodyExtra = `
                <p>⚠️ El fitxer ZIP supera els 20MB (${sizeMB.toFixed(2)} MB) i no s'ha pogut adjuntar.</p>
                <p>Pots descarregar l'exportació des de l'apartat de <strong>Artifacts</strong> de l'última execució del workflow a GitHub Actions.</p>
            `;
            // Marquem que cal pujar el fitxer com artifact a GitHub
            if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `UPLOAD_ARTIFACT=true\n`);
            }
        }

        const totalDocuments = factures.length + pressupostos.length;
        const html = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2563eb;">Export Mensual de Facturació</h2>
                <p>S'ha generat l'exportació de dades i documents per al període <strong>${period}</strong>.</p>
                <ul style="list-style: none; padding: 0;">
                    <li>📄 <strong>Factures:</strong> ${factures.length}</li>
                    <li>📑 <strong>Pressupostos:</strong> ${pressupostos.length}</li>
                </ul>
                ${totalDocuments === 0 ? '<p>No s\'han trobat documents per aquest mes.</p>' : bodyExtra}
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 0.8em; color: #777;">Sistema de facturació Buidant la Bota.</p>
            </div>
        `;

        const { data: emailData, error: emailError } = await resend.emails.send({
            from: emailFrom,
            to: emailTo,
            subject: `Export mensual factures i pressupostos ${period}`,
            html: html,
            attachments: attachments,
        });

        if (emailError) {
            console.error('Error enviant email:', emailError);
            process.exit(1);
        }

        console.log('Email enviat correctament!', emailData);
        process.exit(0);

    } catch (err) {
        console.error('Error crític durant l\'exportació:', err);
        process.exit(1);
    }
}

runExport();
