-- Add AI identification tracking columns to findr_catch_entries
-- This enables tracking AI accuracy and building a feedback loop for self-improvement

-- Add columns for AI identification tracking
ALTER TABLE findr_catch_entries
ADD COLUMN IF NOT EXISTS ai_suggested_species_id TEXT,
ADD COLUMN IF NOT EXISTS ai_suggested_species_name TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_method TEXT CHECK (ai_method IN ('cache', 'database', 'visual', 'ai', 'manual_selection')),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_was_corrected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_gave_up BOOLEAN DEFAULT FALSE, -- True when AI showed low confidence and gave up
ADD COLUMN IF NOT EXISTS identification_source TEXT CHECK (identification_source IN ('ai', 'manual', 'ai_corrected', 'ai_gave_up'));

-- Create indexes for AI accuracy analytics
CREATE INDEX IF NOT EXISTS idx_catch_entries_ai_accuracy
    ON findr_catch_entries (rectangle_code, ai_was_corrected, ai_confidence)
    WHERE ai_suggested_species_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catch_entries_ai_gave_up
    ON findr_catch_entries (rectangle_code, ai_gave_up)
    WHERE ai_gave_up = TRUE;

CREATE INDEX IF NOT EXISTS idx_catch_entries_ai_method_analysis
    ON findr_catch_entries (ai_method, caught_at DESC)
    WHERE ai_method IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catch_entries_species_ai_accuracy
    ON findr_catch_entries (species_id, ai_suggested_species_id)
    WHERE ai_suggested_species_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN findr_catch_entries.ai_suggested_species_id IS 'Species ID that AI originally suggested (before any user correction)';
COMMENT ON COLUMN findr_catch_entries.ai_suggested_species_name IS 'Species name that AI originally suggested';
COMMENT ON COLUMN findr_catch_entries.ai_confidence IS 'AI confidence score (0-1) at time of identification';
COMMENT ON COLUMN findr_catch_entries.ai_method IS 'How the AI identified this catch: cache, database, visual, ai, manual_selection';
COMMENT ON COLUMN findr_catch_entries.ai_reasoning IS 'AI explanation for the identification (e.g., "body shape matches, color pattern consistent")';
COMMENT ON COLUMN findr_catch_entries.ai_was_corrected IS 'True if user changed the AI suggestion to a different species';
COMMENT ON COLUMN findr_catch_entries.ai_gave_up IS 'True if AI showed low confidence and returned manual_selection (no confident suggestion)';
COMMENT ON COLUMN findr_catch_entries.identification_source IS 'Overall source: ai (accepted AI suggestion), manual (no AI involved), ai_corrected (user changed AI suggestion), ai_gave_up (AI had no confident suggestion)';
