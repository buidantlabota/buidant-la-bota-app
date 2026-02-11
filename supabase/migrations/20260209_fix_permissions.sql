-- Relaxed permissions for billing tables to ensure visibility
-- Run this if invoices are not showing up

-- 1. Invoice Records
ALTER TABLE invoice_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a invoice_records" ON invoice_records;
DROP POLICY IF EXISTS "Enable all access for all users" ON invoice_records;

CREATE POLICY "Enable all access for all users" ON invoice_records
FOR ALL USING (true) WITH CHECK (true);

-- 2. App Config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a app_config" ON app_config;
DROP POLICY IF EXISTS "Enable all access for all users" ON app_config;

CREATE POLICY "Enable all access for all users" ON app_config
FOR ALL USING (true) WITH CHECK (true);

-- 3. Quote Records
ALTER TABLE quote_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a quote_records" ON quote_records;
DROP POLICY IF EXISTS "Enable all access for all users" ON quote_records;

CREATE POLICY "Enable all access for all users" ON quote_records
FOR ALL USING (true) WITH CHECK (true);

-- 4. Grants
GRANT ALL ON invoice_records TO anon, authenticated, service_role;
GRANT ALL ON app_config TO anon, authenticated, service_role;
GRANT ALL ON quote_records TO anon, authenticated, service_role;
