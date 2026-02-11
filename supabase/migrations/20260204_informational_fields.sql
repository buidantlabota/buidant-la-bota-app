-- ============================================================================
-- CAMPS INFORMATIUS DE MENJAR I UNIFICACIÓ DE TIPUS D'INGRÉS
-- ============================================================================

-- 1. AFEGIR CAMPS INFORMATIUS DE MENJAR
ALTER TABLE public.bolos 
ADD COLUMN IF NOT EXISTS menjar_esmorzar boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS menjar_dinar boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS menjar_sopar boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS menjar_barra_lliure boolean NOT NULL DEFAULT false;

-- 2. COMENTARIS DELS CAMPS
COMMENT ON COLUMN public.bolos.menjar_esmorzar IS 'Informa si hi ha esmorzar inclòs (no vinculant)';
COMMENT ON COLUMN public.bolos.menjar_dinar IS 'Informa si hi ha dinar inclòs (no vinculant)';
COMMENT ON COLUMN public.bolos.menjar_sopar IS 'Informa si hi ha sopar inclòs (no vinculant)';
COMMENT ON COLUMN public.bolos.menjar_barra_lliure IS 'Informa si hi ha barra lliure (no vinculant)';

-- 3. UNIFICACIÓ DE TEXTOS DE TIPUS D'INGRÉS (A nivell de dada si calgués, 
-- però ho farem principalment a la UI segons la petició: FACTURA -> Factura, B -> Efectiu, ALTRES -> Altres)
-- Si volem normalitzar la DB:
-- UPDATE public.bolos SET tipus_ingres = 'Factura' WHERE tipus_ingres = 'FACTURA';
-- UPDATE public.bolos SET tipus_ingres = 'Efectiu' WHERE tipus_ingres = 'B';
-- UPDATE public.bolos SET tipus_ingres = 'Altres' WHERE tipus_ingres = 'ALTRES';
