-- Add google_event_id to bolos
ALTER TABLE bolos 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create oauth_tokens table (Singleton for 'google' provider logic)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE CHECK (provider IN ('google')),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can do anything.
-- We do NOT want client-side access to tokens.
-- However, Supabase RLS policies usually apply to 'anon' and 'authenticated'.
-- 'service_role' bypasses RLS.
-- So we strictly DENY all for anon/authenticated.

CREATE POLICY "Deny all access to oauth_tokens for clients" 
ON oauth_tokens
FOR ALL 
TO anon, authenticated
USING (false)
WITH CHECK (false);
