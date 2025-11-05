-- Phase 2: Add Pressure Trend Tracking
-- Migration: 20251105000001_add_pressure_trend_columns.sql
-- Description: Add columns to track 3h and 6h pressure trends for bite score calculation
-- Related: docs/PHASE_2_PRESSURE_CLOUD_BITE_SCORE.md

-- Add pressure trend columns to findr_conditions_snapshots
ALTER TABLE findr_conditions_snapshots
ADD COLUMN IF NOT EXISTS pressure_trend_3h_hpa REAL,
ADD COLUMN IF NOT EXISTS pressure_trend_6h_hpa REAL,
ADD COLUMN IF NOT EXISTS pressure_trend_category TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN findr_conditions_snapshots.pressure_trend_3h_hpa IS
'Change in air pressure over last 3 hours (current - 3h ago) in hPa. Positive = rising, negative = falling';

COMMENT ON COLUMN findr_conditions_snapshots.pressure_trend_6h_hpa IS
'Change in air pressure over last 6 hours (current - 6h ago) in hPa. Positive = rising, negative = falling';

COMMENT ON COLUMN findr_conditions_snapshots.pressure_trend_category IS
'Categorized pressure trend: rising (+2 hPa/3h), steady (-2 to +2), falling (-2 to -5), rapid_falling (< -5)';

-- Create index for efficient pressure trend queries
CREATE INDEX IF NOT EXISTS idx_findr_conditions_pressure_trend
ON findr_conditions_snapshots (rectangle_code, captured_at DESC)
WHERE air_pressure_hpa IS NOT NULL;

-- Add CHECK constraint to ensure trend category is valid
ALTER TABLE findr_conditions_snapshots
ADD CONSTRAINT check_pressure_trend_category
CHECK (pressure_trend_category IS NULL OR pressure_trend_category IN (
  'rising',
  'steady',
  'falling',
  'rapid_falling',
  'unknown'  -- for cases where historical data isn't available
));

-- Recreate findr_conditions_latest view to include pressure trend columns
-- Note: findr_conditions_latest is a VIEW, not a table, so we need to DROP and CREATE
-- CASCADE will also drop dependent views like rectangle_data_quality
DROP VIEW IF EXISTS findr_conditions_latest CASCADE;

CREATE VIEW findr_conditions_latest AS
SELECT DISTINCT ON (rectangle_code)
  rectangle_code,
  captured_at,
  source,
  -- Marine conditions
  sea_temp_c,
  water_temp_c,
  wind_speed_kts,
  wind_direction_deg,
  wave_height_m,
  wave_period_s,
  wave_direction_deg,
  wind_sea_height_m,
  swell_height_m,
  current_speed_ms,
  current_direction_deg,
  current_east_ms,
  current_north_ms,
  sea_surface_height_m,
  -- Tide data
  next_high_tide_iso,
  next_low_tide_iso,
  tide_phase,
  tide_flow_speed_ms,
  -- Phase 1: Weather data
  air_pressure_hpa,
  cloud_cover_pct,
  -- Phase 2: Pressure trends (NEW)
  pressure_trend_3h_hpa,
  pressure_trend_6h_hpa,
  pressure_trend_category,
  -- Water clarity & biogeochemical
  kd490,
  kd490_m1,
  water_clarity_kd490,
  secchi_depth_m,
  mixed_layer_depth_m,
  chlorophyll_mg_m3,
  dissolved_oxygen_mg_l,
  salinity_psu,
  nitrate_umol_l,
  phosphate_umol_l,
  phytoplankton_mmol_m3,
  zooplankton_mmol_m3,
  primary_production_mg_c_m3_day,
  -- Raw JSON data
  hourly_marine_json,
  daily_marine_json,
  source_meta,
  -- Metadata
  snapshot_day,
  created_at
FROM findr_conditions_snapshots
ORDER BY rectangle_code, captured_at DESC;

COMMENT ON VIEW findr_conditions_latest IS
'Latest conditions snapshot for each rectangle, including pressure trends from Phase 2';

-- Recreate dependent view: rectangle_data_quality
-- This was dropped by CASCADE and needs to be recreated
CREATE VIEW rectangle_data_quality AS
SELECT
  fcl.rectangle_code,
  fcl.sea_temp_c IS NOT NULL as has_temperature,
  fcl.salinity_psu IS NOT NULL as has_salinity,
  fcl.chlorophyll_mg_m3 IS NOT NULL as has_chlorophyll,
  fcl.dissolved_oxygen_mg_l IS NOT NULL as has_oxygen,
  fcl.captured_at as last_captured,
  NOW() - fcl.captured_at as data_age,
  COUNT(DISTINCT xref.cell_id) as num_grid_cells
FROM findr_conditions_latest fcl
LEFT JOIN grid_025deg_ices_xref xref ON xref.rectangle_code = fcl.rectangle_code
GROUP BY fcl.rectangle_code, fcl.sea_temp_c, fcl.salinity_psu,
         fcl.chlorophyll_mg_m3, fcl.dissolved_oxygen_mg_l, fcl.captured_at
ORDER BY has_temperature DESC, data_age ASC;

COMMENT ON VIEW rectangle_data_quality IS
'Data quality metrics per ICES rectangle showing variable coverage and freshness';
