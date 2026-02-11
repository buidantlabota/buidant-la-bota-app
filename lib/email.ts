
import { Resend } from 'resend';
import { Solicitud } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'BUIDANT LA BOTA <no-reply@app.buidantlabota.cat>';
const APP_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

const SIGNATURE = `
BUIDANT LA BOTA
Joan Candàliga Casas – 656 58 01 31
Marc Sociats Font – 644 14 98 70
Genís Soler Rafart – 625 18 31 87
buidantlabota@gmail.com
Instagram: @buidantlabota
`;

export async function sendClientConfirmation(solicitud: Solicitud) {
    const subject = `Hem rebut la teva sol·licitud – ${solicitud.concepte} (${solicitud.data_actuacio || 'Data a concretar'})`;

    const html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p>Hola <strong>${solicitud.contacte_nom}</strong>,</p>
            <p>Moltes gràcies per contactar amb Buidant la Bota! Hem rebut correctament la teva sol·licitud i la revisarem el més aviat possible.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <h3>Resum de la sol·licitud:</h3>
            <ul>
                <li><strong>Concepte:</strong> ${solicitud.concepte}</li>
                <li><strong>Tipus d'actuació:</strong> ${solicitud.tipus_actuacio || 'N/A'}</li>
                <li><strong>Data:</strong> ${solicitud.data_actuacio || 'A concretar'}</li>
                <li><strong>Població:</strong> ${solicitud.municipi || 'A concretar'}</li>
            </ul>
            
            <p>Ens posarem en contacte amb tu molt aviat.</p>
            
            <p style="white-space: pre-wrap; color: #777; font-size: 0.9em;">${SIGNATURE}</p>
        </div>
    `;

    return resend.emails.send({
        from: FROM_EMAIL,
        to: solicitud.contacte_email,
        subject: subject,
        html: html
    });
}

export async function sendInternalNotification(solicitud: Solicitud) {
    const subject = `🔔 Nova sol·licitud – ${solicitud.concepte} (${solicitud.data_actuacio || '??'}) · ${solicitud.municipi || '??'}`;
    const linkApp = `${APP_URL}/solicituds/${solicitud.id}`;

    const html = `
        <div style="font-family: sans-serif; line-height: 1.4; color: #111;">
            <h2 style="color: #0070f3;">Nova sol·licitud rebuda!</h2>
            <p>S'ha registrat una nova entrada des del web:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Concepte</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.concepte}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Tipus Acte</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.tipus_actuacio || '-'}</td></tr>
                <tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Data</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.data_actuacio || 'No indicada'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Horari</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.hora_inici || '?'} - ${solicitud.hora_fi || '?'}</td></tr>
                <tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Municipi</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.municipi || '-'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Ubicació</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.ubicacio || '-'}</td></tr>
                
                <tr style="background: #f0f7ff;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Contacte</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.contacte_nom} (${solicitud.contacte_email})</td></tr>
                <tr style="background: #f0f7ff;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Telèfon</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.contacte_telefon || '-'}</td></tr>
                
                <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Pressupost?</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.necessita_pressupost ? 'SÍ' : 'No'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Factura?</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.requereix_factura ? 'SÍ' : 'No'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>NIF</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.fact_nif || '-'}</td></tr>
                
                <tr style="background: #fffbe6;"><td style="padding: 8px; border: 1px solid #eee;"><strong>Comentaris</strong></td><td style="padding: 8px; border: 1px solid #eee;">${solicitud.altres_acte || '-'}</td></tr>
            </table>

            <div style="margin-top: 30px; text-align: center;">
                <a href="${linkApp}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    GESTIONAR SOL·LICITUD A L'APP
                </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 0.8em; color: #999;">Aquesta sol·licitud s'ha desat automàticament a la base de dades.</p>
        </div>
    `;

    return resend.emails.send({
        from: FROM_EMAIL,
        to: 'buidantlabota@gmail.com',
        replyTo: solicitud.contacte_email,
        subject: subject,
        html: html
    });
}
