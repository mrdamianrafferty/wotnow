-- Fix incorrect CMEMS region mappings for coastal fishing zones
-- Discovered 2025-11-05: 24 out of 104 rectangles had incorrect region mappings
-- This was preventing data retrieval from Copernicus Marine Service

-- English Channel: IBI → NWS (7 rectangles)
-- English Channel should use Northwest European Shelf, not Iberia-Biscay-Ireland
UPDATE ices_rectangles SET cmems_region = 'NWS'
WHERE rectangle_code IN ('30E8', '30E9', '30F0', '30F1', '31E8', '31E9', '31F1');

-- Scottish East/Southwest: IBI → NWS (4 rectangles)
-- Scottish waters should use Northwest European Shelf for North Sea access
UPDATE ices_rectangles SET cmems_region = 'NWS'
WHERE rectangle_code IN ('33E1', '33E3', '34E3', '35G5');

-- Danish Baltic: NWS → BAL (4 rectangles)
-- Danish Baltic waters should use Baltic Sea model
UPDATE ices_rectangles SET cmems_region = 'BAL'
WHERE rectangle_code IN ('22M4', '22M5', '23M4', '23M5');

-- Swedish West Coast: NWS → BAL (2 rectangles)
-- Swedish West Coast is part of Baltic Sea region
UPDATE ices_rectangles SET cmems_region = 'BAL'
WHERE rectangle_code IN ('24O3', '25O3');

-- Black Sea: MED → BLK (3 rectangles)
-- Black Sea should use dedicated Black Sea model, not Mediterranean
UPDATE ices_rectangles SET cmems_region = 'BLK'
WHERE rectangle_code IN ('39Y3', '40X5', '40Y3');

-- Norwegian Arctic: ARC → NWS (3 rectangles)
-- Norwegian Arctic coastal areas should use NWS for better coastal coverage
UPDATE ices_rectangles SET cmems_region = 'NWS'
WHERE rectangle_code IN ('41P1', '42P1', '43P1');

-- Mediterranean: IBI → MED (1 rectangle)
-- Gibraltar area should use Mediterranean model
UPDATE ices_rectangles SET cmems_region = 'MED'
WHERE rectangle_code IN ('37H4');

-- Verification query
SELECT
  cmems_region,
  COUNT(*) as rectangle_count
FROM ices_rectangles
WHERE is_coastal_fishing_zone = true
GROUP BY cmems_region
ORDER BY rectangle_count DESC;
