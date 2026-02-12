export interface TemplateData {
    type: 'factura' | 'pressupost';
    number: string;
    date: string;
    dueDate?: string;
    client: {
        nom: string;
        rao_social?: string;
        nif?: string;
        adreca?: string;
        poblacio?: string;
        codi_postal?: string;
    };
    bolo: {
        nom_poble: string;
        concepte?: string;
        durada?: number | string;
        data?: string;
        hora?: string;
    };
    articles: { descripcio: string; preu: number; quantitat: number }[];
    total: number;
    descriptionText: string;
}

export const getHTMLTemplate = (data: TemplateData) => {
    const isInvoice = data.type === 'factura';
    const primaryColor = '#5a0000'; // Dark red/maroon
    const secondaryColor = '#000000';

    // Helper to calculate musicians count if not explicitly provided
    // This is a rough estimation or we should pass it in 'data'. 
    // For now, we'll try to extract it from the description or simply omit if not available, 
    // but the screenshot shows it. We'll verify if we can get it from the bolo data or args.
    // In strict mode, we might need to update the interface, but let's check 'data.bolo'.
    const numMusics = (data as any).instrumentsCount
        ? Object.values((data as any).instrumentsCount).reduce((a: any, b: any) => a + b, 0)
        : (data.bolo as any).num_musics || ' - ';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 40pt 50pt; /* Page margins: top/bottom left/right */
            color: #000;
            font-size: 10pt;
            line-height: 1.3;
        }
        .header-bar {
            background-color: ${primaryColor};
            height: 20px;
            width: 100%;
            margin-bottom: 25pt;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20pt;
        }
        .header-info {
            max-width: 60%;
        }
        .header-info h1 {
            color: ${primaryColor};
            font-size: 26pt;
            margin: 0 0 10pt 0;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .header-info p {
            margin: 2pt 0;
            font-size: 10pt;
            font-weight: bold;
            color: #000;
        }
        .logo-box {
            background-color: ${primaryColor};
            width: 100pt;
            height: 100pt;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-box img {
            width: 80pt;
            height: 80pt;
            object-fit: contain;
        }
        .doc-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20pt;
            font-weight: bold;
            font-size: 9pt;
        }
        .main-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20pt;
        }
        .bolo-details {
            width: 60%;
        }
        .bolo-details h2 {
            color: ${primaryColor};
            font-size: 20pt;
            margin: 0 0 15pt 0;
            font-weight: bold;
            text-transform: uppercase;
        }
        .detail-row {
            display: flex;
            margin-bottom: 6pt;
            align-items: baseline;
        }
        .detail-label {
            font-weight: bold;
            width: 110pt;
            min-width: 110pt;
            color: #000;
        }
        .detail-value {
             /* flex: 1; */
        }
        .beneficiary-box {
            width: 35%;
            padding-top: 35pt; /* Move down as requested */
        }
        .beneficiary-box h3 {
            font-size: 10pt;
            margin: 0 0 10pt 0;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
        }
        .beneficiary-info {
            font-size: 10pt;
            line-height: 1.4;
        }
        .description-section {
            margin-bottom: 20pt;
        }
        .description-header {
            background-color: ${primaryColor};
            color: #fff;
            text-align: center;
            padding: 2pt; /* Thinner bar */
            font-weight: bold;
            text-transform: capitalize; 
            font-size: 11pt;
            border: 1px solid #000;
            border-bottom: none;
        }
        .description-content {
            border: 2px solid #000;
            padding: 10pt;
            font-size: 9pt;
            min-height: 60pt;
            white-space: pre-wrap;
            text-align: justify;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10pt;
        }
        .table th {
            color: #ba4a4a; /* Lighter red for headers */
            text-align: left;
            font-size: 11pt;
            font-weight: bold;
            border-bottom: 2px solid ${primaryColor};
            padding: 5pt 0;
        }
        .table th.right { text-align: right; }
        .table td {
            padding: 8pt 0;
            font-size: 10pt;
        }
        .table td.right { text-align: right; }
        .total-row {
            border-top: 2px solid ${primaryColor};
            text-align: right;
            padding-top: 5pt;
            margin-bottom: 30pt;
        }
        .total-amount {
            color: ${primaryColor};
            font-size: 20pt;
            font-weight: bold;
        }
        .footer-section {
            margin-top: 10pt;
            page-break-inside: avoid;
        }
        .footer-title {
            font-weight: bold;
            margin-bottom: 5pt;
            font-size: 10pt;
            text-transform: uppercase;
        }
        .payment-box {
            border: 2px solid #000;
            padding: 5pt 10pt;
            font-size: 10pt;
            margin-bottom: 15pt;
            font-weight: bold;
        }
        .exempt-box {
            border-top: 2px solid #000;
            padding-top: 5pt;
            font-size: 9pt;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header-bar"></div>
    
    <div class="header">
        <div class="header-info">
            <h1>BUIDANT LA BOTA</h1>
            <p>Associació Buidant la Bota</p>
            <p>C/ Rocafort, 51</p>
            <p>08271 - Artés (BARCELONA)</p>
            <p>CIF. G13919436</p>
        </div>
        <div class="logo-box">
            <img src="data:image/jpeg;base64,${/* Logo will be injected here as base64 */ 'LOGO_PLACEHOLDER'}" alt="Logo">
        </div>
    </div>

    <div class="doc-meta">
        <span>Realitzat el ${data.date}</span>
        ${isInvoice ? `<span>Num.factura: ${data.number}</span>` : ''}
        ${isInvoice ? `<span>Validesa: ${data.dueDate}</span>` : ''}
    </div>

    <div class="main-section">
        <div class="bolo-details">
            <h2>${isInvoice ? 'FACTURA' : 'PRESSUPOST'}</h2>
            <div class="detail-row">
                <span class="detail-label">Actuació a:</span>
                <span class="detail-value">${data.bolo.nom_poble}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Concepte:</span>
                <span class="detail-value">${data.bolo.concepte || ''}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Durada de l'actuació:</span>
                <span class="detail-value">${data.bolo.durada ? data.bolo.durada + 'h' : ''}</span> 
            </div>
             <div class="detail-row">
                <span class="detail-label">Nombre de músics:</span>
                <span class="detail-value">${numMusics}</span>
            </div>
        </div>
        <div class="beneficiary-box">
            <h3>DADES DEL BENEFICIARI</h3>
            <div class="beneficiary-info">
                <strong>${data.client.rao_social || data.client.nom}</strong><br>
                ${data.client.nif || ''}<br>
                ${data.client.adreca || ''}<br>
                ${data.client.poblacio ? `${data.client.poblacio} - ${data.client.codi_postal || ''}` : ''}
            </div>
        </div>
    </div>

    <div class="description-section">
        <div class="description-header">Descripció general</div>
        <div class="description-content">${data.descriptionText}</div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Descripció</th>
                <th class="right">Quantitat</th>
                <th class="right">Preu unitari</th>
                <th class="right">Preu total</th>
            </tr>
        </thead>
        <tbody>
            ${data.articles.map(article => `
            <tr>
                <td>${article.descripcio}</td>
                <td class="right">${article.quantitat}</td>
                <td class="right">${article.preu.toFixed(2).replace('.', ',')} €</td>
                <td class="right">${(article.quantitat * article.preu).toFixed(2).replace('.', ',')} €</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-row">
        <span class="total-amount">${data.total.toFixed(2).replace('.', ',')} €</span>
    </div>

    <div class="footer-section">
        <div class="footer-title">${isInvoice ? 'CONDICIONS I FORMA DE PAGAMENT' : 'NOTES'}</div>
        
        ${isInvoice ? `
        <div class="payment-box">
            CAIXABANC<br>
            IBAN: ES44 2100 0017 5901 1078 9921<br>
            BIC: CAIXAESXXXX
        </div>
        ` : ''}

        <div class="exempt-box">
            IVA Exempt<br>
            Art. 20.1.14c LLei 37/1992
        </div>
    </div>
</body>
</html>
    `;
};
