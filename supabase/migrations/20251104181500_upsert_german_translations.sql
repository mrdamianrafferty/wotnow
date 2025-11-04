-- SQL Upsert for German Translations
-- Generated from translations-needed-de.csv
-- Updates German names (name_de) for species in the database
-- Matches species by species_code

-- Add German column if it doesn't exist
ALTER TABLE species ADD COLUMN IF NOT EXISTS name_de TEXT;

-- Atlantic Bonito
UPDATE species
SET
  name_de = 'Pelamide'
WHERE species_code = 'BONITO';

-- Atlantic Chub Mackerel
UPDATE species
SET
  name_de = 'Bastardmakrele'
WHERE species_code = 'CHUB-MACK';

-- Atlantic Halibut
UPDATE species
SET
  name_de = 'Atlantischer Heilbutt'
WHERE species_code = 'HAL';

-- Atlantic Herring
UPDATE species
SET
  name_de = 'Atlantischer Hering'
WHERE species_code = 'HER';

-- Atlantic Pollock (Saithe)
UPDATE species
SET
  name_de = 'Köhler (Seelachs)'
WHERE species_code = 'POK';

-- Atlantic Salmon
UPDATE species
SET
  name_de = 'Atlantischer Lachs'
WHERE species_code = 'ATS';

-- Ballan Wrasse
UPDATE species
SET
  name_de = 'Lippfisch'
WHERE species_code = 'WRB';

-- Common Cuttlefish
UPDATE species
SET
  name_de = 'Gemeine Sepia'
WHERE species_code = 'CUT';

-- Common Ling
UPDATE species
SET
  name_de = 'Leng'
WHERE species_code = 'LIN';

-- Common Octopus
UPDATE species
SET
  name_de = 'Gemeiner Krake'
WHERE species_code = 'OCT';

-- Common Squid
UPDATE species
SET
  name_de = 'Gewöhnlicher Pfeilkalmar'
WHERE species_code = 'SQC';

-- Common Thresher
UPDATE species
SET
  name_de = 'Fuchshai'
WHERE species_code = '61158a';

-- Conger Eel
UPDATE species
SET
  name_de = 'Meeraal'
WHERE species_code = 'CON';

-- Cuckoo Wrasse
UPDATE species
SET
  name_de = 'Kuckuckslippfisch'
WHERE species_code = 'WRC';

-- Dab
UPDATE species
SET
  name_de = 'Kliesche'
WHERE species_code = 'DAB';

-- Dentex
UPDATE species
SET
  name_de = 'Zahnbrasse'
WHERE species_code = 'DEX';

-- Dover Sole
UPDATE species
SET
  name_de = 'Seezunge'
WHERE species_code = 'SOL';

-- Dusky Grouper
UPDATE species
SET
  name_de = 'Zackenbarsch'
WHERE species_code = 'DUSK-GROUP';

-- European Barracuda
UPDATE species
SET
  name_de = 'Mittelmeer-Barrakuda'
WHERE species_code = 'EURO-CUDA';

-- Flounder
UPDATE species
SET
  name_de = 'Flunder'
WHERE species_code = 'FLE';

-- Garfish (Needlefish)
UPDATE species
SET
  name_de = 'Hornhecht'
WHERE species_code = 'GAR';

-- Greater Amberjack
UPDATE species
SET
  name_de = 'Bernsteinmakrele'
WHERE species_code = 'GAJ';

-- Greater Weever
UPDATE species
SET
  name_de = 'Petermännchen'
WHERE species_code = 'WEE';

-- Grey Mullet
UPDATE species
SET
  name_de = 'Große Meeräsche'
WHERE species_code = 'FGM';

-- Haddock
UPDATE species
SET
  name_de = 'Schellfisch'
WHERE species_code = 'HAD';

-- Horse Mackerel
UPDATE species
SET
  name_de = 'Pferdemakrele'
WHERE species_code = 'HOM';

-- John Dory
UPDATE species
SET
  name_de = 'Petersfisch'
WHERE species_code = 'JOD';

-- Leerfish
UPDATE species
SET
  name_de = 'Leerfisch'
WHERE species_code = 'LEERFISH';

-- Meagre
UPDATE species
SET
  name_de = 'Umberfisch'
WHERE species_code = 'MEAGRE';

-- Mediterranean Scad
UPDATE species
SET
  name_de = 'Mittelmeer-Pferdemakrele'
WHERE species_code = 'MED-SCAD';

-- Plaice
UPDATE species
SET
  name_de = 'Scholle'
WHERE species_code = 'PLE';

-- Pollack
UPDATE species
SET
  name_de = 'Pollack'
WHERE species_code = 'POL';

-- Red Mullet
UPDATE species
SET
  name_de = 'Rotbarbe'
WHERE species_code = 'MUL';

-- Red Scorpionfish
UPDATE species
SET
  name_de = 'Roter Drachenkopf'
WHERE species_code = 'RED-SCORP';

-- Red Seabream
UPDATE species
SET
  name_de = 'Rotbrasse'
WHERE species_code = 'SBR';

-- Saddled Seabream
UPDATE species
SET
  name_de = 'Ringelbrasse'
WHERE species_code = 'SADD-BREAM';

-- Sand Eel
UPDATE species
SET
  name_de = 'Sandaal'
WHERE species_code = 'SAN';

-- Sardine
UPDATE species
SET
  name_de = 'Sardine'
WHERE species_code = 'PIL';

-- Sea Bass
UPDATE species
SET
  name_de = 'Wolfsbarsch'
WHERE species_code = 'BSS';

-- Sea Bream (Dorada)
UPDATE species
SET
  name_de = 'Goldbrasse (Dorade)'
WHERE species_code = 'SBA';

-- Sea Trout
UPDATE species
SET
  name_de = 'Meerforelle'
WHERE species_code = 'TRS';

-- Small-spotted Catshark
UPDATE species
SET
  name_de = 'Kleingefleckter Katzenhai'
WHERE species_code = 'SCY';

-- Sprat
UPDATE species
SET
  name_de = 'Sprotte'
WHERE species_code = 'SPR';

-- Thicklip Grey Mullet
UPDATE species
SET
  name_de = 'Dicklippige Meeräsche'
WHERE species_code = 'MUG';

-- Thornback Ray
UPDATE species
SET
  name_de = 'Dornrochen'
WHERE species_code = 'RJC';

-- Tub Gurnard
UPDATE species
SET
  name_de = 'Roter Knurrhahn'
WHERE species_code = 'GUG';

-- Turbot (Small)
UPDATE species
SET
  name_de = 'Steinbutt'
WHERE species_code = 'TUR';

-- Two-banded Seabream
UPDATE species
SET
  name_de = 'Zweibindenbrasse'
WHERE species_code = '2BD-BREAM';

-- White Grouper
UPDATE species
SET
  name_de = 'Weißer Zackenbarsch'
WHERE species_code = 'WHIT-GROUP';

-- White Seabream
UPDATE species
SET
  name_de = 'Geißbrasse'
WHERE species_code = 'WHT-BREAM';

-- Whiting
UPDATE species
SET
  name_de = 'Wittling'
WHERE species_code = 'WHG';

-- Wrasse (various)
UPDATE species
SET
  name_de = 'Lippfische'
WHERE species_code = 'WRA';

-- Wreckfish
UPDATE species
SET
  name_de = 'Wrackbarsch'
WHERE species_code = 'WRK2';

-- Yellowmouth Barracuda
UPDATE species
SET
  name_de = 'Gelbmaul-Barrakuda'
WHERE species_code = 'YEL-CUDA';

