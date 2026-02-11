-- Add google_event_id to bolos
ALTER TABLE IF EXISTS bolos 
ADD COLUMN IF NOT EXISTS google_event_id TEXT NULL;

-- Create oauth_tokens table (Singleton pattern enforced by provider unique constraint)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL UNIQUE, -- 'google'
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expiry timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create Policy: Only allow service_role to access (no authenticated user access)
CREATE POLICY "Service role only" ON oauth_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant access to service_role (explicitly, though often default)
GRANT ALL ON oauth_tokens TO service_role;
