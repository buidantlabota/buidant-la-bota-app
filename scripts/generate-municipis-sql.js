const fs = require('fs');
const path = require('path');

// Read CSV
const csvPath = path.join(__dirname, '..', 'MUNICIPIS.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Normalize function
function normalize(text) {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Escape single quotes for SQL
function escapeSql(text) {
    return text.replace(/'/g, "''");
}

// Parse CSV
const lines = csvContent.split('\n').slice(1); // Skip header
const values = [];

const seen = new Set(); // Prevent duplicates within the input file

for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split(';');
    if (parts.length >= 3) {
        const nom = parts[0].trim();
        const comarca = parts[1].trim();
        const provincia = parts[2].trim();
        const normalized = normalize(nom);

        // Check for duplicates (Key: nom_normalitzat)
        // Since all are ES/Catalunya, uniqueness depends on name
        if (seen.has(normalized)) {
            // console.error(`⚠️ Skipping duplicate: "${nom}" (${normalized})`);
            continue;
        }
        seen.add(normalized);

        values.push(
            `('${escapeSql(nom)}', '${escapeSql(normalized)}', '${escapeSql(comarca)}', '${escapeSql(provincia)}', 'ES', 'Catalunya')`
        );
    }
}

// Generate SQL
const sql = `-- Upsert municipis (Insert or Update if exists)
-- This preserves existing IDs and relationships with bolos table

INSERT INTO public.municipis (nom, nom_normalitzat, comarca, provincia, pais, region) VALUES
${values.join(',\n')}
ON CONFLICT (nom_normalitzat, pais, region) 
DO UPDATE SET 
    nom = EXCLUDED.nom,
    comarca = EXCLUDED.comarca,
    provincia = EXCLUDED.provincia;
`;

console.log(sql);
