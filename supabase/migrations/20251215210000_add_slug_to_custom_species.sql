-- Add slug column to custom_species_suggestions for normalized searching
-- The slug is lowercase with hyphens, matching URL format

-- Add the slug column
ALTER TABLE custom_species_suggestions 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create function to generate slug from common_name
CREATE OR REPLACE FUNCTION generate_species_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(name),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars except spaces and hyphens
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing rows
UPDATE custom_species_suggestions 
SET slug = generate_species_slug(common_name)
WHERE slug IS NULL;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_species_slug 
ON custom_species_suggestions(slug);

-- Create trigger to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION auto_generate_species_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := generate_species_slug(NEW.common_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_slug_custom_species ON custom_species_suggestions;
CREATE TRIGGER trg_auto_slug_custom_species
  BEFORE INSERT OR UPDATE OF common_name
  ON custom_species_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_species_slug();

-- Update the upsert_custom_species_suggestion RPC to handle slug
CREATE OR REPLACE FUNCTION upsert_custom_species_suggestion(
  p_common_name TEXT,
  p_scientific_name TEXT DEFAULT NULL,
  p_common_names TEXT[] DEFAULT NULL,
  p_wiki_data JSONB DEFAULT NULL,
  p_wiki_image_url TEXT DEFAULT NULL,
  p_wiki_image_license TEXT DEFAULT NULL,
  p_community_photo_url TEXT DEFAULT NULL,
  p_community_photo_by TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug for matching
  v_slug := generate_species_slug(p_common_name);
  
  -- Check if species already exists by slug (more reliable than common_name)
  SELECT id INTO v_id
  FROM custom_species_suggestions
  WHERE slug = v_slug
  LIMIT 1;

  IF v_id IS NULL THEN
    -- Insert new suggestion
    INSERT INTO custom_species_suggestions (
      common_name,
      scientific_name,
      common_names,
      wiki_data,
      wiki_image_url,
      wiki_image_license,
      community_photo_url,
      community_photo_by,
      first_suggested_by,
      contributor_ids,
      suggestion_count,
      slug
    ) VALUES (
      p_common_name,
      p_scientific_name,
      COALESCE(p_common_names, ARRAY[p_common_name]),
      p_wiki_data,
      p_wiki_image_url,
      p_wiki_image_license,
      p_community_photo_url,
      p_community_photo_by,
      p_user_id,
      CASE WHEN p_user_id IS NOT NULL THEN ARRAY[p_user_id] ELSE ARRAY[]::UUID[] END,
      1,
      v_slug
    )
    RETURNING id INTO v_id;
  ELSE
    -- Update existing suggestion - increment count, merge wiki data
    UPDATE custom_species_suggestions
    SET 
      suggestion_count = suggestion_count + 1,
      contributor_ids = CASE 
        WHEN p_user_id IS NOT NULL AND NOT (contributor_ids @> ARRAY[p_user_id]) 
        THEN array_append(contributor_ids, p_user_id) 
        ELSE contributor_ids 
      END,
      -- Merge wiki_data: prefer existing values, fill in missing ones
      wiki_data = CASE
        WHEN custom_species_suggestions.wiki_data IS NULL THEN p_wiki_data
        WHEN p_wiki_data IS NULL THEN custom_species_suggestions.wiki_data
        ELSE custom_species_suggestions.wiki_data || p_wiki_data
      END,
      -- Only update wiki fields if currently null
      wiki_image_url = COALESCE(custom_species_suggestions.wiki_image_url, p_wiki_image_url),
      wiki_image_license = COALESCE(custom_species_suggestions.wiki_image_license, p_wiki_image_license),
      -- Update community photo only if new one provided and current is null
      community_photo_url = COALESCE(custom_species_suggestions.community_photo_url, p_community_photo_url),
      community_photo_by = CASE 
        WHEN custom_species_suggestions.community_photo_url IS NULL AND p_community_photo_url IS NOT NULL 
        THEN p_community_photo_by 
        ELSE custom_species_suggestions.community_photo_by 
      END,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN custom_species_suggestions.slug IS 'Normalized slug for URL-friendly lookups. Auto-generated from common_name.';
