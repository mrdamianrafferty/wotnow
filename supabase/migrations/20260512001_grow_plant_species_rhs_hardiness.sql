-- P1 Chunk A: RHS hardiness rating columns for plant_species
-- RHS scale: H1a (tropical) through H7 (fully hardy, survives -20°C)
-- These map to UK growing conditions; USDA columns remain as secondary.
-- Cowork will populate the top-200 species via CSV using grow-gardening-expert skill.

ALTER TABLE plant_species
  ADD COLUMN IF NOT EXISTS rhs_hardiness_min VARCHAR(4),
  ADD COLUMN IF NOT EXISTS rhs_hardiness_max VARCHAR(4);

ALTER TABLE plant_species
  ADD CONSTRAINT IF NOT EXISTS plant_species_rhs_min_valid
    CHECK (rhs_hardiness_min IN ('H1a','H1b','H1c','H2','H3','H4','H5','H6','H7') OR rhs_hardiness_min IS NULL),
  ADD CONSTRAINT IF NOT EXISTS plant_species_rhs_max_valid
    CHECK (rhs_hardiness_max IN ('H1a','H1b','H1c','H2','H3','H4','H5','H6','H7') OR rhs_hardiness_max IS NULL);

CREATE INDEX IF NOT EXISTS idx_plant_species_rhs_hardiness
  ON plant_species (rhs_hardiness_min, rhs_hardiness_max);

COMMENT ON COLUMN plant_species.rhs_hardiness_min IS
  'Minimum RHS hardiness rating (coldest the plant can tolerate). NULL until Cowork CSV import.';
COMMENT ON COLUMN plant_species.rhs_hardiness_max IS
  'Maximum RHS hardiness rating (warmest it grows well in). NULL until Cowork CSV import.';
