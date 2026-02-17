-- Script to import municipis from CSV
-- Step 1: Delete existing municipis
DELETE FROM public.municipis;

-- Step 2: You'll need to run the Node.js script to generate the INSERT statements
-- Or manually copy-paste the CSV data here

-- Temporary solution: Run this in your terminal to generate the SQL:
-- node scripts/generate-municipis-sql.js > scripts/insert-municipis.sql
