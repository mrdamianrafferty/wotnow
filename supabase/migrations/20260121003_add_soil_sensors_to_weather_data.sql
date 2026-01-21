-- ============================================================================
-- ADD SOIL SENSOR COLUMNS TO WEATHER STATION DATA
-- ============================================================================
-- Adds support for storing soil temperature and moisture readings
-- from Ambient Weather stations with soil sensors.
--
-- Created: 2026-01-21
-- ============================================================================

-- Add soil sensor columns to weather station data table
ALTER TABLE public.grow_weather_station_data
  ADD COLUMN IF NOT EXISTS soil_temp_1_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_temp_2_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_temp_3_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_temp_4_c NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_1_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_2_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_3_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS soil_moisture_4_pct NUMERIC(5,2);

-- Add index for soil temperature queries (useful for germination recommendations)
CREATE INDEX IF NOT EXISTS idx_grow_weather_station_soil_temp
  ON public.grow_weather_station_data(soil_temp_1_c)
  WHERE soil_temp_1_c IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN public.grow_weather_station_data.soil_temp_1_c IS 'Soil temperature sensor 1 in Celsius (typically 10cm depth)';
COMMENT ON COLUMN public.grow_weather_station_data.soil_temp_2_c IS 'Soil temperature sensor 2 in Celsius (typically 30cm depth)';
COMMENT ON COLUMN public.grow_weather_station_data.soil_temp_3_c IS 'Soil temperature sensor 3 in Celsius (typically 60cm depth)';
COMMENT ON COLUMN public.grow_weather_station_data.soil_temp_4_c IS 'Soil temperature sensor 4 in Celsius (typically 90cm depth)';
COMMENT ON COLUMN public.grow_weather_station_data.soil_moisture_1_pct IS 'Soil moisture sensor 1 percentage';
COMMENT ON COLUMN public.grow_weather_station_data.soil_moisture_2_pct IS 'Soil moisture sensor 2 percentage';
COMMENT ON COLUMN public.grow_weather_station_data.soil_moisture_3_pct IS 'Soil moisture sensor 3 percentage';
COMMENT ON COLUMN public.grow_weather_station_data.soil_moisture_4_pct IS 'Soil moisture sensor 4 percentage';
