-- Phase 1: Consolidate Species Fishing Data
-- Date: 2025-11-04
--
-- PROBLEM: Species content scattered across multiple sources:
--   - Database: species table (playful_bio, eating_quality)
--   - Database: species_meta table (fun_fact, conservation_status)
--   - JSON file: speciesAdviceData.json (fishing advice, baits, techniques)
--
-- SOLUTION: Move all fishing-related fields into species table with structured data
--
-- BENEFITS:
--   - Single source of truth
--   - No JSON/database synchronization issues
--   - Structured baits/habitats/techniques (not free text)
--   - Matches QuickLogModal options exactly
--   - Database validation and indexing
--
-- SCHEMA ADDITIONS:
--   - recommended_baits: TEXT[] - Matches COMMON_BAITS from baitHabitatOptions.ts
--   - preferred_habitats: TEXT[] - Matches HABITAT_OPTIONS from baitHabitatOptions.ts
--   - effective_techniques: TEXT[] - Structured list (not free text)
--   - best_times: TEXT[] - When to fish ("dawn", "dusk", "night", "day", "flooding_tide", "ebbing_tide")
--   - fun_fact_en: TEXT - Migrated from species_meta.fun_fact
--   - conservation_status: TEXT - Migrated from species_meta (IUCN codes)

BEGIN;

-- Drop dependent view (will be recreated later if it's important)
DROP VIEW IF EXISTS v_species_with_meta CASCADE;

-- Drop conservation_status if it's a generated column (so we can make it a regular column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'species'
          AND column_name = 'conservation_status'
          AND is_generated = 'ALWAYS'
    ) THEN
        ALTER TABLE species DROP COLUMN conservation_status CASCADE;
    END IF;
END $$;

-- Add new columns to species table
ALTER TABLE species
    -- Fishing content fields
    ADD COLUMN IF NOT EXISTS recommended_baits TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS preferred_habitats TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS effective_techniques TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS best_times TEXT[] DEFAULT '{}',

    -- Migrate from species_meta (conservation_status now as regular column, not generated)
    ADD COLUMN IF NOT EXISTS fun_fact_en TEXT,
    ADD COLUMN IF NOT EXISTS conservation_status TEXT,

    -- Data quality tracking
    ADD COLUMN IF NOT EXISTS content_last_reviewed TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS content_reviewed_by TEXT;

-- Create indexes for filtering/searching
CREATE INDEX IF NOT EXISTS idx_species_baits ON species USING GIN (recommended_baits);
CREATE INDEX IF NOT EXISTS idx_species_habitats ON species USING GIN (preferred_habitats);
CREATE INDEX IF NOT EXISTS idx_species_techniques ON species USING GIN (effective_techniques);
CREATE INDEX IF NOT EXISTS idx_species_conservation ON species (conservation_status) WHERE conservation_status IS NOT NULL;

-- Migrate data from species_meta to species BEFORE adding constraint
-- This populates fun_fact_en and conservation_status
UPDATE species s
SET
    fun_fact_en = sm.fun_fact,
    conservation_status = CASE
        -- Normalize any variations to standard IUCN codes
        WHEN sm.conservation_status IN ('Least Concern', 'least concern', 'LC') THEN 'LC'
        WHEN sm.conservation_status IN ('Near Threatened', 'near threatened', 'NT') THEN 'NT'
        WHEN sm.conservation_status IN ('Vulnerable', 'vulnerable', 'VU') THEN 'VU'
        WHEN sm.conservation_status IN ('Endangered', 'endangered', 'EN') THEN 'EN'
        WHEN sm.conservation_status IN ('Critically Endangered', 'critically endangered', 'CR') THEN 'CR'
        WHEN sm.conservation_status IN ('Extinct in the Wild', 'extinct in the wild', 'EW') THEN 'EW'
        WHEN sm.conservation_status IN ('Extinct', 'extinct', 'EX') THEN 'EX'
        WHEN sm.conservation_status IN ('Data Deficient', 'data deficient', 'DD') THEN 'DD'
        WHEN sm.conservation_status IN ('Not Evaluated', 'not evaluated', 'NE') THEN 'NE'
        ELSE NULL  -- Invalid values become NULL
    END
FROM species_meta sm
WHERE s.scientific_name = sm.scientific_name;

-- Add CHECK constraint to ensure valid IUCN conservation status codes
ALTER TABLE species
    DROP CONSTRAINT IF EXISTS check_conservation_status,
    ADD CONSTRAINT check_conservation_status
    CHECK (conservation_status IS NULL OR conservation_status IN (
        'LC',  -- Least Concern
        'NT',  -- Near Threatened
        'VU',  -- Vulnerable
        'EN',  -- Endangered
        'CR',  -- Critically Endangered
        'EW',  -- Extinct in the Wild
        'EX',  -- Extinct
        'DD',  -- Data Deficient
        'NE'   -- Not Evaluated
    ));

-- Add COMMENT to document bait values (must match COMMON_BAITS from baitHabitatOptions.ts)
COMMENT ON COLUMN species.recommended_baits IS
'Valid values (must match COMMON_BAITS):
Worms, Crab, Squid, Fish baits, Shellfish, Prawns, Bread, Feather rigs, Spinners, Soft plastics, Egis, Surface lures, Artificial baits';

-- Add COMMENT to document habitat values (must match HABITAT_OPTIONS)
COMMENT ON COLUMN species.preferred_habitats IS
'Valid values (must match HABITAT_OPTIONS):
rocky_shore, sandy_beach, pier_harbor, estuary, shallow_water, deep_water, wreck_reef, open_sea';

-- Add COMMENT to document technique values
COMMENT ON COLUMN species.effective_techniques IS
'Valid values:
bottom_fishing, float_fishing, spinning, trolling, jigging, drifting, fly_fishing, surfcasting, feathering, drop_shot, popping, walking_the_dog';

-- Add COMMENT to document best_times values
COMMENT ON COLUMN species.best_times IS
'Valid values:
dawn, dusk, day, night, flooding_tide, ebbing_tide, slack_water, spring_tides, neap_tides';

COMMIT;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Phase 1: Species Fishing Data Consolidation COMPLETE';
    RAISE NOTICE '';
    RAISE NOTICE 'New Structured Fields Added:';
    RAISE NOTICE '  • recommended_baits (TEXT[]) - Matches QuickLogModal options';
    RAISE NOTICE '  • preferred_habitats (TEXT[]) - Matches QuickLogModal options';
    RAISE NOTICE '  • effective_techniques (TEXT[]) - Structured techniques list';
    RAISE NOTICE '  • best_times (TEXT[]) - When to fish (dawn/dusk/tides)';
    RAISE NOTICE '';
    RAISE NOTICE 'Migrated from species_meta:';
    RAISE NOTICE '  • fun_fact_en (TEXT)';
    RAISE NOTICE '  • conservation_status (TEXT with IUCN constraint)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Run data migration script: npm run migrate:species-data';
    RAISE NOTICE '  2. Populate baits/habitats/techniques from speciesAdviceData.json';
    RAISE NOTICE '  3. Update TypeScript types';
    RAISE NOTICE '  4. Test with sample species';
    RAISE NOTICE '  5. Drop species_meta table (Phase 2)';
    RAISE NOTICE '  6. Remove speciesAdviceData.json (Phase 2)';
    RAISE NOTICE '';
END $$;
