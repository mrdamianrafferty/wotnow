-- Migration: Create fish_id_usage table for AI budget tracking
-- Created: 2025-11-22
-- Purpose: Move AI identification budget tracking from client-side localStorage to server-side database
--
-- Security Issue: Budget tracking in localStorage can be manipulated by users
-- Solution: Server-side tracking tied to user_id with RLS policies
--
-- Features:
-- - Per-user, per-provider, per-month tracking
-- - Tracks total spend and call count
-- - RLS policies for data protection
-- - Efficient lookups with composite index

CREATE TABLE IF NOT EXISTS fish_id_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User tracking
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period (format: "2025-11")
  month TEXT NOT NULL,

  -- Provider tracking
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'huggingface')),

  -- Usage metrics
  usage_amount NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Total spend in euros (e.g., €2.50)
  call_count INTEGER NOT NULL DEFAULT 0,           -- Number of AI calls

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one row per user/month/provider combination
  CONSTRAINT unique_fish_id_usage UNIQUE (user_id, month, provider)
);

-- Index for efficient lookups by user and month
CREATE INDEX IF NOT EXISTS idx_fish_id_usage_user_month
  ON fish_id_usage (user_id, month, provider);

-- Index for cleanup queries (finding old data)
CREATE INDEX IF NOT EXISTS idx_fish_id_usage_updated
  ON fish_id_usage (updated_at);

-- Enable Row-Level Security
ALTER TABLE fish_id_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own usage data
DROP POLICY IF EXISTS "Users can read own fish ID usage" ON fish_id_usage;
CREATE POLICY "Users can read own fish ID usage"
  ON fish_id_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage data
DROP POLICY IF EXISTS "Users can insert own fish ID usage" ON fish_id_usage;
CREATE POLICY "Users can insert own fish ID usage"
  ON fish_id_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own usage data
DROP POLICY IF EXISTS "Users can update own fish ID usage" ON fish_id_usage;
CREATE POLICY "Users can update own fish ID usage"
  ON fish_id_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access (for admin/cleanup)
DROP POLICY IF EXISTS "Service role has full access to fish ID usage" ON fish_id_usage;
CREATE POLICY "Service role has full access to fish ID usage"
  ON fish_id_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fish_id_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the timestamp update function
DROP TRIGGER IF EXISTS fish_id_usage_updated_at ON fish_id_usage;
CREATE TRIGGER fish_id_usage_updated_at
  BEFORE UPDATE ON fish_id_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_fish_id_usage_timestamp();

-- Comments for documentation
COMMENT ON TABLE fish_id_usage IS 'Tracks AI fish identification usage (budget and call count) per user, month, and provider. Replaces insecure client-side localStorage tracking.';

COMMENT ON COLUMN fish_id_usage.month IS 'Month in YYYY-MM format (e.g., "2025-11")';
COMMENT ON COLUMN fish_id_usage.provider IS 'AI provider: "openai" (GPT-4) or "huggingface" (ViT)';
COMMENT ON COLUMN fish_id_usage.usage_amount IS 'Total spend in euros for this month';
COMMENT ON COLUMN fish_id_usage.call_count IS 'Number of AI identification calls made this month';
