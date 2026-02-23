-- ==========================================
-- 🧹 SCRIPT DE NETEJA DE MUNICIPIS DUPLICATS
-- ==========================================
-- Aquest script identifica municipis que són el mateix (ex: "Puig-reig" i "Puigreig")
-- i els fusiona en un de sol, prioritzant el que té coordenades.
-- També actualitza les referències a la taula de Bolos i Clients.

-- 0. Activar extensió per accents
CREATE EXTENSION IF NOT EXISTS unaccent;

BEGIN;

-- 1. Funció temporal de normalització (idèntica a l'App)
CREATE OR REPLACE FUNCTION public.fn_super_normalize(t text) RETURNS text AS $$
BEGIN
    RETURN lower(regexp_replace(unaccent(t), '[^a-z0-0]', '', 'g'));
EXCEPTION WHEN OTHERS THEN
    RETURN lower(regexp_replace(t, '[^a-z0-0]', '', 'g'));
END;
$$ LANGUAGE plpgsql;

-- 2. Crear mapa de fusió
-- Identifiquem els IDs "dolents" i quin és el "bo" (master)
CREATE TEMP TABLE municipi_merge_map AS
WITH ranked_municipis AS (
    SELECT 
        id, 
        nom,
        fn_super_normalize(nom) as s_norm,
        lat,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY fn_super_normalize(nom) 
            ORDER BY 
                (lat IS NOT NULL) DESC, -- Prioritzem el que té coordenades
                created_at ASC,         -- Prioritzem el més antic
                id                      -- Desempat determinista
        ) as rank
    FROM public.municipis
)
SELECT 
    m_bad.id as bad_id,
    m_good.id as good_id
FROM ranked_municipis m_bad
JOIN ranked_municipis m_good ON m_bad.s_norm = m_good.s_norm
WHERE m_bad.rank > 1 AND m_good.rank = 1;

-- 3. Actualitzar referències a Bolos
UPDATE public.bolos b
SET municipi_id = m.good_id
FROM municipi_merge_map m
WHERE b.municipi_id = m.bad_id;

-- 4. Actualitzar referències a Clients
UPDATE public.clients c
SET municipi_id = m.good_id
FROM municipi_merge_map m
WHERE c.municipi_id = m.bad_id;

-- 5. Eliminar duplicats redundants
DELETE FROM public.municipis
WHERE id IN (SELECT bad_id FROM municipi_merge_map);

-- 6. Estandarditzar tots els 'nom_normalitzat'
-- Això evita que en el futur l'App (que usa aquesta normalització) creï duplicats
UPDATE public.municipis
SET nom_normalitzat = fn_super_normalize(nom);

-- 7. Neteja de la funció temporal
DROP FUNCTION public.fn_super_normalize(text);

COMMIT;

-- Mostra quants s'han fusionat
-- SELECT count(*) as municipis_fusionats FROM municipi_merge_map;
