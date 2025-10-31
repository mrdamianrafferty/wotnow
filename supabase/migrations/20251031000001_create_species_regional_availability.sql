-- Create unified species regional availability table
-- Supports both ICES rectangles and grid cells with monthly seasonality
-- Works independently of user catch data but improves with it

CREATE TABLE IF NOT EXISTS public.species_regional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Region identification (supports both ICES and grid systems)
  region_type text NOT NULL CHECK (region_type IN ('ices', 'grid')),
  region_id text NOT NULL,  -- rectangle_code (e.g. "31F1") or cell_id (e.g. "G025_N51W002")

  -- Species reference
  species_code text NOT NULL REFERENCES species(species_code) ON DELETE CASCADE,

  -- Temporal availability (NULL = year-round)
  month integer CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),

  -- Availability scoring (0.0 = absent, 0.5 = moderate, 1.0 = peak abundance)
  availability_score numeric(3,2) NOT NULL CHECK (availability_score BETWEEN 0.00 AND 1.00),

  -- Metadata
  is_primary_habitat boolean DEFAULT false,  -- True if this is core habitat for the species
  data_source text NOT NULL CHECK (data_source IN ('expert', 'baseline', 'catch_data', 'model')),
  confidence numeric(3,2) DEFAULT 0.50 CHECK (confidence BETWEEN 0.00 AND 1.00),  -- Data quality confidence
  catch_count integer DEFAULT 0,  -- Number of user catches contributing to this record
  last_catch_at timestamptz,  -- Most recent catch in this region

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Composite primary key: unique combination per region, species, and month
  CONSTRAINT species_regional_availability_unique UNIQUE (region_type, region_id, species_code, month)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS species_regional_availability_region_lookup_idx
  ON public.species_regional_availability (region_type, region_id);

CREATE INDEX IF NOT EXISTS species_regional_availability_species_idx
  ON public.species_regional_availability (species_code);

CREATE INDEX IF NOT EXISTS species_regional_availability_score_idx
  ON public.species_regional_availability (availability_score DESC)
  WHERE availability_score > 0.30;  -- Only index meaningful scores

CREATE INDEX IF NOT EXISTS species_regional_availability_primary_habitat_idx
  ON public.species_regional_availability (species_code, is_primary_habitat)
  WHERE is_primary_habitat = true;

CREATE INDEX IF NOT EXISTS species_regional_availability_month_idx
  ON public.species_regional_availability (region_type, region_id, month)
  WHERE month IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.species_regional_availability IS
  'Unified table mapping species to regions (ICES rectangles and grid cells) with seasonal availability. Works without user data but improves with catch logs.';

COMMENT ON COLUMN public.species_regional_availability.region_type IS
  'Type of geographic region: "ices" for ICES rectangles, "grid" for 0.25° grid cells';

COMMENT ON COLUMN public.species_regional_availability.availability_score IS
  'Species abundance score: 0.0 (absent) to 1.0 (peak). Multiplies prediction confidence.';

COMMENT ON COLUMN public.species_regional_availability.data_source IS
  'Origin of data: "expert" (manual), "baseline" (derived from species prefs), "catch_data" (user logs), "model" (ML generated)';

COMMENT ON COLUMN public.species_regional_availability.catch_count IS
  'Number of user catches that have validated this species in this region';

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_species_regional_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on row modification
CREATE TRIGGER update_species_regional_availability_timestamp
  BEFORE UPDATE ON public.species_regional_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_species_regional_availability_updated_at();

-- Grant permissions (adjust based on your RLS policy needs)
-- For now, read-only for authenticated users, write for service role
ALTER TABLE public.species_regional_availability ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read availability data
CREATE POLICY "Anyone can view species regional availability"
  ON public.species_regional_availability
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert/update (via backend logic)
CREATE POLICY "Service role can manage species regional availability"
  ON public.species_regional_availability
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
