-- Phase 1: Add aliases and slug columns to species table
-- This is a NON-BREAKING change that adds new fields without affecting existing functionality
-- Date: 2025-10-30
-- Part of Species Schema Migration Plan

-- Add aliases column for common English names
ALTER TABLE species ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- Add slug column (generated from scientific_name)
-- The slug is a URL-friendly version: lowercase, hyphens instead of spaces
ALTER TABLE species ADD COLUMN IF NOT EXISTS slug VARCHAR
  GENERATED ALWAYS AS (
    lower(regexp_replace(scientific_name, '[^a-zA-Z0-9]+', '-', 'g'))
  ) STORED;

-- Add index on scientific_name for fast lookup (already unique, this adds performance)
CREATE INDEX IF NOT EXISTS idx_species_scientific_name ON species(scientific_name);

-- Add index on slug for URL-based lookups
CREATE INDEX IF NOT EXISTS idx_species_slug ON species(slug);

-- Add GIN index on aliases for fast array search
-- GIN indexes are optimal for array containment queries (e.g., 'dogfish' = ANY(aliases))
CREATE INDEX IF NOT EXISTS idx_species_aliases_gin ON species USING GIN (aliases);

-- Add comments to document the new columns
COMMENT ON COLUMN species.aliases IS 'Common English names and alternative names for species search (e.g., ["dogfish", "common dogfish"])';
COMMENT ON COLUMN species.slug IS 'URL-friendly version of scientific_name (e.g., "scyliorhinus-canicula")';

-- Verify the changes
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'species'
  AND column_name IN ('aliases', 'slug')
ORDER BY ordinal_position;
