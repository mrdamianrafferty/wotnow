-- Migration: Fix wiki_data merging in upsert_species_suggestion
-- Previously, if wiki_data existed (even with null fields inside), it wouldn't be updated.
-- Now we merge the JSONB objects, filling in any missing/null fields.

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
  v_existing_wiki_data JSONB;
  v_merged_wiki_data JSONB;
BEGIN
  -- Try to find existing suggestion
  SELECT id, contributor_ids, wiki_data 
  INTO v_suggestion_id, v_existing_contributors, v_existing_wiki_data
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
    -- Merge wiki_data: take new values for fields that are currently null
    -- This ensures we can fill in wikiDescription even if the record already exists
    IF v_existing_wiki_data IS NULL THEN
      v_merged_wiki_data := p_wiki_data;
    ELSIF p_wiki_data IS NULL THEN
      v_merged_wiki_data := v_existing_wiki_data;
    ELSE
      -- Merge: keep existing values, but fill in nulls from new data
      v_merged_wiki_data := jsonb_build_object(
        'wikiDescription', COALESCE(
          v_existing_wiki_data->>'wikiDescription', 
          p_wiki_data->>'wikiDescription'
        ),
        'wikiUrl', COALESCE(
          CASE 
            WHEN v_existing_wiki_data->'wikiUrl' IS NOT NULL 
                 AND jsonb_typeof(v_existing_wiki_data->'wikiUrl') = 'string'
            THEN v_existing_wiki_data->'wikiUrl'
            WHEN p_wiki_data->'wikiUrl' IS NOT NULL 
            THEN p_wiki_data->'wikiUrl'
            ELSE v_existing_wiki_data->'wikiUrl'
          END
        ),
        'watering', COALESCE(
          v_existing_wiki_data->'watering',
          p_wiki_data->'watering'
        ),
        'edibleParts', COALESCE(
          v_existing_wiki_data->'edibleParts',
          p_wiki_data->'edibleParts'
        ),
        'propagationMethods', COALESCE(
          v_existing_wiki_data->'propagationMethods',
          p_wiki_data->'propagationMethods'
        )
      );
    END IF;

    -- Update existing suggestion
    UPDATE custom_species_suggestions
    SET
      suggestion_count = suggestion_count + 1,
      contributor_ids = CASE 
        WHEN p_user_id IS NOT NULL AND NOT (p_user_id = ANY(contributor_ids))
        THEN array_append(contributor_ids, p_user_id)
        ELSE contributor_ids
      END,
      -- Use merged wiki data
      wiki_data = v_merged_wiki_data,
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

COMMENT ON FUNCTION upsert_species_suggestion IS 'Upserts a species suggestion, incrementing count if exists, tracking contributors, recording the first community photo, and merging wiki_data fields.';
