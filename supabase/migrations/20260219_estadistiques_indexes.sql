-- ============================================================
-- Indexes per optimitzar les queries d'estadístiques
-- Aplicar a Supabase SQL Editor o com a migració
-- ============================================================

-- Index per data_bolo (filtres per any i rang de dates)
CREATE INDEX IF NOT EXISTS idx_bolos_data_bolo
    ON bolos (data_bolo DESC);

-- Index per estat (filtre de confirmat/rebutjat/pendent)
CREATE INDEX IF NOT EXISTS idx_bolos_estat
    ON bolos (estat);

-- Index compost per data + estat (query principal d'estadístiques)
CREATE INDEX IF NOT EXISTS idx_bolos_data_estat
    ON bolos (data_bolo DESC, estat);

-- Index per nom_poble (filtre de pobles)
CREATE INDEX IF NOT EXISTS idx_bolos_nom_poble
    ON bolos (nom_poble);

-- Index per tipus_actuacio (filtre de tipus)
CREATE INDEX IF NOT EXISTS idx_bolos_tipus_actuacio
    ON bolos (tipus_actuacio);

-- Index per tipus_ingres (filtre de pagament)
CREATE INDEX IF NOT EXISTS idx_bolos_tipus_ingres
    ON bolos (tipus_ingres);

-- Index per import_total (filtre rang de preus)
CREATE INDEX IF NOT EXISTS idx_bolos_import_total
    ON bolos (import_total);

-- Index per bolo_musics.bolo_id + estat (ranking de músics)
CREATE INDEX IF NOT EXISTS idx_bolo_musics_bolo_estat
    ON bolo_musics (bolo_id, estat);

-- Index per municipis.nom (lookup de coordenades)
CREATE INDEX IF NOT EXISTS idx_municipis_nom
    ON municipis (nom);

-- Index per lat/lng (per future geo queries)
CREATE INDEX IF NOT EXISTS idx_municipis_coords
    ON municipis (lat, lng)
    WHERE lat IS NOT NULL AND lng IS NOT NULL;
