-- Migració per afegir les columnes 'status' mancants a les taules de facturació
-- Aquest error sol aparèixer quan el codi intenta inserir una columna que no existeix en el schema actual.

-- 1. Afegir la columna 'status' a invoice_records si no existeix
ALTER TABLE invoice_records 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- 2. Afegir la columna 'status' a quote_records si no existeix
ALTER TABLE quote_records 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
