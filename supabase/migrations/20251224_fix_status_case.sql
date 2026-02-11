-- Finalize transition to capitalized status names
-- Description: Updates existing bolo records and fixes triggers/views to use capitalized status names.

BEGIN;

-- 1. Update existing records in 'bolos' table
UPDATE bolos SET estat = 'Sol·licitat' WHERE estat = 'sol·licitat' OR estat = 'pendent';
UPDATE bolos SET estat = 'Confirmat' WHERE estat = 'confirmat';
UPDATE bolos SET estat = 'Tancat' WHERE estat = 'tancat' OR estat = 'realitzat';
UPDATE bolos SET estat = 'Cancel·lat' WHERE estat = 'cancel·lat' OR estat = 'rebutjat';

-- 2. Update View: view_bolos_resum_any
CREATE OR REPLACE VIEW view_bolos_resum_any WITH (security_invoker = true) AS
SELECT
    EXTRACT(YEAR FROM data_bolo) AS "any",
    COUNT(id) AS total_bolos,
    SUM(import_total) AS total_ingressos,
    SUM(cost_total_musics) AS total_cost_musics,
    SUM(pot_delta_final) AS pot_resultant
FROM bolos
WHERE estat != 'Cancel·lat'
GROUP BY EXTRACT(YEAR FROM data_bolo)
ORDER BY "any" DESC;

-- 3. Update Function: manage_bolo_tasks_automation
CREATE OR REPLACE FUNCTION manage_bolo_tasks_automation()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bolo_id bigint;
    v_new_state text;
    v_old_state text;
BEGIN
    v_bolo_id := NEW.id;
    v_new_state := NEW.estat;
    v_old_state := OLD.estat;

    -- If state hasn't changed, do nothing
    IF v_new_state IS NOT DISTINCT FROM v_old_state THEN
        RETURN NEW;
    END IF;

    -- CASE: Cancel·lat
    IF v_new_state = 'Cancel·lat' THEN
        -- Close pending tasks or cancel them
        UPDATE tasques 
        SET estat = 'completada', seguiment = 'Tancada automàticament per cancel·lació del bolo'
        WHERE bolo_id = v_bolo_id AND estat != 'completada';
    END IF;

    -- CASE: Sol·licitat
    IF v_new_state = 'Sol·licitat' THEN
        -- Create default tasks for this phase if they don't exist
        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Verificar disponibilitat', 'Comprovar si tenim prous músics', 'alta', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Verificar disponibilitat');

        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Enviar pressupost', 'Fer i enviar pressupost al client', 'alta', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Enviar pressupost');
    END IF;

    -- CASE: Confirmat (En Curs)
    IF v_new_state = 'Confirmat' THEN
        -- Create default tasks
        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Enviar convocatòria', 'Avisar als músics pel grup', 'alta', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Enviar convocatòria');

        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Organitzar cotxes', 'Planificar desplaçament', 'mitjana', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Organitzar cotxes');
    END IF;
    
    -- CASE: Backtracking
    IF v_new_state = 'Sol·licitat' AND v_old_state = 'Confirmat' THEN
        UPDATE tasques SET estat = 'pendent' 
        WHERE bolo_id = v_bolo_id AND titol IN ('Verificar disponibilitat', 'Enviar pressupost');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
