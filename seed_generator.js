const fs = require('fs');

const rawBolos = `1) REIS OLÓ — 06/01/2025

Jofre, Marc, Genís, Joan, Pol, Josep, Miquel V, Laia, Gerard, Adrià Balcells, Victor Vallejo, Pau Sanchez

2) LLUMS MOIÀ — 06/12/2024

Jofre, Marc, Genís, Pol, Miquel E, Josep, Miquel V, Berta, Laia, Gerard, Ot Carrera, Pau Sanchez

3) CRIDA VIC — 29/06/2024

Jofre, Marc, Joan, Pol, Miquel E, Josep, Berta, Gerard, Adrià Balcells, Conde, Cassia

4) CARNAVAL SALLENT — 01/03/2025

Jofre, Marc, Joan, Pol, Lleïr, Josep, Jan, Miquel V, Berta, Laia, Gerard, Adrià Balcells, Ot Carrera

5) CARNAVAL VILANOVA — 02/03/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Josep, Jan, Miquel V, Laia, Gerard, Adrià Balcells, Ot Carrera, Manu Vallejo, Laura Gil, Julian

6) CARNAVAL INF AVINYÓ — 07/03/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard, Adrià Balcells

7) CARNAVAL AVINYÓ DIVENDRES NIT — 07/03/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard, Adrià Balcells, Pau Sanchez

8) RUA CARNAVAL AVINYÓ DISSABTE TARDA — 08/03/2025

Jofre, Marc, Genís, Joan, Pol, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera, Pau Sanchez

9) CARNAVAL ARTÉS — 15/03/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard, Cassia, Pau Sanchez

10) DESKALÇA’T SALLENT — 29/03/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Josep, Miquel V, Berta, Laia, Gerard, Ot Carrera

11) GEGANTS TONA — 26/04/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard

12) FIRA ARTES — 27/04/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Josep, Jan, Miquel V, Laia, Gerard

13) DR. FERRER — 23/05/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera, Victor Vallejo, Cassia

14) VIC RIERA — 24/05/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Josep, Jan, Miquel V, Berta, Laia, Gerard

15) EMMA ARTÉS — 30/05/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Cassia

16) BOTIGUERS PRATS — 31/05/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Miquel V, Berta, Gerard, Ot Carrera

17) BOTIGUERS MANRESA — 01/06/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Jan, Miquel V, Berta, Laia, Gerard

18) BOTIGUERS SANT FRUITÓS — 07/06/2025

Jofre, Marc, Joan, Pol, Lleïr, Miquel E, Jan, Miquel V, Berta, Laia, Gerard

19) CALDES DE MALAVELLA — 07/06/2025

Jofre, Marc, Joan, Pol, Lleïr, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera

20) ST. JOAN VILATORRADA FM INF — 13/06/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Miquel V, Berta, Laia, Gerard, Ot Carrera, Pau Sanchez

21) ESCOLA MOIÀ — 14/06/2025

Jofre, Marc, Joan, Pol, Lleïr, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Victor Vallejo

22) ENRAMADES SALLENT — 20/06/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Cassia

23) FM OLESA — 22/06/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Josep, Jan, Miquel V, Berta, Laia, Gerard

24) LA CRIDA VIC — 28/06/2025

Jofre, Marc, Joan, Pol, Lleïr, Miquel E, Miquel V, Berta, Laia, Gerard

25) FM CALLÚS — 28/06/2025

Jofre, Marc, Joan, Pol, Lleïr, Josep, Berta, Laia, Gerard

26) PONT DE VILOMARA — 19/07/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera

27) FM BLANES — 26/07/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard, Pau Sanchez

28) GEGANTS ST. JULIÀ VILATORTA — 27/07/2025

Jofre, Marc, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Cassia

29) BIRRATINES TONA — 04/08/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard, Pau Sanchez

30) SOPAR JOVE — 12/08/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera

31) FM TORTELLÀ — 16/08/2025

Jofre, Marc, Berta, Laia, Gerard

32) FM OLÓ — 22/08/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Josep, Jan, Miquel V, Berta, Laia, Gerard

33) FM ALTERNATIVA MANRESA — 23/08/2025

Jofre, Marc, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera

34) PALAU D’ANGELSOLA — 29/08/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Arnau Morell

35) FM ARTÉS — 05/09/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Enric Alcañiz

36) FM SANT FELIU SASSERRA — 13/09/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Enric Alcañiz

37) FM MARGANELL — 14/09/2025

Jofre, Marc, Joan, Pol, Lleïr, Miquel E, Jan, Miquel V, Berta, Gerard, Enric Alcañiz

38) ESBOJARRADA CALELLA — 19/09/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Ot Carrera, Enric Alcañiz, Elies

39) BOTIGUERS MANRESA 2 — 18/10/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Enric Alcañiz

40) BOTIGUERS SANT FRUITÓS 2 — 25/10/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Elies

41) SANTPEDOR — 31/10/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Miquel V, Berta, Laia, Gerard, Pau Roca

42) TONA — 29/11/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Miquel V, Berta, Laia, Gerard

43) LLUMS MOIÀ 2 — 06/12/2025

Jofre, Marc, Genís, Joan, Pol, Miquel E, Jan, Miquel V, Berta, Laia, Gerard, Enric Alcañiz

44) HOME DELS NASSOS BLANES — 31/12/2025

Jofre, Marc, Genís, Joan, Pol, Lleïr, Miquel E, Berta, Laia, Gerard`;

const rawPreus = `70,00 €	60,00 €	70,00 €	70,00 €	70,00 €	45,00 €	60,00 €	70,00 €	60,00 €	60,00 €	60,00 €	0,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	60,00 €	80,00 €	60,00 €	70,00 €	70,00 €	70,00 €	90,00 €	60,00 €	80,00 €	60,00 €	70,00 €	80,00 €	0,00 €	60,00 €	60,00 €	70,00 €	60,00 €	70,00 €	60,00 €	90,00 €	70,00 €	80,00 €`;

const rawImports = `900,00 €	1.000,00 €	1.000,00 €	950,00 €	1.000,00 €	450,00 €	800,00 €	850,00 €	900,00 €	800,00 €	900,00 €	0,00 €	700,00 €	800,00 €	600,00 €	850,00 €	800,00 €	800,00 €	500,00 €	900,00 €	800,00 €	900,00 €	800,00 €	1.000,00 €	900,00 €	1.000,00 €	900,00 €	950,00 €	1.200,00 €	700,00 €	1.100,00 €	900,00 €	900,00 €	1.100,00 €	0,00 €	800,00 €	900,00 €	1.200,00 €	800,00 €	1.000,00 €	800,00 €	1.100,00 €	1.000,00 €	1.200,00 €`;


function parseCurrency(str) {
    if (!str) return 0;
    // Remove € and spaces, replace dots (thousand sep) with nothing, replace comma with dot
    // 1.000,00 -> 1000.00
    // 70,00 -> 70.00
    let clean = str.replace('€', '').trim();
    clean = clean.replace(/\./g, ''); // remove thousands separator
    clean = clean.replace(',', '.'); // decimal separator
    return parseFloat(clean);
}

const preus = rawPreus.split('\t').map(parseCurrency);
const imports = rawImports.split('\t').map(parseCurrency);

// Split bolos by looking for "N) " pattern
const boloChunks = rawBolos.split(/\n\n(?=\d+\))/);

if (boloChunks.length !== 44 || preus.length !== 44 || imports.length !== 44) {
    console.error(`Mismatch in counts: Bolos=${boloChunks.length}, Preus=${preus.length}, Imports=${imports.length}`);
    process.exit(1);
}

let sql = `
-- Drop old constraint to allow new statuses (sol·licitat, tancat, etc.)
ALTER TABLE bolos DROP CONSTRAINT IF EXISTS bolos_estat_check;

DO $$
DECLARE
    v_bolo_id bigint;
    v_music_id uuid;
    v_musics_list text[];
    v_music_name text;
    v_nom_bolo text;
    v_data_bolo date;
    v_preu numeric;
    v_import numeric;
BEGIN
    -- Temporary function to find music ID fuzzy
    -- We assume standard names.
`;

boloChunks.forEach((chunk, index) => {
    // Parse "1) NAME — DATE"
    // Then next line "Names..."
    const lines = chunk.trim().split('\n').filter(l => l.trim() !== '');
    const header = lines[0];
    const musicsStr = lines[1];

    // Header format: "1) REIS OLÓ — 06/01/2025"
    // Regex: \d+\)\s+(.+)\s+—\s+(\d{2}\/\d{2}\/\d{4})
    const match = header.match(/^\d+\)\s+(.+?)\s+[—-]\s+(\d{2}\/\d{2}\/\d{4})/);

    if (!match) {
        console.error(`Failed to parse header: ${header}`);
        return;
    }

    const name = match[1].trim();
    const dateStr = match[2]; // DD/MM/YYYY
    // Convert to YYYY-MM-DD
    const [d, m, y] = dateStr.split('/');
    const isoDate = `${y}-${m}-${d}`;

    const price = preus[index];
    const imp = imports[index];
    const musicians = musicsStr.split(',').map(s => s.trim());

    // Use replaceAll to safely escape single quotes for SQL
    const safeName = name.split("'").join("''");

    // Musicians array string construction
    // We Map each musician to a quoted, escaped string
    const musicsArrayContent = musicians.map(m => {
        const safeM = m.split("'").join("''");
        return `'${safeM}'`;
    }).join(', ');

    sql += `
    ----------------------------------------------------------------
    -- BOLO ${index + 1}: ${name} (${isoDate})
    ----------------------------------------------------------------
    v_nom_bolo := '${safeName}';
    v_data_bolo := '${isoDate}';
    v_preu := ${price};
    v_import := ${imp};
    
    -- Insert Bolo
    INSERT INTO bolos (
        nom_poble, 
        data_bolo, 
        estat, 
        import_total, 
        preu_per_musica, 
        estat_cobrament, 
        estat_assistencia, 
        tipus_ingres
    ) VALUES (
        v_nom_bolo, 
        v_data_bolo, 
        'tancat', -- As requested
        v_import, 
        v_preu, 
        'pendent', 
        'complet', -- Assuming all attended
        'FACTURA' -- Defaulting
    ) RETURNING id INTO v_bolo_id;

    -- Insert Musicians
    v_musics_list := ARRAY[${musicsArrayContent}];
    
    FOREACH v_music_name IN ARRAY v_musics_list
    LOOP
        -- Look up music ID
        SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
        
        IF v_music_id IS NOT NULL THEN
            -- Check if already exists (idempotency safety)
            IF NOT EXISTS (SELECT 1 FROM bolo_musics WHERE bolo_id = v_bolo_id AND music_id = v_music_id) THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, import_assignat, tipus)
                VALUES (v_bolo_id, v_music_id, 'confirmat', v_preu, 'titular');
            END IF;
        ELSE
            RAISE NOTICE 'Music not found: %', v_music_name;
        END IF;
    END LOOP;
    `;
});

sql += `
END $$;
`;

fs.writeFileSync('supabase/migrations/20241212_seed_bolos_2025.sql', sql);
console.log('SQL generated successfully.');
