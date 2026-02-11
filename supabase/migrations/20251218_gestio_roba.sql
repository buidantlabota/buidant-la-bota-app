-- Migration for Clothing and Inventory Management
-- Created at: 2025-12-18
-- Description: Adds tables for inventory catalog, stock (roba), individual items (llibrets), and loans.

BEGIN;

-- 1. Material Types / Catalog
CREATE TABLE IF NOT EXISTS inventory_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('samarreta', 'dessuadora', 'llibret', 'altre')),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON inventory_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Inventory Stock (For bulk items like clothes with sizes)
CREATE TABLE IF NOT EXISTS inventory_stock (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id uuid REFERENCES inventory_catalog(id) ON DELETE CASCADE,
    size text NOT NULL,
    quantity_total int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(catalog_id, size)
);

ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON inventory_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Individual Items (For individually tracked items like booklets)
CREATE TABLE IF NOT EXISTS inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id uuid REFERENCES inventory_catalog(id) ON DELETE CASCADE,
    identifier text NOT NULL, -- e.g. "Trompeta #1"
    status text DEFAULT 'disponible' CHECK (status IN ('disponible', 'retirat', 'reparacio')), -- 'prestat' is derived from active loans? Or explicitly updated?
    -- Let's stick to 'disponible' / 'retirat' here. 'Prestat' is a transient state better calculated, 
    -- BUT for simplicity in UI, we might want to sync it. 
    -- However, the prompt implies "estat: disponible / prestat". 
    -- Let's allow 'prestat' here for easier querying, updated via triggers or app logic.
    -- Added 'prestat' to check.
    created_at timestamptz DEFAULT now()
);
-- Update check constraint to include 'prestat'
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_check;
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_status_check CHECK (status IN ('disponible', 'prestat', 'retirat', 'reparacio'));

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Material Loans / Assignments
CREATE TABLE IF NOT EXISTS material_loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bolo_id bigint REFERENCES bolos(id) ON DELETE SET NULL,
    suplent_id uuid REFERENCES musics(id) ON DELETE SET NULL,
    
    -- We can link to either stock or item
    stock_id uuid REFERENCES inventory_stock(id) ON DELETE SET NULL, -- If it's a bulk item
    item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL, -- If it's an individual item
    
    -- Redundant but useful info
    item_type text NOT NULL CHECK (item_type IN ('samarreta', 'dessuadora', 'llibret', 'altre')),
    
    loan_date date DEFAULT CURRENT_DATE,
    return_date_expected date,
    return_date_real date,
    
    status text DEFAULT 'prestat' CHECK (status IN ('prestat', 'retornat', 'perdut')),
    notes text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE material_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON material_loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Helper View for Stock Availability (Optional but helpful)
CREATE OR REPLACE VIEW view_inventory_status WITH (security_invoker = true) AS
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

-- 6. Initial Seed Data (as per prompt)
DO $$
DECLARE
    v_cat_samarreta uuid;
    v_cat_dessuadora uuid;
    v_cat_llibret uuid;
BEGIN
    -- Catalog
    INSERT INTO inventory_catalog (name, type) VALUES ('Samarreta Oficial', 'samarreta') RETURNING id INTO v_cat_samarreta;
    INSERT INTO inventory_catalog (name, type) VALUES ('Dessuadora Oficial', 'dessuadora') RETURNING id INTO v_cat_dessuadora;
    INSERT INTO inventory_catalog (name, type) VALUES ('Llibret Partitures', 'llibret') RETURNING id INTO v_cat_llibret;

    -- Stock Samarreta: 2 L, 1 XL, 1 M
    INSERT INTO inventory_stock (catalog_id, size, quantity_total) VALUES (v_cat_samarreta, 'M', 1);
    INSERT INTO inventory_stock (catalog_id, size, quantity_total) VALUES (v_cat_samarreta, 'L', 2);
    INSERT INTO inventory_stock (catalog_id, size, quantity_total) VALUES (v_cat_samarreta, 'XL', 1);

    -- Stock Dessuadora: 2 L, 1 XL
    INSERT INTO inventory_stock (catalog_id, size, quantity_total) VALUES (v_cat_dessuadora, 'L', 2);
    INSERT INTO inventory_stock (catalog_id, size, quantity_total) VALUES (v_cat_dessuadora, 'XL', 1);
    
    -- Items Llibret (Examples)
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_llibret, 'Llibret Trompeta #1', 'disponible');
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_llibret, 'Llibret Saxo #1', 'disponible');
    INSERT INTO inventory_items (catalog_id, identifier, status) VALUES (v_cat_llibret, 'Llibret General 2024', 'disponible');
END;
$$;

COMMIT;
