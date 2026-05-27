-- Migration: add RHS hardiness columns to plant_species
-- Phase 1 Step 1 — stores RHS H1a–H7 ratings alongside existing USDA zone fields.
-- VARCHAR(4) covers the widest possible value (H1c = 3 chars; H1a = 3 chars).
-- NULL = not yet rated; populated by the companion data migration (20260527019).

ALTER TABLE plant_species
  ADD COLUMN IF NOT EXISTS rhs_hardiness_min VARCHAR(4),
  ADD COLUMN IF NOT EXISTS rhs_hardiness_max VARCHAR(4);

-- Partial index: speeds up future filter queries on rated species only.
CREATE INDEX IF NOT EXISTS idx_plant_species_rhs_hardiness_min
  ON plant_species (rhs_hardiness_min)
  WHERE rhs_hardiness_min IS NOT NULL;
