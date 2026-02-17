-- 1. Reset all instruments assignments from musicians (as requested)
-- This allows a clean start to re-assign instruments manually.
UPDATE public.musics SET instruments = NULL;

-- 2. Add 'instrument' column to bolo_musics table
-- This stores the specific instrument played by the musician in a specific bolo.
ALTER TABLE public.bolo_musics ADD COLUMN IF NOT EXISTS instrument text;

-- 3. (Optional) If you want to backfill existing bolo_musics with the musician's main instrument
-- (We can't do this easily now because we just wiped the instruments in step 1! 
-- But for future reference, this would be the place).
