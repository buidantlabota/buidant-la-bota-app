-- Fix Pot Calculations: Sync Musician Costs
-- Description: Triggers to automatically set import_assignat based on bolo's preu_per_musica

BEGIN;

-- 1. Function to set import_assignat on new musician insertion
CREATE OR REPLACE FUNCTION set_default_musician_import()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_preu numeric;
BEGIN
    -- Get the current price from the bolo
    SELECT preu_per_musica INTO v_preu
    FROM bolos
    WHERE id = NEW.bolo_id;

    -- Set the import_assignat if not explicitly provided (or if 0)
    IF NEW.import_assignat IS NULL OR NEW.import_assignat = 0 THEN
        NEW.import_assignat := COALESCE(v_preu, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: When adding a musician to a bolo
DROP TRIGGER IF EXISTS tr_set_musician_import ON bolo_musics;
CREATE TRIGGER tr_set_musician_import
BEFORE INSERT ON bolo_musics
FOR EACH ROW
EXECUTE FUNCTION set_default_musician_import();


-- 2. Function to propagate price changes from Bolo to Musicians
CREATE OR REPLACE FUNCTION propagate_bolo_price_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if the price actually changed
    IF OLD.preu_per_musica IS DISTINCT FROM NEW.preu_per_musica THEN
        -- Update all musicians assigned to this bolo
        -- We overwrite their assigned import to match the new price
        -- Note: This assumes all musicians get the standard price. 
        -- If specific overrides are needed, we might need a flag "is_custom_price".
        -- For now, we assume global update is desired behavior for standard "Preu per músic".
        UPDATE bolo_musics
        SET import_assignat = NEW.preu_per_musica
        WHERE bolo_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: When updating bolo price
DROP TRIGGER IF EXISTS tr_propagate_bolo_price ON bolos;
CREATE TRIGGER tr_propagate_bolo_price
AFTER UPDATE OF preu_per_musica ON bolos
FOR EACH ROW
EXECUTE FUNCTION propagate_bolo_price_change();


-- 3. Run a one-time fix for existing records
-- Update all existing bolo_musics to match their bolo's price if they are currently 0
UPDATE bolo_musics bm
SET import_assignat = b.preu_per_musica
FROM bolos b
WHERE bm.bolo_id = b.id
AND (bm.import_assignat = 0 OR bm.import_assignat IS NULL)
AND b.preu_per_musica > 0;

-- Force recalculation of all bolos to ensure integrity
-- We do this by touching the bolos table (dummy update)
UPDATE bolos SET updated_at = now();

COMMIT;
