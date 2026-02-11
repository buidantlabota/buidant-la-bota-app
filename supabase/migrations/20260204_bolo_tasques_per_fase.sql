-- ============================================================================
-- MIGRACIÓ: SISTEMA DE TASQUES PER FASE
-- ============================================================================
-- Objectiu: Evolucionar el sistema de checklist hardcoded cap a tasques
--           dinàmiques associades a fases del workflow del bolo.
-- ============================================================================

-- 1. CREAR TAULA DE TASQUES DE BOLO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bolo_tasques (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bolo_id bigint REFERENCES public.bolos(id) ON DELETE CASCADE NOT NULL,
    
    -- Informació de la tasca
    titol text NOT NULL,
    descripcio text,
    
    -- Associació a fase
    fase_associada text NOT NULL CHECK (fase_associada IN ('Sol·licitat', 'Confirmat', 'Tancat', 'Cancel·lat')),
    
    -- Estat i prioritat
    completada boolean NOT NULL DEFAULT false,
    obligatoria boolean NOT NULL DEFAULT false, -- Si és obligatòria per avançar de fase
    importancia text NOT NULL DEFAULT 'mitjana' CHECK (importancia IN ('baixa', 'mitjana', 'alta')),
    
    -- Metadata
    origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('automatica', 'manual')), -- Com s'ha creat
    creada_per text, -- Usuari que l'ha creat (si és manual)
    data_completada timestamptz,
    
    -- Ordre de visualització dins de la fase
    ordre integer NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índexs per optimitzar consultes
CREATE INDEX IF NOT EXISTS idx_bolo_tasques_bolo_id ON public.bolo_tasques(bolo_id);
CREATE INDEX IF NOT EXISTS idx_bolo_tasques_fase ON public.bolo_tasques(fase_associada);
CREATE INDEX IF NOT EXISTS idx_bolo_tasques_completada ON public.bolo_tasques(completada);

-- RLS Policies
ALTER TABLE public.bolo_tasques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
    ON public.bolo_tasques FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
    ON public.bolo_tasques FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
    ON public.bolo_tasques FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
    ON public.bolo_tasques FOR DELETE 
    TO authenticated 
    USING (true);


-- 2. FUNCIÓ PER MIGRAR TASQUES EXISTENTS
-- ============================================================================
-- Aquesta funció converteix els camps booleans actuals en registres de tasques

CREATE OR REPLACE FUNCTION migrate_existing_checklist_to_tasques()
RETURNS void AS $$
DECLARE
    bolo_record RECORD;
BEGIN
    -- Per cada bolo existent
    FOR bolo_record IN SELECT id, estat, 
        disponibilitat_comprovada, pressupost_enviat, enquesta_enviada, fitxa_client_completa,
        pressupost_acceptat, convocatoria_enviada, enquesta_disponibilitat_musics_enviada,
        calendari_actualitzat, material_organitzat, actuacio_acabada, factura_enviada,
        pagaments_musics_planificats, pagaments_musics_fets, bolo_arxivat, cobrat
    FROM bolos
    LOOP
        -- FASE: Sol·licitat
        INSERT INTO bolo_tasques (bolo_id, titol, descripcio, fase_associada, completada, obligatoria, origen, ordre)
        VALUES 
            (bolo_record.id, 'Disponibilitat comprovada', 'Verificar disponibilitat de la xaranga per la data sol·licitada', 'Sol·licitat', bolo_record.disponibilitat_comprovada, true, 'automatica', 1),
            (bolo_record.id, 'Pressupost enviat', 'Enviar proposta econòmica al client', 'Sol·licitat', bolo_record.pressupost_enviat, true, 'automatica', 2),
            (bolo_record.id, 'Enquesta al client enviada', 'Enviar formulari per recollir detalls de l''actuació', 'Sol·licitat', bolo_record.enquesta_enviada, true, 'automatica', 3),
            (bolo_record.id, 'Fitxa de client completa', 'Assegurar que totes les dades del client estan omplides', 'Sol·licitat', bolo_record.fitxa_client_completa, true, 'automatica', 4)
        ON CONFLICT DO NOTHING;

        -- FASE: Confirmat (En curs)
        INSERT INTO bolo_tasques (bolo_id, titol, descripcio, fase_associada, completada, obligatoria, origen, ordre)
        VALUES 
            (bolo_record.id, 'Pressupost acceptat', 'Confirmació per part del client de la proposta econòmica', 'Confirmat', bolo_record.pressupost_acceptat, false, 'automatica', 1),
            (bolo_record.id, 'Convocatòria enviada als músics', 'Enviar detalls de l''actuació a tots els músics confirmats', 'Confirmat', bolo_record.convocatoria_enviada, false, 'automatica', 2),
            (bolo_record.id, 'Enquesta de disponibilitat als músics enviada', 'Recollir confirmació d''assistència dels músics', 'Confirmat', bolo_record.enquesta_disponibilitat_musics_enviada, false, 'automatica', 3),
            (bolo_record.id, 'Calendari actualitzat', 'Afegir l''actuació al calendari oficial de la xaranga', 'Confirmat', bolo_record.calendari_actualitzat, false, 'automatica', 4),
            (bolo_record.id, 'Material i logística organitzats', 'Preparar instruments, roba i transport necessari', 'Confirmat', bolo_record.material_organitzat, false, 'automatica', 5),
            (bolo_record.id, 'Actuació acabada', 'Marcar com a realitzada després de l''actuació', 'Confirmat', bolo_record.actuacio_acabada, true, 'automatica', 6),
            (bolo_record.id, 'Factura enviada', 'Enviar factura al client', 'Confirmat', bolo_record.factura_enviada, true, 'automatica', 7),
            (bolo_record.id, 'Cobrat', 'Confirmar recepció del pagament del client', 'Confirmat', bolo_record.cobrat, true, 'automatica', 8)
        ON CONFLICT DO NOTHING;

        -- FASE: Tancat
        INSERT INTO bolo_tasques (bolo_id, titol, descripcio, fase_associada, completada, obligatoria, origen, ordre)
        VALUES 
            (bolo_record.id, 'Pagaments a músics planificats', 'Calcular i preparar els pagaments individuals', 'Tancat', bolo_record.pagaments_musics_planificats, false, 'automatica', 1),
            (bolo_record.id, 'Pagaments a músics fets', 'Confirmar que tots els músics han cobrat', 'Tancat', bolo_record.pagaments_musics_fets, false, 'automatica', 2),
            (bolo_record.id, 'Bolo arxivat / registrat', 'Arxivar tota la documentació i tancar el bolo', 'Tancat', bolo_record.bolo_arxivat, false, 'automatica', 3)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 3. FUNCIÓ PER CREAR TASQUES AUTOMÀTIQUES EN ENTRAR A UNA FASE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_automatic_tasks_for_phase(
    p_bolo_id bigint,
    p_fase text
)
RETURNS void AS $$
BEGIN
    -- Evitar duplicats: només crear si no existeixen ja
    
    IF p_fase = 'Sol·licitat' THEN
        INSERT INTO bolo_tasques (bolo_id, titol, descripcio, fase_associada, obligatoria, origen, ordre)
        SELECT p_bolo_id, titol, descripcio, fase, obligatoria, 'automatica', ordre
        FROM (VALUES
            ('Disponibilitat comprovada', 'Verificar disponibilitat de la xaranga per la data sol·licitada', 'Sol·licitat', true, 1),
            ('Pressupost enviat', 'Enviar proposta econòmica al client', 'Sol·licitat', true, 2),
            ('Enquesta al client enviada', 'Enviar formulari per recollir detalls de l''actuació', 'Sol·licitat', true, 3),
            ('Fitxa de client completa', 'Assegurar que totes les dades del client estan omplides', 'Sol·licitat', true, 4)
        ) AS t(titol, descripcio, fase, obligatoria, ordre)
        WHERE NOT EXISTS (
            SELECT 1 FROM bolo_tasques 
            WHERE bolo_id = p_bolo_id 
            AND fase_associada = 'Sol·licitat' 
            AND titol = t.titol
        );
    
    ELSIF p_fase = 'Confirmat' THEN
        INSERT INTO bolo_tasques (bolo_id, titol, descripcio, fase_associada, obligatoria, origen, ordre)
        SELECT p_bolo_id, titol, descripcio, fase, obligatoria, 'automatica', ordre
        FROM (VALUES
            ('Pressupost acceptat', 'Confirmació per part del client de la proposta econòmica', 'Confirmat', false, 1),
            ('Convocatòria enviada als músics', 'Enviar detalls de l''actuació a tots els músics confirmats', 'Confirmat', false, 2),
            ('Enquesta de disponibilitat als músics enviada', 'Recollir confirmació d''assistència dels músics', 'Confirmat', false, 3),
            ('Calendari actualitzat', 'Afegir l''actuació al calendari oficial de la xaranga', 'Confirmat', false, 4),
            ('Material i logística organitzats', 'Preparar instruments, roba i transport necessari', 'Confirmat', false, 5),
            ('Actuació acabada', 'Marcar com a realitzada després de l''actuació', 'Confirmat', true, 6),
            ('Factura enviada', 'Enviar factura al client', 'Confirmat', true, 7),
            ('Cobrat', 'Confirmar recepció del pagament del client', 'Confirmat', true, 8)
        ) AS t(titol, descripcio, fase, obligatoria, ordre)
        WHERE NOT EXISTS (
            SELECT 1 FROM bolo_tasques 
            WHERE bolo_id = p_bolo_id 
            AND fase_associada = 'Confirmat' 
            AND titol = t.titol
        );
    
    ELSIF p_fase = 'Tancat' THEN
        INSERT INTO bolo_tasques (bolo_id, titol, descripcio, fase_associada, obligatoria, origen, ordre)
        SELECT p_bolo_id, titol, descripcio, fase, obligatoria, 'automatica', ordre
        FROM (VALUES
            ('Pagaments a músics planificats', 'Calcular i preparar els pagaments individuals', 'Tancat', false, 1),
            ('Pagaments a músics fets', 'Confirmar que tots els músics han cobrat', 'Tancat', false, 2),
            ('Bolo arxivat / registrat', 'Arxivar tota la documentació i tancar el bolo', 'Tancat', false, 3)
        ) AS t(titol, descripcio, fase, obligatoria, ordre)
        WHERE NOT EXISTS (
            SELECT 1 FROM bolo_tasques 
            WHERE bolo_id = p_bolo_id 
            AND fase_associada = 'Tancat' 
            AND titol = t.titol
        );
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 4. TRIGGER PER CREAR TASQUES AUTOMÀTICAMENT EN CREAR UN BOLO
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_create_initial_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear tasques de la fase inicial (Sol·licitat)
    PERFORM create_automatic_tasks_for_phase(NEW.id, NEW.estat);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_bolo_insert_create_tasks
    AFTER INSERT ON public.bolos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_initial_tasks();


-- 5. TRIGGER PER CREAR TASQUES EN CANVIAR DE FASE
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_create_tasks_on_phase_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Si l'estat ha canviat, crear tasques de la nova fase
    IF OLD.estat IS DISTINCT FROM NEW.estat THEN
        PERFORM create_automatic_tasks_for_phase(NEW.id, NEW.estat);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_bolo_update_create_tasks
    AFTER UPDATE ON public.bolos
    FOR EACH ROW
    WHEN (OLD.estat IS DISTINCT FROM NEW.estat)
    EXECUTE FUNCTION trigger_create_tasks_on_phase_change();


-- 6. EXECUTAR MIGRACIÓ DE BOLOS EXISTENTS
-- ============================================================================
-- IMPORTANT: Executar només una vegada!

-- Descomentar la següent línia per executar la migració:
-- SELECT migrate_existing_checklist_to_tasques();

-- NOTA: Després de la migració, els camps booleans de la taula bolos
--       es poden mantenir per compatibilitat o eliminar en una migració futura.
