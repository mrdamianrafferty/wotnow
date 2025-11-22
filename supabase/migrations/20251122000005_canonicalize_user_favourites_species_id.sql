-- Migration: Canonicalize user_favourites.species_id to species UUIDs
-- Created: 2025-11-22
-- Purpose: Convert legacy text identifiers (codes/names) to canonical species UUID foreign keys
--
-- Summary:
--   * Adds an audit table to track deleted/modified favourites during cleanup
--   * Backfills a temporary UUID column using several matching strategies
--   * Removes favourites we cannot reconcile to a species (logged first)
--   * Deduplicates user favourites that collapse after canonicalization
--   * Enforces a proper foreign key + unique constraint on (user_id, species_id)
--   * Drops the old text column in favour of a UUID column referencing species(id)
--
-- NOTE: This migration assumes species codes are unique and uppercase in the reference table.
--       All potentially destructive operations are logged to user_favourite_canonicalization_audit.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ensure audit table exists so we can track removals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favourite_canonicalization_audit (
  id BIGSERIAL PRIMARY KEY,
  favourite_id UUID,
  user_id UUID NOT NULL,
  legacy_species_id TEXT,
  action TEXT NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_favourite_canonicalization_audit IS 'Tracks rows removed or adjusted during user_favourites species canonicalization.';
COMMENT ON COLUMN user_favourite_canonicalization_audit.legacy_species_id IS 'Original TEXT identifier (code/name/UUID string) before cleanup.';
COMMENT ON COLUMN user_favourite_canonicalization_audit.action IS 'Short machine-friendly reason: deleted_unresolved, duplicate_removed, etc.';

-- ---------------------------------------------------------------------------
-- 2. Add a temporary UUID column for backfill
-- ---------------------------------------------------------------------------
ALTER TABLE user_favourites
  ADD COLUMN IF NOT EXISTS species_uuid UUID;

-- ---------------------------------------------------------------------------
-- 3. Backfill using multiple matching strategies
-- ---------------------------------------------------------------------------
-- 3a. Exact UUID matches (rows already stored as species UUID strings)
UPDATE user_favourites uf
SET species_uuid = s.id
FROM species s
WHERE uf.species_uuid IS NULL
  AND uf.species_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND s.id::text = uf.species_id::text;

-- 3b. Legacy species codes (case-insensitive)
UPDATE user_favourites uf
SET species_uuid = s.id
FROM species s
WHERE uf.species_uuid IS NULL
  AND upper(trim(uf.species_id::text)) = s.species_code;

-- 3c. English common name match
UPDATE user_favourites uf
SET species_uuid = s.id
FROM species s
WHERE uf.species_uuid IS NULL
  AND s.name_en IS NOT NULL
  AND lower(trim(uf.species_id::text)) = lower(trim(s.name_en));

-- 3d. Scientific name match
UPDATE user_favourites uf
SET species_uuid = s.id
FROM species s
WHERE uf.species_uuid IS NULL
  AND s.scientific_name IS NOT NULL
  AND lower(trim(uf.species_id::text)) = lower(trim(s.scientific_name));

-- ---------------------------------------------------------------------------
-- 4. Log and remove unresolved favourites (no canonical UUID found)
-- ---------------------------------------------------------------------------
INSERT INTO user_favourite_canonicalization_audit (favourite_id, user_id, legacy_species_id, action, notes)
SELECT id, user_id, species_id, 'deleted_unresolved', 'Removed favourite with no matching species record'
FROM user_favourites
WHERE species_uuid IS NULL;

DELETE FROM user_favourites
WHERE species_uuid IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Deduplicate rows that now point to the same (user_id, species_uuid)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    user_id,
    species_uuid,
    species_id AS legacy_species_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, species_uuid
      ORDER BY added_at DESC, id DESC  -- keep the most recently added favourite
    ) AS rn
  FROM user_favourites
)
INSERT INTO user_favourite_canonicalization_audit (favourite_id, user_id, legacy_species_id, action, notes)
SELECT id, user_id, legacy_species_id, 'duplicate_removed', 'Removed duplicate after canonicalization'
FROM ranked
WHERE rn > 1;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, species_uuid
      ORDER BY added_at DESC, id DESC
    ) AS rn
  FROM user_favourites
)
DELETE FROM user_favourites uf
USING ranked r
WHERE uf.id = r.id
  AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 6. Remove legacy constraints/indexes tied to TEXT column
-- ---------------------------------------------------------------------------
ALTER TABLE user_favourites
  DROP CONSTRAINT IF EXISTS user_favourites_user_id_species_id_key;

DROP INDEX IF EXISTS idx_user_favourites_species_id;

-- ---------------------------------------------------------------------------
-- 7. Promote species_uuid column and enforce referential integrity
-- ---------------------------------------------------------------------------
ALTER TABLE user_favourites
  ALTER COLUMN species_uuid SET NOT NULL;

ALTER TABLE user_favourites
  DROP COLUMN species_id;

ALTER TABLE user_favourites
  RENAME COLUMN species_uuid TO species_id;

ALTER TABLE user_favourites
  ADD CONSTRAINT user_favourites_species_id_fkey
    FOREIGN KEY (species_id)
    REFERENCES species (id)
    ON DELETE CASCADE;

ALTER TABLE user_favourites
  ADD CONSTRAINT user_favourites_user_id_species_id_key
    UNIQUE (user_id, species_id);

CREATE INDEX IF NOT EXISTS idx_user_favourites_species_id
  ON user_favourites(species_id);

COMMENT ON COLUMN user_favourites.species_id IS 'Foreign key to species.id (UUID) after canonicalization of legacy codes.';

COMMIT;
