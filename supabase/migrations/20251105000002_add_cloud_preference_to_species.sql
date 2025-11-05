-- Phase 2: Add Cloud Preference Fields to Species Table
-- Migration: 20251105000002_add_cloud_preference_to_species.sql
-- Description: Add cloud cover preference and weight for species-specific cloud scoring
-- Related: docs/PHASE_2_PRESSURE_CLOUD_BITE_SCORE.md

-- Add cloud preference columns to species table
ALTER TABLE species
ADD COLUMN IF NOT EXISTS cloud_preference TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS cloud_weight REAL DEFAULT 0.05;

-- Add CHECK constraint to ensure cloud_preference is valid
ALTER TABLE species
ADD CONSTRAINT check_cloud_preference
CHECK (cloud_preference IS NULL OR cloud_preference IN (
  'overcast',      -- Prefer low light (ambush predators like bass)
  'partly_cloudy', -- Prefer some light (visual feeders like mackerel)
  'clear',         -- Prefer bright conditions (daytime sight feeders like wrasse)
  'neutral'        -- No strong preference
));

-- Add comments explaining the fields
COMMENT ON COLUMN species.cloud_preference IS
'Species cloud cover preference: overcast (ambush predators), partly_cloudy (visual feeders), clear (sight feeders), neutral (no preference)';

COMMENT ON COLUMN species.cloud_weight IS
'Weight for cloud cover scoring (0.03-0.08), default 0.05';

-- Set cloud preferences for key species
-- Ambush predators (prefer low light / overcast conditions)
UPDATE species SET cloud_preference = 'overcast', cloud_weight = 0.08
WHERE name_en IN ('European Bass', 'Cod', 'Pollock', 'Garfish');

-- Visual feeders (prefer some light / partly cloudy)
UPDATE species SET cloud_preference = 'partly_cloudy', cloud_weight = 0.05
WHERE name_en IN ('Mackerel', 'Black Bream', 'Gilthead Bream');

-- Daytime sight feeders (prefer clear skies)
UPDATE species SET cloud_preference = 'clear', cloud_weight = 0.03
WHERE name_en IN ('Ballan Wrasse', 'Corkwing Wrasse', 'Grey Mullet');

-- Cephalopods (slight overcast preference for ambush hunting)
UPDATE species SET cloud_preference = 'overcast', cloud_weight = 0.06
WHERE name_en IN ('Common Cuttlefish', 'Common Octopus', 'European Squid');

-- Note: All other species remain 'neutral' with default weight 0.05
