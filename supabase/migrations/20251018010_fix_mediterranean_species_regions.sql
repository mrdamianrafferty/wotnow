-- Fix incorrect biogeographic regions for Mediterranean-specific species
-- Bogue and similar species should NOT appear in Atlantic/Bay of Biscay waters

-- Bogue (Boops boops) - Strictly Mediterranean/warm Atlantic (Portugal/Spain coast)
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'Bogue';

-- White Seabream (Diplodus sargus) - Mediterranean/warm temperate
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'White Seabream';

-- Painted Comber - Mediterranean
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean']
WHERE name_en = 'Painted Comber';

-- Striped Red Mullet - Mediterranean/warm Atlantic
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'Striped Red Mullet';

-- Picarel - Mediterranean/warm Atlantic
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'Picarel';

-- Salema - Mediterranean
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean']
WHERE name_en = 'Salema';

-- Annular Seabream - Mediterranean
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean']
WHERE name_en = 'Annular Seabream';

-- Saddled Seabream - Mediterranean
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean']
WHERE name_en = 'Saddled Seabream';

-- Gilt-head Bream - Mediterranean
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'Gilt-head Bream';

-- Common Pandora - Mediterranean
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean']
WHERE name_en = 'Common Pandora';

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed Mediterranean species biogeographic regions!';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated species (Mediterranean only or Mediterranean + IBI):';
  RAISE NOTICE '  • Bogue: Mediterranean, IBI (was also in Atlantic, Bay of Biscay)';
  RAISE NOTICE '  • White Seabream: Mediterranean, IBI';
  RAISE NOTICE '  • Painted Comber: Mediterranean only';
  RAISE NOTICE '  • Striped Red Mullet: Mediterranean, IBI';
  RAISE NOTICE '  • Picarel: Mediterranean, IBI';
  RAISE NOTICE '  • Salema: Mediterranean only';
  RAISE NOTICE '  • Annular Seabream: Mediterranean only';
  RAISE NOTICE '  • Saddled Seabream: Mediterranean only';
  RAISE NOTICE '  • Gilt-head Bream: Mediterranean, IBI';
  RAISE NOTICE '  • Common Pandora: Mediterranean only';
  RAISE NOTICE '';
  RAISE NOTICE 'These species will NO LONGER appear in:';
  RAISE NOTICE '  • Atlantic (21D8 - Galician Coast)';
  RAISE NOTICE '  • Bay of Biscay (25E1)';
  RAISE NOTICE '  • Celtic Sea (28E5 - Irish waters)';
  RAISE NOTICE '  • North Sea (41F3)';
END $$;
