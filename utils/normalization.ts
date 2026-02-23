/**
 * Normalitza un text de municipi o lloc:
 * - Minuscules
 * - Elimina accents i diacritics
 * - Elimina puntuacio redundant (mante espais)
 * - Trim i col·lapsa espais
 */
export function normalizePlace(text: string): string {
    if (!text) return "";

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Elimina accents (diacritics)
        .replace(/['’'"`.,;:-]/g, "") // Elimina puntuacio específica
        .replace(/\s+/g, "") // Elimina TOTS els espais per evitar "puig-reig" vs "puig reig"
        .replace(/[^\w]/g, "") // Elimina qualsevol altre caràcter especial restant
        .trim();
}
