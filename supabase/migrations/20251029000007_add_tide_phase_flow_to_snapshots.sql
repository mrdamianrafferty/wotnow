-- Add Tide Phase and Flow Speed to findr_conditions_snapshots
-- Week 1: Data Pipeline for Real-Time Bite Score Framework
--
-- COLUMNS ADDED:
-- 1. tide_phase: Calculated tide phase (early_flood, mid_flood, high, early_ebb, mid_ebb, low_slack)
-- 2. tide_flow_speed_ms: Estimated tidal flow speed in meters/second
--
-- These will be calculated by ingestFindrConditions.ts using the helper functions

ALTER TABLE findr_conditions_snapshots
ADD COLUMN IF NOT EXISTS tide_phase text,
ADD COLUMN IF NOT EXISTS tide_flow_speed_ms double precision;

COMMENT ON COLUMN findr_conditions_snapshots.tide_phase IS
'Tide phase: early_flood, mid_flood, high, early_ebb, mid_ebb, low_slack. Calculated from tide times and flow speed';

COMMENT ON COLUMN findr_conditions_snapshots.tide_flow_speed_ms IS
'Estimated tidal flow speed in meters/second. Max at mid-flood/mid-ebb, min at slack';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ findr_conditions_snapshots schema updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS ADDED:';
  RAISE NOTICE '  - tide_phase: Calculated tide phase from helper function';
  RAISE NOTICE '  - tide_flow_speed_ms: Tidal flow speed calculation';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update ingestFindrConditions.ts to calculate these fields';
END $$;
