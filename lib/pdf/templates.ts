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
    const primaryColor = '#5a0000';

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
            padding: 0;
            color: #000;
            font-size: 10pt;
            line-height: 1.25;
        }
        .header-bar {
            background-color: ${primaryColor};
            height: 15px;
            width: 100%;
        }
        .container {
            padding: 45pt 50pt 30pt 50pt;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20pt;
        }
        .header-info h1 {
            color: ${primaryColor};
            font-size: 24pt;
            margin: 0 0 5pt 0;
            font-weight: bold;
            letter-spacing: -0.5px;
        }
        .header-info p {
            margin: 2pt 0;
            font-size: 10pt;
            color: #333;
        }
        .logo-box {
            background-color: ${primaryColor};
            width: 75pt;
            height: 75pt;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-box img {
            width: 60pt;
            height: 60pt;
            object-fit: contain;
        }
        .doc-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15pt;
            font-weight: bold;
            font-size: 9pt;
            border-bottom: 1px solid #eee;
            padding-bottom: 10pt;
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
            font-size: 16pt;
            margin: 0 0 10pt 0;
            text-transform: uppercase;
        }
        .detail-row {
            display: flex;
            margin-bottom: 5pt;
        }
        .detail-label {
            font-weight: bold;
            width: 100pt;
            color: #555;
        }
        .beneficiary-box {
            width: 35%;
        }
        .beneficiary-box h3 {
            font-size: 10pt;
            margin: 0 0 5pt 0;
            font-weight: bold;
            color: #555;
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
            padding: 5pt;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10pt;
        }
        .description-content {
            border: 1px solid ${primaryColor};
            border-top: none;
            padding: 10pt;
            font-size: 10pt;
            min-height: 50pt;
            white-space: pre-wrap;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15pt;
        }
        .table th {
            color: #666;
            text-align: left;
            font-size: 10pt;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding: 8pt 0;
        }
        .table th.right { text-align: right; }
        .table td {
            padding: 8pt 0;
            font-size: 10pt;
            border-bottom: 1px solid #eee;
        }
        .table td.right { text-align: right; }
        .total-row {
            text-align: right;
            padding-top: 10pt;
            margin-bottom: 30pt;
        }
        .total-amount {
            color: ${primaryColor};
            font-size: 20pt;
            font-weight: bold;
        }
        .footer-section {
            margin-top: 20pt;
            page-break-inside: avoid;
        }
        .footer-title {
            font-weight: bold;
            margin-bottom: 5pt;
            font-size: 10pt;
            text-transform: uppercase;
        }
        .payment-box {
            border: 1px solid #ccc;
            padding: 8pt;
            font-size: 10pt;
            margin-bottom: 15pt;
            background-color: #f9f9f9;
        }
        .exempt-info {
            font-size: 9pt;
            color: #666;
        }
        .exempt-header {
            font-weight: bold;
            margin-bottom: 2pt;
        }
    </style>
</head>
<body>
    <div class="header-bar"></div>
    <div class="container">
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
                    <span>${data.bolo.nom_poble}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Concepte:</span>
                    <span>${data.bolo.concepte || ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Durada:</span>
                    <span>${data.bolo.durada || ''} minuts</span>
                </div>
            </div>
            <div class="beneficiary-box">
                <h3>DADES DEL BENEFICIARI</h3>
                <div class="beneficiary-info">
                    <strong>${data.client.rao_social || data.client.nom}</strong><br>
                    ${data.client.rao_social && data.client.rao_social !== data.client.nom ? `${data.client.nom}<br>` : ''}
                    ${data.client.nif ? `${data.client.nif}<br>` : ''}
                    ${data.client.adreca ? `${data.client.adreca}<br>` : ''}
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
                    <td class="right">${article.preu.toFixed(2)} €</td>
                    <td class="right">${(article.quantitat * article.preu).toFixed(2)} €</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="total-row">
            <span class="total-amount">${data.total.toFixed(2)} €</span>
        </div>

        <div class="footer-section">
            <div class="footer-title">${isInvoice ? 'CONDICIONS I FORMA DE PAGAMENT' : 'NOTES'}</div>
            
            ${isInvoice ? `
            <div class="payment-box">
                <strong>BBVA</strong><br>
                IBAN: ES42 0182 3521 1102 0177 8875<br>
                BIC: BBVAESMMXXX
            </div>
            ` : ''}

            <div class="exempt-info">
                <div class="exempt-header">IVA Exempt</div>
                <div>Art. 20.1.14c LLei 37/1992</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};
