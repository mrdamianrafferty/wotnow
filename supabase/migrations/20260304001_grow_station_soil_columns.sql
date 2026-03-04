-- ============================================================================
-- ADD SOIL SENSOR COLUMNS TO WEATHER STATION DATA
-- ============================================================================
-- Adds soil temperature and moisture columns for stations with soil probes
-- (Ambient Weather, Ecowitt, Davis WeatherLink).
-- Supports up to 4 soil sensor channels.
--
-- Created: 2026-03-04
-- ============================================================================

ALTER TABLE public.grow_weather_station_data
  ADD COLUMN IF NOT EXISTS soil_temp_1_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_temp_2_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_temp_3_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_temp_4_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_1_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_2_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_3_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_4_pct NUMERIC(5,2);

COMMENT ON COLUMN public.grow_weather_station_data.soil_temp_1_c IS 'Soil temperature channel 1 (Celsius)';
COMMENT ON COLUMN public.grow_weather_station_data.soil_moisture_1_pct IS 'Soil moisture channel 1 (percentage)';
