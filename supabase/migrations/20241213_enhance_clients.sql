-- Migration: Enhance clients table for billing and contact management
-- Created: 2024-12-13
-- Description: Adds billing, contact, and classification fields to clients table

BEGIN;

-- Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add new columns for billing and contact information
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nif text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS altres text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rao_social text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS poblacio text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS adreca text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS codi_postal text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipus_client text CHECK (tipus_client IN ('ajuntament', 'associacio', 'empresa', 'ampa', 'altres'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS requereix_efactura boolean DEFAULT false;

-- Contact fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS persona_contacte text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS correu_contacte text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telefon_contacte text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telefon_extra text;

-- Legacy fields (keep if they exist)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telefon text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS correu text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS observacions text;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_clients_nif ON clients(nif) WHERE nif IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_clients_tipus ON clients(tipus_client) WHERE tipus_client IS NOT NULL;

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON clients;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON clients FOR DELETE TO authenticated USING (true);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
