-- Phase 3: Add species lookup helper functions
-- This creates RPC functions for flexible species lookup using any identifier
-- Date: 2025-10-30
-- Part of Species Schema Migration Plan

-- Function 1: Find species by any identifier (scientific_name, species_code, name_en, or alias)
-- This is the main lookup function that searches all possible identifiers
CREATE OR REPLACE FUNCTION find_species_by_identifier(identifier TEXT)
RETURNS SETOF species
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- First try exact matches (case-sensitive)
  RETURN QUERY
  SELECT * FROM species
  WHERE
    scientific_name = identifier
    OR species_code = identifier
    OR name_en = identifier
    OR identifier = ANY(aliases)
  LIMIT 1;

  -- If no exact match, try case-insensitive
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT * FROM species
    WHERE
      LOWER(scientific_name) = LOWER(identifier)
      OR LOWER(species_code) = LOWER(identifier)
      OR LOWER(name_en) = LOWER(identifier)
      OR LOWER(identifier) = ANY(
        SELECT LOWER(unnest(aliases))
        FROM species s
        WHERE s.id = species.id
      )
    LIMIT 1;
  END IF;
END;
$$;

-- Function 2: Search species by name (returns multiple matches, useful for autocomplete)
-- This function does partial matching and is case-insensitive
CREATE OR REPLACE FUNCTION search_species_by_name(search_term TEXT, max_results INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  species_code VARCHAR,
  scientific_name VARCHAR,
  name_en VARCHAR,
  slug VARCHAR,
  aliases TEXT[],
  match_type TEXT,
  match_value TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH matches AS (
    -- Exact scientific name match (highest priority)
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'scientific_name_exact'::TEXT as match_type,
      s.scientific_name::TEXT as match_value,
      1 as priority
    FROM species s
    WHERE LOWER(s.scientific_name) = LOWER(search_term)

    UNION ALL

    -- Exact name_en match
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'name_en_exact'::TEXT,
      s.name_en::TEXT,
      2 as priority
    FROM species s
    WHERE LOWER(s.name_en) = LOWER(search_term)

    UNION ALL

    -- Exact alias match
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'alias_exact'::TEXT,
      alias_val::TEXT,
      3 as priority
    FROM species s,
         unnest(s.aliases) as alias_val
    WHERE LOWER(alias_val) = LOWER(search_term)

    UNION ALL

    -- Partial scientific name match (starts with)
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'scientific_name_partial'::TEXT,
      s.scientific_name::TEXT,
      4 as priority
    FROM species s
    WHERE LOWER(s.scientific_name) LIKE LOWER(search_term) || '%'
      AND LOWER(s.scientific_name) != LOWER(search_term)

    UNION ALL

    -- Partial name_en match (starts with)
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'name_en_partial'::TEXT,
      s.name_en::TEXT,
      5 as priority
    FROM species s
    WHERE LOWER(s.name_en) LIKE LOWER(search_term) || '%'
      AND LOWER(s.name_en) != LOWER(search_term)

    UNION ALL

    -- Partial alias match (starts with)
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'alias_partial'::TEXT,
      alias_val::TEXT,
      6 as priority
    FROM species s,
         unnest(s.aliases) as alias_val
    WHERE LOWER(alias_val) LIKE LOWER(search_term) || '%'
      AND LOWER(alias_val) != LOWER(search_term)

    UNION ALL

    -- Contains match (last resort)
    SELECT
      s.id,
      s.species_code,
      s.scientific_name,
      s.name_en,
      s.slug,
      s.aliases,
      'name_contains'::TEXT,
      s.name_en::TEXT,
      7 as priority
    FROM species s
    WHERE (
      LOWER(s.name_en) LIKE '%' || LOWER(search_term) || '%'
      OR LOWER(s.scientific_name) LIKE '%' || LOWER(search_term) || '%'
    )
    AND LOWER(s.name_en) NOT LIKE LOWER(search_term) || '%'
    AND LOWER(s.scientific_name) NOT LIKE LOWER(search_term) || '%'
  )
  SELECT DISTINCT ON (m.id)
    m.id,
    m.species_code,
    m.scientific_name,
    m.name_en,
    m.slug,
    m.aliases,
    m.match_type,
    m.match_value
  FROM matches m
  ORDER BY m.id, m.priority, m.match_value
  LIMIT max_results;
END;
$$;

-- Add comments documenting the functions
COMMENT ON FUNCTION find_species_by_identifier IS 'Find a single species by any identifier: scientific_name, species_code, name_en, or any alias. Returns at most one result, trying exact matches first, then case-insensitive.';

COMMENT ON FUNCTION search_species_by_name IS 'Search for species by partial name match. Returns multiple results ranked by match quality (exact > starts-with > contains). Useful for autocomplete. Default limit: 10 results.';

-- Verification: Test the functions
DO $$
DECLARE
  test_result RECORD;
  search_count INTEGER;
BEGIN
  RAISE NOTICE '✅ Species Lookup Functions Created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Testing find_species_by_identifier():';

  -- Test 1: Find by scientific name
  SELECT * INTO test_result FROM find_species_by_identifier('Gadus morhua');
  IF FOUND THEN
    RAISE NOTICE '  ✓ Found by scientific name: % (Gadus morhua)', test_result.name_en;
  END IF;

  -- Test 2: Find by species code
  SELECT * INTO test_result FROM find_species_by_identifier('COD');
  IF FOUND THEN
    RAISE NOTICE '  ✓ Found by species code: % (COD)', test_result.name_en;
  END IF;

  -- Test 3: Find by alias (case-insensitive)
  SELECT * INTO test_result FROM find_species_by_identifier('cod');
  IF FOUND THEN
    RAISE NOTICE '  ✓ Found by alias: % (cod)', test_result.name_en;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Testing search_species_by_name():';

  -- Test 4: Search for "bass"
  SELECT COUNT(*) INTO search_count FROM search_species_by_name('bass');
  RAISE NOTICE '  ✓ Search for "bass" returned % results', search_count;

  -- Test 5: Search for "cod"
  SELECT COUNT(*) INTO search_count FROM search_species_by_name('cod');
  RAISE NOTICE '  ✓ Search for "cod" returned % results', search_count;

  RAISE NOTICE '';
  RAISE NOTICE 'Functions ready for use! 🎣';
END $$;
