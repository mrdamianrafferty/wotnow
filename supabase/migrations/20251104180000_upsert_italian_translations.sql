-- SQL Upsert for Italian Translations
-- Generated from translations-needed-it.csv
-- Updates Italian names (it) for species in the database
-- Matches species by species_code

-- Add Italian column if it doesn't exist
ALTER TABLE species ADD COLUMN IF NOT EXISTS it TEXT;

-- Ballan Wrasse
UPDATE species
SET
  it = 'Tordo marvizzo'
WHERE species_code = 'WRB';

-- Black Seabream
UPDATE species
SET
  it = 'Tanuta'
WHERE species_code = 'BRS';

-- Blackbelly Rosefish
UPDATE species
SET
  it = 'Scorfano atlantico'
WHERE species_code = 'BBR';

-- Brill
UPDATE species
SET
  it = 'Rombo liscio'
WHERE species_code = 'BLL';

-- Common Ling
UPDATE species
SET
  it = 'Molva'
WHERE species_code = 'LIN';

-- Conger Eel
UPDATE species
SET
  it = 'Grongo'
WHERE species_code = 'CON';

-- Cuckoo Wrasse
UPDATE species
SET
  it = 'Tordo codanera'
WHERE species_code = 'WRC';

-- Dab
UPDATE species
SET
  it = 'Limanda comune'
WHERE species_code = 'DAB';

-- Dentex
UPDATE species
SET
  it = 'Dentice comune'
WHERE species_code = 'DEX';

-- Dover Sole
UPDATE species
SET
  it = 'Sogliola comune'
WHERE species_code = 'SOL';

-- Flounder
UPDATE species
SET
  it = 'Passera di mare'
WHERE species_code = 'FLE';

-- Garfish (Needlefish)
UPDATE species
SET
  it = 'Aguglia'
WHERE species_code = 'GAR';

-- Horse Mackerel
UPDATE species
SET
  it = 'Sugarello'
WHERE species_code = 'HOM';

-- John Dory
UPDATE species
SET
  it = 'Pesce San Pietro'
WHERE species_code = 'JOD';

-- Mackerel
UPDATE species
SET
  it = 'Sgombro'
WHERE species_code = 'MAC';

-- Megrim
UPDATE species
SET
  it = 'Megrino'
WHERE species_code = 'LDB';

-- Parrotfish
UPDATE species
SET
  it = 'Pesce pappagallo'
WHERE species_code = 'PAR';

-- Plaice
UPDATE species
SET
  it = 'Platessa'
WHERE species_code = 'PLE';

-- Pollack
UPDATE species
SET
  it = 'Pollack'
WHERE species_code = 'POL';

-- Red Mullet
UPDATE species
SET
  it = 'Triglia di scoglio'
WHERE species_code = 'MUL';

-- Red Seabream
UPDATE species
SET
  it = 'Occhione'
WHERE species_code = 'SBR';

-- Sand Eel
UPDATE species
SET
  it = 'Pesce ago di sabbia'
WHERE species_code = 'SAN';

-- Sardine
UPDATE species
SET
  it = 'Sardina'
WHERE species_code = 'PIL';

-- Sea Bass
UPDATE species
SET
  it = 'Branzino (Spigola)'
WHERE species_code = 'BSS';

-- Sea Bream (Dorada)
UPDATE species
SET
  it = 'Orata'
WHERE species_code = 'SBA';

-- Sea Trout
UPDATE species
SET
  it = 'Trota di mare'
WHERE species_code = 'TRS';

-- Sprat
UPDATE species
SET
  it = 'Spratto'
WHERE species_code = 'SPR';

-- Thornback Ray
UPDATE species
SET
  it = 'Razza chiodata'
WHERE species_code = 'RJC';

-- Tub Gurnard
UPDATE species
SET
  it = 'Gallinella'
WHERE species_code = 'GUG';

-- Turbot (Small)
UPDATE species
SET
  it = 'Rombo chiodato'
WHERE species_code = 'TUR';

-- Whiting
UPDATE species
SET
  it = 'Merlano'
WHERE species_code = 'WHG';

-- Wrasse (various)
UPDATE species
SET
  it = 'Labridi'
WHERE species_code = 'WRA';

