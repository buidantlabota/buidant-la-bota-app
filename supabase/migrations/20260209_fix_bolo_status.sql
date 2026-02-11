-- 1. Fix 'Tancat' -> 'Tancades'
UPDATE bolos 
SET estat = 'Tancades' 
WHERE estat = 'Tancat';

-- 2. Fix 'Cancel·lat' and others -> 'Cancel·lats' (Now using Plural as requested)
UPDATE bolos 
SET estat = 'Cancel·lats' 
WHERE estat IN ('Cancel·lat', 'Cancelats', 'Cancel·lada', 'Anul·lat');
