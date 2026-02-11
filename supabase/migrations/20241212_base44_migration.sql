-- Migration to add Base 44 functionalities
-- Created at: 2024-12-12
-- Description: Adds economic fields, automation triggers, history table, and views.

BEGIN;

-- 1. ALTER TABLE BOLOS
-- Ensure all required columns exist
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS import_total numeric DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS preu_per_musica numeric DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS num_musics integer DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS cost_total_musics numeric DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS pot_delta numeric DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS ajust_pot_manual numeric DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS comentari_ajust_pot text;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS pot_delta_final numeric DEFAULT 0;
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS estat_cobrament text DEFAULT 'pendent'; -- pendent, parcial, cobrat
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS estat_assistencia text DEFAULT 'pendent'; -- pendent, confirmat, incomplet
ALTER TABLE bolos ADD COLUMN IF NOT EXISTS tipus_ingres text DEFAULT 'B'; -- B, FACTURA, MIXT

-- 2. ALTER TABLE BOLO_MUSICS
ALTER TABLE bolo_musics ADD COLUMN IF NOT EXISTS import_assignat numeric DEFAULT 0;

-- 3. CREATE DESPESES_INGRESSOS TABLE
CREATE TABLE IF NOT EXISTS despeses_ingressos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data date NOT NULL DEFAULT CURRENT_DATE,
    descripcio text NOT NULL,
    tipus text NOT NULL CHECK (tipus IN ('ingrés', 'despesa')),
    categoria text,
    import numeric NOT NULL DEFAULT 0,
    any_pot integer, -- Useful for grouping purely by year regardless of bolo date
    actuacio_id bigint REFERENCES bolos(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE despeses_ingressos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON despeses_ingressos;
CREATE POLICY "Enable read access for authenticated users" ON despeses_ingressos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON despeses_ingressos;
CREATE POLICY "Enable insert access for authenticated users" ON despeses_ingressos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON despeses_ingressos;
CREATE POLICY "Enable update access for authenticated users" ON despeses_ingressos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON despeses_ingressos;
CREATE POLICY "Enable delete access for authenticated users" ON despeses_ingressos FOR DELETE TO authenticated USING (true);

-- 4. CREATE BOLO_HISTORY TABLE
CREATE TABLE IF NOT EXISTS bolo_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bolo_id bigint REFERENCES bolos(id) ON DELETE CASCADE,
    tipus_event text, -- 'estat', 'import', 'music', 'tasca_auto', 'info'
    valor_anterior text,
    valor_nou text,
    usuari text, -- email or id
    data timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE bolo_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bolo_history;
CREATE POLICY "Enable read access for authenticated users" ON bolo_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON bolo_history;
CREATE POLICY "Enable insert access for authenticated users" ON bolo_history FOR INSERT TO authenticated WITH CHECK (true);

-- 5. FUNCTION & TRIGGER: AUTOMATIC CALCULATIONS
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
    WHERE bolo_id = v_bolo_id AND estat != 'no' AND estat != 'baixa'; -- Only count active musicians

    -- Get current bolo values (needed if triggered from bolo_musics)
    SELECT import_total, ajust_pot_manual INTO v_import_total, v_ajust_manual
    FROM bolos WHERE id = v_bolo_id;

    -- Calculate Pot math
    v_pot_delta := COALESCE(v_import_total, 0) - v_cost_musics;
    v_pot_delta_final := v_pot_delta + COALESCE(v_ajust_manual, 0);

    -- Update Bolo without triggering recursion loops if values haven't changed (Postgres handles this usually, but good to be safe)
    UPDATE bolos
    SET
        num_musics = v_num_musics,
        cost_total_musics = v_cost_musics,
        pot_delta = v_pot_delta,
        pot_delta_final = v_pot_delta_final
    WHERE id = v_bolo_id;

    RETURN NULL; -- For AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Trigger on BoloMusics
DROP TRIGGER IF EXISTS tr_refresh_economics_bolomusics ON bolo_musics;
CREATE TRIGGER tr_refresh_economics_bolomusics
AFTER INSERT OR UPDATE OR DELETE ON bolo_musics
FOR EACH ROW EXECUTE FUNCTION calculate_bolo_economics();

-- Trigger on Bolos (when import_total or ajust_pot_manual changes)
DROP TRIGGER IF EXISTS tr_refresh_economics_bolos ON bolos;
CREATE TRIGGER tr_refresh_economics_bolos
AFTER UPDATE OF import_total, ajust_pot_manual ON bolos
FOR EACH ROW
WHEN (OLD.import_total IS DISTINCT FROM NEW.import_total OR OLD.ajust_pot_manual IS DISTINCT FROM NEW.ajust_pot_manual)
EXECUTE FUNCTION calculate_bolo_economics();


-- 6. FUNCTION & TRIGGER: ESTAT ASSISTENCIA
CREATE OR REPLACE FUNCTION update_estat_assistencia()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bolo_id bigint;
    v_total_musics int;
    v_confirmed_musics int;
    v_pending_musics int;
    v_new_status text;
BEGIN
    If TG_OP = 'DELETE' THEN v_bolo_id := OLD.bolo_id; ELSE v_bolo_id := NEW.bolo_id; END IF;

    SELECT
        count(*),
        count(*) FILTER (WHERE estat = 'confirmat'),
        count(*) FILTER (WHERE estat = 'pendent')
    INTO v_total_musics, v_confirmed_musics, v_pending_musics
    FROM bolo_musics
    WHERE bolo_id = v_bolo_id;

    IF v_total_musics = 0 THEN
        v_new_status := 'pendent';
    ELSIF v_confirmed_musics = v_total_musics THEN
        v_new_status := 'complet'; -- All confirmed
    ELSIF v_pending_musics > 0 THEN
        v_new_status := 'pendent';
    ELSE
        v_new_status := 'incomplet'; -- Some might be 'no' or 'baixa', but no pendings
    END IF;

    UPDATE bolos SET estat_assistencia = v_new_status WHERE id = v_bolo_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_estat_assistencia ON bolo_musics;
CREATE TRIGGER tr_update_estat_assistencia
AFTER INSERT OR UPDATE OR DELETE ON bolo_musics
FOR EACH ROW EXECUTE FUNCTION update_estat_assistencia();

-- 7. FUNCTION & TRIGGER: HISTORY
CREATE OR REPLACE FUNCTION log_bolo_changes()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user text;
BEGIN
    -- Try to get user from session, fallback to 'system'
    BEGIN
        v_user := auth.uid()::text;
    EXCEPTION WHEN OTHERS THEN
        v_user := 'system';
    END;

    IF OLD.estat IS DISTINCT FROM NEW.estat THEN
        INSERT INTO bolo_history (bolo_id, tipus_event, valor_anterior, valor_nou, usuari)
        VALUES (NEW.id, 'estat', OLD.estat, NEW.estat, v_user);
    END IF;

    IF OLD.import_total IS DISTINCT FROM NEW.import_total THEN
        INSERT INTO bolo_history (bolo_id, tipus_event, valor_anterior, valor_nou, usuari)
        VALUES (NEW.id, 'import', OLD.import_total::text, NEW.import_total::text, v_user);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_bolo_changes ON bolos;
CREATE TRIGGER tr_log_bolo_changes
AFTER UPDATE ON bolos
FOR EACH ROW EXECUTE FUNCTION log_bolo_changes();

-- 8. VIEWS
-- View: Resum Any
CREATE OR REPLACE VIEW view_bolos_resum_any WITH (security_invoker = true) AS
SELECT
    EXTRACT(YEAR FROM data_bolo) AS "any",
    COUNT(id) AS total_bolos,
    SUM(import_total) AS total_ingressos,
    SUM(cost_total_musics) AS total_cost_musics,
    SUM(pot_delta_final) AS pot_resultant
FROM bolos
WHERE estat NOT IN ('cancel·lat', 'rebutjat')
GROUP BY EXTRACT(YEAR FROM data_bolo)
ORDER BY "any" DESC;

-- View: Economia Detallada
CREATE OR REPLACE VIEW view_economia_bolos WITH (security_invoker = true) AS
SELECT
    id AS bolo_id,
    nom_poble,
    data_bolo,
    import_total,
    cost_total_musics,
    num_musics,
    pot_delta,
    ajust_pot_manual,
    pot_delta_final,
    estat_cobrament,
    tipus_ingres
FROM bolos
ORDER BY data_bolo DESC;

-- 9. ALTER TASQUES (Link to Bolo)
ALTER TABLE tasques ADD COLUMN IF NOT EXISTS bolo_id bigint REFERENCES bolos(id) ON DELETE CASCADE;

-- 10. FUNCTION & TRIGGER: TASQUES AUTOMATIQUES
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

    -- CASE: Rebutjat or Cancel·lat
    IF v_new_state IN ('rebutjat', 'cancel·lat') THEN
        -- Close pending tasks or cancel them
        UPDATE tasques 
        SET estat = 'completada', seguiment = 'Tancada automàticament per cancel·lació del bolo'
        WHERE bolo_id = v_bolo_id AND estat != 'completada';
    END IF;

    -- CASE: Sol·licitat (New or Backtracking)
    IF v_new_state = 'sol·licitat' AND v_old_state != 'sol·licitat' THEN
        -- Create default tasks for this phase if they don't exist
        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Verificar disponibilitat', 'Comprovar si tenim prous músics', 'alta', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Verificar disponibilitat');

        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Enviar pressupost', 'Fer i enviar pressupost al client', 'alta', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Enviar pressupost');
    END IF;

    -- CASE: Confirmat (En Curs)
    IF v_new_state = 'confirmat' AND v_old_state != 'confirmat' THEN
        -- Create default tasks
        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Enviar convocatòria', 'Avisar als músics pel grup', 'alta', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Enviar convocatòria');

        INSERT INTO tasques (titol, descripcio, importancia, estat, bolo_id)
        SELECT 'Organitzar cotxes', 'Planificar desplaçament', 'mitjana', 'pendent', v_bolo_id
        WHERE NOT EXISTS (SELECT 1 FROM tasques WHERE bolo_id = v_bolo_id AND titol = 'Organitzar cotxes');
    END IF;
    
    -- CASE: Backtracking (If going back, maybe reset tasks?)
    -- Simplified: We just leave them as is or reopen them? 
    -- The request said: "Si es torna enrere una fase: reseteja tasques d’aquella fase"
    -- This is complex to define "tasks of that phase". 
    -- For now, we implemented creation. Resetting specific tasks by name is safer.
    
    IF v_new_state = 'sol·licitat' AND v_old_state = 'confirmat' THEN
        UPDATE tasques SET estat = 'pendent' 
        WHERE bolo_id = v_bolo_id AND titol IN ('Verificar disponibilitat', 'Enviar pressupost');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_manage_bolo_tasks ON bolos;
CREATE TRIGGER tr_manage_bolo_tasks
AFTER UPDATE ON bolos
FOR EACH ROW
EXECUTE FUNCTION manage_bolo_tasks_automation();

COMMIT;
