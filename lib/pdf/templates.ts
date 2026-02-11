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
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 11pt;
            line-height: 1.4;
        }
        .header-bar {
            background-color: ${primaryColor};
            height: 10px;
            width: 100%;
        }
        .container {
            padding: 40pt;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30pt;
        }
        .header-info h1 {
            color: ${primaryColor};
            font-size: 28pt;
            margin: 0;
            font-weight: bold;
        }
        .header-info p {
            margin: 2pt 0;
            font-weight: bold;
            font-size: 12pt;
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
            margin-bottom: 30pt;
        }
        .bolo-details {
            width: 60%;
        }
        .bolo-details h2 {
            color: ${primaryColor};
            font-size: 20pt;
            margin: 0 0 15pt 0;
        }
        .detail-row {
            display: flex;
            margin-bottom: 8pt;
        }
        .detail-label {
            font-weight: bold;
            width: 120pt;
        }
        .beneficiary-box {
            width: 35%;
        }
        .beneficiary-box h3 {
            font-size: 12pt;
            margin: 0 0 10pt 0;
            font-weight: bold;
        }
        .beneficiary-info {
            font-size: 10pt;
        }
        .description-section {
            margin-bottom: 30pt;
        }
        .description-header {
            background-color: ${primaryColor};
            color: #fff;
            text-align: center;
            padding: 4pt;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11pt;
            border: 1px solid #000;
        }
        .description-content {
            border: 1px solid #000;
            border-top: none;
            padding: 10pt;
            font-size: 10pt;
            min-height: 80pt;
            white-space: pre-wrap;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20pt;
        }
        .table th {
            color: #ba7373;
            text-align: left;
            font-size: 12pt;
            font-weight: bold;
            border-top: 2pt solid #7d4343;
            padding: 8pt 0;
        }
        .table th.right { text-align: right; }
        .table td {
            padding: 8pt 0;
            font-size: 11pt;
        }
        .table td.right { text-align: right; }
        .total-row {
            border-top: 2pt solid ${primaryColor};
            text-align: right;
            padding-top: 10pt;
        }
        .total-amount {
            color: ${primaryColor};
            font-size: 24pt;
            font-weight: bold;
        }
        .footer-section {
            margin-top: 40pt;
        }
        .footer-title {
            font-weight: bold;
            margin-bottom: 10pt;
            font-size: 12pt;
        }
        .payment-box {
            border: 1px solid #000;
            padding: 10pt;
            font-size: 11pt;
            margin-bottom: 20pt;
        }
        .exempt-info {
            font-size: 11pt;
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
