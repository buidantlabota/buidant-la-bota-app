-- 1. Reset all instruments assignments from musicians
-- Utilitzem cadena buida '' en lloc de NULL perquè la columna és obligatòria (NOT NULL).
UPDATE public.musics SET instruments = '';

-- 2. Add 'instrument' column to bolo_musics table
-- This stores the specific instrument played by the musician in a specific bolo.
ALTER TABLE public.bolo_musics ADD COLUMN IF NOT EXISTS instrument text;
