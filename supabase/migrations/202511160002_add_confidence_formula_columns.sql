-- Add minimal columns needed for new confidence formula
-- November 16, 2025
-- This migration adds only 8 new columns - most data already exists in species table

-- CATCH DATA (Base Availability)
ALTER TABLE species ADD COLUMN IF NOT EXISTS catches_2024 INTEGER DEFAULT 0;
COMMENT ON COLUMN species.catches_2024 IS '2024 ICES catch count for this species (used as proxy for current availability)';

-- SEASONAL PATTERNS (Base Availability)
ALTER TABLE species ADD COLUMN IF NOT EXISTS peak_months INTEGER[] DEFAULT '{}';
ALTER TABLE species ADD COLUMN IF NOT EXISTS good_months INTEGER[] DEFAULT '{}';
ALTER TABLE species ADD COLUMN IF NOT EXISTS possible_months INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN species.peak_months IS 'Months (1-12) when species is at peak abundance and catchability';
COMMENT ON COLUMN species.good_months IS 'Months when species is available with good catch rates';
COMMENT ON COLUMN species.possible_months IS 'Months when species is present but less active/catchable';

-- ENVIRONMENTAL PREFERENCES (Environmental Match)
ALTER TABLE species ADD COLUMN IF NOT EXISTS chlorophyll_preference TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS oxygen_comfortable NUMERIC;
ALTER TABLE species ADD COLUMN IF NOT EXISTS oxygen_survival NUMERIC;
ALTER TABLE species ADD COLUMN IF NOT EXISTS wave_tolerance NUMERIC;

COMMENT ON COLUMN species.chlorophyll_preference IS 'Preferred chlorophyll level: high (productive waters), medium (coastal), low (oceanic clear water), or indifferent';
COMMENT ON COLUMN species.oxygen_comfortable IS 'Comfortable dissolved oxygen level (mg/L) - species feeds actively above this';
COMMENT ON COLUMN species.oxygen_survival IS 'Survival dissolved oxygen level (mg/L) - species avoids areas below this';
COMMENT ON COLUMN species.wave_tolerance IS 'Maximum wave height tolerance (meters) - NULL means indifferent';

-- Add CHECK constraint for chlorophyll preference
ALTER TABLE species ADD CONSTRAINT species_chlorophyll_preference_check
  CHECK (chlorophyll_preference IS NULL OR chlorophyll_preference IN ('high', 'medium', 'low', 'indifferent'));

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_species_catches_2024 ON species(catches_2024 DESC);
CREATE INDEX IF NOT EXISTS idx_species_chlorophyll_preference ON species(chlorophyll_preference);

-- Update DATABASE_SCHEMA_REFERENCE.md documentation reminder
COMMENT ON TABLE species IS 'Fish species with environmental preferences, catch data, and seasonal patterns. See DATABASE_SCHEMA_REFERENCE.md for complete column reference.';
