-- Ensure billing tables exist
-- This script can be run safely multiple times

-- 1. Create app_config table if not exists
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create invoice_records table if not exists
CREATE TABLE IF NOT EXISTS invoice_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    bolo_id INTEGER REFERENCES bolos(id) ON DELETE SET NULL,
    creation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_url TEXT,
    pdf_storage_path TEXT,
    notes TEXT,
    articles JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create quote_records table if not exists
CREATE TABLE IF NOT EXISTS quote_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    bolo_id INTEGER REFERENCES bolos(id) ON DELETE SET NULL,
    creation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(10,2) NOT NULL,
    pdf_url TEXT,
    pdf_storage_path TEXT,
    notes TEXT,
    articles JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Initialize invoice counter if not exists
INSERT INTO app_config (key, value)
VALUES ('invoice_counter', '{"last_number": 0, "year": 2026}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_records ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a app_config" ON app_config;
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a invoice_records" ON invoice_records;
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a quote_records" ON quote_records;

-- 7. Create RLS policies
CREATE POLICY "Usuaris autenticats poden fer-ho tot a app_config" 
    ON app_config FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuaris autenticats poden fer-ho tot a invoice_records" 
    ON invoice_records FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuaris autenticats poden fer-ho tot a quote_records" 
    ON quote_records FOR ALL TO authenticated USING (true);

-- 8. Create or replace update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
DROP TRIGGER IF EXISTS update_invoice_records_updated_at ON invoice_records;
DROP TRIGGER IF EXISTS update_quote_records_updated_at ON quote_records;

-- 10. Create triggers
CREATE TRIGGER update_app_config_updated_at 
    BEFORE UPDATE ON app_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_records_updated_at 
    BEFORE UPDATE ON invoice_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_records_updated_at 
    BEFORE UPDATE ON quote_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
