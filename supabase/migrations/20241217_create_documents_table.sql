-- Crear taula per documents (pressupostos i factures)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipus TEXT NOT NULL CHECK (tipus IN ('pressupost', 'factura')),
    bolo_id INTEGER REFERENCES bolos(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Dades del document
    numero_document TEXT, -- Número de pressupost/factura generat per n8n
    data_emissio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Articles
    articles JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{descripcio: string, preu: number}, ...]
    
    -- Totals
    subtotal DECIMAL(10,2),
    iva DECIMAL(10,2),
    total DECIMAL(10,2),
    
    -- PDF
    pdf_url TEXT, -- URL del PDF generat
    pdf_storage_path TEXT, -- Path al storage de Supabase
    
    -- Estat
    estat TEXT DEFAULT 'pendent' CHECK (estat IN ('pendent', 'enviat', 'cobrat', 'cancel·lat')),
    
    -- Metadata
    nombre_musics INTEGER, -- Només per factures
    observacions TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index per cerques ràpides
CREATE INDEX IF NOT EXISTS idx_documents_bolo_id ON documents(bolo_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_tipus ON documents(tipus);
CREATE INDEX IF NOT EXISTS idx_documents_data_emissio ON documents(data_emissio DESC);

-- RLS (Row Level Security)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Política: tots els usuaris autenticats poden veure tots els documents
CREATE POLICY "Usuaris autenticats poden veure documents"
    ON documents FOR SELECT
    TO authenticated
    USING (true);

-- Política: tots els usuaris autenticats poden crear documents
CREATE POLICY "Usuaris autenticats poden crear documents"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política: tots els usuaris autenticats poden actualitzar documents
CREATE POLICY "Usuaris autenticats poden actualitzar documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (true);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Comentaris
COMMENT ON TABLE documents IS 'Taula per emmagatzemar pressupostos i factures generats';
COMMENT ON COLUMN documents.articles IS 'Array JSON amb els articles: [{descripcio: string, preu: number}]';
COMMENT ON COLUMN documents.nombre_musics IS 'Nombre de músics inscrits (només per factures)';
