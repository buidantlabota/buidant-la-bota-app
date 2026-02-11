-- Migration: Add missing ubicacio_detallada to bolos table
-- This column was used in the code but missing from the DB

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'ubicacio_detallada') THEN
        ALTER TABLE bolos ADD COLUMN ubicacio_detallada TEXT;
    END IF;
END $$;
