-- Migration: Add email tracking columns to solicituds table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicituds' AND column_name = 'client_email_sent_at') THEN
        ALTER TABLE solicituds ADD COLUMN client_email_sent_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicituds' AND column_name = 'internal_email_sent_at') THEN
        ALTER TABLE solicituds ADD COLUMN internal_email_sent_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'solicituds' AND column_name = 'email_error') THEN
        ALTER TABLE solicituds ADD COLUMN email_error TEXT;
    END IF;
END $$;
