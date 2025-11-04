-- Create Fishing Techniques Reference Table
-- Date: 2025-11-04
--
-- PURPOSE: Store comprehensive metadata about fishing techniques
-- USAGE: Join with species.effective_techniques to enrich technique data
--
-- BENEFITS:
--   - Single source of truth for technique metadata
--   - Reusable across species
--   - Easy to update technique details without touching species records
--   - Supports filtering by environment, season, weather conditions

BEGIN;

-- Create fishing_techniques table
CREATE TABLE IF NOT EXISTS fishing_techniques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core identification
    code TEXT NOT NULL UNIQUE, -- Matches values in species.effective_techniques
    name_en TEXT NOT NULL,
    name_fr TEXT,
    name_es TEXT,
    name_de TEXT,
    name_it TEXT,
    name_pt TEXT,

    -- Description
    description_en TEXT,

    -- Target species (array of common species names)
    typical_targets TEXT[],

    -- Gear & tackle requirements
    core_gear_en TEXT,

    -- Environmental suitability
    key_environments TEXT[], -- e.g., ['reefs', 'wrecks', 'harbours']

    -- Seasonal information
    seasonal_peaks TEXT, -- e.g., "Spring-Autumn", "Year-round"
    best_months INTEGER[], -- e.g., {5,6,7,8,9} for May-September

    -- Weather & sea conditions
    min_weather_score NUMERIC(3,2) DEFAULT 0.3, -- 0-1 scale
    max_wind_speed_ms NUMERIC(4,1), -- meters per second
    max_wave_height_m NUMERIC(3,1), -- meters
    max_swell_height_m NUMERIC(3,1),
    requires_clear_water BOOLEAN DEFAULT false,
    works_in_rough_conditions BOOLEAN DEFAULT false,

    -- Tide considerations
    tide_dependent BOOLEAN DEFAULT false,
    best_tide_phase TEXT, -- e.g., "flooding", "ebbing", "slack", "any"

    -- Time of day preferences
    best_times TEXT[], -- e.g., ['dawn', 'dusk', 'night']

    -- Additional conditions logic (free text for complex rules)
    conditions_notes_en TEXT,

    -- Safety considerations
    requires_boat BOOLEAN DEFAULT false,
    requires_experience_level TEXT, -- 'beginner', 'intermediate', 'advanced'
    safety_notes_en TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert techniques from your reference table
INSERT INTO fishing_techniques (
    code, name_en, typical_targets, core_gear_en, key_environments,
    seasonal_peaks, min_weather_score, works_in_rough_conditions,
    tide_dependent, conditions_notes_en, requires_boat, requires_experience_level
) VALUES
    (
        'bottom_fishing',
        'Bottom Fishing / Ledgering',
        ARRAY['Cod', 'Bream', 'Snapper', 'Flounder', 'Rays', 'Ling', 'Haddock', 'Whiting'],
        'Ledger rigs, paternoster, sinkers, bait (worms, squid, shellfish, cut bait)',
        ARRAY['reefs', 'sand_flats', 'mud_flats', 'harbour_mouths', 'wrecks'],
        'Year-round; strong winter relevance in N. Europe for cod/whiting',
        0.4, -- Fair-to-rough OK
        true,
        true,
        'Works best with moderate tide flow; clarity less crucial; scent dominates',
        false,
        'beginner'
    ),
    (
        'float_fishing',
        'Float Fishing',
        ARRAY['Mackerel', 'Garfish', 'Mullet', 'Wrasse', 'Sea Bass', 'Scad'],
        'Floats, light leaders, small hooks, fresh bait',
        ARRAY['piers', 'harbours', 'rocky_margins', 'marinas'],
        'Spring-Autumn (mackerel high summer)',
        0.6, -- Prefers calm-moderate
        false,
        false,
        'Water clarity helps; avoid heavy swell; tides influence depth setting',
        false,
        'beginner'
    ),
    (
        'surfcasting',
        'Surf Casting / Beach Casting',
        ARRAY['Sea Bass', 'Mullet', 'Flatfish', 'Rays', 'Red Drum', 'Bluefish', 'Whiting'],
        'Long rods, shock leaders, beach ledger rigs, bait clips',
        ARRAY['surf_beaches', 'estuary_mouths', 'storm_drains', 'sandbars'],
        'Spring-Autumn; winter cod runs in Europe',
        0.5, -- Moderate surf ideal
        false,
        true,
        'Works with churned water; avoid weed build-ups and strong cross-winds',
        false,
        'intermediate'
    ),
    (
        'spinning',
        'Lure Casting / Spinning',
        ARRAY['Sea Bass', 'Pollack', 'Bluefish', 'Snook', 'Redfish', 'Mackerel', 'Small Tuna'],
        'Hard lures, metals, soft plastics; medium tackle',
        ARRAY['rock_marks', 'estuaries', 'beaches', 'breakwaters'],
        'Spring-Late Autumn; winter bass in some EU areas',
        0.6, -- Calm-moderate
        false,
        false,
        'Requires visibility + actively feeding fish; dawn/dusk boosts',
        false,
        'beginner'
    ),
    (
        'jigging',
        'Vertical Jigging',
        ARRAY['Tuna', 'Amberjack', 'Cod', 'Halibut', 'Pollack', 'Groupers'],
        'Boat rods, speed jigs, slow-pitch jigs',
        ARRAY['deep_reefs', 'wrecks', 'offshore_structure'],
        'Late Spring-Autumn; winter deep wreck cod',
        0.5, -- Moderate seas
        false,
        true,
        'Tide windows critical; depth + water movement primary',
        true,
        'intermediate'
    ),
    (
        'soft_plastics',
        'Soft-plastic Finesse (Inshore)',
        ARRAY['Bass', 'Sea Trout', 'Redfish', 'Snook', 'Wrasse', 'Flounder'],
        'Light jigheads, weedless rigs, finesse lures',
        ARRAY['estuaries', 'surf_edges', 'rocky_coves', 'tidal_creeks'],
        'Spring-Autumn',
        0.7, -- Best calm-moderate
        false,
        false,
        'Clarity important; subtle bites; low wind aids presentation',
        false,
        'intermediate'
    ),
    (
        'fly_fishing',
        'Saltwater Fly Fishing',
        ARRAY['Sea Trout', 'Stripers', 'Bonefish', 'Tarpon', 'Jacks', 'Mullet'],
        '7-10wt rods, saltwater lines & flies',
        ARRAY['flats', 'estuaries', 'beaches', 'tidal_marsh'],
        'Spring-Autumn (tropics year-round)',
        0.7, -- Needs calmer conditions
        false,
        true,
        'Sight fishing dependent; tides + light crucial; sensitive to turbidity',
        false,
        'advanced'
    ),
    (
        'trolling',
        'Trolling',
        ARRAY['Tuna', 'Wahoo', 'Mackerel', 'Mahi-Mahi', 'Salmon', 'Stripers'],
        'Offshore trolling rods, outriggers, lures',
        ARRAY['offshore', 'reefs', 'rips', 'currents'],
        'Spring-Autumn',
        0.5, -- Moderate seas; long swells OK
        true,
        false,
        'Works on temp breaks, bait balls, current lines',
        true,
        'intermediate'
    ),
    (
        'drifting',
        'Live-bait Drifting / Slow Trolling',
        ARRAY['Kingfish', 'Bass', 'Fluke', 'Snook', 'Amberjack'],
        'Live wells, circle hooks, balloons/drifts',
        ARRAY['reefs', 'wrecks', 'channels', 'estuaries'],
        'Spring-Autumn',
        0.6, -- Calm-moderate ideal
        false,
        true,
        'Best with steady tide + bait presence; clarity less critical',
        true,
        'intermediate'
    ),
    (
        'chumming',
        'Chumming / Ground-baiting',
        ARRAY['Sharks', 'Tuna', 'Bluefish', 'Mackerel', 'Bream'],
        'Chum blocks, mash buckets, oily baits',
        ARRAY['offshore_currents', 'nearshore_currents'],
        'Summer-Autumn',
        0.5, -- Moderate OK
        false,
        true,
        'Relies on current; too much drift wastes chum line',
        true,
        'intermediate'
    ),
    (
        'pier_fishing',
        'Pier / Jetty Mixed Methods',
        ARRAY['Bass', 'Wrasse', 'Pollack', 'Mackerel', 'Scad', 'Flounder'],
        'Floats, ledger rigs, lures, sabiki',
        ARRAY['piers', 'jetties', 'harbour_mouths'],
        'Spring-Autumn',
        0.4, -- Variable; sheltered spots viable in rough weather
        true,
        true,
        'Structure + tide edges; can fish in poor clarity',
        false,
        'beginner'
    ),
    (
        'kayak_fishing',
        'Kayak / Small-craft Mixed',
        ARRAY['Bass', 'Pollack', 'Redfish', 'Snook', 'Fluke', 'Mackerel'],
        'Light-medium tackle, lures, bait',
        ARRAY['inshore_reefs', 'kelp', 'sandbanks', 'mangroves'],
        'Spring-Autumn',
        0.8, -- Needs calmer seas
        false,
        false,
        'Critical safety thresholds: wave height, wind speed, gusts, tide',
        false,
        'advanced'
    );

-- Create indexes for common queries
CREATE INDEX idx_techniques_code ON fishing_techniques(code);
CREATE INDEX idx_techniques_environments ON fishing_techniques USING GIN(key_environments);
CREATE INDEX idx_techniques_experience ON fishing_techniques(requires_experience_level);
CREATE INDEX idx_techniques_boat_required ON fishing_techniques(requires_boat);

-- Add comment explaining the table purpose
COMMENT ON TABLE fishing_techniques IS
'Reference table for fishing techniques with comprehensive metadata.
Join with species.effective_techniques to enrich technique information.
Updated: 2025-11-04';

COMMIT;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fishing Techniques Reference Table Created';
    RAISE NOTICE '';
    RAISE NOTICE 'Table: fishing_techniques';
    RAISE NOTICE '  • 12 techniques populated with full metadata';
    RAISE NOTICE '  • Includes: target species, gear, environments, conditions';
    RAISE NOTICE '  • Indexed for fast lookups and filtering';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage: JOIN species.effective_techniques with fishing_techniques.code';
    RAISE NOTICE '';
END $$;
