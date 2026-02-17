-- Migració per afegir pagaments anticipats i preus personalitzats per músic en un bolo

-- 1. Afegir columna 'preu_personalitzat' a la taula bolo_musics
-- Això permetrà indicar si un músic cobra algo diferent al preu estàndard del bolo
ALTER TABLE bolo_musics 
ADD COLUMN IF NOT EXISTS preu_personalitzat DECIMAL(10,2) DEFAULT NULL;

-- 2. Crear taula de pagaments anticipats
CREATE TABLE IF NOT EXISTS pagaments_anticipats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bolo_id INTEGER REFERENCES bolos(id) ON DELETE CASCADE,
    music_id UUID REFERENCES musics(id) ON DELETE CASCADE,
    import DECIMAL(10,2) NOT NULL,
    data_pagament TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    creat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE pagaments_anticipats ENABLE ROW LEVEL SECURITY;

-- 4. Polítiques RLS
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a pagaments_anticipats" ON pagaments_anticipats;
CREATE POLICY "Usuaris autenticats poden fer-ho tot a pagaments_anticipats" 
ON pagaments_anticipats FOR ALL TO authenticated USING (true);

-- 5. Índexs per performance
CREATE INDEX IF NOT EXISTS idx_pagaments_anticipats_bolo ON pagaments_anticipats(bolo_id);
CREATE INDEX IF NOT EXISTS idx_pagaments_anticipats_music ON pagaments_anticipats(music_id);
