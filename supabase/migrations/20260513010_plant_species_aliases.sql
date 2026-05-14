-- plant_species_aliases
-- Backwards-compatibility redirect table for renamed plant slugs.
-- Application layer checks this on 404 and issues a 301 to the canonical slug.

CREATE TABLE IF NOT EXISTS plant_species_aliases (
  old_slug   TEXT PRIMARY KEY,
  new_slug   TEXT NOT NULL REFERENCES plant_species(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plant_species_aliases_new_slug_idx
  ON plant_species_aliases (new_slug);
