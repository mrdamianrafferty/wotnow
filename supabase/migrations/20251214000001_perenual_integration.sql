-- Perenual Plant API Integration
-- Adds fields for toxicity, watering, wildlife attraction, care guides, and more

-- Add Perenual-specific columns to plant_species table
ALTER TABLE plant_species
  -- Perenual identifiers
  ADD COLUMN IF NOT EXISTS perenual_id INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS perenual_common_name TEXT,
  ADD COLUMN IF NOT EXISTS perenual_scientific_name TEXT[],
  ADD COLUMN IF NOT EXISTS perenual_other_names TEXT[],
  ADD COLUMN IF NOT EXISTS perenual_family TEXT,
  
  -- Growth & Care
  ADD COLUMN IF NOT EXISTS growth_rate TEXT, -- 'Low', 'Medium', 'High'
  ADD COLUMN IF NOT EXISTS maintenance TEXT, -- 'Low', 'Medium', 'High'
  ADD COLUMN IF NOT EXISTS watering TEXT, -- 'Frequent', 'Average', 'Minimum', 'None'
  ADD COLUMN IF NOT EXISTS watering_general_benchmark JSONB, -- { "value": "7-10", "unit": "days" }
  ADD COLUMN IF NOT EXISTS watering_period TEXT,
  ADD COLUMN IF NOT EXISTS drought_tolerant BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS salt_tolerant BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS thorny BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invasive BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tropical BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS indoor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS care_level TEXT, -- 'Low', 'Medium', 'High'
  
  -- Dimensions
  ADD COLUMN IF NOT EXISTS dimension TEXT,
  ADD COLUMN IF NOT EXISTS dimensions JSONB, -- { "type": "Height", "min_value": 1, "max_value": 2, "unit": "feet" }
  ADD COLUMN IF NOT EXISTS average_height_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS maximum_height_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS average_spread_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS maximum_spread_cm NUMERIC(10,2),
  
  -- Environmental preferences (from Perenual)
  ADD COLUMN IF NOT EXISTS sunlight TEXT[], -- Array: ['Full sun', 'Part shade']
  ADD COLUMN IF NOT EXISTS soil TEXT[], -- Array: soil types
  ADD COLUMN IF NOT EXISTS hardiness_min INTEGER, -- USDA zone min
  ADD COLUMN IF NOT EXISTS hardiness_max INTEGER, -- USDA zone max
  ADD COLUMN IF NOT EXISTS hardiness_location JSONB, -- Full location data
  
  -- Flowering & Visual
  ADD COLUMN IF NOT EXISTS flowers BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flowering_season TEXT,
  ADD COLUMN IF NOT EXISTS flower_color TEXT,
  ADD COLUMN IF NOT EXISTS cones BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fruits BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edible_fruit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edible_fruit_taste_profile TEXT,
  ADD COLUMN IF NOT EXISTS fruit_nutritional_value TEXT,
  ADD COLUMN IF NOT EXISTS fruit_color TEXT[],
  ADD COLUMN IF NOT EXISTS harvest_season TEXT,
  ADD COLUMN IF NOT EXISTS harvest_method TEXT,
  ADD COLUMN IF NOT EXISTS leaf BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS leaf_color TEXT[],
  ADD COLUMN IF NOT EXISTS edible_leaf BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edible_leaf_taste_profile TEXT,
  ADD COLUMN IF NOT EXISTS leaf_nutritional_value TEXT,
  ADD COLUMN IF NOT EXISTS cuisine BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cuisine_list TEXT,
  ADD COLUMN IF NOT EXISTS medicinal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medicinal_use TEXT,
  ADD COLUMN IF NOT EXISTS medicinal_method TEXT,
  
  -- Toxicity (critical for safety)
  ADD COLUMN IF NOT EXISTS poisonous_to_humans INTEGER DEFAULT 0, -- 0 = safe, 1-5 = severity
  ADD COLUMN IF NOT EXISTS poisonous_to_pets INTEGER DEFAULT 0, -- 0 = safe, 1-5 = severity
  ADD COLUMN IF NOT EXISTS poison_effects_to_humans TEXT,
  ADD COLUMN IF NOT EXISTS poison_effects_to_pets TEXT,
  ADD COLUMN IF NOT EXISTS poison_to_humans_cure TEXT,
  ADD COLUMN IF NOT EXISTS poison_to_pets_cure TEXT,
  
  -- Wildlife attraction
  ADD COLUMN IF NOT EXISTS attracts TEXT[], -- ['Bees', 'Butterflies', 'Birds']
  ADD COLUMN IF NOT EXISTS pest_susceptibility TEXT[],
  ADD COLUMN IF NOT EXISTS pest_susceptibility_api TEXT,
  
  -- Propagation & Planting
  ADD COLUMN IF NOT EXISTS propagation TEXT[], -- Methods: ['Seed', 'Cutting', 'Division']
  ADD COLUMN IF NOT EXISTS seeds INTEGER DEFAULT 0,
  
  -- Images from Perenual
  ADD COLUMN IF NOT EXISTS perenual_default_image JSONB, -- { "license": 0-45, "license_name": "...", "license_url": "...", "original_url": "...", "regular_url": "...", "medium_url": "...", "small_url": "...", "thumbnail": "..." }
  ADD COLUMN IF NOT EXISTS perenual_other_images TEXT[], -- Additional image URLs
  
  -- Care guides (separate API call)
  ADD COLUMN IF NOT EXISTS care_guides JSONB, -- Full care guide data
  
  -- Sync metadata
  ADD COLUMN IF NOT EXISTS perenual_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS perenual_raw_response JSONB; -- Store complete API response

-- Create index for faster Perenual lookups
CREATE INDEX IF NOT EXISTS idx_plant_species_perenual_id ON plant_species(perenual_id);

-- Create table for companion planting relationships
CREATE TABLE IF NOT EXISTS plant_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_slug TEXT NOT NULL REFERENCES plant_species(slug) ON DELETE CASCADE,
  companion_slug TEXT REFERENCES plant_species(slug) ON DELETE SET NULL,
  companion_name TEXT NOT NULL, -- Store name even if not in our DB
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('beneficial', 'harmful', 'neutral')),
  benefit_description TEXT,
  source TEXT DEFAULT 'almanac',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plant_slug, companion_name, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_plant_companions_plant_slug ON plant_companions(plant_slug);
CREATE INDEX IF NOT EXISTS idx_plant_companions_companion_slug ON plant_companions(companion_slug);

-- Create table for Perenual sync logs (track unmatched species)
CREATE TABLE IF NOT EXISTS perenual_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  our_slug TEXT,
  our_name TEXT,
  perenual_search_query TEXT,
  perenual_results_count INTEGER,
  perenual_matched_id INTEGER,
  perenual_matched_name TEXT,
  match_confidence TEXT CHECK (match_confidence IN ('exact', 'high', 'medium', 'low', 'none')),
  status TEXT NOT NULL CHECK (status IN ('matched', 'unmatched', 'multiple', 'error', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perenual_sync_logs_status ON perenual_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_perenual_sync_logs_slug ON perenual_sync_logs(our_slug);

-- Create table for raw Perenual API response cache (backup)
CREATE TABLE IF NOT EXISTS perenual_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perenual_id INTEGER UNIQUE NOT NULL,
  common_name TEXT,
  scientific_name TEXT[],
  response_json JSONB NOT NULL,
  care_guide_json JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perenual_cache_id ON perenual_response_cache(perenual_id);
CREATE INDEX IF NOT EXISTS idx_perenual_cache_common_name ON perenual_response_cache(common_name);

-- Add RLS policies
ALTER TABLE plant_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE perenual_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE perenual_response_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to companion data
CREATE POLICY "Allow public read access to plant companions"
  ON plant_companions FOR SELECT
  USING (true);

-- Service role only for writing
CREATE POLICY "Allow service role to manage plant companions"
  ON plant_companions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage perenual sync logs"
  ON perenual_sync_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage perenual response cache"
  ON perenual_response_cache FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE plant_companions IS 'Stores companion planting relationships between plant species';
COMMENT ON TABLE perenual_sync_logs IS 'Logs Perenual API sync attempts for debugging unmatched species';
COMMENT ON TABLE perenual_response_cache IS 'Caches raw Perenual API responses as backup';
