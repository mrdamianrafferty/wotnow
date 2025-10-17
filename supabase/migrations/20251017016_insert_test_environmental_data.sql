-- Insert test environmental data for weather scoring validation
-- This data is for testing purposes only

-- Insert test data for rectangle 26C7 (Irish Southwest)
INSERT INTO findr_conditions_snapshots (
  rectangle_code,
  sea_temp_c,
  chlorophyll_mg_m3,
  dissolved_oxygen_mg_l,
  salinity_psu,
  captured_at
) VALUES 
  ('26C7', 14.5, 0.8, 8.2, 35.1, '2025-10-17 12:00:00+00'),
  ('26C7', 14.6, 0.75, 8.3, 35.0, '2025-10-16 12:00:00+00'),
  ('26C7', 14.4, 0.85, 8.1, 35.2, '2025-10-15 12:00:00+00')
ON CONFLICT DO NOTHING;

-- Insert test data for rectangle 22D8 (Galician Coast)
INSERT INTO findr_conditions_snapshots (
  rectangle_code,
  sea_temp_c,
  chlorophyll_mg_m3,
  dissolved_oxygen_mg_l,
  salinity_psu,
  captured_at
) VALUES 
  ('22D8', 15.2, 1.2, 7.9, 34.8, '2025-10-17 12:00:00+00'),
  ('22D8', 15.1, 1.1, 8.0, 34.9, '2025-10-16 12:00:00+00')
ON CONFLICT DO NOTHING;

-- Insert test data for rectangle 22L5 (Polish Baltic)
INSERT INTO findr_conditions_snapshots (
  rectangle_code,
  sea_temp_c,
  chlorophyll_mg_m3,
  dissolved_oxygen_mg_l,
  salinity_psu,
  captured_at
) VALUES 
  ('22L5', 14.8, 0.6, 8.4, 35.3, '2025-10-17 12:00:00+00'),
  ('22L5', 14.7, 0.65, 8.3, 35.2, '2025-10-16 12:00:00+00')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Test environmental data inserted for weather testing';
  RAISE NOTICE '   • Rectangle 26C7: 3 snapshots (Irish Southwest)';
  RAISE NOTICE '   • Rectangle 22D8: 2 snapshots (Galician Coast)';
  RAISE NOTICE '   • Rectangle 22L5: 2 snapshots (Polish Baltic)';
  RAISE NOTICE '';
  RAISE NOTICE '   Run: npx tsx scripts/test-comprehensive-weather.ts';
END $$;
