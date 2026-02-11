-- Migration to update Pot calculation logic based on payment status
-- Created at: 2024-12-14

BEGIN;

-- 1. Redefine calculate_bolo_economics function
CREATE OR REPLACE FUNCTION calculate_bolo_economics()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bolo_id bigint;
    v_num_musics int;
    v_cost_musics numeric;
    v_import_total numeric;
    v_ajust_manual numeric;
    v_pot_delta numeric;
    v_pot_delta_final numeric;
    v_cobrat boolean;
    v_pagaments_fets boolean;
    v_income numeric;
    v_expense numeric;
BEGIN
    -- Determine bolo_id depending on the table triggering
    IF TG_TABLE_NAME = 'bolo_musics' THEN
        v_bolo_id := NEW.bolo_id;
        IF TG_OP = 'DELETE' THEN
            v_bolo_id := OLD.bolo_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'bolos' THEN
        v_bolo_id := NEW.id;
    END IF;

    -- Calculate Num Musics and Cost Total Musics
    SELECT
        COUNT(*),
        COALESCE(SUM(import_assignat), 0)
    INTO
        v_num_musics,
        v_cost_musics
    FROM bolo_musics
    WHERE bolo_id = v_bolo_id AND estat != 'no' AND estat != 'baixa';

    -- Get current bolo values including payment status
    -- Note: Ensure 'cobrat' and 'pagaments_musics_fets' columns exist and are booleans
    -- They are part of the original schema layout usually. If not, we might need to cast or default.
    SELECT 
        import_total, 
        ajust_pot_manual, 
        COALESCE(cobrat, false), 
        COALESCE(pagaments_musics_fets, false)
    INTO 
        v_import_total, 
        v_ajust_manual, 
        v_cobrat, 
        v_pagaments_fets
    FROM bolos WHERE id = v_bolo_id;

    -- Calculate Income based on 'Cobrat' status
    IF v_cobrat THEN
        v_income := COALESCE(v_import_total, 0);
    ELSE
        v_income := 0;
    END IF;

    -- Calculate Expense based on 'Pagaments Fets' status
    IF v_pagaments_fets THEN
        v_expense := v_cost_musics;
    ELSE
        v_expense := 0;
    END IF;

    -- Calculate Pot math
    -- Pot Delta = (Realized Income) - (Realized Expense)
    -- But usually Pot Delta reflects the "Theoretical" or "Projected" profit in some views?
    -- The user requested: "fins que no es posi cobrat, al pot no ha de sortir el que hi ha referent a aquell bolo"
    -- So Pot Delta SHOULD be 0 if not cobrat.
    -- And "quan sigui cobrat i pagat surtira la diferencia".
    
    v_pot_delta := v_income - v_expense;
    
    -- Final Pot includes manual adjustment (assuming adjustment applies regardless? Or only if finalized?)
    -- Let's assume adjustment applies immediately or follows same logic? 
    -- Usually manual adjustment is for corrections, let's just add it.
    v_pot_delta_final := v_pot_delta + COALESCE(v_ajust_manual, 0);

    -- Update Bolo
    UPDATE bolos
    SET
        num_musics = v_num_musics,
        cost_total_musics = v_cost_musics,
        pot_delta = v_pot_delta,
        pot_delta_final = v_pot_delta_final
    WHERE id = v_bolo_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Update Trigger on Bolos to include new columns
-- We need to drop the old trigger condition to update it easily or just replace it.
DROP TRIGGER IF EXISTS tr_refresh_economics_bolos ON bolos;

CREATE TRIGGER tr_refresh_economics_bolos
AFTER UPDATE OF import_total, ajust_pot_manual, cobrat, pagaments_musics_fets ON bolos
FOR EACH ROW
WHEN (
    OLD.import_total IS DISTINCT FROM NEW.import_total OR 
    OLD.ajust_pot_manual IS DISTINCT FROM NEW.ajust_pot_manual OR
    OLD.cobrat IS DISTINCT FROM NEW.cobrat OR
    OLD.pagaments_musics_fets IS DISTINCT FROM NEW.pagaments_musics_fets
)
EXECUTE FUNCTION calculate_bolo_economics();

COMMIT;
