const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

async function sendBackup() {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const date = new Date().toISOString().split('T')[0];
    const fileName = process.argv[2]; // El nom del fitxer ZIP es passa com a argument

    if (!fileName || !fs.existsSync(fileName)) {
        console.error('Fitxer de backup no trobat:', fileName);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(fileName);
    const base64Content = fileContent.toString('base64');

    try {
        console.log(`Enviant backup: ${fileName}...`);

        const { data, error } = await resend.emails.send({
            from: 'Buidant la Bota <onboarding@resend.dev>',
            to: 'buidantlabota@gmail.com',
            subject: `📦 Backup Total Supabase – ${date}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Còpia de seguretat mensual</h2>
                    <p>S'ha generat correctament la còpia de seguretat total de la base de dades de Supabase.</p>
                    <p><strong>Fitxer:</strong> ${fileName}</p>
                    <p>Aquest fitxer conté tot l'esquema i les dades (clients, bolos, factures, etc.) en format SQL.</p>
                    <hr />
                    <p style="font-size: 0.8em; color: #777;">Aquest és un enviament automàtic de seguretat.</p>
                </div>
            `,
            attachments: [
                {
                    filename: fileName,
                    content: base64Content,
                },
            ],
        });

        if (error) {
            console.error('Error enviant email:', error);
            process.exit(1);
        }

        console.log('Backup enviat correctament!', data);
    } catch (err) {
        console.error('Error crític en l\'script de backup:', err);
        process.exit(1);
    }
}

sendBackup();
