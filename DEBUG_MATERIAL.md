# DEBUG: Assignació Automàtica de Material

## Problema Reportat
1. El botó d'assignació automàtica no funciona dins de la pàgina de gestió de roba
2. Les talles no es detecten correctament (sempre surt L en lloc de la talla real)
3. No es pot editar una assignació existent

## Passos per Debugar

### 1. Verificar Talles a la Base de Dades

Obre Supabase SQL Editor i executa:
```sql
-- Veure totes les talles
SELECT id, nom, talla_samarreta, tipus FROM musics ORDER BY nom;

-- Veure Pere Montserrat específicament
SELECT * FROM musics WHERE nom LIKE '%Pere%' AND nom LIKE '%Montserrat%';
```

Si Pere Montserrat no té `talla_samarreta = 'XL'`, actualitza-ho:
```sql
UPDATE musics SET talla_samarreta = 'XL' 
WHERE nom LIKE '%Pere%' AND nom LIKE '%Montserrat%';
```

### 2. Verificar Estoc Disponible

```sql
-- Veure tot l'estoc de samarretes
SELECT 
    ist.id,
    ic.name,
    ist.size,
    ist.quantity_total
FROM inventory_stock ist
JOIN inventory_catalog ic ON ist.catalog_id = ic.id
WHERE ic.type = 'samarreta'
ORDER BY ist.size;
```

Assegura't que existeix estoc amb `size = 'XL'`.

### 3. Provar Assignació Automàtica

1. Ves a **Gestió de Roba** > **Per Bolo**
2. Selecciona un bolo
3. Obre la **Consola del Navegador** (F12)
4. Clica **Assignació Automàtica**
5. Revisa els logs a la consola:

Hauries de veure:
```
=== INICI ASSIGNACIÓ AUTOMÀTICA ===
Bolo ID: xxx
Total músics suplents: X
Estoc disponible: [...]

--- Processant músic: Pere Montserrat ---
  Talla a BD: "XL"
  Samarreta: Intentant assignar
  Buscant estoc: catalog_id=xxx, size="XL"
  Estoc trobat: ID=xxx, Talla=XL, Total=X
  ✅ Samarreta talla XL assignada!
```

### 4. Si Continua Fallant

**Problema Possible**: La columna `talla_samarreta` pot tenir espais en blanc o caràcters estranys.

Neteja les talles:
```sql
UPDATE musics 
SET talla_samarreta = TRIM(talla_samarreta) 
WHERE talla_samarreta IS NOT NULL;
```

### 5. Verificar Assignacions Actuals

```sql
SELECT 
    m.nom,
    m.talla_samarreta as talla_music,
    ml.item_type,
    ist.size as talla_assignada,
    b.nom_poble
FROM material_loans ml
JOIN musics m ON ml.suplent_id = m.id
LEFT JOIN inventory_stock ist ON ml.stock_id = ist.id
LEFT JOIN bolos b ON ml.bolo_id = b.id
WHERE ml.status = 'prestat'
ORDER BY m.nom;
```

## Solucions Implementades

✅ **Logs extensius**: Ara pots veure exactament què passa a cada pas
✅ **No usa valor per defecte**: Si no hi ha talla, salta el músic
✅ **Busca talla exacta**: `s.size === musicianSize` (sense fallback)
✅ **Edició funcional**: Pots editar assignacions existents
✅ **Dessuadores estacionals**: Només de setembre a abril

## Contacte
Si continua sense funcionar després de seguir aquests passos, comparteix els logs de la consola.
