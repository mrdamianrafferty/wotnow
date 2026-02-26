-- ============================================================================
-- GROW REVENUECAT IAP COLUMNS
-- ============================================================================
-- Adds RevenueCat customer ID to profiles and dedup column to events table
-- for iOS In-App Purchase support via RevenueCat.
--
-- Created: 2026-02-27
-- ============================================================================

-- Add RevenueCat customer ID to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT;

-- Index for RevenueCat customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_customer
  ON public.profiles(revenuecat_customer_id)
  WHERE revenuecat_customer_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.revenuecat_customer_id IS 'RevenueCat App User ID for iOS IAP subscriptions';

-- Add RevenueCat event ID to grow_subscription_events for dedup (mirrors stripe_event_id)
ALTER TABLE public.grow_subscription_events
  ADD COLUMN IF NOT EXISTS revenuecat_event_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_grow_sub_events_rc_event
  ON public.grow_subscription_events(revenuecat_event_id)
  WHERE revenuecat_event_id IS NOT NULL;

COMMENT ON COLUMN public.grow_subscription_events.revenuecat_event_id IS 'RevenueCat webhook event ID for deduplication';
