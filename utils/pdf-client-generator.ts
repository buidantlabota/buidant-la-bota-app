import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';

export interface PDFData {
    type: 'pressupost' | 'factura';
    number: string;
    date: string;
    dueDate?: string;
    client: {
        nom: string;
        nif?: string | null;
        adreca?: string | null;
        poblacio?: string | null;
        codi_postal?: string | null;
    };
    bolo: {
        nom_poble: string;
        concepte?: string | null;
        durada?: number | null;
        data: string;
        hora?: string | null;
        nombre_musics?: number;
    };
    articles: { descripcio: string; preu: number; quantitat: number }[];
    total: number;
    descriptionText?: string;
}

export async function generateClientPDF(data: PDFData) {
    const doc = new jsPDF();

    // COLORS
    const BLB_BURGUNDY: [number, number, number] = [90, 0, 0]; // #5a0000 (Main)
    const BLB_DARK_BURGUNDY: [number, number, number] = [60, 0, 0]; // #3c0000 (Darker)

    // MARGINS (Standard "Word" style ~20-25mm)
    const marginL = 20;
    const marginR = 20;
    const marginT = 25;
    const pageWidth = 210;
    const contentWidth = pageWidth - marginL - marginR;

    // Helper to load logo
    const getLogoBase64 = async () => {
        try {
            const response = await fetch('/blb-logo.jpg');
            const blob = await response.blob();
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    const logoBase64 = await getLogoBase64();

    // 1. BARRA SUPERIOR (Inside margins, not touching walls)
    doc.setFillColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.rect(marginL, marginT, contentWidth, 5, 'F');

    // 2. LOGO (Top Right, within margins)
    const logoSize = 45;
    const logoX = pageWidth - marginR - logoSize;
    const logoY = marginT + 10;

    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize);
    }

    // 3. NOM GRUP (Left aligned with margin)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.text('BUIDANT LA BOTA', marginL, marginT + 22);

    // 4. DADES ORGANITZACIÓ
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Associació Buidant la Bota', marginL, marginT + 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('C/ Rocafort, 51', marginL, marginT + 39);
    doc.text('08271 - Artés (BARCELONA)', marginL, marginT + 44);
    doc.text('CIF. G13919436', marginL, marginT + 49);

    // 5. FILA META (Data, Numero, Validesa)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const realitzatData = data.date;
    doc.text(`Realitzat el ${realitzatData}`, marginL, marginT + 65);

    doc.setFont('helvetica', 'bold');
    const labelDoc = data.type === 'factura' ? 'Num.factura' : 'Num.pressupost';
    doc.text(`${labelDoc}: ${data.number}`, marginL + 70, marginT + 65);

    const valLabel = data.type === 'factura' ? 'Validesa' : 'Validesa';
    const valDate = data.dueDate || data.date;
    doc.text(`${valLabel}: ${valDate}`, marginL + 130, marginT + 65);

    // 6. TÍTOL DOCUMENT
    doc.setFontSize(22);
    doc.setTextColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.setFont('helvetica', 'bold');
    const docTitle = data.type === 'factura' ? 'FACTURA' : 'PRESSUPOST';
    doc.text(docTitle, marginL, marginT + 82);

    // 7. DETALLS BOLO (Left side) - Moved up to align with beneficiary title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const boloDetailsX = marginL;
    const boloValueX = marginL + 25;
    const maxBoloWidth = 65; // Max width for left column (reduced for safety margin)
    let boloY = marginT + 94;

    // Actuació a:
    doc.text('Actuació a:', boloDetailsX, boloY);
    doc.setFont('helvetica', 'normal');
    const dataObj = parseISO(data.bolo.data);
    const dateStr = format(dataObj, 'dd/MM/yy');
    const timeStr = data.bolo.hora ? data.bolo.hora.substring(0, 5) : '';
    const actuacioText = `${data.bolo.nom_poble}, ${dateStr}${timeStr ? ', ' + timeStr : ''}`;
    const actuacioLines = doc.splitTextToSize(actuacioText, maxBoloWidth);
    doc.text(actuacioLines, boloValueX, boloY);
    boloY += actuacioLines.length * 5 + 2;

    // BENEFICIARI TITLE - Aligned with "Actuació a:"
    const beneficiariX = 115;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADES DEL BENEFICIARI', beneficiariX, marginT + 94);

    // DADES BENEFICIARI (Client) with text wrapping
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let clientY = marginT + 102;
    const maxClientWidth = 75; // Max width to stay within margins

    // Client name with wrapping
    const clientNameLines = doc.splitTextToSize(data.client.nom, maxClientWidth);
    doc.text(clientNameLines, beneficiariX, clientY);
    clientY += clientNameLines.length * 5;

    if (data.client.nif) {
        doc.text(data.client.nif, beneficiariX, clientY);
        clientY += 5;
    }
    if (data.client.adreca) {
        const adrecaLines = doc.splitTextToSize(data.client.adreca, maxClientWidth);
        doc.text(adrecaLines, beneficiariX, clientY);
        clientY += adrecaLines.length * 5;
    }
    const pobMeta = `${data.client.poblacio || ''} - ${data.client.codi_postal || ''}`.trim();
    if (pobMeta && pobMeta !== '-') {
        const pobLines = doc.splitTextToSize(pobMeta, maxClientWidth);
        doc.text(pobLines, beneficiariX, clientY);
        clientY += pobLines.length * 5;
    }

    // Continue with bolo details
    // Concepte:
    doc.setFont('helvetica', 'bold');
    doc.text('Concepte:', boloDetailsX, boloY);
    doc.setFont('helvetica', 'normal');
    const concepteLines = doc.splitTextToSize(data.bolo.concepte || '-', maxBoloWidth);
    doc.text(concepteLines, boloValueX, boloY);
    boloY += concepteLines.length * 5 + 2;

    // Durada:
    doc.setFont('helvetica', 'bold');
    doc.text('Durada:', boloDetailsX, boloY);
    doc.setFont('helvetica', 'normal');
    const duradaFormatted = data.bolo.durada ? (data.bolo.durada >= 60 ? `${data.bolo.durada / 60}h` : `${data.bolo.durada}min`) : '-';
    doc.text(duradaFormatted, boloValueX, boloY);
    boloY += 7;

    // Nombre de musics:
    doc.setFont('helvetica', 'bold');
    doc.text('Nº músics:', boloDetailsX, boloY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.bolo.nombre_musics || '-'}`, boloValueX, boloY);

    // 8. DESCRIPCIÓ GENERAL
    let currentY = boloY + 12;
    doc.setFillColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.rect(marginL, currentY, contentWidth, 6, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Descripció general', marginL + (contentWidth / 2), currentY + 4.5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const descriptionBoxText = data.descriptionText || '';
    const splitDesc = doc.splitTextToSize(descriptionBoxText, contentWidth - 6);
    const descHeight = Math.max(30, splitDesc.length * 5 + 10);

    doc.rect(marginL, currentY + 6, contentWidth, descHeight); // Box border
    doc.text(splitDesc, marginL + 3, currentY + 13);

    // 9. TAULA D'ARTICLES
    currentY += descHeight + 15;

    doc.setTextColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Descripció', marginL, currentY);
    doc.text('Quantitat', marginL + 120, currentY, { align: 'right' });
    doc.text('P. unitari', marginL + 145, currentY, { align: 'right' });
    doc.text('P. Total', pageWidth - marginR, currentY, { align: 'right' });

    doc.setDrawColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.setLineWidth(0.5);
    doc.line(marginL, currentY + 2, pageWidth - marginR, currentY + 2);

    currentY += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    data.articles.forEach(art => {
        doc.text(art.descripcio, marginL, currentY);
        doc.text(art.quantitat.toString(), marginL + 120, currentY, { align: 'right' });
        doc.text(`${art.preu.toFixed(2).replace('.', ',')} €`, marginL + 145, currentY, { align: 'right' });
        doc.text(`${(art.preu * art.quantitat).toFixed(2).replace('.', ',')} €`, pageWidth - marginR, currentY, { align: 'right' });
        currentY += 6;
    });

    doc.line(marginL, currentY, pageWidth - marginR, currentY);

    // TOTAL
    currentY += 12;
    doc.setFontSize(22);
    doc.setTextColor(BLB_BURGUNDY[0], BLB_BURGUNDY[1], BLB_BURGUNDY[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.total.toFixed(2).replace('.', ',')} €`, pageWidth - marginR, currentY, { align: 'right' });

    // 10. NOTES / PAGAMENT
    currentY += 12;
    if (data.type === 'factura') {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('CONDICIONS I FORMA DE PAGAMENT', marginL, currentY);
        currentY += 5;
        doc.rect(marginL, currentY, contentWidth, 18);
        doc.line(marginL, currentY + 6, pageWidth - marginR, currentY + 6);
        doc.line(marginL, currentY + 12, pageWidth - marginR, currentY + 12);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CAIXABANC', marginL + 3, currentY + 4);
        doc.text('IBAN: ES87 2100 0401 5201 0043 4560', marginL + 3, currentY + 10);
        doc.text('BIC: CAIXESBBXXX', marginL + 3, currentY + 16);
    } else {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('NOTES', marginL, currentY);
    }

    // 11. IVA EXEMPT
    currentY += 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('IVA Exempt', marginL, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Art. 20.1.14c LLei 37/1992', marginL, currentY);

    return doc;
}
