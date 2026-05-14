-- plant_species_aliases is a public lookup table (old slug → canonical slug).
-- RLS was auto-enabled on the table but no SELECT policy was added, so anon
-- requests see 0 rows and the alias redirect never fires (404 instead of 301).
-- This migration adds a permissive public read policy.

CREATE POLICY "public_read" ON plant_species_aliases
  FOR SELECT
  TO anon, authenticated
  USING (true);
