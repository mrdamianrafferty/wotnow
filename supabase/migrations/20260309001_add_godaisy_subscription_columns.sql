-- ============================================================================
-- GO DAISY+ SUBSCRIPTION SYSTEM
-- Adds Go Daisy subscription tier columns and events audit table
-- Created: 2026-03-09
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ADD GO DAISY SUBSCRIPTION COLUMNS TO PROFILES
-- Separate from Findr and Grow Daisy subscriptions (users can subscribe to any/all)
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS godaisy_subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (godaisy_subscription_tier IN ('free', 'plus')),
  ADD COLUMN IF NOT EXISTS godaisy_subscription_type TEXT
    CHECK (godaisy_subscription_type IN ('monthly', 'annual', 'promo')),
  ADD COLUMN IF NOT EXISTS godaisy_stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS godaisy_stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS godaisy_subscription_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS godaisy_subscription_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS godaisy_revenuecat_product_id TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_godaisy_subscription
  ON public.profiles(godaisy_subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_godaisy_stripe_sub
  ON public.profiles(godaisy_stripe_subscription_id)
  WHERE godaisy_stripe_subscription_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.profiles.godaisy_subscription_tier IS 'Go Daisy subscription tier: free or plus';
COMMENT ON COLUMN public.profiles.godaisy_subscription_type IS 'Billing type: monthly, annual, or promo (free via promo code)';
COMMENT ON COLUMN public.profiles.godaisy_stripe_subscription_id IS 'Stripe subscription ID for recurring Go Daisy+ subscriptions';
COMMENT ON COLUMN public.profiles.godaisy_stripe_customer_id IS 'Stripe customer ID for Go Daisy+ billing';
COMMENT ON COLUMN public.profiles.godaisy_subscription_start IS 'When the Go Daisy+ subscription started';
COMMENT ON COLUMN public.profiles.godaisy_subscription_end IS 'When the Go Daisy+ subscription ends';
COMMENT ON COLUMN public.profiles.godaisy_revenuecat_product_id IS 'RevenueCat product ID for iOS Go Daisy+ purchases';

-- ----------------------------------------------------------------------------
-- GO DAISY SUBSCRIPTION EVENTS (audit trail)
-- Separate from Findr and Grow subscription events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.godaisy_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  revenuecat_event_id TEXT UNIQUE,
  tier TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_godaisy_subscription_events_user
  ON public.godaisy_subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_godaisy_subscription_events_type
  ON public.godaisy_subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_godaisy_subscription_events_created
  ON public.godaisy_subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_godaisy_subscription_events_rc
  ON public.godaisy_subscription_events(revenuecat_event_id)
  WHERE revenuecat_event_id IS NOT NULL;

ALTER TABLE public.godaisy_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage godaisy subscription events" ON public.godaisy_subscription_events;
CREATE POLICY "Service role can manage godaisy subscription events"
  ON public.godaisy_subscription_events FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.godaisy_subscription_events IS 'Audit log of Go Daisy+ subscription events';

-- ----------------------------------------------------------------------------
-- ANALYTICS VIEW
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.godaisy_subscription_overview AS
SELECT
  godaisy_subscription_tier,
  godaisy_subscription_type,
  COUNT(*) as user_count,
  COUNT(CASE WHEN godaisy_subscription_start > NOW() - INTERVAL '30 days' THEN 1 END) as new_last_30d
FROM public.profiles
WHERE godaisy_subscription_tier IS NOT NULL AND godaisy_subscription_tier != 'free'
GROUP BY godaisy_subscription_tier, godaisy_subscription_type;

GRANT SELECT ON public.godaisy_subscription_overview TO authenticated;

COMMENT ON VIEW public.godaisy_subscription_overview IS 'Real-time Go Daisy+ subscription metrics';
