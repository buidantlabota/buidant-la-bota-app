-- Seed script to update musicians
-- This script safely updates existing musicians by name or inserts new ones.
-- It ensures instruments, t-shirt sizes, and types (titular/substitut) are set correctly.

DO $$
DECLARE
    v_rows_updated integer := 0;
    v_rows_inserted integer := 0;
BEGIN

    -- Helper temporary table to hold source data
    CREATE TEMP TABLE IF NOT EXISTS source_musicians (
        nom text,
        instruments text,
        talla_samarreta text,
        tipus text
    );

    DELETE FROM source_musicians;

    -- TITULARS
    INSERT INTO source_musicians (nom, instruments, talla_samarreta, tipus) VALUES
    ('Jofre', 'Percussió', 'L', 'titular'),
    ('Marc', 'Percussió', 'L', 'titular'),
    ('Genís', 'Percussió', 'L', 'titular'),
    ('Joan', 'Trompeta', 'L', 'titular'),
    ('Pol', 'Trompeta', 'L', 'titular'),
    ('Lleïr', 'Trompeta', 'L', 'titular'),
    ('Miquel E', 'Trombó', 'L', 'titular'),
    ('Josep', 'Trombó', 'L', 'titular'),
    ('Jan', 'Trombó', 'L', 'titular'),
    ('Enric Alcañiz', 'Trombó', 'L', 'titular'),
    ('Miquel V', 'Tuba', 'XL', 'titular'),
    ('Berta', 'Saxo Alt', 'L', 'titular'),
    ('Laia', 'Saxo Alt', 'L', 'titular'),
    ('Gerard', 'Saxo Tenor', 'M', 'titular'),

    -- SUBSTITUTS
    ('Adrià Balcells', 'Saxo', 'L', 'substitut'),
    ('Ot Carrera', 'Trompeta', 'L', 'substitut'),
    ('Victor Vallejo', 'Saxo', 'L', 'substitut'),
    ('Conde', 'Trompeta', 'L', 'substitut'),
    ('Cassia', 'Tuba', 'L', 'substitut'),
    ('Pau Sanchez', 'Trompeta', 'L', 'substitut'),
    ('Montra', 'Saxo', 'L', 'substitut'),
    ('Manu Vallejo', 'Saxo', 'L', 'substitut'),
    ('Guillem Estany', 'Saxo', 'L', 'substitut'),
    ('Elena Rescalvo', 'Trombó', 'L', 'substitut'),
    ('Arnau Morell', 'Trompeta', 'L', 'substitut'),
    ('Arnau Roca', 'Trombó', 'L', 'substitut'),
    ('Pol Salvador', 'Saxo', 'L', 'substitut'),
    ('Pau Roca', 'Trompeta', 'L', 'substitut'),
    ('Laura Gil', 'Trompeta', 'L', 'substitut'),
    ('Oscar Montoya', 'Saxo', 'L', 'substitut'),
    ('Juanra', 'Tuba', 'L', 'substitut'),
    ('Pere Montserrat (Petro)', 'Trombó', 'L', 'substitut'),
    ('Julian', 'Trombó', 'L', 'substitut'),
    ('Elies', 'Saxo', 'L', 'substitut'),
    ('Joan Fons', 'Trompeta', 'L', 'substitut'),
    ('Agustí', 'Trompeta', 'L', 'substitut');


    -- Perform Upsert (using simple loop for clarity/compatibility if unique constraint is missing on nom)
    -- We assume 'nom' is the distinct identifier for this purpose. 
    -- Ideally, we'd add constraints, but we respect the existing schema state.

    MERGE INTO musics m
    USING source_musicians s
    ON (m.nom = s.nom)
    WHEN MATCHED THEN
        UPDATE SET 
            instruments = s.instruments,
            talla_samarreta = s.talla_samarreta,
            tipus = s.tipus
    WHEN NOT MATCHED THEN
        INSERT (nom, instruments, talla_samarreta, tipus)
        VALUES (s.nom, s.instruments, s.talla_samarreta, s.tipus);

    -- Clean up
    DROP TABLE source_musicians;

END $$;
