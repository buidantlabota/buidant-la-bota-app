-- Seed: Initial clients data
-- Created: 2024-12-13
-- Description: Inserts 26 initial clients with deduplication

BEGIN;

-- Insert clients with ON CONFLICT to avoid duplicates
-- Deduplication by NIF (if provided) or by nom

INSERT INTO clients (nom, nif, altres, rao_social, poblacio, adreca, codi_postal, tipus_client, requereix_efactura)
VALUES
    ('AJUNTAMENT MOIÀ', NULL, NULL, NULL, NULL, NULL, NULL, 'ajuntament', true),
    ('AJUNTAMENT OLÓ', NULL, NULL, NULL, NULL, NULL, NULL, 'ajuntament', true),
    ('AJUNTAMENT PONT', 'P0818100J', 'Oficina d''Atenció Ciutadana (OAC)', 'Ajuntament del Pont de Vilomara i Rocafort', 'El Pont de Vilomara i Rocafort', 'Pl. de l''Ajuntament, 1', '08254', 'ajuntament', false),
    ('AJUNTAMENT VIC', 'ESP0829900J', NULL, 'Ajuntament de Vic', 'Vic', 'C/ Ciutat, 1', '08500', 'ajuntament', true),
    ('AJUNTAMENT ARTÉS', 'P0801000A', NULL, 'Ajuintament d''Artés', 'Artés', 'C/ Barquera, 41', '08271', 'ajuntament', true),
    ('AMPA Llar d''Infants Municipal L''Estel', 'G60860798', NULL, 'AMPA Llar d''Infants Municipal L''Estel', 'Avinyó', 'C/Industria, s/n', '08279', 'ampa', false),
    ('AMPA CEIP BARNOLA', 'G08922874', NULL, 'AMPA CEIP BARNOLA', 'Avinyó', 'C/Industria, 6', '08279', 'ampa', false),
    ('AJUNTAMENT CALLÚS', 'P0803700D', NULL, 'Ajuntament de Callús', 'Callús', 'Pl/ Major, 1', '08262', 'ajuntament', false),
    ('UNIÓ DE BOTIGUERS I COMERCIANTS DE MANRESA', 'G58116435', NULL, 'UNIÓ DE BOTIGUERS I COMERCIANTS DE MANRESA', 'Manresa', 'Pl. del Mercat, s/n - Edifici Can Jorba', '08241', 'associacio', false),
    ('UNIÓ DE BOTIGUERS DE PRATS DE LLUÇANÈS', 'G59999151', NULL, 'UNIÓ DE BOTIGUERS I COMERCIANTS DE PRATS', 'Prats de Lluçanes', 'Av. Pau Casals, 8', '08513', 'associacio', false),
    ('AJUNTAMENT DE TONA', 'P0828300D', NULL, 'Ajuntament de Tona', 'Tona', 'Carrer de la Font, 10', '08551', 'ajuntament', true),
    ('ASSOCIACIÓ SANT FRUITÓS COMERÇ ACTIU', 'G65809527', NULL, 'ASSOCIACIÓ SANT FRUITÓS COMERÇ ACTIU', 'Sant Fruitos de Bages', 'C/ Joan XXIII, 5', '08272', 'associacio', false),
    ('AJUNTAMENT DE SALLENT', 'P0819000A', NULL, 'Ajuntament de Sallent', 'Sallent', 'Pl/ Vila, 1', '08650', 'ajuntament', false),
    ('AFA ESCOLA DOCOR FERRER', 'G59862425', NULL, 'AFA ESCOLA DOCTOR FERRER', 'Artés', 'C/ Barcelona, 23', '08271', 'associacio', false),
    ('GEGANTS CARRER RIERA', 'G65327348', NULL, 'Associació de geganters i grallers del carrer de la Riera de Vic', 'Vic', 'C/ de les Basses, 3', '08500', 'associacio', false),
    ('ASSOCIACIÓ COLLA GEGANTERA DE CALDES DE MALAVELLA', 'G17472572', NULL, 'Associació Colla Gegantera de Caldes de Malavella', 'Caldes de Malavella', 'Casa dels gegants, Pl CruÏlles 1', '17455', 'associacio', false),
    ('El SIDRAL', 'G62216353', NULL, 'El Sidral', 'Sant Joan de Vilatorrada', 'C/Alzines,20, baixos', '08250', 'empresa', false),
    ('AFA JOR', 'G58401167', NULL, 'AFA JOR', 'Moià', 'C/ Miquel Vilarrúbia,12', '08180', 'associacio', false),
    ('AJUNTAMENT DE TORTELLÀ', 'P1721300J', NULL, 'Ajuntament de Tortellà', 'Tortellà', 'Plaça Mercat, 21', '17853', 'ajuntament', false),
    ('AJUNTAMENT DE SANT JULIÀ DE VILATORTA', 'P0821800J', NULL, 'Ajuntament de Sant Julià de Vilatorta', 'Sant Julià de Vilatorta', 'Pl/ de l''U d''Octubre, 1', '08504', 'ajuntament', false),
    ('AJUNTAMENT DE PALAU D''ANGLESOLA', 'P2589100C', NULL, 'Ajuntament de Palau d''Anglesola', 'Palau d''Anglesola', 'C/ Sant Josep, 1', '25243', 'ajuntament', false),
    ('GEGANTS CALELLA', 'V61320115', NULL, 'Colla de Geganters i Grallers de Calella', 'Calella', 'C/ Sant Jaume (fàbrica LLobet), 339, 1er pis', '08370', 'associacio', false),
    ('AJUNTAMENT DE MARGANELL', 'P0824200J', NULL, 'Ajuntament de Marganell', 'Marganell', 'C/ Sant Esteve S/N', '08298', 'ajuntament', false),
    ('AJUNTAMENT DE SANT FRUITÓS DE BAGES', 'P0821200C', NULL, 'Ajuntament de Sant Fruitós de Bages', 'Sant Frutiós de Bages', 'C/ Vic, 35-37', '08272', 'ajuntament', false),
    ('AJUNTAMENT DE MASQUEFA', 'P0811800B', NULL, 'Ajuntament de Masquefa', 'Masquefa', 'C/Major, 93', '08783', 'ajuntament', false),
    ('AJUNTAMENT DE BLANES', 'P1702600F', NULL, 'Ajuntament de Blanes', 'Blanes', 'Passeig de Dintre,29', '17300', 'ajuntament', false)
ON CONFLICT DO NOTHING;

COMMIT;
