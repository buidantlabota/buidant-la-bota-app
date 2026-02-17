-- Migration to add instrument_principal to musics table
ALTER TABLE public.musics ADD COLUMN IF NOT EXISTS instrument_principal text;
