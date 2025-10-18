-- Fix biogeographic regions based on actual species advice data
-- This replaces the incorrect temperature-based logic

-- Ballan Wrasse
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'North Sea'] WHERE name_en = 'Ballan Wrasse';

-- Bass (Shore-Caught) - note: might be stored as "European Seabass" or "Sea Bass"
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'North Sea', 'English Channel'] WHERE name_en = 'Bass (Shore-Caught)';
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'North Sea', 'English Channel', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Sea Bass';

-- Black Seabream
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'IBI', 'English Channel'] WHERE name_en = 'Black Seabream';

-- Bogue - CORRECT: Atlantic AND Mediterranean
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'Bay of Biscay', 'IBI'] WHERE name_en = 'Bogue';

-- Atlantic Bonito - warm Atlantic species, NOT Mediterranean-only
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Bay of Biscay', 'IBI', 'Mediterranean'] WHERE name_en = 'Atlantic Bonito';

-- Atlantic Chub Mackerel - Atlantic AND Mediterranean
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Bay of Biscay', 'IBI', 'Mediterranean'] WHERE name_en = 'Atlantic Chub Mackerel';

-- Bluefish - warm waters, Atlantic and Mediterranean
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Bay of Biscay', 'IBI', 'Mediterranean'] WHERE name_en = 'Bluefish';

-- Brill
UPDATE species SET biogeographic_regions = ARRAY['North Sea', 'Atlantic', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Brill';

-- Bull Huss
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Bull Huss';

-- Cod (Coastal)
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'Bay of Biscay', 'Celtic Sea', 'English Channel'] WHERE name_en = 'Cod (Coastal)';

-- Cod (Offshore)
UPDATE species SET biogeographic_regions = ARRAY['English Channel', 'Atlantic', 'North Sea', 'Bay of Biscay'] WHERE name_en = 'Cod (Offshore)';

-- Comber - Mediterranean specialist
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean'] WHERE name_en = 'Comber';

-- Common Dab
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Common Dab';

-- Common Dentex
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI'] WHERE name_en = 'Common Dentex';

-- Common Pandora
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Common Pandora';

-- Common Two-Banded Seabream
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Common Two-Banded Seabream';

-- Cuttlefish
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Cuttlefish';

-- European Flounder
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'European Flounder';

-- Garfish
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'Bay of Biscay', 'English Channel', 'North Sea'] WHERE name_en = 'Garfish';

-- Gilthead Seabream
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI'] WHERE name_en = 'Gilthead Seabream';

-- Greater Spotted Dogfish
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Greater Spotted Dogfish';

-- Grey Mullet
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Grey Mullet';

-- Haddock
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Haddock';

-- John Dory
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay', 'English Channel'] WHERE name_en = 'John Dory';

-- Lesser Spotted Dogfish
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'English Channel', 'North Sea', 'Bay of Biscay'] WHERE name_en = 'Lesser Spotted Dogfish';

-- Ling
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Ling';

-- Mackerel
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'IBI', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Mackerel';

-- Mediterranean Horse Mackerel
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Mediterranean Horse Mackerel';

-- Megrim
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Megrim';

-- Plaice
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Plaice';

-- Pollack
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Pollack';

-- Pouting
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'Bay of Biscay'] WHERE name_en = 'Pouting';

-- Red Mullet
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay', 'English Channel'] WHERE name_en = 'Red Mullet';

-- Red Seabream
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Red Seabream';

-- Saithe
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Saithe';

-- Sand Smelt
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'English Channel'] WHERE name_en = 'Sand Smelt';

-- Sargo Seabream
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Sargo Seabream';

-- Sole
UPDATE species SET biogeographic_regions = ARRAY['North Sea', 'Atlantic', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Sole';

-- Striped Mullet
UPDATE species SET biogeographic_regions = ARRAY['Mediterranean', 'Atlantic', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Striped Mullet';

-- Thornback Ray
UPDATE species SET biogeographic_regions = ARRAY['North Sea', 'Atlantic', 'English Channel', 'Bay of Biscay', 'IBI'] WHERE name_en = 'Thornback Ray';

-- Tope Shark
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'English Channel', 'Bay of Biscay'] WHERE name_en = 'Tope Shark';

-- Turbot
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Mediterranean'] WHERE name_en = 'Turbot';

-- Undulate Ray
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'IBI', 'Bay of Biscay'] WHERE name_en = 'Undulate Ray';

-- Whiting
UPDATE species SET biogeographic_regions = ARRAY['Atlantic', 'North Sea', 'English Channel', 'Bay of Biscay', 'Celtic Sea'] WHERE name_en = 'Whiting';

-- Verify results
SELECT name_en, biogeographic_regions 
FROM species 
WHERE name_en IN ('Atlantic Bonito', 'Bogue', 'Atlantic Chub Mackerel', 'Bluefish')
ORDER BY name_en;
