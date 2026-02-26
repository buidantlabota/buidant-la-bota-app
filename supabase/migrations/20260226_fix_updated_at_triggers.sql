-- Ensure updated_at triggers for economic tables
-- This ensures that transaction dates in the ledger are accurate

-- 1. Function to update updated_at if it exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bolos Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bolos' AND column_name = 'updated_at') THEN
        ALTER TABLE bolos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_bolos_updated_at ON bolos;
CREATE TRIGGER update_bolos_updated_at 
    BEFORE UPDATE ON bolos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Despeses/Ingressos Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'despeses_ingressos' AND column_name = 'updated_at') THEN
        ALTER TABLE despeses_ingressos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_despeses_ingressos_updated_at ON despeses_ingressos;
CREATE TRIGGER update_despeses_ingressos_updated_at 
    BEFORE UPDATE ON despeses_ingressos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Pagaments Anticipats Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagaments_anticipats' AND column_name = 'updated_at') THEN
        ALTER TABLE pagaments_anticipats ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_pagaments_anticipats_updated_at ON pagaments_anticipats;
CREATE TRIGGER update_pagaments_anticipats_updated_at 
    BEFORE UPDATE ON pagaments_anticipats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
