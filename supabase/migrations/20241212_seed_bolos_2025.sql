
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

    ----------------------------------------------------------------
    -- BOLO 1: REIS OLÓ (2025-01-06)
    ----------------------------------------------------------------
    v_nom_bolo := 'REIS OLÓ';
    v_data_bolo := '2025-01-06';
    v_preu := 70;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Josep', 'Miquel V', 'Laia', 'Gerard', 'Adrià Balcells', 'Victor Vallejo', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 2: LLUMS MOIÀ (2024-12-06)
    ----------------------------------------------------------------
    v_nom_bolo := 'LLUMS MOIÀ';
    v_data_bolo := '2024-12-06';
    v_preu := 60;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Pol', 'Miquel E', 'Josep', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 3: CRIDA VIC (2024-06-29)
    ----------------------------------------------------------------
    v_nom_bolo := 'CRIDA VIC';
    v_data_bolo := '2024-06-29';
    v_preu := 70;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Berta', 'Gerard', 'Adrià Balcells', 'Conde', 'Cassia'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 4: CARNAVAL SALLENT (2025-03-01)
    ----------------------------------------------------------------
    v_nom_bolo := 'CARNAVAL SALLENT';
    v_data_bolo := '2025-03-01';
    v_preu := 70;
    v_import := 950;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Adrià Balcells', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 5: CARNAVAL VILANOVA (2025-03-02)
    ----------------------------------------------------------------
    v_nom_bolo := 'CARNAVAL VILANOVA';
    v_data_bolo := '2025-03-02';
    v_preu := 70;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Laia', 'Gerard', 'Adrià Balcells', 'Ot Carrera', 'Manu Vallejo', 'Laura Gil', 'Julian'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 6: CARNAVAL INF AVINYÓ (2025-03-07)
    ----------------------------------------------------------------
    v_nom_bolo := 'CARNAVAL INF AVINYÓ';
    v_data_bolo := '2025-03-07';
    v_preu := 45;
    v_import := 450;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Adrià Balcells'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 7: CARNAVAL AVINYÓ DIVENDRES NIT (2025-03-07)
    ----------------------------------------------------------------
    v_nom_bolo := 'CARNAVAL AVINYÓ DIVENDRES NIT';
    v_data_bolo := '2025-03-07';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Adrià Balcells', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 8: RUA CARNAVAL AVINYÓ DISSABTE TARDA (2025-03-08)
    ----------------------------------------------------------------
    v_nom_bolo := 'RUA CARNAVAL AVINYÓ DISSABTE TARDA';
    v_data_bolo := '2025-03-08';
    v_preu := 70;
    v_import := 850;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 9: CARNAVAL ARTÉS (2025-03-15)
    ----------------------------------------------------------------
    v_nom_bolo := 'CARNAVAL ARTÉS';
    v_data_bolo := '2025-03-15';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 10: DESKALÇA’T SALLENT (2025-03-29)
    ----------------------------------------------------------------
    v_nom_bolo := 'DESKALÇA’T SALLENT';
    v_data_bolo := '2025-03-29';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 11: GEGANTS TONA (2025-04-26)
    ----------------------------------------------------------------
    v_nom_bolo := 'GEGANTS TONA';
    v_data_bolo := '2025-04-26';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 12: FIRA ARTES (2025-04-27)
    ----------------------------------------------------------------
    v_nom_bolo := 'FIRA ARTES';
    v_data_bolo := '2025-04-27';
    v_preu := 0;
    v_import := 0;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 13: DR. FERRER (2025-05-23)
    ----------------------------------------------------------------
    v_nom_bolo := 'DR. FERRER';
    v_data_bolo := '2025-05-23';
    v_preu := 60;
    v_import := 700;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Victor Vallejo', 'Cassia'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 14: VIC RIERA (2025-05-24)
    ----------------------------------------------------------------
    v_nom_bolo := 'VIC RIERA';
    v_data_bolo := '2025-05-24';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 15: EMMA ARTÉS (2025-05-30)
    ----------------------------------------------------------------
    v_nom_bolo := 'EMMA ARTÉS';
    v_data_bolo := '2025-05-30';
    v_preu := 60;
    v_import := 600;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 16: BOTIGUERS PRATS (2025-05-31)
    ----------------------------------------------------------------
    v_nom_bolo := 'BOTIGUERS PRATS';
    v_data_bolo := '2025-05-31';
    v_preu := 60;
    v_import := 850;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Miquel V', 'Berta', 'Gerard', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 17: BOTIGUERS MANRESA (2025-06-01)
    ----------------------------------------------------------------
    v_nom_bolo := 'BOTIGUERS MANRESA';
    v_data_bolo := '2025-06-01';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 18: BOTIGUERS SANT FRUITÓS (2025-06-07)
    ----------------------------------------------------------------
    v_nom_bolo := 'BOTIGUERS SANT FRUITÓS';
    v_data_bolo := '2025-06-07';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 19: CALDES DE MALAVELLA (2025-06-07)
    ----------------------------------------------------------------
    v_nom_bolo := 'CALDES DE MALAVELLA';
    v_data_bolo := '2025-06-07';
    v_preu := 60;
    v_import := 500;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 20: ST. JOAN VILATORRADA FM INF (2025-06-13)
    ----------------------------------------------------------------
    v_nom_bolo := 'ST. JOAN VILATORRADA FM INF';
    v_data_bolo := '2025-06-13';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 21: ESCOLA MOIÀ (2025-06-14)
    ----------------------------------------------------------------
    v_nom_bolo := 'ESCOLA MOIÀ';
    v_data_bolo := '2025-06-14';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Victor Vallejo'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 22: ENRAMADES SALLENT (2025-06-20)
    ----------------------------------------------------------------
    v_nom_bolo := 'ENRAMADES SALLENT';
    v_data_bolo := '2025-06-20';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 23: FM OLESA (2025-06-22)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM OLESA';
    v_data_bolo := '2025-06-22';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 24: LA CRIDA VIC (2025-06-28)
    ----------------------------------------------------------------
    v_nom_bolo := 'LA CRIDA VIC';
    v_data_bolo := '2025-06-28';
    v_preu := 80;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 25: FM CALLÚS (2025-06-28)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM CALLÚS';
    v_data_bolo := '2025-06-28';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 26: PONT DE VILOMARA (2025-07-19)
    ----------------------------------------------------------------
    v_nom_bolo := 'PONT DE VILOMARA';
    v_data_bolo := '2025-07-19';
    v_preu := 70;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 27: FM BLANES (2025-07-26)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM BLANES';
    v_data_bolo := '2025-07-26';
    v_preu := 70;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 28: GEGANTS ST. JULIÀ VILATORTA (2025-07-27)
    ----------------------------------------------------------------
    v_nom_bolo := 'GEGANTS ST. JULIÀ VILATORTA';
    v_data_bolo := '2025-07-27';
    v_preu := 70;
    v_import := 950;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 29: BIRRATINES TONA (2025-08-04)
    ----------------------------------------------------------------
    v_nom_bolo := 'BIRRATINES TONA';
    v_data_bolo := '2025-08-04';
    v_preu := 90;
    v_import := 1200;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Pau Sanchez'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 30: SOPAR JOVE (2025-08-12)
    ----------------------------------------------------------------
    v_nom_bolo := 'SOPAR JOVE';
    v_data_bolo := '2025-08-12';
    v_preu := 60;
    v_import := 700;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 31: FM TORTELLÀ (2025-08-16)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM TORTELLÀ';
    v_data_bolo := '2025-08-16';
    v_preu := 80;
    v_import := 1100;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 32: FM OLÓ (2025-08-22)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM OLÓ';
    v_data_bolo := '2025-08-22';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 33: FM ALTERNATIVA MANRESA (2025-08-23)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM ALTERNATIVA MANRESA';
    v_data_bolo := '2025-08-23';
    v_preu := 70;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 34: PALAU D’ANGELSOLA (2025-08-29)
    ----------------------------------------------------------------
    v_nom_bolo := 'PALAU D’ANGELSOLA';
    v_data_bolo := '2025-08-29';
    v_preu := 80;
    v_import := 1100;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Arnau Morell'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 35: FM ARTÉS (2025-09-05)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM ARTÉS';
    v_data_bolo := '2025-09-05';
    v_preu := 0;
    v_import := 0;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 36: FM SANT FELIU SASSERRA (2025-09-13)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM SANT FELIU SASSERRA';
    v_data_bolo := '2025-09-13';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 37: FM MARGANELL (2025-09-14)
    ----------------------------------------------------------------
    v_nom_bolo := 'FM MARGANELL';
    v_data_bolo := '2025-09-14';
    v_preu := 60;
    v_import := 900;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Gerard', 'Enric Alcañiz'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 38: ESBOJARRADA CALELLA (2025-09-19)
    ----------------------------------------------------------------
    v_nom_bolo := 'ESBOJARRADA CALELLA';
    v_data_bolo := '2025-09-19';
    v_preu := 70;
    v_import := 1200;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Enric Alcañiz', 'Elies'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 39: BOTIGUERS MANRESA 2 (2025-10-18)
    ----------------------------------------------------------------
    v_nom_bolo := 'BOTIGUERS MANRESA 2';
    v_data_bolo := '2025-10-18';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 40: BOTIGUERS SANT FRUITÓS 2 (2025-10-25)
    ----------------------------------------------------------------
    v_nom_bolo := 'BOTIGUERS SANT FRUITÓS 2';
    v_data_bolo := '2025-10-25';
    v_preu := 70;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Elies'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 41: SANTPEDOR (2025-10-31)
    ----------------------------------------------------------------
    v_nom_bolo := 'SANTPEDOR';
    v_data_bolo := '2025-10-31';
    v_preu := 60;
    v_import := 800;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Pau Roca'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 42: TONA (2025-11-29)
    ----------------------------------------------------------------
    v_nom_bolo := 'TONA';
    v_data_bolo := '2025-11-29';
    v_preu := 90;
    v_import := 1100;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 43: LLUMS MOIÀ 2 (2025-12-06)
    ----------------------------------------------------------------
    v_nom_bolo := 'LLUMS MOIÀ 2';
    v_data_bolo := '2025-12-06';
    v_preu := 70;
    v_import := 1000;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
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
    
    ----------------------------------------------------------------
    -- BOLO 44: HOME DELS NASSOS BLANES (2025-12-31)
    ----------------------------------------------------------------
    v_nom_bolo := 'HOME DELS NASSOS BLANES';
    v_data_bolo := '2025-12-31';
    v_preu := 80;
    v_import := 1200;
    
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
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Berta', 'Laia', 'Gerard'];
    
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
    
END $$;
