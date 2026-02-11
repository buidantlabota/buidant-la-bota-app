-- Migration to update view_economia_bolos to include payment flags
-- Created at: 2024-12-14

BEGIN;

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
    tipus_ingres,
    cobrat,
    pagaments_musics_fets
FROM bolos
ORDER BY data_bolo DESC;

COMMIT;
