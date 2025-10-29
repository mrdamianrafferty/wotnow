-- Populate Species-Specific Feeding Behavior
--
-- Based on fishing knowledge and biological research:
-- - Tide sensitivity: How much species feeding is influenced by tidal flow
-- - Wind sensitivity: How much wind/waves affect feeding
-- - Temperature sensitivity: How critical temp matching is
-- - is_night_species: Nocturnal feeders

-- ========================================
-- HIGH TIDE SENSITIVITY (0.7-0.9)
-- Species that feed aggressively on tide changes
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.85,
  wind_sensitivity = 0.65,  -- Coastal species, wind affects feeding
  temperature_sensitivity = 0.70,
  pressure_sensitivity = 0.50,
  is_night_species = false
WHERE scientific_name = 'Dicentrarchus labrax';  -- European Bass

UPDATE species SET
  tide_sensitivity = 0.80,
  wind_sensitivity = 0.40,  -- Calmer water preferred
  temperature_sensitivity = 0.60,
  pressure_sensitivity = 0.35,
  is_night_species = false
WHERE scientific_name IN ('Chelon labrosus', 'Mugil cephalus');  -- Grey Mullet, Flathead

UPDATE species SET
  tide_sensitivity = 0.75,
  wind_sensitivity = 0.55,
  temperature_sensitivity = 0.65,
  pressure_sensitivity = 0.40,
  is_night_species = false
WHERE scientific_name = 'Platichthys flesus';  -- European Flounder

-- ========================================
-- MODERATE TIDE SENSITIVITY (0.4-0.6)
-- Coastal/reef species with some tidal influence
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.55,
  wind_sensitivity = 0.45,
  temperature_sensitivity = 0.60,
  pressure_sensitivity = 0.35,
  is_night_species = false
WHERE scientific_name = 'Spondyliosoma cantharus';  -- Black Seabream

UPDATE species SET
  tide_sensitivity = 0.50,
  wind_sensitivity = 0.60,  -- Pelagic reef species
  temperature_sensitivity = 0.55,
  pressure_sensitivity = 0.40,
  is_night_species = false
WHERE scientific_name = 'Pollachius pollachius';  -- Pollack

UPDATE species SET
  tide_sensitivity = 0.45,
  wind_sensitivity = 0.35,  -- Reef-dwelling, sheltered
  temperature_sensitivity = 0.50,
  pressure_sensitivity = 0.30,
  is_night_species = false
WHERE scientific_name LIKE 'Labrus%';  -- Wrasse species

UPDATE species SET
  tide_sensitivity = 0.50,
  wind_sensitivity = 0.50,
  temperature_sensitivity = 0.70,  -- Very temp-sensitive!
  pressure_sensitivity = 0.35,
  is_night_species = false
WHERE scientific_name = 'Sparus aurata';  -- Sea Bream (Dorada)

-- ========================================
-- LOW TIDE SENSITIVITY (0.1-0.3)
-- Pelagic or benthic species less affected by tides
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.20,
  wind_sensitivity = 0.70,  -- Surface feeder, very wind-sensitive
  temperature_sensitivity = 0.65,
  pressure_sensitivity = 0.45,
  is_night_species = false
WHERE scientific_name = 'Scomber scombrus';  -- Mackerel

UPDATE species SET
  tide_sensitivity = 0.25,
  wind_sensitivity = 0.30,  -- Benthic ambush predator
  temperature_sensitivity = 0.60,
  pressure_sensitivity = 0.25,
  is_night_species = true  -- Often hunts at night
WHERE scientific_name = 'Octopus vulgaris';  -- Common Octopus

UPDATE species SET
  tide_sensitivity = 0.30,
  wind_sensitivity = 0.45,
  temperature_sensitivity = 0.70,  -- Cold-water specialist
  pressure_sensitivity = 0.35,
  is_night_species = false
WHERE scientific_name = 'Limanda limanda';  -- Dab

UPDATE species SET
  tide_sensitivity = 0.25,
  wind_sensitivity = 0.40,
  temperature_sensitivity = 0.70,
  pressure_sensitivity = 0.30,
  is_night_species = false
WHERE scientific_name = 'Solea solea';  -- Dover Sole

-- ========================================
-- NOCTURNAL SPECIES (is_night_species = true)
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.50,
  wind_sensitivity = 0.25,  -- Deep rocky holes, sheltered
  temperature_sensitivity = 0.45,
  pressure_sensitivity = 0.30,
  is_night_species = true  -- PURE NOCTURNAL
WHERE scientific_name = 'Conger conger';  -- Conger Eel

UPDATE species SET
  tide_sensitivity = 0.60,
  wind_sensitivity = 0.30,
  temperature_sensitivity = 0.50,
  pressure_sensitivity = 0.30,
  is_night_species = true  -- Nocturnal
WHERE scientific_name = 'Anguilla anguilla';  -- European Eel

UPDATE species SET
  tide_sensitivity = 0.40,
  wind_sensitivity = 0.45,
  temperature_sensitivity = 0.50,
  pressure_sensitivity = 0.35,
  is_night_species = true  -- Nocturnal shark
WHERE scientific_name LIKE 'Scyliorhinus%';  -- Dogfish species

-- ========================================
-- PELAGIC SCHOOLING FISH (low tide, high wind sensitivity)
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.25,
  wind_sensitivity = 0.75,  -- Very wind-sensitive surface feeders
  temperature_sensitivity = 0.60,
  pressure_sensitivity = 0.50,
  is_night_species = false
WHERE scientific_name IN ('Trachurus trachurus', 'Scomber japonicus');  -- Horse Mackerel, Spanish Mackerel

UPDATE species SET
  tide_sensitivity = 0.30,
  wind_sensitivity = 0.70,
  temperature_sensitivity = 0.65,
  pressure_sensitivity = 0.45,
  is_night_species = false
WHERE scientific_name = 'Sardina pilchardus';  -- Sardine

-- ========================================
-- COLD-WATER SPECIES (high temp sensitivity)
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.45,
  wind_sensitivity = 0.55,
  temperature_sensitivity = 0.80,  -- VERY temp-sensitive cold-water fish
  pressure_sensitivity = 0.40,
  is_night_species = false
WHERE scientific_name = 'Molva molva';  -- Common Ling

UPDATE species SET
  tide_sensitivity = 0.40,
  wind_sensitivity = 0.50,
  temperature_sensitivity = 0.75,
  pressure_sensitivity = 0.35,
  is_night_species = false
WHERE scientific_name = 'Gadus morhua';  -- Atlantic Cod

UPDATE species SET
  tide_sensitivity = 0.50,
  wind_sensitivity = 0.60,
  temperature_sensitivity = 0.75,
  pressure_sensitivity = 0.40,
  is_night_species = false
WHERE scientific_name = 'Pollachius virens';  -- Coalfish/Saithe

-- ========================================
-- WARM-WATER SPECIES (high temp sensitivity)
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.35,
  wind_sensitivity = 0.40,
  temperature_sensitivity = 0.75,  -- Warm-water specialist
  pressure_sensitivity = 0.30,
  is_night_species = false
WHERE scientific_name = 'Diplodus vulgaris';  -- White Seabream

UPDATE species SET
  tide_sensitivity = 0.40,
  wind_sensitivity = 0.45,
  temperature_sensitivity = 0.70,
  pressure_sensitivity = 0.35,
  is_night_species = false
WHERE scientific_name = 'Spicara smaris';  -- Picarel

-- ========================================
-- CEPHALOPODS (low tide, moderate temp)
-- ========================================

UPDATE species SET
  tide_sensitivity = 0.30,
  wind_sensitivity = 0.35,
  temperature_sensitivity = 0.55,
  pressure_sensitivity = 0.40,  -- Sensitive to pressure changes
  is_night_species = false
WHERE scientific_name IN ('Sepia officinalis', 'Loligo vulgaris');  -- Cuttlefish, Squid

-- Log what we've done
DO $$
BEGIN
  RAISE NOTICE '✅ Species feeding behavior populated!';
  RAISE NOTICE '';
  RAISE NOTICE 'HIGH TIDE SENSITIVITY (0.7-0.9):';
  RAISE NOTICE '  • Bass, Mullet, Flounder - Prime tide feeders';
  RAISE NOTICE '';
  RAISE NOTICE 'LOW TIDE SENSITIVITY (0.1-0.3):';
  RAISE NOTICE '  • Mackerel, Octopus - Pelagic/benthic, tide independent';
  RAISE NOTICE '';
  RAISE NOTICE 'NOCTURNAL SPECIES:';
  RAISE NOTICE '  • Conger Eel, Dogfish, Eel - Night hunters';
  RAISE NOTICE '';
  RAISE NOTICE 'TEMPERATURE SPECIALISTS:';
  RAISE NOTICE '  • High (0.7-0.8): Ling, Cod (cold-water)';
  RAISE NOTICE '  • High (0.7-0.8): Sea Bream, White Seabream (warm-water)';
  RAISE NOTICE '';
  RAISE NOTICE 'Bite scores will now vary significantly by species!';
END $$;
