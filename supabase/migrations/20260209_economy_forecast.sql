-- Create table for forecast items (expenses and investments)
CREATE TABLE IF NOT EXISTS forecast_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('expense', 'investment')),
    name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0 NOT NULL,
    date DATE, -- Planned date
    category TEXT, -- For expenses
    status TEXT DEFAULT 'idea', -- For investments: idea, planned, approved
    is_active BOOLEAN DEFAULT true, -- For expenses: active; For investments: include_in_calc
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE forecast_items ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (same pattern as other tables in this app)
DROP POLICY IF EXISTS "allow_all_forecast_items" ON forecast_items;
CREATE POLICY "allow_all_forecast_items" ON forecast_items FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON forecast_items TO anon, authenticated, service_role;


-- Create table for economy settings (singleton)
CREATE TABLE IF NOT EXISTS economy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reserve_min NUMERIC DEFAULT 0 NOT NULL,
    default_horizon_days INTEGER DEFAULT 90,
    -- Singleton constraint
    is_singleton BOOLEAN DEFAULT true CHECK (is_singleton) UNIQUE
);

-- Enable RLS
ALTER TABLE economy_settings ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "allow_all_economy_settings" ON economy_settings;
CREATE POLICY "allow_all_economy_settings" ON economy_settings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON economy_settings TO anon, authenticated, service_role;

-- Insert default row if not exists
INSERT INTO economy_settings (reserve_min, default_horizon_days)
SELECT 0, 90
WHERE NOT EXISTS (SELECT 1 FROM economy_settings);
