-- Backfill wikiDescription in custom_species_suggestions from grow_user_plants
-- This fixes existing records where wikiDescription was not saved properly

-- Update custom_species_suggestions with wikiDescription from grow_user_plants
-- where the suggestion has null wikiDescription but the plant has it
UPDATE custom_species_suggestions css
SET wiki_data = jsonb_set(
  COALESCE(css.wiki_data, '{}'::jsonb),
  '{wikiDescription}',
  to_jsonb(gup.wiki_description)
)
FROM grow_user_plants gup
WHERE gup.scientific_name = css.scientific_name
  AND gup.wiki_description IS NOT NULL
  AND (css.wiki_data IS NULL OR css.wiki_data->>'wikiDescription' IS NULL);

-- Also update wikiUrl if it's an object (from Plant.id) but we have a string URL
-- First, let's see what needs updating
-- SELECT css.common_name, css.wiki_data->>'wikiDescription', gup.wiki_description
-- FROM custom_species_suggestions css
-- JOIN grow_user_plants gup ON gup.scientific_name = css.scientific_name
-- WHERE gup.wiki_description IS NOT NULL;
