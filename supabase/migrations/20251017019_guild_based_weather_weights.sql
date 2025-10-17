-- Guild-Based Weather Weight Optimization
-- Sets weather weights based on species ecological guilds and feeding behavior
-- Date: 2025-10-17

-- Update weather weights based on species guilds/behaviors

-- PELAGIC SURFACE FEEDERS (High wind sensitivity, moderate pressure)
-- These species hunt near surface, very affected by wind/waves
UPDATE species SET wind_weight = 0.70, pressure_weight = 0.30 WHERE species_code IN (
  'mac',        -- Mackerel: Surface shoal feeder
  'chub-mack',  -- Chub Mackerel: Surface shoal feeder
  'horse-mack', -- Horse Mackerel: Mid-upper water column
  'g-mackerel', -- Gilt-head Mackerel: Surface feeder
  'gar',        -- Garfish: Surface predator
  'bonito',     -- Bonito: Fast surface hunter
  'bluefish',   -- Bluefish: Aggressive surface predator
  'bogue'       -- Bogue: Surface shoaling species
);

-- BOTTOM FEEDERS - FLATFISH (Low wind sensitivity, very high pressure)
-- Bottom dwellers, pressure changes affect feeding behavior strongly
UPDATE species SET wind_weight = 0.25, pressure_weight = 0.75 WHERE species_code IN (
  'ple',        -- Plaice: Classic bottom feeder
  'sol',        -- Sole: Nocturnal bottom feeder
  'dab',        -- Dab: Sandy bottom feeder
  'fle',        -- Flounder: Estuarine bottom feeder
  'turbot',     -- Turbot: Sandy bottom ambush predator
  'bll',        -- Brill: Sandy bottom feeder
  'meg'         -- Megrim: Deeper water flatfish
);

-- DEMERSAL PREDATORS (Moderate wind, high pressure sensitivity)
-- Hunt in mid-water to bottom, pressure affects feeding activity
UPDATE species SET wind_weight = 0.35, pressure_weight = 0.65 WHERE species_code IN (
  'cod',        -- Cod: Classic demersal predator
  'had',        -- Haddock: Demersal feeder
  'pol',        -- Pollack: Mid-water/structure hunter
  'pok',        -- Pouting: Demersal opportunist
  'whg'         -- Whiting: Mid-water/bottom hunter
);

-- REEF/STRUCTURE SPECIES (Very low wind, high pressure)
-- Protected habitats, less wind-affected, but pressure-sensitive
UPDATE species SET wind_weight = 0.20, pressure_weight = 0.80 WHERE species_code IN (
  'wrb',        -- Ballan Wrasse: Reef-dwelling
  'wra',        -- Wrasse (various): Reef species
  'cuc',        -- Cuckoo Wrasse: Rock dweller
  'brs',        -- Black Seabream: Reef forager
  '2bd-bream',  -- Two-banded Seabream: Reef species
  'bsp',        -- Spotted Bass: Structure-oriented
  'cuttlefish', -- Cuttlefish: Structure ambush predator
  'octopus',    -- Octopus: Reef dweller
  'mug',        -- Grey Mullet: Protected harbours
  'fgm'         -- Flathead Grey Mullet: Estuarine/harbour
);

-- SHARKS & RAYS (Very low wind, very high pressure)
-- Deep water species, barometric pressure crucial for feeding
UPDATE species SET wind_weight = 0.15, pressure_weight = 0.85 WHERE species_code IN (
  'BUH',        -- Bull Huss: Bottom shark
  'LBD',        -- Lesser Spotted Dogfish: Bottom shark
  'GFH',        -- Greater Forkbeard: Deep water
  'POR',        -- Porbeagle: Pelagic shark
  'SMA',        -- Shortfin Mako: Pelagic shark  
  'rjc',        -- Thornback Ray: Bottom ray
  'rju',        -- Undulate Ray: Bottom ray
  'blonde-ray', -- Blonde Ray: Bottom ray
  'small-eyed', -- Small-eyed Ray: Bottom ray
  'sting-ray'   -- Stingray: Bottom ray
);

-- CONGER & MORAY EELS (Low wind, very high pressure)
-- Hole-dwelling ambush predators, pressure-sensitive
UPDATE species SET wind_weight = 0.20, pressure_weight = 0.80 WHERE species_code IN (
  'con',        -- Conger Eel: Hole dweller
  'mor'         -- Moray Eel: Reef crevice dweller
);

-- BASS SPECIES (Moderate-high wind, moderate pressure)
-- Structure hunters but also surface feeders
UPDATE species SET wind_weight = 0.55, pressure_weight = 0.45 WHERE species_code IN (
  'bss',        -- Sea Bass: Versatile hunter
  'gilthead-bm' -- Gilthead Bream: Structure/open water
);

-- TUNA & LARGE PELAGICS (High wind, low pressure)
-- Open ocean hunters, wind affects baitfish availability
UPDATE species SET wind_weight = 0.75, pressure_weight = 0.25 WHERE species_code IN (
  'alb',        -- Albacore: Open ocean
  'bft',        -- Bluefin Tuna: Open ocean apex
  'yft'         -- Yellowfin Tuna: Open ocean
);

-- CEPHALOPODS (Low wind, moderate-high pressure)
-- Mostly structure-oriented, pressure-sensitive for feeding
UPDATE species SET wind_weight = 0.30, pressure_weight = 0.70 WHERE species_code IN (
  'squid',      -- Common Squid: Mid-water hunter
  'sqm'         -- European Flying Squid: Pelagic but pressure-sensitive
);

-- JACKS & AMBERJACKS (High wind, moderate pressure)
-- Fast pelagic predators, wind affects prey behavior
UPDATE species SET wind_weight = 0.65, pressure_weight = 0.35 WHERE species_code IN (
  'med-scad',   -- Mediterranean Scad: Pelagic shoaler
  'pilot-fish'  -- Pilotfish: Pelagic follower
);

-- BAIT FISH (High wind, low pressure)
-- Surface shoalers, very wind-sensitive
UPDATE species SET wind_weight = 0.80, pressure_weight = 0.20 WHERE species_code IN (
  'anc',        -- Anchovy: Surface shoaler
  'her',        -- Herring: Surface/mid-water
  'pil',        -- Sardine: Surface shoaler
  'spr',        -- Sprat: Surface baitfish
  'sand-smelt'  -- Sand Smelt: Surface shoaler
);

-- MIGRATORY SALMONIDS (Moderate wind, high pressure)
-- River/coastal migrants, pressure affects movement
UPDATE species SET wind_weight = 0.40, pressure_weight = 0.60 WHERE species_code IN (
  'trs',        -- Sea Trout: Coastal migrant
  'salmon-atl'  -- Atlantic Salmon: Coastal migrant
);

-- GURNARDS (Low wind, moderate-high pressure)
-- Bottom walkers, less wind-affected
UPDATE species SET wind_weight = 0.30, pressure_weight = 0.70 WHERE species_code IN (
  'gug',        -- Grey Gurnard: Bottom walker
  'gur',        -- Red Gurnard: Bottom walker
  'tub-gurnard' -- Tub Gurnard: Bottom walker
);

-- RED MULLET & SURMULLET (Moderate wind, moderate-high pressure)
-- Bottom foragers but also mid-water
UPDATE species SET wind_weight = 0.40, pressure_weight = 0.60 WHERE species_code IN (
  'red-mullet', -- Red Mullet: Bottom forager
  'sur-mullet'  -- Surmullet: Bottom forager
);

-- JOHN DORY & SPECIALTIES (Low-moderate wind, high pressure)
-- Ambush predators, pressure-sensitive
UPDATE species SET wind_weight = 0.35, pressure_weight = 0.65 WHERE species_code IN (
  'jod',        -- John Dory: Ambush hunter
  'striped-mullet', -- Striped Mullet: Bottom/surface
  'wedge-sole'  -- Wedge Sole: Bottom feeder
);

-- Add comments explaining the logic
COMMENT ON COLUMN species.wind_weight IS 'Species sensitivity to wind conditions (0-1). Higher values = more affected by wind (e.g., surface feeders=0.7-0.8, bottom dwellers=0.2-0.3)';
COMMENT ON COLUMN species.pressure_weight IS 'Species sensitivity to barometric pressure (0-1). Higher values = more affected by pressure (e.g., sharks/rays=0.85, surface baitfish=0.2)';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Guild-Based Weather Weight Optimization Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Weight Distribution by Guild:';
  RAISE NOTICE '  • Surface Pelagics (Mackerel, Garfish): 0.70 wind / 0.30 pressure';
  RAISE NOTICE '  • Large Pelagics (Tuna): 0.75 wind / 0.25 pressure';
  RAISE NOTICE '  • Baitfish (Anchovy, Herring): 0.80 wind / 0.20 pressure';
  RAISE NOTICE '  • Demersal Predators (Cod, Pollack): 0.35 wind / 0.65 pressure';
  RAISE NOTICE '  • Flatfish (Plaice, Sole): 0.25 wind / 0.75 pressure';
  RAISE NOTICE '  • Reef Species (Wrasse, Cuttlefish): 0.20 wind / 0.80 pressure';
  RAISE NOTICE '  • Sharks & Rays: 0.15 wind / 0.85 pressure';
  RAISE NOTICE '  • Bass: 0.55 wind / 0.45 pressure';
  RAISE NOTICE '';
  RAISE NOTICE 'Rationale:';
  RAISE NOTICE '  - Surface feeders: Wind affects prey visibility and feeding';
  RAISE NOTICE '  - Bottom dwellers: Pressure changes trigger feeding behavior';
  RAISE NOTICE '  - Reef species: Protected from wind, pressure-sensitive';
  RAISE NOTICE '  - Sharks/Rays: Deep water, barometric pressure crucial';
  RAISE NOTICE '';
  RAISE NOTICE '✅ All species now have guild-appropriate weather sensitivity!';
END $$;
