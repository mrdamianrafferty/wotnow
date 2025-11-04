-- Add new fields to moon_cache table for phase stage and countdown to next phases
-- Migration: add_moon_phase_stage_and_countdown
-- Created: 2025-10-17

-- Add moon_phase_stage column (waxing/waning)
ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS moon_phase_stage TEXT;

-- Add days_until_next_full_moon column
ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS days_until_next_full_moon INTEGER;

-- Add days_until_next_new_moon column
ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS days_until_next_new_moon INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN moon_cache.moon_phase_stage IS 'Stage of the moon cycle: waxing or waning';
COMMENT ON COLUMN moon_cache.days_until_next_full_moon IS 'Number of days until the next full moon';
COMMENT ON COLUMN moon_cache.days_until_next_new_moon IS 'Number of days until the next new moon';
