-- ============================================================================
-- SISTEMA DE PREVISIÓ DE MÚSICS (RESUM 30 DIES)
-- ============================================================================
-- Objectiu: Afegir camps per gestionar la previsió de músics dels propers
--           bolos amb notes, confirmació de lineup, i text lliure per WhatsApp.
-- ============================================================================

-- 1. AFEGIR CAMPS A LA TAULA BOLOS
-- ============================================================================

-- Camp per confirmar que el lineup està tancat (independent de l'estat administratiu)
ALTER TABLE public.bolos 
ADD COLUMN IF NOT EXISTS lineup_confirmed boolean NOT NULL DEFAULT false;

-- Camps de text lliure per "No pot" i "Pendent" (per al resum WhatsApp)
ALTER TABLE public.bolos 
ADD COLUMN IF NOT EXISTS lineup_no_pot text;

ALTER TABLE public.bolos 
ADD COLUMN IF NOT EXISTS lineup_pendent text;

-- Notes generals del lineup del bolo (opcional)
ALTER TABLE public.bolos 
ADD COLUMN IF NOT EXISTS lineup_notes text;


-- 2. AFEGIR CAMP DE NOTES A BOLO_MUSICS
-- ============================================================================

-- El camp 'comentari' ja existeix a bolo_musics, però el renombrem a 'note' per claredat
-- NOTA: Si el camp 'comentari' ja s'utilitza, mantenir-lo i afegir 'note' com a nou camp

-- Opció A: Si 'comentari' NO s'utilitza actualment, renombrar-lo
-- ALTER TABLE public.bolo_musics RENAME COLUMN comentari TO note;

-- Opció B: Si 'comentari' JA s'utilitza, afegir un nou camp 'note'
-- (Descomentar si cal mantenir 'comentari' per altres usos)
-- ALTER TABLE public.bolo_musics ADD COLUMN IF NOT EXISTS note text;

-- Per defecte, assumim que 'comentari' és el camp que volem utilitzar
-- No cal fer res addicional si ja existeix


-- 3. ÍNDEXS PER OPTIMITZAR CONSULTES
-- ============================================================================

-- Índex per trobar bolos amb lineup confirmat
CREATE INDEX IF NOT EXISTS idx_bolos_lineup_confirmed 
ON public.bolos(lineup_confirmed) 
WHERE lineup_confirmed = true;

-- Índex normal sobre la data del bolo (per consultes de rangs de dates)
CREATE INDEX IF NOT EXISTS idx_bolos_data_bolo 
ON public.bolos(data_bolo);


-- 4. FUNCIÓ PER OBTENIR BOLOS DELS PROPERS 30 DIES AMB MÚSICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upcoming_bolos_with_musicians()
RETURNS TABLE (
    bolo_id bigint,
    nom_poble text,
    municipi_text text,
    data_bolo date,
    hora_inici text,
    estat text,
    tipus_actuacio text,
    lineup_confirmed boolean,
    lineup_no_pot text,
    lineup_pendent text,
    lineup_notes text,
    total_musics bigint,
    musicians jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bolo_id,
        b.nom_poble,
        b.municipi_text,
        b.data_bolo,
        b.hora_inici,
        b.estat,
        b.tipus_actuacio,
        b.lineup_confirmed,
        b.lineup_no_pot,
        b.lineup_pendent,
        b.lineup_notes,
        COUNT(bm.id) as total_musics,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', m.id,
                    'nom', m.nom,
                    'instruments', m.instruments,
                    'tipus', bm.tipus,
                    'estat', bm.estat,
                    'note', bm.comentari
                )
                ORDER BY m.instruments, m.nom
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::jsonb
        ) as musicians
    FROM public.bolos b
    LEFT JOIN public.bolo_musics bm ON b.id = bm.bolo_id
    LEFT JOIN public.musics m ON bm.music_id = m.id
    WHERE 
        b.data_bolo >= CURRENT_DATE
        AND b.data_bolo <= CURRENT_DATE + INTERVAL '30 days'
        AND b.estat != 'Cancel·lat'
    GROUP BY b.id
    ORDER BY b.data_bolo, b.hora_inici NULLS LAST;
END;
$$ LANGUAGE plpgsql;


-- 5. COMENTARIS
-- ============================================================================

COMMENT ON COLUMN public.bolos.lineup_confirmed IS 'Indica si el lineup de músics està confirmat i tancat (independent de l''estat administratiu del bolo)';
COMMENT ON COLUMN public.bolos.lineup_no_pot IS 'Text lliure per indicar qui no pot assistir (per al resum WhatsApp)';
COMMENT ON COLUMN public.bolos.lineup_pendent IS 'Text lliure per indicar qui està pendent de confirmar (per al resum WhatsApp)';
COMMENT ON COLUMN public.bolos.lineup_notes IS 'Notes generals sobre el lineup d''aquest bolo';
COMMENT ON COLUMN public.bolo_musics.comentari IS 'Nota específica per aquest músic en aquest bolo (ex: "Fa tenor en lloc d''alto")';
