-- Translation Cache Table
-- This table stores all translations with usage tracking and quality management

CREATE TABLE IF NOT EXISTS translation_cache (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The source text and target language form a unique pair
  source_text text NOT NULL,
  target_language text NOT NULL,
  
  -- The translated text (from DeepL or manual override)
  translated_text text NOT NULL,
  
  -- Track the source of this translation
  translation_source text NOT NULL DEFAULT 'auto'
    CHECK (translation_source IN ('auto', 'reviewed', 'manual')),
  
  -- Content hash to detect when source text changes
  source_content_hash text,
  
  -- Management flags
  needs_review boolean DEFAULT false,
  has_fishing_terminology boolean DEFAULT false,
  quality_issues text[],
  
  -- Usage statistics
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  
  -- Audit information
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  notes text,
  
  -- Ensure uniqueness
  UNIQUE (source_text, target_language)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup 
  ON translation_cache (source_text, target_language);

CREATE INDEX IF NOT EXISTS idx_translation_cache_popular 
  ON translation_cache (access_count DESC)
  WHERE translation_source = 'auto';

CREATE INDEX IF NOT EXISTS idx_translation_cache_review 
  ON translation_cache (needs_review, access_count DESC)
  WHERE needs_review = true;

CREATE INDEX IF NOT EXISTS idx_translation_cache_by_language 
  ON translation_cache (target_language, access_count DESC);

-- Row Level Security
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

-- Allow all users to read translations (create only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'translation_cache' 
    AND policyname = 'Translations readable by all'
  ) THEN
    CREATE POLICY "Translations readable by all"
      ON translation_cache FOR SELECT
      USING (true);
  END IF;
END $$;

-- Only service role can write translations (create only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'translation_cache' 
    AND policyname = 'Translations writable by service role'
  ) THEN
    CREATE POLICY "Translations writable by service role"
      ON translation_cache FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;