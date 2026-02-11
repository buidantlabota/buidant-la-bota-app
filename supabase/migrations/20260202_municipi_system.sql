-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Table: municipis (Catalog of Catalonia)
CREATE TABLE IF NOT EXISTS public.municipis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom text NOT NULL,
    nom_normalitzat text NOT NULL,
    comarca text,
    provincia text,
    pais text NOT NULL DEFAULT 'ES',
    region text NOT NULL DEFAULT 'Catalunya',
    created_at timestamptz DEFAULT now(),
    UNIQUE(nom_normalitzat, pais, region)
);

-- Search Index for municipis
CREATE INDEX IF NOT EXISTS idx_municipis_nom_normalitzat ON public.municipis USING gin (nom_normalitzat gin_trgm_ops);

-- 2. Table: municipis_custom (Free text entries)
CREATE TABLE IF NOT EXISTS public.municipis_custom (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_original text NOT NULL,
    nom text NOT NULL,
    pais text,
    nom_normalitzat text NOT NULL,
    origen text NOT NULL DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    UNIQUE(nom_normalitzat, COALESCE(pais, ''))
);

-- Search Index for municipis_custom
CREATE INDEX IF NOT EXISTS idx_municipis_custom_nom_normalitzat ON public.municipis_custom USING gin (nom_normalitzat gin_trgm_ops);

-- 3. Update existing tables (bolos and clients)

-- For Bolos
ALTER TABLE public.bolos ADD COLUMN IF NOT EXISTS municipi_id uuid REFERENCES public.municipis(id);
ALTER TABLE public.bolos ADD COLUMN IF NOT EXISTS municipi_custom_id uuid REFERENCES public.municipis_custom(id);
ALTER TABLE public.bolos ADD COLUMN IF NOT EXISTS municipi_text text;

-- Constraint XOR for bolos (permet nulls per registres antics, però si s'informa un ID ha de ser exactament un)
ALTER TABLE public.bolos DROP CONSTRAINT IF EXISTS bolos_municipi_xor;
ALTER TABLE public.bolos ADD CONSTRAINT bolos_municipi_xor 
    CHECK (
        (municipi_id IS NOT NULL AND municipi_custom_id IS NULL) OR 
        (municipi_id IS NULL AND municipi_custom_id IS NOT NULL) OR
        (municipi_id IS NULL AND municipi_custom_id IS NULL)
    );

-- For Clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS municipi_id uuid REFERENCES public.municipis(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS municipi_custom_id uuid REFERENCES public.municipis_custom(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS municipi_text text;

-- Constraint XOR for clients
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_municipi_xor;
ALTER TABLE public.clients ADD CONSTRAINT clients_municipi_xor 
    CHECK (
        (municipi_id IS NOT NULL AND municipi_custom_id IS NULL) OR 
        (municipi_id IS NULL AND municipi_custom_id IS NOT NULL) OR
        (municipi_id IS NULL AND municipi_custom_id IS NULL)
    );

-- Enable RLS
ALTER TABLE public.municipis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipis_custom ENABLE ROW LEVEL SECURITY;

-- Select policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Municipis are viewable by everyone' AND tablename = 'municipis') THEN
        CREATE POLICY "Municipis are viewable by everyone" ON public.municipis FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Municipis custom are viewable by everyone' AND tablename = 'municipis_custom') THEN
        CREATE POLICY "Municipis custom are viewable by everyone" ON public.municipis_custom FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert custom municipis' AND tablename = 'municipis_custom') THEN
        CREATE POLICY "Authenticated users can insert custom municipis" ON public.municipis_custom FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
