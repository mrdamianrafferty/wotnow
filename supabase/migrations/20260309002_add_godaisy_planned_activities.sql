-- =============================================================================
-- Go Daisy+ Planned Activities Journal
--
-- Allows users to plan and log activities with weather context.
-- Part of Go Daisy+ subscription features.
-- =============================================================================

CREATE TABLE IF NOT EXISTS godaisy_planned_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_key TEXT NOT NULL,
  planned_date DATE NOT NULL,
  location_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lon DOUBLE PRECISION,
  notes TEXT,
  weather_snapshot JSONB,       -- Saved weather conditions at time of planning
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped', 'cancelled')),
  completed_at TIMESTAMPTZ,
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_godaisy_planned_user_date
  ON godaisy_planned_activities(user_id, planned_date DESC);

-- RLS policies
ALTER TABLE godaisy_planned_activities ENABLE ROW LEVEL SECURITY;

-- Users can read their own planned activities
CREATE POLICY "Users can view own planned activities"
  ON godaisy_planned_activities FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own planned activities
CREATE POLICY "Users can create own planned activities"
  ON godaisy_planned_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own planned activities
CREATE POLICY "Users can update own planned activities"
  ON godaisy_planned_activities FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own planned activities
CREATE POLICY "Users can delete own planned activities"
  ON godaisy_planned_activities FOR DELETE
  USING (auth.uid() = user_id);
