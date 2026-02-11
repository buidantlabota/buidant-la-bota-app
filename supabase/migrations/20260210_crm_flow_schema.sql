-- Migration: CRM Flow implementation (Solicituds, Clients Potencials, etc.)

-- 1. Create SOLICITUDS table (replaces basic leads)
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS solicituds;

CREATE TABLE solicituds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estat TEXT NOT NULL DEFAULT 'NOVA', -- NOVA, ACCEPTADA, REBUTJADA
    
    -- DADES DE L'ACTE
    concepte TEXT,
    tipus_actuacio TEXT,
    data_actuacio DATE,
    hora_inici TIME,
    hora_fi TIME,
    municipi TEXT,
    ubicacio TEXT,
    aparcament BOOLEAN DEFAULT false,
    espai_fundes BOOLEAN DEFAULT false,
    altres_acte TEXT,
    
    -- DADES DE CONTACTE
    contacte_nom TEXT NOT NULL,
    contacte_email TEXT NOT NULL,
    contacte_telefon TEXT,
    
    -- DADES DE PAGAMENT / FACTURACIÓ
    responsable_pagament TEXT,
    forma_pagament TEXT,
    requereix_factura BOOLEAN DEFAULT false,
    necessita_pressupost BOOLEAN DEFAULT false,
    
    -- DADES FISCALS
    fact_nom TEXT,
    fact_nif TEXT,
    fact_rao_social TEXT,
    fact_direccio TEXT,
    fact_poblacio TEXT,
    fact_cp TEXT,
    fact_altres TEXT,
    
    -- METADATA
    com_ens_has_conegut TEXT,
    raw_payload JSONB,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    bolo_id BIGINT REFERENCES bolos(id) ON DELETE SET NULL,
    notes_internes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Modify CLIENTS to support CRM types
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='tipus') THEN
        ALTER TABLE clients ADD COLUMN tipus TEXT DEFAULT 'real'; -- potencial, real
    END IF;
END $$;

-- 3. Modify BOLOS to link with solicituds
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bolos' AND column_name='solicitud_id') THEN
        ALTER TABLE bolos ADD COLUMN solicitud_id UUID REFERENCES solicituds(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE solicituds ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything
CREATE POLICY admin_solicituds_policy ON solicituds
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_solicituds_estat ON solicituds(estat);
CREATE INDEX IF NOT EXISTS idx_solicituds_data_actuacio ON solicituds(data_actuacio);
CREATE INDEX IF NOT EXISTS idx_clients_tipus ON clients(tipus);
