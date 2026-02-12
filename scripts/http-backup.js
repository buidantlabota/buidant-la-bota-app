const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function runBackup() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usarem la service role per tenir accés total

    if (!supabaseUrl || !supabaseKey) {
        console.error('Falten les claus de Supabase (URL o Service Role Key)');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const date = new Date().toISOString().split('T')[0];
    const backupDir = path.join(process.cwd(), `backup_${date}`);
    const zipFileName = `backup_buidantlabota_${date}.zip`;

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    // Llista de taules a backupejar
    const tables = [
        'bolos', 'clients', 'solicituds', 'documents', 'musics',
        'bolos_musics', 'tasques', 'notes', 'inventory_catalog',
        'inventory_stock', 'inventory_items', 'material_loans'
    ];

    console.log('Iniciant descàrrega de dades via HTTP...');

    try {
        for (const table of tables) {
            console.log(`Baixant taula: ${table}...`);
            const { data, error } = await supabase.from(table).select('*');

            if (error) {
                console.warn(`Error baixant ${table}: ${error.message}`);
                continue;
            }

            fs.writeFileSync(
                path.join(backupDir, `${table}.json`),
                JSON.stringify(data, null, 2)
            );
        }

        // Crear el ZIP
        console.log('Creant fitxer ZIP...');
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`Backup completat: ${zipFileName} (${archive.pointer()} bytes)`);
            process.exit(0);
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);
        archive.directory(backupDir, false);
        await archive.finalize();

    } catch (err) {
        console.error('Error crític durant el backup HTTP:', err);
        process.exit(1);
    }
}

runBackup();
