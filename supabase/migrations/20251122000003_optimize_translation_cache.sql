-- Migration: Optimize translation_cache table for faster lookups
-- Created: 2025-11-22
-- Purpose: Add composite index and optimize translation cache performance
--
-- Current Performance: Variable (depends on table size)
-- Expected After Index: <5ms for cache lookups
--
-- Query Pattern:
-- SELECT * FROM translation_cache
-- WHERE source_text = '<text>' AND target_language = '<lang>'

-- Add composite index for the exact query pattern used in autoTranslate
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
  ON translation_cache (source_text, target_language);

-- Add index for translation source ordering (used in prioritizing manual translations)
CREATE INDEX IF NOT EXISTS idx_translation_cache_source
  ON translation_cache (source_text, target_language, translation_source DESC);

-- Add index for cleanup queries (finding stale translations)
CREATE INDEX IF NOT EXISTS idx_translation_cache_accessed
  ON translation_cache (last_accessed_at)
  WHERE last_accessed_at IS NOT NULL;

-- Comment on indexes
COMMENT ON INDEX idx_translation_cache_lookup IS
  'Composite index for translation cache lookups by source_text and target_language. Primary query pattern for autoTranslate function.';

COMMENT ON INDEX idx_translation_cache_source IS
  'Composite index including translation_source for prioritizing manual translations over automatic ones.';

COMMENT ON INDEX idx_translation_cache_accessed IS
  'Partial index for cleanup queries to identify stale or unused translations.';
