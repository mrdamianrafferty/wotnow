-- ============================================================================
-- GROW SUBSCRIPTION WEBHOOK COLUMNS
-- ============================================================================
-- Additional profile columns needed for webhook handling
--
-- Created: 2026-01-20
-- ============================================================================

-- Add missing columns for webhook handler
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grow_stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS grow_trial_ends_at TIMESTAMPTZ;

-- Rename columns to match webhook handler expectations (if they exist with old names)
-- Note: These are safe to run - they create the columns if they don't exist with new names
DO $$
BEGIN
  -- Check if grow_subscription_start_date exists but grow_subscription_start doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'grow_subscription_start_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'grow_subscription_start'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN grow_subscription_start_date TO grow_subscription_start;
  END IF;

  -- Check if grow_subscription_end_date exists but grow_subscription_end doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'grow_subscription_end_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'grow_subscription_end'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN grow_subscription_end_date TO grow_subscription_end;
  END IF;
END $$;

-- Add columns if they don't exist (in case rename didn't happen)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grow_subscription_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grow_subscription_end TIMESTAMPTZ;

-- Create index for Stripe subscription lookups
CREATE INDEX IF NOT EXISTS idx_profiles_grow_stripe_sub ON public.profiles(grow_stripe_subscription_id)
  WHERE grow_stripe_subscription_id IS NOT NULL;

-- Update view to use correct column names
CREATE OR REPLACE VIEW public.grow_subscription_overview AS
SELECT
  grow_subscription_tier,
  grow_subscription_type,
  COUNT(*) as user_count,
  COUNT(CASE WHEN grow_subscription_start > NOW() - INTERVAL '30 days' THEN 1 END) as new_last_30d
FROM public.profiles
WHERE grow_subscription_tier IS NOT NULL AND grow_subscription_tier != 'seed'
GROUP BY grow_subscription_tier, grow_subscription_type;

GRANT SELECT ON public.grow_subscription_overview TO authenticated;

-- Add comments
COMMENT ON COLUMN public.profiles.grow_stripe_subscription_id IS 'Stripe subscription ID for recurring Grow subscriptions';
COMMENT ON COLUMN public.profiles.grow_trial_ends_at IS 'When the trial period ends for Grow subscription';
COMMENT ON COLUMN public.profiles.grow_subscription_start IS 'When the Grow subscription started';
COMMENT ON COLUMN public.profiles.grow_subscription_end IS 'When the Grow subscription ends (null for lifetime)';
