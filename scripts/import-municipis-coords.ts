import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase URL or Service Role Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizePlace(text: string): string {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['’'"`.,;:-]/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function run() {
    console.log('🚀 Iniciant importació de coordenades...');

    const filename = 'LINCAT_divisions-administratives-v2r1-caps-municipi-20250730.xlsx';
    const filePath = path.join(process.cwd(), filename);

    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Coordenades dels caps de munici';
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        console.error(`❌ No s'ha trobat la fulla '${sheetName}'`);
        process.exit(1);
    }

    const excelData = xlsx.utils.sheet_to_json(worksheet) as any[];
    console.log(`📊 S'han llegit ${excelData.length} files de l'Excel.`);

    // Fetch all municipis from Supabase to match locally and avoid N+1
    const { data: dbMunicipis, error: dbError } = await supabase
        .from('municipis')
        .select('id, nom, nom_normalitzat');

    if (dbError) {
        console.error('❌ Error llegint municipis de la DB:', dbError);
        process.exit(1);
    }

    console.log(`📡 S'han obtingut ${dbMunicipis.length} municipis de la base de dades.`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound = [];

    // Map DB municipis for easy lookup
    const dbMap = new Map();
    dbMunicipis.forEach(m => {
        dbMap.set(m.nom_normalitzat, m);
    });

    for (const row of excelData) {
        const nom = row['Municipi'];
        const lat = row['Latitud'];
        const lng = row['Longitud'];

        if (!nom || lat === undefined || lng === undefined) continue;

        const normalized = normalizePlace(nom);
        const match = dbMap.get(normalized);

        if (match) {
            const { error: updateError } = await supabase
                .from('municipis')
                .update({ lat, lng })
                .eq('id', match.id);

            if (updateError) {
                console.error(`❌ Error actualitzant ${nom}:`, updateError.message);
            } else {
                updatedCount++;
            }
        } else {
            notFoundCount++;
            notFound.push(nom);
        }
    }

    console.log('\n--- 📝 REPORT FINAL ---');
    console.log(`✅ Total actualitzats: ${updatedCount}`);
    console.log(`❌ Municipis no trobats: ${notFoundCount}`);

    if (notFound.length > 0) {
        console.log('Municipis no trobats:', notFound.slice(0, 20).join(', ') + (notFound.length > 20 ? '...' : ''));
    }

    console.log('------------------------\n');
}

run().catch(console.error);
