-- ============================================================================
-- MIGRACIÓ: CORRECCIÓ DE WARNINGS DE SEGURETAT (SUPABASE LINTER)
-- ============================================================================
-- 1. Fix: Function Search Path Mutable
-- 2. Fix: Security Definer View
-- ============================================================================

BEGIN;

-- 1. MODIFICACIÓ DE FUNCIONS (SET search_path = public)
-- ============================================================================

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- migrate_existing_checklist_to_tasques
CREATE OR REPLACE FUNCTION public.migrate_existing_checklist_to_tasques()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- create_automatic_tasks_for_phase
CREATE OR REPLACE FUNCTION public.create_automatic_tasks_for_phase(p_bolo_id bigint, p_fase text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- trigger_create_initial_tasks
CREATE OR REPLACE FUNCTION public.trigger_create_initial_tasks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Crear tasques de la fase inicial (Sol·licitat)
    PERFORM create_automatic_tasks_for_phase(NEW.id, NEW.estat);
    RETURN NEW;
END;
$$;

-- trigger_create_tasks_on_phase_change
CREATE OR REPLACE FUNCTION public.trigger_create_tasks_on_phase_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Si l'estat ha canviat, crear tasques de la nova fase
    IF OLD.estat IS DISTINCT FROM NEW.estat THEN
        PERFORM create_automatic_tasks_for_phase(NEW.id, NEW.estat);
    END IF;
    RETURN NEW;
END;
$$;

-- update_notes_updated_at
CREATE OR REPLACE FUNCTION public.update_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- search_notes
CREATE OR REPLACE FUNCTION public.search_notes(search_query text)
RETURNS TABLE(id uuid, title text, content text, color text, pinned boolean, categoria text, bolo_id bigint, created_at timestamp with time zone, rank real)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.color,
        n.pinned,
        n.categoria,
        n.bolo_id,
        n.created_at,
        ts_rank(
            to_tsvector('catalan', coalesce(n.title, '') || ' ' || n.content),
            plainto_tsquery('catalan', search_query)
        ) as rank
    FROM public.notes n
    WHERE 
        NOT n.archived
        AND to_tsvector('catalan', coalesce(n.title, '') || ' ' || n.content) @@ plainto_tsquery('catalan', search_query)
    ORDER BY rank DESC, n.pinned DESC, n.created_at DESC;
END;
$$;

-- get_upcoming_bolos_with_musicians
CREATE OR REPLACE FUNCTION public.get_upcoming_bolos_with_musicians()
RETURNS TABLE(bolo_id bigint, nom_poble text, municipi_text text, data_bolo date, hora_inici text, estat text, tipus_actuacio text, lineup_confirmed boolean, lineup_no_pot text, lineup_pendent text, lineup_notes text, total_musics bigint, musicians jsonb)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bolo_id,
        b.nom_poble,
        b.municipi_text,
        b.data_bolo,
        b.hora_inici,
        b.estat,
        b.tipus_actuacio,
        b.lineup_confirmed,
        b.lineup_no_pot,
        b.lineup_pendent,
        b.lineup_notes,
        COUNT(bm.id) as total_musics,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', m.id,
                    'nom', m.nom,
                    'instruments', m.instruments,
                    'tipus', bm.tipus,
                    'estat', bm.estat,
                    'note', bm.comentari
                )
                ORDER BY m.instruments, m.nom
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::jsonb
        ) as musicians
    FROM public.bolos b
    LEFT JOIN public.bolo_musics bm ON b.id = bm.bolo_id
    LEFT JOIN public.musics m ON bm.music_id = m.id
    WHERE 
        b.data_bolo >= CURRENT_DATE
        AND b.data_bolo <= CURRENT_DATE + INTERVAL '30 days'
        AND b.estat != 'Cancel·lat'
    GROUP BY b.id
    ORDER BY b.data_bolo, b.hora_inici NULLS LAST;
END;
$$;


-- 2. RECREACIÓ DE LA VISTA (security_invoker = true)
-- ============================================================================

-- Recreem la vista per assegurar que utilitza els permisos de l'usuari que la consulta (INVOKER)
CREATE OR REPLACE VIEW public.view_inventory_status 
WITH (security_invoker = true) 
AS
SELECT
    ic.id as catalog_id,
    ic.name,
    ic.type,
    s.id as stock_id,
    s.size,
    s.quantity_total,
    (
        s.quantity_total - (
            SELECT COUNT(*) 
            FROM material_loans l 
            WHERE l.stock_id = s.id AND l.status = 'prestat'
        )
    ) as quantity_available
FROM inventory_catalog ic
JOIN inventory_stock s ON s.catalog_id = ic.id
WHERE ic.type IN ('samarreta', 'dessuadora', 'altre');

COMMIT;
