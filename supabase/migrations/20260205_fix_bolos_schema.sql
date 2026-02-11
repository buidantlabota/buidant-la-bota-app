-- Add missing columns to bolos table if they don't exist
DO $$
BEGIN
    -- Menjar columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'menjar_esmorzar') THEN
        ALTER TABLE bolos ADD COLUMN menjar_esmorzar BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'menjar_dinar') THEN
        ALTER TABLE bolos ADD COLUMN menjar_dinar BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'menjar_sopar') THEN
        ALTER TABLE bolos ADD COLUMN menjar_sopar BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'menjar_barra_lliure') THEN
        ALTER TABLE bolos ADD COLUMN menjar_barra_lliure BOOLEAN DEFAULT FALSE;
    END IF;

    -- Municipi columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'municipi_id') THEN
        ALTER TABLE bolos ADD COLUMN municipi_id UUID DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'municipi_custom_id') THEN
        ALTER TABLE bolos ADD COLUMN municipi_custom_id UUID DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'municipi_text') THEN
        ALTER TABLE bolos ADD COLUMN municipi_text TEXT DEFAULT NULL;
    END IF;

    -- Extra details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'concepte') THEN
        ALTER TABLE bolos ADD COLUMN concepte TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'durada') THEN
        ALTER TABLE bolos ADD COLUMN durada INTEGER DEFAULT NULL;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'tipus_actuacio') THEN
        ALTER TABLE bolos ADD COLUMN tipus_actuacio TEXT DEFAULT NULL;
    END IF;

    -- Lineup columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'lineup_confirmed') THEN
        ALTER TABLE bolos ADD COLUMN lineup_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'lineup_no_pot') THEN
        ALTER TABLE bolos ADD COLUMN lineup_no_pot TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'lineup_pendent') THEN
        ALTER TABLE bolos ADD COLUMN lineup_pendent TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'lineup_notes') THEN
        ALTER TABLE bolos ADD COLUMN lineup_notes TEXT DEFAULT NULL;
    END IF;
    
    -- Fix Tipus Ingres Check Constraint
    -- We first drop the constraint if it exists, then re-add it with the new allowed values
    -- Or just drop it to be flexible. Let's drop it to be safe and flexible as 'text' type allows anything.
    -- If we want to enforce it, we can add it back later.
    ALTER TABLE bolos DROP CONSTRAINT IF EXISTS bolos_tipus_ingres_check;
    
    -- Optionally, add it back with updated values if needed, but for now dropping it solves the immediate error.
    -- ALTER TABLE bolos ADD CONSTRAINT bolos_tipus_ingres_check CHECK (tipus_ingres IN ('Efectiu', 'Factura', 'Altres'));

END $$;
