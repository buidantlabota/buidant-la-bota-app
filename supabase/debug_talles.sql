-- DEBUG: Verificar talles dels músics
-- Executa això a Supabase SQL Editor per veure les talles actuals

-- 1. Veure tots els músics i les seves talles
SELECT id, nom, talla_samarreta, tipus 
FROM musics 
ORDER BY nom;

-- 2. Veure específicament Pere Montserrat
SELECT id, nom, talla_samarreta, tipus 
FROM musics 
WHERE nom LIKE '%Pere%Montserrat%' OR nom LIKE '%Montserrat%Pere%';

-- 3. Veure tots els préstecs actuals amb les talles assignades
SELECT 
    ml.id,
    m.nom as music_nom,
    m.talla_samarreta as talla_music,
    ml.item_type,
    ist.size as talla_assignada,
    ml.status,
    b.nom_poble
FROM material_loans ml
LEFT JOIN musics m ON ml.suplent_id = m.id
LEFT JOIN inventory_stock ist ON ml.stock_id = ist.id
LEFT JOIN bolos b ON ml.bolo_id = b.id
WHERE ml.status = 'prestat'
ORDER BY m.nom, ml.item_type;

-- 4. Si necessites actualitzar la talla de Pere Montserrat manualment:
-- UPDATE musics SET talla_samarreta = 'XL' WHERE nom LIKE '%Pere%Montserrat%';
