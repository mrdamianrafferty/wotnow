-- ============================================================================
-- GROW DAISY OUTCOME TRACKING
-- ============================================================================
-- Database schema for tracking harvest outcomes and task feedback.
-- Part of Phase 2 data collection infrastructure.
--
-- Created: 2026-01-20
-- ============================================================================

-- =============================================================================
-- HARVEST OUTCOMES TABLE
-- =============================================================================
-- Tracks actual harvest results from user plants

CREATE TABLE IF NOT EXISTS public.grow_harvest_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID NOT NULL,  -- Reference to user's plant entry

  -- Harvest details
  harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_value NUMERIC,
  quantity_unit TEXT,  -- 'kg', 'lbs', 'count', 'bunches', etc.

  -- Quality assessment
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),  -- 1-5 stars
  quality_notes TEXT,

  -- Comparison to expectations
  met_expectations TEXT CHECK (met_expectations IN ('exceeded', 'met', 'below', 'failed')),

  -- Conditions at harvest
  days_from_planting INTEGER,  -- Days from plant date to harvest
  weather_at_harvest JSONB,    -- Weather snapshot from that day

  -- Photos
  photo_urls TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_harvest_outcomes_user ON public.grow_harvest_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_harvest_outcomes_plant ON public.grow_harvest_outcomes(plant_id);
CREATE INDEX IF NOT EXISTS idx_grow_harvest_outcomes_date ON public.grow_harvest_outcomes(harvest_date);

-- RLS policies
ALTER TABLE public.grow_harvest_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own harvest outcomes" ON public.grow_harvest_outcomes;
CREATE POLICY "Users can manage own harvest outcomes"
  ON public.grow_harvest_outcomes FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all harvest outcomes" ON public.grow_harvest_outcomes;
CREATE POLICY "Service role can manage all harvest outcomes"
  ON public.grow_harvest_outcomes FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- TASK FEEDBACK TABLE
-- =============================================================================
-- Tracks feedback on completed tasks (did it help?)

CREATE TABLE IF NOT EXISTS public.grow_task_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID NOT NULL,  -- Reference to the task that was completed

  -- Task context
  task_type TEXT NOT NULL,  -- 'watering', 'fertilizing', 'pest_treatment', etc.
  plant_id UUID,           -- Associated plant (if any)
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Feedback
  was_helpful BOOLEAN,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_text TEXT,

  -- Outcome (collected a few days later)
  outcome TEXT CHECK (outcome IN ('improved', 'no_change', 'worsened', 'unknown')),
  outcome_notes TEXT,

  -- Follow-up action
  would_recommend BOOLEAN,  -- Would recommend this task to others

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  outcome_recorded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_task_feedback_user ON public.grow_task_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_task_feedback_task ON public.grow_task_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_grow_task_feedback_type ON public.grow_task_feedback(task_type);
CREATE INDEX IF NOT EXISTS idx_grow_task_feedback_plant ON public.grow_task_feedback(plant_id);

-- RLS policies
ALTER TABLE public.grow_task_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own task feedback" ON public.grow_task_feedback;
CREATE POLICY "Users can manage own task feedback"
  ON public.grow_task_feedback FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all task feedback" ON public.grow_task_feedback;
CREATE POLICY "Service role can manage all task feedback"
  ON public.grow_task_feedback FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- PLANT HEALTH LOG TABLE
-- =============================================================================
-- Tracks plant health observations over time

CREATE TABLE IF NOT EXISTS public.grow_plant_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID NOT NULL,

  -- Health observation
  observed_at TIMESTAMPTZ DEFAULT now(),
  health_score INTEGER CHECK (health_score >= 1 AND health_score <= 10),  -- 1-10

  -- Symptoms (if any)
  symptoms TEXT[],  -- ['yellowing_leaves', 'wilting', 'pest_damage', etc.]
  symptom_notes TEXT,

  -- Growth metrics
  height_cm NUMERIC,
  leaf_count INTEGER,
  flower_count INTEGER,
  fruit_count INTEGER,

  -- Environmental context
  weather_snapshot JSONB,
  soil_moisture TEXT CHECK (soil_moisture IN ('dry', 'moist', 'wet')),

  -- Photos
  photo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_plant_health_log_user ON public.grow_plant_health_log(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_plant_health_log_plant ON public.grow_plant_health_log(plant_id);
CREATE INDEX IF NOT EXISTS idx_grow_plant_health_log_observed ON public.grow_plant_health_log(observed_at);

-- RLS policies
ALTER TABLE public.grow_plant_health_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own plant health logs" ON public.grow_plant_health_log;
CREATE POLICY "Users can manage own plant health logs"
  ON public.grow_plant_health_log FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all plant health logs" ON public.grow_plant_health_log;
CREATE POLICY "Service role can manage all plant health logs"
  ON public.grow_plant_health_log FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- AGGREGATE STATISTICS VIEW
-- =============================================================================
-- Anonymous aggregated data for improving recommendations

CREATE OR REPLACE VIEW public.grow_outcome_statistics AS
SELECT
  -- Group by plant species (would need to join with plants table)
  COUNT(*) as total_harvests,
  AVG(quality_rating) as avg_quality,
  AVG(days_from_planting) as avg_days_to_harvest,
  COUNT(CASE WHEN met_expectations = 'exceeded' THEN 1 END) as exceeded_count,
  COUNT(CASE WHEN met_expectations = 'met' THEN 1 END) as met_count,
  COUNT(CASE WHEN met_expectations = 'below' THEN 1 END) as below_count,
  COUNT(CASE WHEN met_expectations = 'failed' THEN 1 END) as failed_count
FROM public.grow_harvest_outcomes
WHERE harvest_date > NOW() - INTERVAL '1 year';

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get recent harvest outcomes for a user
CREATE OR REPLACE FUNCTION public.grow_get_user_harvest_outcomes(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  plant_id UUID,
  harvest_date DATE,
  quantity_value NUMERIC,
  quantity_unit TEXT,
  quality_rating INTEGER,
  met_expectations TEXT,
  days_from_planting INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.plant_id,
    h.harvest_date,
    h.quantity_value,
    h.quantity_unit,
    h.quality_rating,
    h.met_expectations,
    h.days_from_planting,
    h.created_at
  FROM public.grow_harvest_outcomes h
  WHERE h.user_id = p_user_id
  ORDER BY h.harvest_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get task feedback summary for a task type
CREATE OR REPLACE FUNCTION public.grow_get_task_feedback_summary(
  p_task_type TEXT
)
RETURNS TABLE (
  total_feedback BIGINT,
  helpful_count BIGINT,
  avg_rating NUMERIC,
  improved_count BIGINT,
  no_change_count BIGINT,
  worsened_count BIGINT,
  would_recommend_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_feedback,
    COUNT(CASE WHEN was_helpful = true THEN 1 END)::BIGINT as helpful_count,
    AVG(feedback_rating)::NUMERIC as avg_rating,
    COUNT(CASE WHEN outcome = 'improved' THEN 1 END)::BIGINT as improved_count,
    COUNT(CASE WHEN outcome = 'no_change' THEN 1 END)::BIGINT as no_change_count,
    COUNT(CASE WHEN outcome = 'worsened' THEN 1 END)::BIGINT as worsened_count,
    COUNT(CASE WHEN would_recommend = true THEN 1 END)::BIGINT as would_recommend_count
  FROM public.grow_task_feedback
  WHERE task_type = p_task_type
    AND created_at > NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.grow_harvest_outcomes IS 'Tracks user harvest results for data collection and prediction improvement';
COMMENT ON TABLE public.grow_task_feedback IS 'Tracks feedback on completed tasks to improve recommendations';
COMMENT ON TABLE public.grow_plant_health_log IS 'Tracks plant health observations over time';
COMMENT ON FUNCTION public.grow_get_user_harvest_outcomes IS 'Get recent harvest outcomes for a user';
COMMENT ON FUNCTION public.grow_get_task_feedback_summary IS 'Get aggregated feedback statistics for a task type';
