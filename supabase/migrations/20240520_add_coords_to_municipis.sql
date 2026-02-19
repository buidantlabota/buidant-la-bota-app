-- SQL for adding lat/lng columns to the municipis table
ALTER TABLE municipis ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE municipis ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Comment for documentation
COMMENT ON COLUMN municipis.lat IS 'Latitud del cap de municipi';
COMMENT ON COLUMN municipis.lng IS 'Longitud del cap de municipi';
