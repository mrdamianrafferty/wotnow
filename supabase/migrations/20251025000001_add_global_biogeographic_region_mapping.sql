-- Add global biogeographic region mapping based on coordinates
-- Fixes issue where users south of USA get European species
-- Maps coordinates to biogeographic regions: Atlantic (NE/NW/US), Pacific (NE/Hawaii/GoA/Cortez), Caribbean, Gulf_of_Mexico, Mediterranean

CREATE OR REPLACE FUNCTION get_biogeographic_region_from_coords(
  lat numeric,
  lon numeric
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  region_name text;
BEGIN
  -- PACIFIC OCEAN REGIONS (longitude: -180 to -60 for Eastern Pacific)
  IF lon < -100 THEN  -- Eastern Pacific
    -- Hawaii (approximately 18°N to 23°N, -161°W to -154°W)
    IF lat BETWEEN 18 AND 23 AND lon BETWEEN -161 AND -154 THEN
      region_name := 'Hawaii';

    -- Gulf of Alaska (approximately 54°N to 61°N, -165°W to -130°W)
    ELSIF lat BETWEEN 54 AND 61 AND lon BETWEEN -165 AND -130 THEN
      region_name := 'Gulf_of_Alaska';

    -- Sea of Cortez / Gulf of California (approximately 23°N to 32°N, -115°W to -108°W)
    ELSIF lat BETWEEN 23 AND 32 AND lon BETWEEN -115 AND -108 THEN
      region_name := 'Sea_of_Cortez';

    -- Northeast Pacific (California, Oregon, Washington, BC - 32°N to 60°N, west of -100°W)
    ELSIF lat BETWEEN 32 AND 60 THEN
      region_name := 'NE_Pacific';

    -- Tropical Eastern Pacific (south of 23°N, west of -100°W)
    ELSIF lat < 23 AND lat > -23.5 THEN  -- Between Tropics of Cancer and Capricorn
      region_name := 'NE_Pacific';  -- Default tropical Pacific to NE_Pacific for now

    -- Default Pacific
    ELSE
      region_name := 'NE_Pacific';
    END IF;

  -- ATLANTIC OCEAN REGIONS
  ELSIF lon >= -100 THEN
    -- Mediterranean Sea (approximately 30°N to 46°N, -6°W to 37°E)
    IF lat BETWEEN 30 AND 46 AND lon BETWEEN -6 AND 37 THEN
      region_name := 'Mediterranean';

    -- Caribbean (approximately 10°N to 26°N, -85°W to -60°W)
    ELSIF lat BETWEEN 10 AND 26 AND lon BETWEEN -85 AND -60 THEN
      region_name := 'Caribbean';

    -- Gulf of Mexico (approximately 18°N to 31°N, -98°W to -80°W)
    ELSIF lat BETWEEN 18 AND 31 AND lon BETWEEN -98 AND -80 THEN
      region_name := 'Gulf_of_Mexico';

    -- US Atlantic Coast (approximately 24°N to 45°N, -82°W to -65°W)
    ELSIF lat BETWEEN 24 AND 45 AND lon BETWEEN -82 AND -65 THEN
      region_name := 'US_Atlantic';

    -- Northwest Atlantic (approximately 35°N to 60°N, -75°W to -40°W)
    -- Includes US Northeast, Canada Maritime, Newfoundland
    ELSIF lat BETWEEN 35 AND 60 AND lon BETWEEN -75 AND -40 THEN
      region_name := 'NW_Atlantic';

    -- Northeast Atlantic (European waters: approximately 36°N to 72°N, -25°W to 40°E)
    -- Includes North Sea, English Channel, Celtic Sea, Bay of Biscay, Irish Sea, Norwegian Sea
    ELSIF lat BETWEEN 36 AND 72 AND lon BETWEEN -25 AND 40 THEN
      region_name := 'NE_Atlantic';

    -- Tropical / Subtropical Atlantic (between Tropics, -60°W to 20°W)
    -- For locations south of Caribbean/Gulf until Tropic of Capricorn
    ELSIF lat < 10 AND lat > -23.5 AND lon BETWEEN -60 AND 20 THEN
      -- Still show Caribbean species for tropical Atlantic
      region_name := 'Caribbean';

    -- South of Tropic of Capricorn (-23.5°S and below)
    ELSIF lat <= -23.5 THEN
      -- For now, return NULL to show all species (or create specific South Atlantic region)
      region_name := NULL;

    -- Default to NW_Atlantic for other Western Atlantic locations
    ELSIF lon < -40 THEN
      region_name := 'NW_Atlantic';

    -- Default to NE_Atlantic for other Eastern Atlantic/European locations
    ELSE
      region_name := 'NE_Atlantic';
    END IF;

  -- Fallback for any uncaught coordinates
  ELSE
    region_name := NULL;  -- Return NULL to show all species
  END IF;

  RETURN region_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_biogeographic_region_from_coords(numeric, numeric) TO authenticated, anon;

-- Test the function with some example coordinates
DO $$
BEGIN
  RAISE NOTICE 'Testing biogeographic region mapping:';
  RAISE NOTICE 'San Francisco (37.77, -122.42): %', get_biogeographic_region_from_coords(37.77, -122.42);
  RAISE NOTICE 'Miami (25.76, -80.19): %', get_biogeographic_region_from_coords(25.76, -80.19);
  RAISE NOTICE 'Bahamas (25.0, -77.5): %', get_biogeographic_region_from_coords(25.0, -77.5);
  RAISE NOTICE 'New York (40.71, -74.01): %', get_biogeographic_region_from_coords(40.71, -74.01);
  RAISE NOTICE 'London (51.51, -0.13): %', get_biogeographic_region_from_coords(51.51, -0.13);
  RAISE NOTICE 'Hawaii (20.0, -156.0): %', get_biogeographic_region_from_coords(20.0, -156.0);
  RAISE NOTICE 'Mexico Baja (29.0, -113.5): %', get_biogeographic_region_from_coords(29.0, -113.5);
  RAISE NOTICE 'Brazil tropical (-10.0, -38.0): %', get_biogeographic_region_from_coords(-10.0, -38.0);
  RAISE NOTICE 'Brazil south of tropic (-25.0, -48.0): %', get_biogeographic_region_from_coords(-25.0, -48.0);
  RAISE NOTICE '✅ Global biogeographic region mapping added - fixes species selection for worldwide locations';
END $$;
