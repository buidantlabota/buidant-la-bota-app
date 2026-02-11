-- 1. Add 'type' column to differentiate between Invoices and Quotes
ALTER TABLE invoice_records 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'factura' CHECK (type IN ('factura', 'pressupost'));

-- 2. Add 'status' column if missing (useful for quotes: pending, accepted, rejected)
ALTER TABLE invoice_records 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- 3. Ensure permissions are WIDE OPEN for this table to avoid RLS headaches
ALTER TABLE invoice_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable all access for all users" ON invoice_records;
DROP POLICY IF EXISTS "Usuaris autenticats poden fer-ho tot a invoice_records" ON invoice_records;

-- Create a blanket policy for EVERYONE (anon + authenticated)
CREATE POLICY "unify_billing_access_policy" 
ON invoice_records 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Grant privileges explicitly
GRANT ALL ON invoice_records TO anon, authenticated, service_role;
