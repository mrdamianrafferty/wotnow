-- Add Fly bait to system and associate with fly-fishing species
-- Date: 2025-11-09
--
-- CHANGES:
--   1. Update recommended_baits column comment to include 'Fly'
--   2. Add 'Fly' to recommended_baits for:
--      - All salmon species (Atlantic, Chinook, Chum, Coho, Pink, Sockeye, Steelhead)
--      - Sea Trout
--      - Sea Bass (European and Spotted)
--      - Striped Bass
--      - All grey mullet species (Golden, Grey, Thicklip, Thin-lipped)

BEGIN;

-- Update the column comment to include Fly in the valid values list
COMMENT ON COLUMN species.recommended_baits IS
'Valid values (must match COMMON_BAITS):
Worms, Crab, Squid, Fish baits, Shellfish, Prawns, Bread, Feather rigs, Fly, Spinners, Soft plastics, Egis, Surface lures, Artificial baits';

-- Add 'Fly' to salmon species
UPDATE species
SET recommended_baits = array_append(recommended_baits, 'Fly')
WHERE name_en IN (
  'Atlantic Salmon',
  'Chinook Salmon',
  'Chum Salmon',
  'Coho Salmon',
  'Pink Salmon',
  'Sockeye Salmon',
  'Steelhead (Sea-run Rainbow Trout)'
)
AND NOT ('Fly' = ANY(recommended_baits)); -- Only add if not already present

-- Add 'Fly' to Sea Trout
UPDATE species
SET recommended_baits = array_append(recommended_baits, 'Fly')
WHERE name_en = 'Sea Trout'
AND NOT ('Fly' = ANY(recommended_baits));

-- Add 'Fly' to bass species (Sea Bass, Spotted Bass, Striped Bass)
UPDATE species
SET recommended_baits = array_append(recommended_baits, 'Fly')
WHERE name_en IN (
  'Sea Bass',
  'Spotted Bass',
  'Striped Bass'
)
AND NOT ('Fly' = ANY(recommended_baits));

-- Add 'Fly' to grey mullet species (excluding Red Mullet which is a different family)
UPDATE species
SET recommended_baits = array_append(recommended_baits, 'Fly')
WHERE name_en IN (
  'Golden grey mullet',
  'Grey Mullet',
  'Thicklip Grey Mullet',
  'Thin-lipped grey mullet'
)
AND NOT ('Fly' = ANY(recommended_baits));

COMMIT;

-- Verification query (comment this out in production)
-- SELECT name_en, recommended_baits
-- FROM species
-- WHERE 'Fly' = ANY(recommended_baits)
-- ORDER BY name_en;

-- Log the change
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM species
  WHERE 'Fly' = ANY(recommended_baits);

  RAISE NOTICE '';
  RAISE NOTICE '✅ Fly Bait Added Successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Species now supporting fly fishing: %', updated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Updated species categories:';
  RAISE NOTICE '  • Salmons (7 species)';
  RAISE NOTICE '  • Sea Trout (1 species)';
  RAISE NOTICE '  • Bass species (3 species)';
  RAISE NOTICE '  • Grey Mullet species (4 species)';
  RAISE NOTICE '';
END $$;
