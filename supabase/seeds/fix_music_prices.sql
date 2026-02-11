-- 1. Create Function to set default price from Bolo
CREATE OR REPLACE FUNCTION set_default_music_price()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_default_price numeric;
BEGIN
    -- Only set if not already set (or if 0, assuming 0 is 'unset')
    IF NEW.import_assignat IS NULL OR NEW.import_assignat = 0 THEN
        SELECT preu_per_musica INTO v_default_price FROM bolos WHERE id = NEW.bolo_id;
        
        IF v_default_price IS NOT NULL THEN
            NEW.import_assignat := v_default_price;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create Trigger (Before Insert/Update)
DROP TRIGGER IF EXISTS tr_set_default_music_price ON bolo_musics;
CREATE TRIGGER tr_set_default_music_price
BEFORE INSERT OR UPDATE OF import_assignat ON bolo_musics
FOR EACH ROW
EXECUTE FUNCTION set_default_music_price();

-- 3. Fix Existing Data
-- Update all bolo_musics where import_assignat is 0 to match the bolo's preu_per_musica
UPDATE bolo_musics bm
SET import_assignat = b.preu_per_musica
FROM bolos b
WHERE bm.bolo_id = b.id
  AND (bm.import_assignat IS NULL OR bm.import_assignat = 0)
  AND b.preu_per_musica > 0;

-- 4. Force Recalculate Bolo Economics (Just to be safe, though the UPDATE above triggers tr_refresh_economics_bolomusics)
-- We can touch the bolos to be sure
UPDATE bolos SET updated_at = now();
