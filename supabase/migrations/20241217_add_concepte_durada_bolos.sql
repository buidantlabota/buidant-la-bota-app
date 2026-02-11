-- Afegir camps 'concepte' i 'durada' a la taula bolos
ALTER TABLE bolos 
ADD COLUMN IF NOT EXISTS concepte TEXT,
ADD COLUMN IF NOT EXISTS durada INTEGER; -- durada en minuts

-- Comentaris per documentar
COMMENT ON COLUMN bolos.concepte IS 'Descripció del concepte de l''actuació (ex: Cercavila de Festa Major)';
COMMENT ON COLUMN bolos.durada IS 'Durada estimada de l''actuació en minuts';
