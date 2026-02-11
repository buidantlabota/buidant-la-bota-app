import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, addMonths, addMinutes, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import { Bolo, Client, DocumentArticle } from '@/types';

// Extend jsPDF with autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export interface PDFData {
    tipus: 'pressupost' | 'factura';
    numero_document: string;
    data_emissio: Date;
    validity_date: Date;
    client: Client;
    bolo: Bolo;
    articles: DocumentArticle[];
    instrumentsCount?: Record<string, number>;
}

const PRIMARY_COLOR = '#5a0000'; // Granat
const TEXT_COLOR = '#000000';
const SECONDARY_TEXT_COLOR = '#ba7373';
const BORDER_COLOR = '#000000';

export async function generatePDF(data: PDFData) {
    const doc = new jsPDF();
    const { tipus, numero_document, data_emissio, validity_date, client, bolo, articles, instrumentsCount } = data;

    // --- Try to load logo ---
    try {
        const logoResponse = await fetch('/blb-logo.jpg');
        const blob = await logoResponse.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(blob);
        const logoBase64 = await base64Promise;
        doc.addImage(logoBase64, 'JPEG', 150, 10, 45, 45);
    } catch (e) {
        console.warn('Could not load logo for PDF', e);
    }

    // --- Helper for fonts and layout ---
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;

    // Header Bar
    doc.setFillColor(PRIMARY_COLOR);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // --- Title Section ---
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text("BUIDANT LA BOTA", margin, 25);

    // --- Association Details ---
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Associació Buidant la Bota", margin, 35);
    doc.setFont('helvetica', 'normal');
    doc.text("C/ Rocafort, 51", margin, 40);
    doc.text("08271 - Artés (BARCELONA)", margin, 45);
    doc.text("CIF. G13919436", margin, 50);

    // --- Document Details ---
    const dateFormatted = format(data_emissio, 'dd/MM/yyyy');
    const validityFormatted = format(validity_date, 'dd/MM/yyyy');

    doc.setFont('helvetica', 'bold');
    doc.text(`Realitzat el ${dateFormatted}`, margin, 65);
    if (tipus === 'factura') {
        doc.text(`Num.factura: ${numero_document}`, margin + 50, 65);
    } else {
        doc.text(`Pressupost`, margin + 50, 65);
    }
    doc.text(`Validesa: ${validityFormatted}`, margin + 110, 65);

    // --- Beneficiary Box ---
    const beneficiaryX = margin + 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADES DEL BENEFICIARI', beneficiaryX, 85);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let currentY = 92;
    if (client.rao_social) {
        doc.text(client.rao_social, beneficiaryX, currentY);
        currentY += 5;
    }
    if (client.nom && client.nom !== client.rao_social) {
        doc.text(client.nom, beneficiaryX, currentY);
        currentY += 5;
    }
    if (client.nif) {
        doc.text(client.nif, beneficiaryX, currentY);
        currentY += 5;
    }
    if (client.adreca) {
        doc.text(client.adreca, beneficiaryX, currentY);
        currentY += 5;
    }
    const cityZip = `${client.poblacio || ''} - ${client.codi_postal || ''}`;
    if (cityZip.trim() !== '-') {
        doc.text(cityZip, beneficiaryX, currentY);
    }

    // --- Document Title (Factura/Pressupost) ---
    doc.setTextColor(PRIMARY_COLOR);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(tipus.toUpperCase(), margin, 85);

    // --- Bolo Details ---
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(10);

    let boloY = 95;
    doc.setFont('helvetica', 'bold');
    doc.text('Actuació a:', margin, boloY);
    doc.setFont('helvetica', 'normal');
    doc.text(bolo.nom_poble || '', margin + 30, boloY);

    boloY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Concepte:', margin, boloY);
    doc.setFont('helvetica', 'normal');
    doc.text(bolo.concepte || '', margin + 30, boloY);

    boloY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text("Durada:", margin, boloY);
    doc.setFont('helvetica', 'normal');
    doc.text(bolo.durada ? `${bolo.durada} minuts` : '', margin + 30, boloY);

    if (tipus === 'factura') {
        boloY += 7;
        doc.setFont('helvetica', 'bold');
        doc.text("Nombre de músics:", margin, boloY);
        doc.setFont('helvetica', 'normal');
        doc.text(data.instrumentsCount ? Object.values(data.instrumentsCount).reduce((a, b) => a + b, 0).toString() : '', margin + 40, boloY);
    }

    // --- General Description Text ---
    const descriptionY = 125;
    doc.setFillColor(PRIMARY_COLOR);
    doc.setDrawColor(BORDER_COLOR);
    doc.rect(margin, descriptionY - 5, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Descripció general", margin + (pageWidth - margin * 2) / 2, descriptionY, { align: 'center' });

    doc.setTextColor(TEXT_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const descText = generateDescriptionText(tipus, bolo, client, instrumentsCount);
    const splitText = doc.splitTextToSize(descText, pageWidth - (margin * 2 + 10));
    const descHeight = Math.max(30, splitText.length * 5 + 10);

    doc.rect(margin, descriptionY + 2, pageWidth - (margin * 2), descHeight);
    doc.text(splitText, margin + 5, descriptionY + 10);

    // --- Articles Table ---
    const tableY = descriptionY + descHeight + 15;

    doc.autoTable({
        startY: tableY,
        head: [['Descripció', 'Quantitat', 'Preu unitari', 'Preu total']],
        body: articles.map(a => [
            a.descripcio,
            '1',
            `${a.preu.toFixed(2)} €`,
            `${a.preu.toFixed(2)} €`
        ]),
        theme: 'plain',
        headStyles: {
            textColor: SECONDARY_TEXT_COLOR,
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: { top: 5, bottom: 5, left: 0, right: 0 }
        },
        styles: {
            fontSize: 10,
            cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 30 },
            2: { halign: 'right', cellWidth: 40 },
            3: { halign: 'right', cellWidth: 40 }
        },
        didDrawCell: (data: any) => {
            if (data.section === 'head' && data.row.index === 0) {
                doc.setDrawColor(SECONDARY_TEXT_COLOR);
                doc.setLineWidth(0.5);
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
            }
        },
        margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const total = articles.reduce((sum, a) => sum + a.preu, 0);

    // Total Line
    doc.setDrawColor(PRIMARY_COLOR);
    doc.setLineWidth(1);
    doc.line(margin, finalY - 5, pageWidth - margin, finalY - 5);

    doc.setTextColor(PRIMARY_COLOR);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`${total.toFixed(2)} €`, pageWidth - margin, finalY + 5, { align: 'right' });

    // --- Footer: Conditions ---
    let footerY = finalY + 20;
    doc.setTextColor(TEXT_COLOR);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(tipus === 'factura' ? "CONDICIONS I FORMA DE PAGAMENT" : "NOTES", margin, footerY);

    if (tipus === 'factura') {
        footerY += 10;
        doc.setFontSize(10);
        doc.rect(margin, footerY, pageWidth - (margin * 2), 20);
        doc.text("BBVA", margin + 5, footerY + 7);
        doc.text("IBAN: ES42 0182 3521 1102 0177 8875", margin + 5, footerY + 12);
        doc.text("BIC: BBVAESMMXXX", margin + 5, footerY + 17);
        footerY += 25;
    } else {
        footerY += 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.text("IVA Exempt", margin, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text("Art. 20.1.14c LLei 37/1992", margin, footerY + 5);

    // Save
    const fileName = `${tipus === 'factura' ? 'Factura' : 'Pressupost'} ${bolo.nom_poble}.pdf`;
    doc.save(fileName);
}

function generateDescriptionText(tipus: string, bolo: Bolo, client: Client, instrumentsCount?: Record<string, number>) {
    const dataObj = bolo.data_bolo ? parseISO(bolo.data_bolo) : new Date();
    const diaSetmana = format(dataObj, 'eeee', { locale: ca });
    const dia = format(dataObj, 'd');
    const mes = format(dataObj, 'MMMM', { locale: ca });
    const any = format(dataObj, 'yyyy');

    const horaInici = bolo.hora_inici ? bolo.hora_inici.substring(0, 5) : 'per confirmar';
    let horaFi = 'per confirmar';
    if (bolo.hora_inici && bolo.durada) {
        const [h, m] = bolo.hora_inici.split(':');
        const start = new Date();
        start.setHours(parseInt(h), parseInt(m));
        const end = addMinutes(start, bolo.durada);
        horaFi = format(end, 'HH:mm');
    }

    if (tipus === 'factura') {
        const plantilla = formatPlantilla(instrumentsCount);
        return `Actuació musical de la xaranga Buidant la Bota a ${bolo.nom_poble} organitzat per ${client.nom}.
\nL'actuació va esdevenir el ${diaSetmana} dia ${dia} de ${mes}, de les ${horaInici} a les ${horaFi}h.
\nLa plantilla va ser composta per ${plantilla}.`;
    } else {
        return `Actuació musical de la xaranga Buidant La Bota a ${bolo.nom_poble}, a la ${bolo.concepte || ''}, el dia ${dia} de ${mes} de ${any}, a les ${horaInici} hores.
\nOferim un repertori divers i que s'adapta a les característiques de l'actuació, des de pasdobles, cançons actuals, "hits" històrics o inclús músiques populars de la festa on anem.
\nPel que fa la nostra plantilla/formació, consta de percussionistes (caixa/bombo/plats), trompetes, trombons, saxos alt, saxo tenor/baríton i sousàfon.
\nEn cas que l'actuació es programés en un horari que impliqués la necessitat de dietes pels membres del grup, sol·licitem amablement que se'ns proporcioni. En aquest sentit agrairíem que se'ns informés tan bon punt es tingui decidida la planificació per tal d'organitzar-nos la jornada com a grup.
\nEl nombre de músics exactament, ho confirmarem uns dies abans de l'actuació, en el cas que sigui necessari.
\nEl pagament es pot realitzar en efectiu, el mateix dia de l’actuació, o per transferència bancària.`;
    }
}

function formatPlantilla(counts?: Record<string, number>) {
    if (!counts || Object.keys(counts).length === 0) return "per confirmar";

    const parts: string[] = [];

    // Grouping
    const percussio = counts['percussió'] || counts['percussio'] || 0;
    const trompetes = counts['trompeta'] || 0;
    const saxos = (counts['saxo alt'] || 0) + (counts['saxo'] || 0);
    const saxoTenor = counts['saxo tenor'] || 0;
    const trombó = counts['trombó'] || counts['trombo'] || 0;
    const tuba = counts['tuba'] || counts['sousàfon'] || counts['sousafon'] || 0;

    if (percussio) parts.push(`${percussio} percussionistes`);
    if (trompetes) parts.push(`${trompetes} trompeta${trompetes > 1 ? 's' : ''}`);
    if (saxos) parts.push(`${saxos} saxo${saxos > 1 ? 's' : ''}`);
    if (saxoTenor) parts.push(`${saxoTenor} saxo tenor`);
    if (trombó) parts.push(`${trombó} trombó${trombó > 1 ? 's' : ''}`);
    if (tuba) parts.push(`${tuba} tuba`);

    if (parts.length === 0) return "la formació habitual";
    if (parts.length === 1) return parts[0];

    const last = parts.pop();
    return parts.join(', ') + ' i ' + last;
}
