-- Create leads table for public form submissions
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telefon TEXT,
  data_event DATE,
  tipus_acte TEXT,
  municipi TEXT,
  pressupost NUMERIC,
  missatge TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role access but deny public insert/select (standard)
-- Note: Service role always bypasses RLS, so this table will be safe from direct browser access.
