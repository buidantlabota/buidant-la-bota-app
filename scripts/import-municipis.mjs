import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to normalize text (remove accents, lowercase, trim)
function normalize(text) {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

async function importMunicipis() {
    try {
        console.log('📂 Reading MUNICIPIS.csv...');

        // Read CSV file (it's in the root directory, not in scripts)
        const csvPath = path.join(__dirname, '..', 'MUNICIPIS.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV (skip header)
        const lines = csvContent.split('\n').slice(1);
        const municipis = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = line.split(';');
            if (parts.length >= 3) {
                const nom = parts[0].trim();
                municipis.push({
                    nom: nom,
                    nom_normalitzat: normalize(nom),
                    comarca: parts[1].trim(),
                    provincia: parts[2].trim(),
                    pais: 'ES',
                    region: 'Catalunya'
                });
            }
        }

        console.log(`📊 Found ${municipis.length} municipis in CSV`);

        // Delete existing municipis
        console.log('🗑️  Deleting existing municipis...');
        const { error: deleteError } = await supabase
            .from('municipis')
            .delete()
            .neq('id', 0); // Delete all

        if (deleteError) {
            console.error('❌ Error deleting existing municipis:', deleteError);
            throw deleteError;
        }

        console.log('✅ Existing municipis deleted');

        // Insert new municipis in batches of 100
        console.log('📥 Inserting new municipis...');
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < municipis.length; i += batchSize) {
            const batch = municipis.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('municipis')
                .insert(batch);

            if (insertError) {
                console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError);
                throw insertError;
            }

            inserted += batch.length;
            console.log(`  ✓ Inserted ${inserted}/${municipis.length} municipis`);
        }

        console.log('✅ All municipis imported successfully!');
        console.log(`📊 Total: ${inserted} municipis`);

    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

importMunicipis();
