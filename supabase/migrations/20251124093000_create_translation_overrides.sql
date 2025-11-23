-- Translation Overrides Table
-- Stores manual translations that should take precedence over automatic ones

CREATE TABLE IF NOT EXISTS translation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  target_language text NOT NULL,
  translated_text text NOT NULL,
  context text,
  notes text,
  tags text[],
  created_by text,
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE (source_text, target_language)
);

CREATE INDEX IF NOT EXISTS idx_translation_overrides_active
  ON translation_overrides (target_language, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_translation_overrides_source
  ON translation_overrides (source_text);

ALTER TABLE translation_overrides ENABLE ROW LEVEL SECURITY;

-- Only the service role can read/write overrides by default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'translation_overrides'
      AND policyname = 'Overrides readable by service role'
  ) THEN
    CREATE POLICY "Overrides readable by service role"
      ON translation_overrides FOR SELECT
      TO service_role
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'translation_overrides'
      AND policyname = 'Overrides writable by service role'
  ) THEN
    CREATE POLICY "Overrides writable by service role"
      ON translation_overrides FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE translation_overrides IS 'Manual translations that override runtime machine translations.';
COMMENT ON COLUMN translation_overrides.source_text IS 'Original English string.';
COMMENT ON COLUMN translation_overrides.target_language IS 'ISO language code (lowercase).';
COMMENT ON COLUMN translation_overrides.context IS 'Optional hint for differentiating similar strings.';
COMMENT ON COLUMN translation_overrides.tags IS 'Free-form labels for filtering (e.g. settings, findr, grow).';
COMMENT ON COLUMN translation_overrides.is_active IS 'Inactive overrides are ignored by the runtime translator.';
