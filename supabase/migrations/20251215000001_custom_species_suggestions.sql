-- Migration: Custom Species Suggestions & Contributors
-- Enables users to add plants not in our database, track popular suggestions,
-- and recognize contributors when species are promoted to official status.

-- ============================================================================
-- 1. Enhance grow_user_plants for custom species
-- ============================================================================

ALTER TABLE grow_user_plants
  ADD COLUMN IF NOT EXISTS scientific_name TEXT,
  ADD COLUMN IF NOT EXISTS wiki_description TEXT,
  ADD COLUMN IF NOT EXISTS wiki_url TEXT,
  ADD COLUMN IF NOT EXISTS wiki_image_url TEXT,
  ADD COLUMN IF NOT EXISTS wiki_image_license TEXT,
  ADD COLUMN IF NOT EXISTS identification_data JSONB,
  ADD COLUMN IF NOT EXISTS is_community_photo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS community_photo_url TEXT;

-- Index for looking up custom plants (those without species_slug)
CREATE INDEX IF NOT EXISTS idx_grow_user_plants_custom 
  ON grow_user_plants(user_id) 
  WHERE species_slug IS NULL;

-- Index for scientific name lookups
CREATE INDEX IF NOT EXISTS idx_grow_user_plants_scientific_name 
  ON grow_user_plants(scientific_name) 
  WHERE scientific_name IS NOT NULL;

COMMENT ON COLUMN grow_user_plants.scientific_name IS 'Scientific name from Plant.id identification (for custom species not in plant_species)';
COMMENT ON COLUMN grow_user_plants.wiki_description IS 'Wikipedia description text, truncated, with attribution';
COMMENT ON COLUMN grow_user_plants.wiki_url IS 'Wikipedia article URL for attribution';
COMMENT ON COLUMN grow_user_plants.wiki_image_url IS 'Hotlinked Wikipedia/Wikimedia image URL (only if license allows)';
COMMENT ON COLUMN grow_user_plants.wiki_image_license IS 'License of the Wikipedia image (e.g., CC BY-SA 4.0, Public Domain)';
COMMENT ON COLUMN grow_user_plants.identification_data IS 'Full Plant.id response data for reference';
COMMENT ON COLUMN grow_user_plants.is_community_photo IS 'True if user contributed their own photo for the community';
COMMENT ON COLUMN grow_user_plants.community_photo_url IS 'URL to user-contributed photo in Supabase storage';

-- ============================================================================
-- 2. Create custom_species_suggestions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_species_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Species identification
  scientific_name TEXT NOT NULL UNIQUE,
  common_name TEXT NOT NULL,
  common_names TEXT[] DEFAULT '{}',
  
  -- Tracking
  suggestion_count INTEGER DEFAULT 1,
  first_suggested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_suggested_at TIMESTAMPTZ DEFAULT NOW(),
  contributor_ids UUID[] DEFAULT '{}',
  
  -- Wikipedia data for potential promotion
  wiki_data JSONB,
  wiki_image_url TEXT,
  wiki_image_license TEXT,
  
  -- Community photo (first contributed becomes default)
  community_photo_url TEXT,
  community_photo_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Promotion tracking
  promoted_to_species_slug TEXT REFERENCES plant_species(slug) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_species_suggestions_scientific_name 
  ON custom_species_suggestions(scientific_name);
CREATE INDEX IF NOT EXISTS idx_custom_species_suggestions_count 
  ON custom_species_suggestions(suggestion_count DESC);
CREATE INDEX IF NOT EXISTS idx_custom_species_suggestions_not_promoted 
  ON custom_species_suggestions(suggestion_count DESC) 
  WHERE promoted_to_species_slug IS NULL;

-- Enable RLS
ALTER TABLE custom_species_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read suggestions
CREATE POLICY "Anyone can read custom species suggestions"
  ON custom_species_suggestions FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert (via function)
CREATE POLICY "Authenticated users can insert suggestions"
  ON custom_species_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only service role can update (for incrementing counts, promotion)
CREATE POLICY "Service role can update suggestions"
  ON custom_species_suggestions FOR UPDATE
  USING (auth.role() = 'service_role');

COMMENT ON TABLE custom_species_suggestions IS 'Tracks species suggested by users that are not in our official plant_species database. Popular suggestions can be promoted to official species.';

-- ============================================================================
-- 3. Create species_contributors table
-- ============================================================================

CREATE TYPE contribution_type AS ENUM ('suggested', 'photo', 'data');

CREATE TABLE IF NOT EXISTS species_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What species (can be either official or suggestion)
  species_slug TEXT REFERENCES plant_species(slug) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES custom_species_suggestions(id) ON DELETE CASCADE,
  
  -- Who contributed
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What they contributed
  contribution_type contribution_type NOT NULL,
  
  -- When
  contributed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure at least one of species_slug or suggestion_id is set
  CONSTRAINT species_or_suggestion_required 
    CHECK (species_slug IS NOT NULL OR suggestion_id IS NOT NULL),
  
  -- Unique contribution per user per type per species
  CONSTRAINT unique_contribution 
    UNIQUE (user_id, species_slug, suggestion_id, contribution_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_species_contributors_species 
  ON species_contributors(species_slug) 
  WHERE species_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_species_contributors_suggestion 
  ON species_contributors(suggestion_id) 
  WHERE suggestion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_species_contributors_user 
  ON species_contributors(user_id);

-- Enable RLS
ALTER TABLE species_contributors ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read contributors
CREATE POLICY "Anyone can read contributors"
  ON species_contributors FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own contributions
CREATE POLICY "Users can insert own contributions"
  ON species_contributors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE species_contributors IS 'Tracks users who contributed to species data - either by suggesting new species, contributing photos, or providing data. Used to credit users when species are promoted.';

-- ============================================================================
-- 4. Create helper function to upsert species suggestion
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_species_suggestion(
  p_scientific_name TEXT,
  p_common_name TEXT,
  p_common_names TEXT[] DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_wiki_data JSONB DEFAULT NULL,
  p_wiki_image_url TEXT DEFAULT NULL,
  p_wiki_image_license TEXT DEFAULT NULL,
  p_community_photo_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suggestion_id UUID;
  v_existing_contributors UUID[];
BEGIN
  -- Try to find existing suggestion
  SELECT id, contributor_ids INTO v_suggestion_id, v_existing_contributors
  FROM custom_species_suggestions
  WHERE scientific_name = p_scientific_name;
  
  IF v_suggestion_id IS NULL THEN
    -- Insert new suggestion
    INSERT INTO custom_species_suggestions (
      scientific_name,
      common_name,
      common_names,
      first_suggested_by,
      contributor_ids,
      wiki_data,
      wiki_image_url,
      wiki_image_license,
      community_photo_url,
      community_photo_by
    ) VALUES (
      p_scientific_name,
      p_common_name,
      p_common_names,
      p_user_id,
      CASE WHEN p_user_id IS NOT NULL THEN ARRAY[p_user_id] ELSE '{}' END,
      p_wiki_data,
      p_wiki_image_url,
      p_wiki_image_license,
      p_community_photo_url,
      CASE WHEN p_community_photo_url IS NOT NULL THEN p_user_id ELSE NULL END
    )
    RETURNING id INTO v_suggestion_id;
    
    -- Record contribution
    IF p_user_id IS NOT NULL THEN
      INSERT INTO species_contributors (suggestion_id, user_id, contribution_type)
      VALUES (v_suggestion_id, p_user_id, 'suggested')
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    -- Update existing suggestion
    UPDATE custom_species_suggestions
    SET
      suggestion_count = suggestion_count + 1,
      contributor_ids = CASE 
        WHEN p_user_id IS NOT NULL AND NOT (p_user_id = ANY(contributor_ids))
        THEN array_append(contributor_ids, p_user_id)
        ELSE contributor_ids
      END,
      -- Update wiki data if not already set
      wiki_data = COALESCE(custom_species_suggestions.wiki_data, p_wiki_data),
      wiki_image_url = COALESCE(custom_species_suggestions.wiki_image_url, p_wiki_image_url),
      wiki_image_license = COALESCE(custom_species_suggestions.wiki_image_license, p_wiki_image_license),
      -- Update community photo if not already set
      community_photo_url = COALESCE(custom_species_suggestions.community_photo_url, p_community_photo_url),
      community_photo_by = CASE 
        WHEN custom_species_suggestions.community_photo_url IS NULL AND p_community_photo_url IS NOT NULL 
        THEN p_user_id 
        ELSE custom_species_suggestions.community_photo_by 
      END,
      updated_at = NOW()
    WHERE id = v_suggestion_id;
    
    -- Record contribution if new contributor
    IF p_user_id IS NOT NULL AND NOT (p_user_id = ANY(v_existing_contributors)) THEN
      INSERT INTO species_contributors (suggestion_id, user_id, contribution_type)
      VALUES (v_suggestion_id, p_user_id, 'suggested')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Record photo contribution if provided
  IF p_community_photo_url IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO species_contributors (suggestion_id, user_id, contribution_type)
    VALUES (v_suggestion_id, p_user_id, 'photo')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN v_suggestion_id;
END;
$$;

COMMENT ON FUNCTION upsert_species_suggestion IS 'Upserts a species suggestion, incrementing count if exists, tracking contributors, and recording the first community photo.';

-- ============================================================================
-- 5. Create storage bucket for community plant photos
-- ============================================================================

-- Note: Storage bucket creation is typically done via Supabase dashboard or API
-- This is a reminder to create the bucket manually:
-- Bucket name: community-plant-photos
-- Public: true (for easy image serving)
-- File size limit: 5MB
-- Allowed mime types: image/jpeg, image/png, image/webp

-- ============================================================================
-- 6. Grant necessary permissions
-- ============================================================================

GRANT SELECT ON custom_species_suggestions TO authenticated, anon;
GRANT INSERT ON custom_species_suggestions TO authenticated;
GRANT SELECT ON species_contributors TO authenticated, anon;
GRANT INSERT ON species_contributors TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_species_suggestion TO authenticated;
