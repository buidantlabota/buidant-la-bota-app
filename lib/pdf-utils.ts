import { format, addMinutes, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import { Bolo, Client } from '@/types';

export function formatPlantilla(counts?: Record<string, number>) {
    if (!counts || Object.keys(counts).length === 0) return "per confirmar";

    const parts: string[] = [];

    // Grouping
    const percussio = counts['percussió'] || counts['percussio'] || 0;
    const trompetes = counts['trompeta'] || 0;
    const saxos = (counts['saxo alt'] || 0) + (counts['saxo'] || 0);
    const saxoTenor = counts['saxo tenor'] || 0;
    const trombó = counts['trombó'] || counts['trombo'] || 0;
    const tuba = counts['tuba'] || counts['sousàfon'] || counts['sousafon'] || 0;

    if (percussio) parts.push(percussio > 1 ? `${percussio} percussionistes` : `${percussio} percussionista`);
    if (trompetes) parts.push(trompetes > 1 ? `${trompetes} trompetes` : `${trompetes} trompeta`);
    if (saxos) parts.push(saxos > 1 ? `${saxos} saxos` : `${saxos} saxo`);
    if (saxoTenor) parts.push(saxoTenor > 1 ? `${saxoTenor} saxos tenors` : `${saxoTenor} saxo tenor`);
    if (trombó) parts.push(trombó > 1 ? `${trombó} trombons` : `${trombó} trombó`);
    if (tuba) parts.push(tuba > 1 ? `${tuba} tubes` : `${tuba} tuba`);

    if (parts.length === 0) return "la formació habitual";
    if (parts.length === 1) return parts[0];

    const last = parts.pop();
    return parts.join(', ') + ' i ' + last;
}

const smartTitleCase = (str: string) => {
    if (!str) return '';
    const minorWords = ['a', 'de', 'del', 'dels', 'el', 'els', 'la', 'les', 'i', 'o', 'per', 'en', 'amb', 'd\'', 'l\''];
    return str.toLowerCase().split(' ').map((word, index) => {
        if (index > 0 && minorWords.includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

export function generateDescriptionText(tipus: string, bolo: Bolo, client: Client, instrumentsCount?: Record<string, number>) {
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

    const poble = smartTitleCase(bolo.nom_poble);
    const clientNom = smartTitleCase(client.nom);
    const concepte = smartTitleCase(bolo.concepte || '');

    if (tipus === 'factura') {
        const plantilla = formatPlantilla(instrumentsCount);
        return `Actuació musical de la xaranga Buidant la Bota a ${poble} organitzat per ${clientNom}.
\nL'actuació va esdevenir el ${diaSetmana} dia ${dia} de ${mes}, de les ${horaInici} a les ${horaFi}h.
\nLa plantilla va ser composta per ${plantilla}.`;
    } else {
        const nMusics = bolo.num_musics || 10;
        return `Actuació musical de la xaranga Buidant La Bota a ${poble}, a la ${concepte}, el dia ${dia} de ${mes} de ${any}, a les ${horaInici} hores.
\nL'actuació es realitzarà amb una formació de ${nMusics} músics.
\nOferim un repertori divers i que s'adapta a les característiques de l'actuació, des de pasdobles, cançons actuals, "hits" històrics o inclús músiques populars de la festa on anem.
\nEn cas que l'actuació es programés en un horari que impliqués la necessitat de dietes pels membres del grup, sol·licitem amablement que se'ns proporcioni. En aquest sentit agrairíem que se'ns informés tan bon punt es tingui decidida la planificació per tal d'organitzar-nos la jornada com a grup.
\nEl pagament es pot realitzar en efectiu, el mateix dia de l’actuació, o per transferència bancària.`;
    }
}
