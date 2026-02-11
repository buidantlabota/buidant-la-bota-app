-- Migració per al nou sistema de facturació i pressupostos directe (sense n8n)

-- Taula per a la configuració de l'aplicació (com el comptador de factures)
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inicialitzar el comptador de factures si no existeix
INSERT INTO app_config (key, value)
VALUES ('invoice_counter', '{"last_number": 0, "year": 2026}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Taula per al registre de factures
CREATE TABLE IF NOT EXISTS invoice_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE, -- Format YY/NNN
    client_name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    bolo_id INTEGER REFERENCES bolos(id) ON DELETE SET NULL,
    creation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL, -- creation_date + 3 mesos
    total_amount DECIMAL(10,2) NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_url TEXT,
    pdf_storage_path TEXT,
    notes TEXT,
    articles JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Taula per al registre de pressupostos
CREATE TABLE IF NOT EXISTS quote_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT NOT NULL, -- Opcionalment YY/NNN
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

-- Habilitar RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_records ENABLE ROW LEVEL SECURITY;

-- Polítiques RLS
CREATE POLICY "Usuaris autenticats poden fer-ho tot a app_config" ON app_config FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuaris autenticats poden fer-ho tot a invoice_records" ON invoice_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuaris autenticats poden fer-ho tot a quote_records" ON quote_records FOR ALL TO authenticated USING (true);

-- Triggers per a updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_records_updated_at BEFORE UPDATE ON invoice_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_records_updated_at BEFORE UPDATE ON quote_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
