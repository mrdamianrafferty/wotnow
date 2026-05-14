-- P1 Chunk D: Content columns for JSON-LD schema on species pages
-- howto_steps and faqs: populated by Cowork via grow-gardening-expert skill
-- date_published / date_modified: used in Article schema

ALTER TABLE plant_species
  ADD COLUMN IF NOT EXISTS howto_steps JSONB,
  ADD COLUMN IF NOT EXISTS faqs JSONB,
  ADD COLUMN IF NOT EXISTS date_published DATE,
  ADD COLUMN IF NOT EXISTS date_modified DATE;

COMMENT ON COLUMN plant_species.howto_steps IS
  'Array of {step, name, text, image?} objects for HowTo JSON-LD schema. NULL until Cowork drafts.';
COMMENT ON COLUMN plant_species.faqs IS
  'Array of {question, answer} objects for FAQPage JSON-LD schema. NULL until Cowork drafts.';
COMMENT ON COLUMN plant_species.date_published IS
  'Date species page was first published. Used in Article JSON-LD.';
COMMENT ON COLUMN plant_species.date_modified IS
  'Date species page content was last modified. Updated by Cowork on content edits.';
