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
    const numMusics = (data as any).instrumentsCount
        ? Object.values((data as any).instrumentsCount).reduce((a: any, b: any) => a + b, 0)
        : (data.bolo as any).num_musics || ' - ';

    // Helper for Smart Title Case: "Sant Feliu Sasserra" (handling particles)
    const formatText = (str: string) => {
        if (!str) return '';
        // List of words to keep lowercase (unless first word)
        const minorWords = ['a', 'de', 'del', 'dels', 'el', 'els', 'la', 'les', 'i', 'o', 'per', 'en', 'amb', 'd\'', 'l\''];

        return str.toLowerCase().split(' ').map((word, index) => {
            // Handle apostrophes basic support (e.g., l'Estel -> L'Estel)
            // Ideally we'd split by apostrophe too but simple per-word check helps
            if (index > 0 && minorWords.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

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
            padding: 35pt 50pt; /* Reduced vertical padding to fit on page */
            color: #000;
            font-size: 10pt;
            line-height: 1.25; /* Slightly tighter line height */
        }
        .header-bar {
            background-color: ${primaryColor};
            height: 20px;
            width: 100%;
            margin-bottom: 20pt; /* Reduced margin */
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15pt; /* Reduced margin */
        }
        .header-info {
            max-width: 60%;
        }
        .header-info h1 {
            color: ${primaryColor};
            font-size: 26pt;
            margin: 0 0 5pt 0; /* Reduced margin */
            font-weight: bold;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .header-info p {
            margin: 2pt 0;
            font-size: 10pt;
            color: #000;
        }
        .logo-box {
            /* background-color: ${primaryColor}; Removed to avoid weird background */
            width: 100pt;
            height: 100pt;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .doc-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20pt; /* Reduced margin */
            font-weight: bold; /* Requested to be bold */
            font-size: 9pt;
        }
        .main-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15pt; /* Reduced margin */
        }
        .bolo-details {
            width: 60%;
        }
        .bolo-details h2 {
            color: ${primaryColor};
            font-size: 20pt;
            margin: 0 0 8pt 0; /* Reduced margin */
            font-weight: bold;
            text-transform: uppercase;
        }
        
        /* New Table for Details alignment */
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table td {
            padding: 2pt 0; /* Tighter padding */
            vertical-align: top;
            font-size: 9pt; /* Smaller font as requested */
        }
        .details-table .label {
            font-weight: bold;
            width: 110pt; /* Slightly narrower label col */
            color: #000;
        }
        
        .beneficiary-box {
            width: 35%;
            padding-top: 35pt; 
        }
        .beneficiary-box h3 {
            font-size: 9pt; /* Smaller header */
            margin: 0 0 5pt 0; 
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
        }
        .beneficiary-info {
            font-size: 9pt; /* Smaller body text */
            line-height: 1.3;
        }
        .description-section {
            margin-bottom: 20pt;
        }
        .description-header {
            background-color: ${primaryColor};
            color: #fff;
            text-align: center;
            padding: 3pt;
            font-weight: bold;
            font-size: 10pt;
            border: 0.5pt solid #000;
            border-bottom: none;
        }
        .description-content {
            border: 0.5pt solid #000;
            padding: 20pt; 
            font-size: 9pt;
            min-height: 50pt; 
            white-space: pre-wrap;
            text-align: justify;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10pt; 
        }
        .table th {
            color: #ba4a4a;
            text-align: left;
            font-size: 10pt; /* Slightly smaller headers too */
            font-weight: bold;
            border-bottom: 2px solid ${primaryColor};
            padding: 5pt 0;
        }
        .table th.right { text-align: right; }
        .table td {
            padding: 6pt 0; 
            font-size: 10pt;
        }
        .table td.right { text-align: right; }
        .total-row {
            border-top: 2px solid ${primaryColor};
            text-align: right;
            padding-top: 5pt;
            margin-bottom: 20pt; 
        }
        .total-amount {
            color: ${primaryColor};
            font-size: 18pt; /* Slightly smaller total */
            font-weight: bold;
        }
        .footer-section {
            margin-top: 5pt; 
            page-break-inside: avoid;
        }
        .footer-title {
            font-weight: bold;
            margin-bottom: 5pt;
            font-size: 9pt; /* Smaller footer title */
            text-transform: uppercase;
        }
        
        /* Styled Payment Table */
        .payment-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 10pt; 
            font-size: 9pt; /* Smaller payment info */
        }
        .payment-table td {
            border-bottom: 1px solid #000;
            padding: 3pt 6pt;
        }
        .payment-table tr:last-child td {
            border-bottom: none;
        }
        .payment-table strong {
            font-weight: bold;
        }

        .exempt-box {
            border-top: 2px solid #000;
            padding-top: 5pt;
            font-size: 8pt; /* Smaller exempt text */
            font-weight: bold;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="header-bar"></div>
    
    <div class="header">
        <div class="header-info">
            <h1>BUIDANT LA BOTA</h1>
            <p style="font-weight: bold;">Associació Buidant la Bota</p>
            <p>C/ Rocafort, 51</p>
            <p>08271 - Artés (BARCELONA)</p>
            <p>CIF. G13919436</p>
        </div>
        <div class="logo-box">
            <!-- Using PNG for better transparency support if needed -->
            <img src="data:image/png;base64,${/* Logo will be injected here */ 'LOGO_PLACEHOLDER'}" alt="Logo">
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
            
            <table class="details-table">
                <tr>
                    <td class="label">Actuació a:</td>
                    <td>${formatText(data.bolo.nom_poble)}</td>
                </tr>
                <tr>
                    <td class="label">Concepte:</td>
                    <td>${formatText(data.bolo.concepte || '')}</td>
                </tr>
                <tr>
                    <td class="label">Durada de l'actuació:</td>
                    <td>${data.bolo.durada ? data.bolo.durada + 'h' : ''}</td>
                </tr>
                <tr>
                    <td class="label">Nombre de músics:</td>
                    <td>${numMusics}</td>
                </tr>
            </table>

        </div>
        <div class="beneficiary-box">
            <h3>DADES DEL BENEFICIARI</h3>
            <div class="beneficiary-info">
                <strong>${formatText(data.client.rao_social || data.client.nom)}</strong><br>
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
        <table class="payment-table">
            <tr>
                <td><strong>CAIXABANC</strong></td>
            </tr>
            <tr>
                <td><strong>IBAN:</strong> ES44 2100 0017 5901 1078 9921</td>
            </tr>
            <tr>
                <td><strong>BIC:</strong> CAIXAESXXXX</td>
            </tr>
        </table>
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
