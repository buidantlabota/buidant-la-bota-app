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
        .replace(/['’'"`.,;:-]/g, "") // Elimina puntuacio especifica per mantenir l'exemple lhospitalet
        .replace(/[^\w\s]/g, "") // Elimina qualsevol altre caracter especial no-paraula (com puntuació restant)
        .replace(/\s+/g, " ") // Col·lapsa múltiples espais en un de sol
        .trim();
}
