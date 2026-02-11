-- Fix missing updated_at column in clients table
-- This column was intended to be added by 20241213_enhance_clients.sql but was skipped if table existed
-- Description: Explicitly adds updated_at column

BEGIN;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

COMMIT;
