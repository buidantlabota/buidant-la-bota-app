-- ============================================================================
-- SISTEMA DE NOTES ESTIL GOOGLE KEEP
-- ============================================================================
-- Objectiu: Crear un sistema de notes ràpides tipus post-it per a la pàgina
--           de tasques, amb colors, pins, i vinculació opcional a bolos.
-- ============================================================================

-- 1. CREAR TAULA DE NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contingut
    title text,
    content text NOT NULL,
    
    -- Aparença i organització
    color text NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'gray', 'red')),
    pinned boolean NOT NULL DEFAULT false,
    archived boolean NOT NULL DEFAULT false,
    
    -- Vinculació opcional a bolo
    bolo_id bigint REFERENCES public.bolos(id) ON DELETE SET NULL,
    
    -- Categories/Tags
    tags text[] DEFAULT '{}',
    categoria text CHECK (categoria IN ('IMPORTANT', 'RECORDATORI', 'MATERIAL', 'LOGÍSTICA', 'GENERAL')),
    
    -- Ordre personalitzat (per drag & drop futur)
    ordre integer DEFAULT 0,
    
    -- Timestamps
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índexs per optimitzar consultes
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(pinned) WHERE NOT archived;
CREATE INDEX IF NOT EXISTS idx_notes_archived ON public.notes(archived);
CREATE INDEX IF NOT EXISTS idx_notes_bolo_id ON public.notes(bolo_id) WHERE bolo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_categoria ON public.notes(categoria) WHERE categoria IS NOT NULL;

-- Índex per cerca de text (GIN)
CREATE INDEX IF NOT EXISTS idx_notes_search ON public.notes USING gin(to_tsvector('catalan', coalesce(title, '') || ' ' || content));


-- 2. TRIGGER PER ACTUALITZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION update_notes_updated_at();


-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies: tots els usuaris autenticats poden fer CRUD
CREATE POLICY "Enable read access for authenticated users" 
    ON public.notes FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
    ON public.notes FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
    ON public.notes FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
    ON public.notes FOR DELETE 
    TO authenticated 
    USING (true);


-- 4. FUNCIÓ PER CERCAR NOTES
-- ============================================================================

CREATE OR REPLACE FUNCTION search_notes(search_query text)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    color text,
    pinned boolean,
    categoria text,
    bolo_id bigint,
    created_at timestamptz,
    rank real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.color,
        n.pinned,
        n.categoria,
        n.bolo_id,
        n.created_at,
        ts_rank(
            to_tsvector('catalan', coalesce(n.title, '') || ' ' || n.content),
            plainto_tsquery('catalan', search_query)
        ) as rank
    FROM public.notes n
    WHERE 
        NOT n.archived
        AND to_tsvector('catalan', coalesce(n.title, '') || ' ' || n.content) @@ plainto_tsquery('catalan', search_query)
    ORDER BY rank DESC, n.pinned DESC, n.created_at DESC;
END;
$$ LANGUAGE plpgsql;


-- 5. DADES DE MOSTRA (OPCIONAL)
-- ============================================================================

-- Descomentar per inserir notes de mostra:

INSERT INTO public.notes (title, content, color, pinned, categoria) VALUES
    ('Recordatori important', 'Revisar pressupost abans de divendres', 'red', true, 'IMPORTANT'),
    ('Material necessari', 'Comprar cordes noves per als instruments', 'blue', false, 'MATERIAL'),
    ('Logística', 'Confirmar transport per al bolo de dissabte', 'green', false, 'LOGÍSTICA'),
    ('Idea', 'Proposar nou repertori per a festes majors', 'yellow', false, 'GENERAL');

