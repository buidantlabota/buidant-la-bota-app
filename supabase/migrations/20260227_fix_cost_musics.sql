-- Fix pot and cost_total_musics logic to consider preu_personalitzat.
-- Created at: 2026-02-27

BEGIN;

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
    -- Fix: Use preu_personalitzat if set, otherwise import_assignat
    SELECT
        COUNT(*),
        COALESCE(SUM(COALESCE(preu_personalitzat, import_assignat)), 0)
    INTO
        v_num_musics,
        v_cost_musics
    FROM bolo_musics
    WHERE bolo_id = v_bolo_id AND estat != 'no' AND estat != 'baixa';

    -- Get current bolo values including payment status
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

    -- Pot Delta = (Realized Income) - (Realized Expense)
    v_pot_delta := v_income - v_expense;
    
    -- Final Pot includes manual adjustment
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

-- Dummy update to force trigger recalculation for all bolos that have custom prices
UPDATE bolo_musics 
SET updated_at = NOW() 
WHERE preu_personalitzat IS NOT NULL;

COMMIT;
