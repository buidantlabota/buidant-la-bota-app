DO $$
DECLARE
    v_bolo_id bigint;
    v_music_id uuid;
    v_musics_list text[];
    v_music_name text;
    v_nom_bolo text;
    v_data_bolo date;
BEGIN
    -- 1) REIS OLÓ — 06/01/2025
    v_nom_bolo := 'REIS OLÓ';
    v_data_bolo := '2025-01-06';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Josep', 'Miquel V', 'Laia', 'Gerard', 'Adrià Balcells', 'Victor Vallejo', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 2) LLUMS MOIÀ — 06/12/2024
    v_nom_bolo := 'LLUMS MOIÀ';
    v_data_bolo := '2024-12-06';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Pol', 'Miquel E', 'Josep', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 3) CRIDA VIC — 29/06/2024
    v_nom_bolo := 'CRIDA VIC';
    v_data_bolo := '2024-06-29';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Berta', 'Gerard', 'Adrià Balcells', 'Conde', 'Cassia'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 4) CARNAVAL SALLENT — 01/03/2025
    v_nom_bolo := 'CARNAVAL SALLENT';
    v_data_bolo := '2025-03-01';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Adrià Balcells', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 5) CARNAVAL VILANOVA — 02/03/2025
    v_nom_bolo := 'CARNAVAL VILANOVA';
    v_data_bolo := '2025-03-02';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Laia', 'Gerard', 'Adrià Balcells', 'Ot Carrera', 'Manu Vallejo', 'Laura Gil', 'Julian'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 6) CARNAVAL INF AVINYÓ — 07/03/2025
    v_nom_bolo := 'CARNAVAL INF AVINYÓ';
    v_data_bolo := '2025-03-07';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Adrià Balcells'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 7) CARNAVAL AVINYÓ DIVENDRES NIT — 07/03/2025
    v_nom_bolo := 'CARNAVAL AVINYÓ DIVENDRES NIT';
    v_data_bolo := '2025-03-07';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Adrià Balcells', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 8) RUA CARNAVAL AVINYÓ DISSABTE TARDA — 08/03/2025
    v_nom_bolo := 'RUA CARNAVAL AVINYÓ DISSABTE TARDA';
    v_data_bolo := '2025-03-08';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 9) CARNAVAL ARTÉS — 15/03/2025
    v_nom_bolo := 'CARNAVAL ARTÉS';
    v_data_bolo := '2025-03-15';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 10) DESKALÇA’T SALLENT — 29/03/2025
    v_nom_bolo := 'DESKALÇA’T SALLENT';
    v_data_bolo := '2025-03-29';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 11) GEGANTS TONA — 26/04/2025
    v_nom_bolo := 'GEGANTS TONA';
    v_data_bolo := '2025-04-26';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 12) FIRA ARTES — 27/04/2025
    v_nom_bolo := 'FIRA ARTES';
    v_data_bolo := '2025-04-27';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 13) DR. FERRER — 23/05/2025
    v_nom_bolo := 'DR. FERRER';
    v_data_bolo := '2025-05-23';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Victor Vallejo', 'Cassia'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 14) VIC RIERA — 24/05/2025
    v_nom_bolo := 'VIC RIERA';
    v_data_bolo := '2025-05-24';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 15) EMMA ARTÉS — 30/05/2025
    v_nom_bolo := 'EMMA ARTÉS';
    v_data_bolo := '2025-05-30';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 16) BOTIGUERS PRATS — 31/05/2025
    v_nom_bolo := 'BOTIGUERS PRATS';
    v_data_bolo := '2025-05-31';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Miquel V', 'Berta', 'Gerard', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 17) BOTIGUERS MANRESA — 01/06/2025
    v_nom_bolo := 'BOTIGUERS MANRESA';
    v_data_bolo := '2025-06-01';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 18) BOTIGUERS SANT FRUITÓS — 07/06/2025
    v_nom_bolo := 'BOTIGUERS SANT FRUITÓS';
    v_data_bolo := '2025-06-07';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 19) CALDES DE MALAVELLA — 07/06/2025
    v_nom_bolo := 'CALDES DE MALAVELLA';
    v_data_bolo := '2025-06-07';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 20) ST. JOAN VILATORRADA FM INF — 13/06/2025
    v_nom_bolo := 'ST. JOAN VILATORRADA FM INF';
    v_data_bolo := '2025-06-13';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 21) ESCOLA MOIÀ — 14/06/2025
    v_nom_bolo := 'ESCOLA MOIÀ';
    v_data_bolo := '2025-06-14';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Victor Vallejo'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 22) ENRAMADES SALLENT — 20/06/2025
    v_nom_bolo := 'ENRAMADES SALLENT';
    v_data_bolo := '2025-06-20';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 23) FM OLESA — 22/06/2025
    v_nom_bolo := 'FM OLESA';
    v_data_bolo := '2025-06-22';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 24) LA CRIDA VIC — 28/06/2025
    v_nom_bolo := 'LA CRIDA VIC';
    v_data_bolo := '2025-06-28';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 25) FM CALLÚS — 28/06/2025
    v_nom_bolo := 'FM CALLÚS';
    v_data_bolo := '2025-06-28';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Josep', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 26) PONT DE VILOMARA — 19/07/2025
    v_nom_bolo := 'PONT DE VILOMARA';
    v_data_bolo := '2025-07-19';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 27) FM BLANES — 26/07/2025
    v_nom_bolo := 'FM BLANES';
    v_data_bolo := '2025-07-26';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 28) GEGANTS ST. JULIÀ VILATORTA — 27/07/2025
    v_nom_bolo := 'GEGANTS ST. JULIÀ VILATORTA';
    v_data_bolo := '2025-07-27';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Cassia'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 29) BIRRATINES TONA — 04/08/2025
    v_nom_bolo := 'BIRRATINES TONA';
    v_data_bolo := '2025-08-04';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Pau Sanchez'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 30) SOPAR JOVE — 12/08/2025
    v_nom_bolo := 'SOPAR JOVE';
    v_data_bolo := '2025-08-12';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 31) FM TORTELLÀ — 16/08/2025
    v_nom_bolo := 'FM TORTELLÀ';
    v_data_bolo := '2025-08-16';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 32) FM OLÓ — 22/08/2025
    v_nom_bolo := 'FM OLÓ';
    v_data_bolo := '2025-08-22';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Josep', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 33) FM ALTERNATIVA MANRESA — 23/08/2025
    v_nom_bolo := 'FM ALTERNATIVA MANRESA';
    v_data_bolo := '2025-08-23';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 34) PALAU D’ANGELSOLA — 29/08/2025
    v_nom_bolo := 'PALAU D’ANGELSOLA';
    v_data_bolo := '2025-08-29';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Arnau Morell'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 35) FM ARTÉS — 05/09/2025
    v_nom_bolo := 'FM ARTÉS';
    v_data_bolo := '2025-09-05';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 36) FM SANT FELIU SASSERRA — 13/09/2025
    v_nom_bolo := 'FM SANT FELIU SASSERRA';
    v_data_bolo := '2025-09-13';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 37) FM MARGANELL — 14/09/2025
    v_nom_bolo := 'FM MARGANELL';
    v_data_bolo := '2025-09-14';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Gerard', 'Enric Alcañiz'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 38) ESBOJARRADA CALELLA — 19/09/2025
    v_nom_bolo := 'ESBOJARRADA CALELLA';
    v_data_bolo := '2025-09-19';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Ot Carrera', 'Enric Alcañiz', 'Elies'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 39) BOTIGUERS MANRESA 2 — 18/10/2025
    v_nom_bolo := 'BOTIGUERS MANRESA 2';
    v_data_bolo := '2025-10-18';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 40) BOTIGUERS SANT FRUITÓS 2 — 25/10/2025
    v_nom_bolo := 'BOTIGUERS SANT FRUITÓS 2';
    v_data_bolo := '2025-10-25';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Elies'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 41) SANTPEDOR — 31/10/2025
    v_nom_bolo := 'SANTPEDOR';
    v_data_bolo := '2025-10-31';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Pau Roca'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 42) TONA — 29/11/2025
    v_nom_bolo := 'TONA';
    v_data_bolo := '2025-11-29';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Miquel V', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 43) LLUMS MOIÀ 2 — 06/12/2025
    v_nom_bolo := 'LLUMS MOIÀ 2';
    v_data_bolo := '2025-12-06';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Miquel E', 'Jan', 'Miquel V', 'Berta', 'Laia', 'Gerard', 'Enric Alcañiz'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 44) HOME DELS NASSOS BLANES — 31/12/2025
    v_nom_bolo := 'HOME DELS NASSOS BLANES';
    v_data_bolo := '2025-12-31';
    v_musics_list := ARRAY['Jofre', 'Marc', 'Genís', 'Joan', 'Pol', 'Lleïr', 'Miquel E', 'Berta', 'Laia', 'Gerard'];
    
    SELECT id INTO v_bolo_id FROM bolos WHERE nom_poble = v_nom_bolo AND data_bolo = v_data_bolo LIMIT 1;
    IF v_bolo_id IS NOT NULL THEN
        FOREACH v_music_name IN ARRAY v_musics_list LOOP
            SELECT id INTO v_music_id FROM musics WHERE nom ILIKE v_music_name || '%' LIMIT 1;
            IF v_music_id IS NOT NULL THEN
                INSERT INTO bolo_musics (bolo_id, music_id, estat, tipus) VALUES (v_bolo_id, v_music_id, 'confirmat', 'titular') ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

END $$;
