-- Migration: Create fish identification metrics tracking table
-- Purpose: Track performance and accuracy of fish ID providers (OpenAI vs Hugging Face)
-- Date: 2025-11-11

-- Create fish_identification_metrics table
CREATE TABLE IF NOT EXISTS fish_identification_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Provider information
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'huggingface')),

  -- Request metadata
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rectangle_code TEXT,

  -- Performance metrics
  latency_ms INTEGER NOT NULL,
  cost_eur DECIMAL(10, 4) NOT NULL DEFAULT 0,

  -- Identification results
  method TEXT NOT NULL CHECK (method IN ('cache', 'database', 'visual', 'ai', 'manual_selection')),
  confidence DECIMAL(5, 4) CHECK (confidence >= 0 AND confidence <= 1),
  suggested_species_id UUID REFERENCES species(id) ON DELETE SET NULL,
  suggested_species_name TEXT,

  -- User validation (if they later correct it)
  actual_species_id UUID REFERENCES species(id) ON DELETE SET NULL,
  actual_species_name TEXT,
  was_correct BOOLEAN,

  -- Additional context
  num_candidates INTEGER,
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fish_id_metrics_created_at
  ON fish_identification_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fish_id_metrics_provider
  ON fish_identification_metrics(provider);

CREATE INDEX IF NOT EXISTS idx_fish_id_metrics_rectangle
  ON fish_identification_metrics(rectangle_code);

CREATE INDEX IF NOT EXISTS idx_fish_id_metrics_user
  ON fish_identification_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_fish_id_metrics_accuracy
  ON fish_identification_metrics(was_correct)
  WHERE was_correct IS NOT NULL;

-- Add comment
COMMENT ON TABLE fish_identification_metrics IS
  'Tracks performance and accuracy metrics for fish identification across providers (OpenAI vs Hugging Face)';

-- Enable Row Level Security
ALTER TABLE fish_identification_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own metrics
CREATE POLICY fish_id_metrics_select_own
  ON fish_identification_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert metrics
CREATE POLICY fish_id_metrics_service_insert
  ON fish_identification_metrics
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Service role can update metrics (for validation)
CREATE POLICY fish_id_metrics_service_update
  ON fish_identification_metrics
  FOR UPDATE
  USING (true);

-- Create a view for provider comparison statistics
CREATE OR REPLACE VIEW fish_identification_provider_stats AS
SELECT
  provider,
  COUNT(*) as total_identifications,
  AVG(latency_ms) as avg_latency_ms,
  SUM(cost_eur) as total_cost_eur,
  AVG(confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE was_correct = true) as correct_count,
  COUNT(*) FILTER (WHERE was_correct = false) as incorrect_count,
  COUNT(*) FILTER (WHERE was_correct IS NOT NULL) as validated_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE was_correct IS NOT NULL) > 0
    THEN (COUNT(*) FILTER (WHERE was_correct = true)::DECIMAL / COUNT(*) FILTER (WHERE was_correct IS NOT NULL))
    ELSE NULL
  END as accuracy_rate,
  COUNT(*) FILTER (WHERE error_occurred = true) as error_count,
  DATE_TRUNC('day', created_at) as date
FROM fish_identification_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider, DATE_TRUNC('day', created_at)
ORDER BY date DESC, provider;

-- Grant access to the view
GRANT SELECT ON fish_identification_provider_stats TO authenticated;
GRANT SELECT ON fish_identification_provider_stats TO anon;

COMMENT ON VIEW fish_identification_provider_stats IS
  'Daily statistics comparing OpenAI vs Hugging Face fish identification performance';
