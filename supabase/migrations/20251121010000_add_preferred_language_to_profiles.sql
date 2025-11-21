-- Add preferred language column to profiles for cross-app localization sync
-- November 21, 2025

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT
  CHECK (preferred_language IN ('en','es','fr','pt','de','it','nl','pl','tr','sv'))
  DEFAULT 'en';

COMMENT ON COLUMN public.profiles.preferred_language IS 'User interface language preference shared across Go Daisy, Findr, and Grow Daisy.';
