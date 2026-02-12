-- Migration: Add IP address for rate limiting
ALTER TABLE solicituds ADD COLUMN ip_address TEXT;

-- Index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_solicituds_ip_created ON solicituds (ip_address, created_at);
