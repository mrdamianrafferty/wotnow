-- Create ICES rectangles tables for Findr
-- This provides the geographic data for fishing predictions

-- Create main ICES rectangles reference table
CREATE TABLE IF NOT EXISTS public.ices_rectangles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rectangle_code text NOT NULL UNIQUE,
  region text NOT NULL,
  center_lat numeric NOT NULL,
  center_lon numeric NOT NULL,
  distance_to_shore_km numeric,
  is_coastal boolean GENERATED ALWAYS AS (
    CASE 
      WHEN distance_to_shore_km IS NULL THEN true
      WHEN distance_to_shore_km <= 10 THEN true
      ELSE false
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create findr_rectangles as an alias/view of ices_rectangles for compatibility
CREATE TABLE IF NOT EXISTS public.findr_rectangles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rectangle_code text NOT NULL UNIQUE,
  region text NOT NULL,
  center_lat numeric NOT NULL,
  center_lon numeric NOT NULL,
  distance_to_shore_km numeric,
  is_coastal boolean GENERATED ALWAYS AS (
    CASE 
      WHEN distance_to_shore_km IS NULL THEN true
      WHEN distance_to_shore_km <= 10 THEN true
      ELSE false
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS ices_rectangles_rectangle_code_idx ON public.ices_rectangles (rectangle_code);
CREATE INDEX IF NOT EXISTS ices_rectangles_region_idx ON public.ices_rectangles (region);
CREATE INDEX IF NOT EXISTS ices_rectangles_coastal_idx ON public.ices_rectangles (is_coastal);
CREATE INDEX IF NOT EXISTS ices_rectangles_location_idx ON public.ices_rectangles (center_lat, center_lon);

CREATE INDEX IF NOT EXISTS findr_rectangles_rectangle_code_idx ON public.findr_rectangles (rectangle_code);
CREATE INDEX IF NOT EXISTS findr_rectangles_region_idx ON public.findr_rectangles (region);
CREATE INDEX IF NOT EXISTS findr_rectangles_coastal_idx ON public.findr_rectangles (is_coastal);
CREATE INDEX IF NOT EXISTS findr_rectangles_location_idx ON public.findr_rectangles (center_lat, center_lon);

-- Add comments
COMMENT ON TABLE public.ices_rectangles IS 'ICES statistical rectangles for marine fisheries data';
COMMENT ON TABLE public.findr_rectangles IS 'Findr rectangles (alias for ICES rectangles)';

-- Insert sample ICES rectangle data based on fallback data
INSERT INTO public.ices_rectangles (rectangle_code, region, center_lat, center_lon, distance_to_shore_km) VALUES
('20C5', 'Portuguese Coast', 37.500000, -7.500000, 1.60),
('21C6', 'Portuguese Coast', 37.500000, -8.500000, 1.40),
('21D7', 'Galician Coast', 42.500000, -8.000000, 0.90),
('21D8', 'Galician Coast', 42.500000, -9.000000, 0.60),
('22D6', 'Portuguese Coast', 38.500000, -9.000000, 1.00),
('22D7', 'Galician Coast', 43.500000, -8.000000, 0.70),
('22D8', 'Galician Coast', 43.500000, -9.000000, 0.50),
('23D6', 'Portuguese Coast', 39.000000, -9.000000, 0.80),
('23E0', 'Bay of Biscay', 43.250000, -7.500000, 1.20),
('23E1', 'Bay of Biscay', 43.750000, -7.500000, 1.00),
('24D7', 'Portuguese Coast', 41.000000, -8.000000, 1.30),
('24E0', 'Bay of Biscay', 43.250000, -6.500000, 1.50),
('24E1', 'Bay of Biscay', 43.750000, -6.500000, 1.80),
('24E2', 'Bay of Biscay', 43.750000, -7.500000, 3.00),
('25C8', 'Irish Southwest', 52.500000, -9.000000, 1.40),
('25D7', 'Portuguese Coast', 41.500000, -8.000000, 1.10),
('25D8', 'Irish West', 53.000000, -9.000000, 1.00),
('25D9', 'Irish West', 53.000000, -10.000000, 0.70),
('25E0', 'Bay of Biscay', 43.250000, -5.500000, 2.50),
('25E1', 'Bay of Biscay', 43.750000, -5.500000, 3.20),
('25E2', 'Bay of Biscay', 43.750000, -6.500000, 4.10),
('26D8', 'Irish West', 53.500000, -9.000000, 1.20),
('26D9', 'Irish West', 53.500000, -10.000000, 0.80),
('26E0', 'Celtic Sea', 48.750000, -5.500000, 2.80),
('26E1', 'Celtic Sea', 49.250000, -5.500000, 3.50),
('26E2', 'Celtic Sea', 49.250000, -6.500000, 2.90),
('27D9', 'Irish West', 54.000000, -10.000000, 0.90),
('27E0', 'Celtic Sea', 48.750000, -4.500000, 4.20),
('27E1', 'Celtic Sea', 49.250000, -4.500000, 5.10),
('27E2', 'Celtic Sea', 49.250000, -5.500000, 3.80),
('27E3', 'Irish Sea', 53.750000, -5.500000, 2.60),
('27E4', 'Irish Sea', 53.750000, -6.500000, 1.90),
('28D9', 'Irish Northwest', 55.000000, -10.000000, 1.10),
('28E1', 'Celtic Sea', 49.750000, -4.500000, 6.20),
('28E2', 'Celtic Sea', 49.750000, -5.500000, 4.80),
('28E3', 'Irish Sea', 54.250000, -5.500000, 3.40),
('28E4', 'Irish Sea', 54.250000, -6.500000, 2.70),
('29E1', 'English Channel', 50.250000, -4.500000, 7.50),
('29E2', 'Celtic Sea', 50.250000, -5.500000, 5.90),
('29E3', 'Irish Sea', 54.750000, -5.500000, 4.20),
('29E4', 'Irish Sea', 54.750000, -6.500000, 3.60),
('30E1', 'English Channel', 50.750000, -4.500000, 8.20),
('30E2', 'English Channel', 50.750000, -5.500000, 6.80),
('30E3', 'Irish Sea', 55.250000, -5.500000, 5.10),
('30E4', 'Irish Sea', 55.250000, -6.500000, 4.40),
('30E5', 'Hebrides', 56.250000, -6.500000, 2.30),
('30E6', 'Hebrides', 56.250000, -7.500000, 1.80),
('31E2', 'English Channel', 51.250000, -5.500000, 7.90),
('31E3', 'English Channel', 51.250000, -4.500000, 9.10),
('31E4', 'Irish Sea', 55.750000, -6.500000, 5.20),
('31E5', 'Hebrides', 56.750000, -6.500000, 3.10),
('31E6', 'Hebrides', 56.750000, -7.500000, 2.60),
('31E7', 'Hebrides', 56.750000, -8.500000, 1.40),
('31F1', 'North Sea', 51.750000, -2.500000, 12.80),
('31F2', 'English Channel', 51.750000, -3.500000, 11.20),
('32E4', 'Hebrides', 56.250000, -6.500000, 6.10),
('32E5', 'Hebrides', 57.250000, -6.500000, 4.80),
('32E6', 'Hebrides', 57.250000, -7.500000, 3.90),
('32E7', 'Hebrides', 57.250000, -8.500000, 2.20),
('32E8', 'Hebrides', 57.250000, -9.500000, 1.50),
('32F1', 'North Sea', 52.250000, -2.500000, 13.60),
('32F2', 'English Channel', 52.250000, -3.500000, 12.10),
('33E5', 'Hebrides', 57.750000, -6.500000, 5.70),
('33E6', 'Hebrides', 57.750000, -7.500000, 4.60),
('33E7', 'Hebrides', 57.750000, -8.500000, 3.10),
('33E8', 'Hebrides', 57.750000, -9.500000, 2.30),
('33F1', 'North Sea', 52.750000, -2.500000, 14.40),
('33F2', 'North Sea', 52.750000, -3.500000, 13.20),
('34E6', 'Hebrides', 58.250000, -7.500000, 5.40),
('34E7', 'Hebrides', 58.250000, -8.500000, 4.20),
('34E8', 'Hebrides', 58.250000, -9.500000, 3.10),
('34F1', 'North Sea', 53.250000, -2.500000, 15.20),
('34F2', 'North Sea', 53.250000, -3.500000, 14.10),
('35E7', 'Hebrides', 58.750000, -8.500000, 5.10),
('35E8', 'Hebrides', 58.750000, -9.500000, 4.20),
('35F1', 'North Sea', 53.750000, -2.500000, 16.10),
('35F2', 'North Sea', 53.750000, -3.500000, 14.90),
('36E8', 'Hebrides', 59.250000, -9.500000, 5.10),
('36F1', 'North Sea', 54.250000, -2.500000, 17.20),
('36F2', 'North Sea', 54.250000, -3.500000, 15.80),
('37F1', 'North Sea', 54.750000, -2.500000, 18.40),
('37F2', 'North Sea', 54.750000, -3.500000, 16.90),
('38F1', 'North Sea', 55.250000, -2.500000, 19.60),
('38F2', 'North Sea', 55.250000, -3.500000, 18.20),
('39F1', 'North Sea', 55.750000, -2.500000, 20.80),
('39F2', 'North Sea', 55.750000, -3.500000, 19.40),
('40F1', 'North Sea', 56.250000, -2.500000, 22.10),
('40F2', 'North Sea', 56.250000, -3.500000, 20.60),
('41F1', 'North Sea', 56.750000, -2.500000, 23.40),
('41F2', 'North Sea', 56.750000, -3.500000, 21.90),
('42F1', 'North Sea', 57.250000, -2.500000, 24.80),
('42F2', 'North Sea', 57.250000, -3.500000, 23.20),
('43F1', 'North Sea', 57.750000, -2.500000, 26.20),
('43F2', 'North Sea', 57.750000, -3.500000, 24.60),
('44F1', 'North Sea', 58.250000, -2.500000, 27.60),
('44F2', 'North Sea', 58.250000, -3.500000, 26.10),
('45F1', 'North Sea', 58.750000, -2.500000, 29.10),
('45F2', 'North Sea', 58.750000, -3.500000, 27.50),
('46F1', 'North Sea', 59.250000, -2.500000, 30.70),
('46F2', 'North Sea', 59.250000, -3.500000, 29.20),
('47F1', 'North Sea', 59.750000, -2.500000, 32.40),
('47F2', 'North Sea', 59.750000, -3.500000, 30.90),
('48F1', 'North Sea', 60.250000, -2.500000, 34.20),
('48F2', 'North Sea', 60.250000, -3.500000, 32.70),
('49F1', 'North Sea', 60.750000, -2.500000, 36.10),
('49F2', 'North Sea', 60.750000, -3.500000, 34.60)
ON CONFLICT (rectangle_code) DO NOTHING;

-- Copy data to findr_rectangles for compatibility
INSERT INTO public.findr_rectangles (rectangle_code, region, center_lat, center_lon, distance_to_shore_km)
SELECT rectangle_code, region, center_lat, center_lon, distance_to_shore_km
FROM public.ices_rectangles
ON CONFLICT (rectangle_code) DO NOTHING;

-- Update timestamp trigger
CREATE TRIGGER update_ices_rectangles_updated_at 
    BEFORE UPDATE ON public.ices_rectangles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_findr_rectangles_updated_at 
    BEFORE UPDATE ON public.findr_rectangles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();