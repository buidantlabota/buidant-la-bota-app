-- Migration: Seed Booklets and Update Musician Sizes

BEGIN;

-- 1. Update all Substitutes to Size L
UPDATE musics 
SET talla_samarreta = 'L' 
WHERE tipus = 'substitut';

-- 2. Register Booklets
DO $$
DECLARE
    v_cat_id uuid;
BEGIN
    -- Helper logic for each booklet type:
    -- We select the ID if exists, or insert and get ID.
    -- Note: inventory_catalog does not have a unique constraint on name by default, so we check existence.

    -- Trompeta 1 (2 units)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Trompeta 1' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Trompeta 1', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    -- Insert Items
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tpt1-01', 'disponible');
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tpt1-02', 'disponible');


    -- Trompeta 2 (1 unit)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Trompeta 2' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Trompeta 2', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tpt2-01', 'disponible');


    -- Trombó 1 (2 units)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Trombó 1' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Trombó 1', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tbn1-01', 'disponible');
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tbn1-02', 'disponible');


    -- Trombó 2 (1 unit)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Trombó 2' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Trombó 2', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tbn2-01', 'disponible');


    -- Tuba (1 unit)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Tuba' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Tuba', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'Tuba-01', 'disponible');


    -- Saxo Alto (1 unit)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Saxo Alto' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Saxo Alto', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'SaxAlto-01', 'disponible');


    -- Saxo Tenor (1 unit)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Llibret Saxo Tenor' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Saxo Tenor', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'SaxTen-01', 'disponible');


    -- Partitures Sueltes Saxo (1 unit)
    SELECT id INTO v_cat_id FROM inventory_catalog WHERE name = 'Partitures Sueltes Saxo' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO inventory_catalog (name, type) VALUES ('Partitures Sueltes Saxo', 'llibret') RETURNING id INTO v_cat_id;
    END IF;
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_id, 'PartSax-01', 'disponible');

END;
$$;

COMMIT;
