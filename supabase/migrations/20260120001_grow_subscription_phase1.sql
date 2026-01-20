-- ============================================================================
-- GROW DAISY SUBSCRIPTION PHASE 1
-- Adds Grow-specific subscription tier and usage tracking
-- Created: 2026-01-20
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ADD GROW SUBSCRIPTION TIER TO PROFILES
-- Separate from Findr subscription (users can subscribe to either/both)
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grow_subscription_tier TEXT DEFAULT 'seed'
    CHECK (grow_subscription_tier IN ('seed', 'sprout', 'bloom', 'harvest', 'orchard')),
  ADD COLUMN IF NOT EXISTS grow_subscription_type TEXT
    CHECK (grow_subscription_type IN ('monthly', 'annual', 'lifetime')),
  ADD COLUMN IF NOT EXISTS grow_stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS grow_subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grow_subscription_end_date TIMESTAMPTZ;

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_grow_subscription ON public.profiles(grow_subscription_tier);

COMMENT ON COLUMN public.profiles.grow_subscription_tier IS 'Grow Daisy subscription tier: seed (free), sprout, bloom, harvest, orchard';
COMMENT ON COLUMN public.profiles.grow_subscription_type IS 'Billing type: monthly, annual, or lifetime';

-- ----------------------------------------------------------------------------
-- GROW USAGE TABLE
-- Tracks AI feature usage per user per month
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.grow_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,  -- Format: YYYY-MM (e.g., '2026-01')

  -- AI usage counters
  plant_id_calls INTEGER DEFAULT 0,
  pest_disease_calls INTEGER DEFAULT 0,
  expert_question_calls INTEGER DEFAULT 0,

  -- Photo storage tracking (count, not bytes for simplicity)
  photo_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One record per user per month
  UNIQUE(user_id, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_usage_user_month ON public.grow_usage(user_id, month);

-- Enable RLS
ALTER TABLE public.grow_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own usage" ON public.grow_usage;
CREATE POLICY "Users can view own usage"
  ON public.grow_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage usage" ON public.grow_usage;
CREATE POLICY "Service role can manage usage"
  ON public.grow_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
DROP TRIGGER IF EXISTS grow_usage_updated_at ON public.grow_usage;
CREATE TRIGGER grow_usage_updated_at
  BEFORE UPDATE ON public.grow_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.grow_usage IS 'Monthly AI and feature usage tracking for Grow Daisy';

-- ----------------------------------------------------------------------------
-- USAGE INCREMENT FUNCTION
-- Safely increment usage counters with upsert
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grow_increment_usage(
  p_user_id UUID,
  p_usage_type TEXT,  -- 'plant_id', 'pest_disease', 'expert_question', 'photo'
  p_increment INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_month TEXT;
  v_current_usage INTEGER;
  v_result RECORD;
BEGIN
  -- Get current month in YYYY-MM format
  v_month := to_char(NOW(), 'YYYY-MM');

  -- Upsert the usage record
  INSERT INTO public.grow_usage (user_id, month)
  VALUES (p_user_id, v_month)
  ON CONFLICT (user_id, month) DO NOTHING;

  -- Update the appropriate counter
  CASE p_usage_type
    WHEN 'plant_id' THEN
      UPDATE public.grow_usage
      SET plant_id_calls = plant_id_calls + p_increment,
          updated_at = NOW()
      WHERE user_id = p_user_id AND month = v_month
      RETURNING plant_id_calls INTO v_current_usage;
    WHEN 'pest_disease' THEN
      UPDATE public.grow_usage
      SET pest_disease_calls = pest_disease_calls + p_increment,
          updated_at = NOW()
      WHERE user_id = p_user_id AND month = v_month
      RETURNING pest_disease_calls INTO v_current_usage;
    WHEN 'expert_question' THEN
      UPDATE public.grow_usage
      SET expert_question_calls = expert_question_calls + p_increment,
          updated_at = NOW()
      WHERE user_id = p_user_id AND month = v_month
      RETURNING expert_question_calls INTO v_current_usage;
    WHEN 'photo' THEN
      UPDATE public.grow_usage
      SET photo_count = photo_count + p_increment,
          updated_at = NOW()
      WHERE user_id = p_user_id AND month = v_month
      RETURNING photo_count INTO v_current_usage;
    ELSE
      RETURN jsonb_build_object('error', 'Invalid usage type');
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'usage_type', p_usage_type,
    'current_count', v_current_usage,
    'month', v_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grow_increment_usage IS 'Increment usage counter for a specific feature type';

-- ----------------------------------------------------------------------------
-- GET CURRENT USAGE FUNCTION
-- Returns current month usage for a user
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grow_get_current_usage(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_month TEXT;
  v_usage RECORD;
BEGIN
  v_month := to_char(NOW(), 'YYYY-MM');

  SELECT * INTO v_usage
  FROM public.grow_usage
  WHERE user_id = p_user_id AND month = v_month;

  IF NOT FOUND THEN
    -- Return zeroed usage if no record exists
    RETURN jsonb_build_object(
      'month', v_month,
      'plant_id_calls', 0,
      'pest_disease_calls', 0,
      'expert_question_calls', 0,
      'photo_count', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'month', v_month,
    'plant_id_calls', v_usage.plant_id_calls,
    'pest_disease_calls', v_usage.pest_disease_calls,
    'expert_question_calls', v_usage.expert_question_calls,
    'photo_count', v_usage.photo_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.grow_get_current_usage IS 'Get current month usage counters for a user';

-- ----------------------------------------------------------------------------
-- GROW SUBSCRIPTION EVENTS (audit trail)
-- Separate from Findr subscription events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.grow_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'subscription_created', 'subscription_updated', 'subscription_cancelled', 'payment_succeeded', 'payment_failed'
  stripe_event_id TEXT UNIQUE,
  old_tier TEXT,
  new_tier TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grow_subscription_events_user ON public.grow_subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_subscription_events_type ON public.grow_subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_grow_subscription_events_created ON public.grow_subscription_events(created_at);

ALTER TABLE public.grow_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage grow subscription events" ON public.grow_subscription_events;
CREATE POLICY "Service role can manage grow subscription events"
  ON public.grow_subscription_events FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.grow_subscription_events IS 'Audit log of Grow Daisy subscription events';

-- ----------------------------------------------------------------------------
-- ANALYTICS VIEW
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.grow_subscription_overview AS
SELECT
  grow_subscription_tier,
  grow_subscription_type,
  COUNT(*) as user_count
FROM profiles
WHERE grow_subscription_tier IS NOT NULL
GROUP BY grow_subscription_tier, grow_subscription_type;

GRANT SELECT ON public.grow_subscription_overview TO authenticated;

COMMENT ON VIEW public.grow_subscription_overview IS 'Real-time Grow Daisy subscription metrics';
