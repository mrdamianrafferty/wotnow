-- Migration: Add additional European species (wrasse, smoothhounds, rays, gurnards)
-- Date: 2025-10-11
-- Description: Adds 17 additional species with shore/boat advice

-- =========================
-- REEF / WRASSE & SERRANIDS
-- =========================

-- Corkwing Wrasse (Symphodus melops)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'WRK',
    'Symphodus melops',
    'Corkwing Wrasse',
    'Tordo verde',
    'Crénilabre coucou',
    'Lippfisch',
    'Tordo',
    'Bodião',
    '{"crab_bait","prawn","float","LRF"}',
    7,
    false,
    true,
    3,
    1,
    25,
    '{"reef","kelp","rocks"}',
    0.20,
    0.70,
    0.30,
    0.50,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Atlantic fringes, Channel, W Europe',
            'best_time', 'Daylight; flood tide over kelp/rocks',
            'tide_sensitivity', 'Moderate; likes movement around cover',
            'baits_diet', 'Crab and prawn; grazes in kelp',
            'temperature_effect', 'Mild-warm months best; slows in winter',
            'weather_effect', 'Clear water helps; heavy swell tucks fish tight to cover',
            'distance_depth', 'Right under boulders/kelp, 1-10 m',
            'restrictions', 'Local livebait rules; many anglers C&R',
            'authority', 'Regional conservation/fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Inshore reefs/kelp beds',
            'best_time', 'Bright days with some run',
            'tide_sensitivity', 'Moderate',
            'baits_diet', 'Small crab/prawn; micro-jigs',
            'temperature_effect', 'Better in warmer months',
            'weather_effect', 'Best in settled, clear water',
            'distance_depth', 'Reefs 5-25 m',
            'restrictions', 'Check local protections for wrasse removal',
            'authority', 'Regional conservation/fisheries'
        )
    ),
    'Daylight dater, loves kelp-side snacks. Bring crab and I''m yours.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    name_es = EXCLUDED.name_es,
    name_fr = EXCLUDED.name_fr,
    name_de = EXCLUDED.name_de,
    name_it = EXCLUDED.name_it,
    name_pt = EXCLUDED.name_pt,
    typical_gear = EXCLUDED.typical_gear,
    max_boat_size = EXCLUDED.max_boat_size,
    is_night_species = EXCLUDED.is_night_species,
    is_seasonal = EXCLUDED.is_seasonal,
    eating_quality = EXCLUDED.eating_quality,
    min_depth = EXCLUDED.min_depth,
    max_depth = EXCLUDED.max_depth,
    preferred_habitat = EXCLUDED.preferred_habitat,
    wind_sensitivity = EXCLUDED.wind_sensitivity,
    temperature_sensitivity = EXCLUDED.temperature_sensitivity,
    pressure_sensitivity = EXCLUDED.pressure_sensitivity,
    tide_sensitivity = EXCLUDED.tide_sensitivity,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Goldsinny Wrasse (Ctenolabrus rupestris)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'WRG',
    'Ctenolabrus rupestris',
    'Goldsinny Wrasse',
    'Tordo roquero',
    'Crénilabre doré',
    'Goldmaid',
    'Tordo dorato',
    'Bodião-dourado',
    '{"crab_bait","prawn","LRF"}',
    7,
    false,
    true,
    2,
    1,
    20,
    '{"harbour","kelp","rocks"}',
    0.20,
    0.70,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'NE Atlantic, Channel',
            'best_time', 'Bright days around kelp/rocks',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Tiny crab/prawn bits; picks at invertebrates',
            'temperature_effect', 'Perks up with warmth',
            'weather_effect', 'Clear water helps sighting',
            'distance_depth', 'Harbour walls/kelp edges 1-8 m',
            'restrictions', 'Often used as livebait; check local rules',
            'authority', 'Regional conservation/fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Shallow reefs/weed beds',
            'best_time', 'Daylight',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Micro baits; tiny jigs',
            'temperature_effect', 'Warm months best',
            'weather_effect', 'Settle/clear',
            'distance_depth', '1-15 m',
            'restrictions', 'Local limits possible',
            'authority', 'Regional conservation/fisheries'
        )
    ),
    'Pocket rocket on light tackle - swipe right for tiny prawns.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Rock Cook Wrasse (Centrolabrus exoletus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'WRO',
    'Centrolabrus exoletus',
    'Rock Cook',
    'Tordo cocinero',
    'Crénilabre exocet',
    'Grünlippfisch',
    'Tordo cuoco',
    'Bodião roqueiro',
    '{"crab_bait","prawn","LRF"}',
    7,
    false,
    true,
    2,
    1,
    20,
    '{"rocks","boulders","kelp"}',
    0.20,
    0.70,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'NE Atlantic coasts',
            'best_time', 'Sunny, clear days over boulders/kelp',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Tiny crab/prawn; grazes on small inverts',
            'temperature_effect', 'Warm months best',
            'weather_effect', 'Clear water helps',
            'distance_depth', 'Rock pools to 6-10 m',
            'restrictions', 'Handle gently; popular for species hunts',
            'authority', 'Regional conservation/fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Shallow reefs',
            'best_time', 'Daylight',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Micro baits/micro-jigs',
            'temperature_effect', 'Warmer months',
            'weather_effect', 'Settle/clear',
            'distance_depth', '5-20 m',
            'restrictions', 'Local protections possible',
            'authority', 'Regional conservation/fisheries'
        )
    ),
    'Bright, nosy, and into snacks. Got prawn? Let''s chat.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Comber (Serranus cabrilla)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'CMB',
    'Serranus cabrilla',
    'Comber',
    'Cabrilla',
    'Serran cabrilla',
    'Mittelmeer-Zackenbarsch',
    'Serranide',
    'Serrano',
    '{"small_jigs","shrimp_bait","float","LRF"}',
    8,
    false,
    true,
    4,
    2,
    80,
    '{"reef","harbour","wreck"}',
    0.30,
    0.70,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Mediterranean & S Iberia',
            'best_time', 'Daylight, especially early/late',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Shrimp/prawn bits, small fish; takes micro-jigs',
            'temperature_effect', 'Warm months best',
            'weather_effect', 'Clear, calm conditions suit ambush style',
            'distance_depth', 'Harbours, reefs 2-20 m',
            'restrictions', 'Local MLS/bag rules vary',
            'authority', 'Regional Med fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Med reefs/wrecks',
            'best_time', 'Daylight, dawn better',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Shrimp, small fish; small jigs',
            'temperature_effect', 'Warmth helps',
            'weather_effect', 'Calm/clear best',
            'distance_depth', '10-80 m',
            'restrictions', 'Regional limits',
            'authority', 'Regional Med fisheries'
        )
    ),
    'Reef romantic with a taste for shrimp dates. Keep it small and subtle.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Painted Comber (Serranus scriba)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'CMP',
    'Serranus scriba',
    'Painted Comber',
    'Serrano pintado',
    'Serran écriture',
    'Streifenbarsch',
    'Sciarrano',
    'Serrano pintado',
    '{"small_jigs","shrimp_bait","LRF"}',
    8,
    false,
    true,
    4,
    2,
    60,
    '{"reef","harbour","rocks"}',
    0.30,
    0.70,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Mediterranean',
            'best_time', 'Daylight; dawn/late afternoon prime',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Shrimp pieces, tiny fish strips; micro-jigs',
            'temperature_effect', 'Warm seasons best',
            'weather_effect', 'Calm/clear favours sight takes',
            'distance_depth', 'Harbours/rocky coves 2-15 m',
            'restrictions', 'Local rules vary',
            'authority', 'Regional Med fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Med reefs',
            'best_time', 'Daytime',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Shrimp/squid slivers; micro metals',
            'temperature_effect', 'Warm months',
            'weather_effect', 'Calm/clear',
            'distance_depth', '10-60 m',
            'restrictions', 'Local rules vary',
            'authority', 'Regional Med fisheries'
        )
    ),
    'Paint me like one of your harbour models. Tiny prawn bits only.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Salema (Sarpa salpa)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'SAL',
    'Sarpa salpa',
    'Salema (Saupe)',
    'Salema',
    'Saupe',
    'Goldbrasse',
    'Salpa',
    'Salema',
    '{"float","bread_paste","weed_bait","small_hooks"}',
    7,
    false,
    true,
    4,
    1,
    30,
    '{"weed_beds","reef","shallow"}',
    0.40,
    0.80,
    0.30,
    0.30,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Mediterranean, Macaronesia fringe',
            'best_time', 'Daylight on calm, clear days',
            'tide_sensitivity', 'Low; gentle movement fine',
            'baits_diet', 'Weed, bread paste, tiny shrimps; herbivore/omnivore',
            'temperature_effect', 'Likes warm water; summer peak',
            'weather_effect', 'Clear/settled best; swell hides shoals',
            'distance_depth', 'Shallow weed beds/reefs 1-10 m',
            'restrictions', 'Local MLS/bag limits possible',
            'authority', 'Regional Med fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Nearshore weed/reef',
            'best_time', 'Daylight, summer',
            'tide_sensitivity', 'Low',
            'baits_diet', 'Weed baits, small shrimp',
            'temperature_effect', 'Warm months',
            'weather_effect', 'Calm/clear',
            'distance_depth', '5-30 m',
            'restrictions', 'Local rules',
            'authority', 'Regional Med fisheries'
        )
    ),
    'Sun-loving veggie with a soft spot for bread dates. Keep it chill and clear.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Picarel (Spicara smaris)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'PIC',
    'Spicara smaris',
    'Picarel',
    'Alacha',
    'Picarel',
    'Picarel',
    'Zerri',
    'Carapauzinho (picarel)',
    '{"sabiki","tiny_hooks","float"}',
    7,
    false,
    true,
    3,
    3,
    60,
    '{"mid_water","harbour","shoals"}',
    0.50,
    0.70,
    0.30,
    0.30,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Mediterranean',
            'best_time', 'Dawn/day; harbours/rocky bays',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Planktonic microfauna; fine sabiki, tiny prawns',
            'temperature_effect', 'Warm months best',
            'weather_effect', 'Calm/clear suits',
            'distance_depth', 'Mid-water shoals 3-20 m',
            'restrictions', 'Local limits possible',
            'authority', 'Regional Med fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Inshore shoals',
            'best_time', 'Dawn/daylight',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Fine sabiki/micro metals',
            'temperature_effect', 'Warm months',
            'weather_effect', 'Calm',
            'distance_depth', '5-60 m mid-water',
            'restrictions', 'Local limits possible',
            'authority', 'Regional Med fisheries'
        )
    ),
    'Schooling socialite - tiny hooks, tiny bites, big smiles.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- =========================================
-- HOUNDS, HUSS & INSHORE RAYS
-- =========================================

-- Starry Smoothhound (Mustelus asterias)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'SSH',
    'Mustelus asterias',
    'Starry Smoothhound',
    'Pintarroja estrellada',
    'Emissole étoilée',
    'Sternhai',
    'Palombo stellato',
    'Cação-liso estrelado',
    '{"crab_baits","bottom_rigs","kayak"}',
    8,
    false,
    true,
    4,
    3,
    60,
    '{"clean_ground","mixed_ground","sand"}',
    0.30,
    0.60,
    0.30,
    0.60,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'UK/IE/FR/ES Atlantic coasts',
            'best_time', 'Late spring-autumn; dusk into night',
            'tide_sensitivity', 'Strong; likes push on flood',
            'baits_diet', 'Peeler crab, hardback crab, prawn',
            'temperature_effect', 'Perks up in warmer months',
            'weather_effect', 'Fishable in light chop; heavy surf reduces bites',
            'distance_depth', 'Clean/mixed ground 3-15 m',
            'restrictions', 'Local size/bag rules; many C&R',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Banks/edges 10-60 m',
            'best_time', 'Flood/ebb runs',
            'tide_sensitivity', 'Strong',
            'baits_diet', 'Crabs; scent trails work',
            'temperature_effect', 'Warm months',
            'weather_effect', 'Moderate chop ok',
            'distance_depth', '10-60 m clean/mixed',
            'restrictions', 'Local rules',
            'authority', 'National fisheries'
        )
    ),
    'Crab connoisseur seeking a spring fling on the flood.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Common Smoothhound (Mustelus mustelus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'CSH',
    'Mustelus mustelus',
    'Common Smoothhound',
    'Pintarroja',
    'Emissole tachetée',
    'Glatter Hai',
    'Palombo',
    'Cação-liso',
    '{"crab_baits","bottom_rigs","kayak"}',
    8,
    false,
    true,
    4,
    3,
    60,
    '{"clean_ground","mixed_ground","sand"}',
    0.30,
    0.60,
    0.30,
    0.60,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'SE/SW Europe, Med and Atlantic',
            'best_time', 'Late spring-autumn; dusk best',
            'tide_sensitivity', 'Strong; flooding tide key',
            'baits_diet', 'Crab foremost; also prawn',
            'temperature_effect', 'Warmth helps; retreats deeper in cold',
            'weather_effect', 'Moderate seas OK',
            'distance_depth', 'Clean/mixed ground 3-15 m',
            'restrictions', 'Local rules; many anglers release',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Banks/edges 10-60 m',
            'best_time', 'Flood/ebb runs',
            'tide_sensitivity', 'Strong',
            'baits_diet', 'Crab baits with elastic thread',
            'temperature_effect', 'Warm months',
            'weather_effect', 'Moderate chop fine',
            'distance_depth', '10-60 m',
            'restrictions', 'Local rules',
            'authority', 'National fisheries'
        )
    ),
    'Smooth operator with a thing for peeler crabs.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Bull Huss (Greater Spotted Dogfish) (Scyliorhinus stellaris)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'BUH',
    'Scyliorhinus stellaris',
    'Bull Huss',
    'Pintarroja mayor',
    'Roussette tachetée',
    'Katzenhai (groß)',
    'Gattuccio maggiore',
    'Pintarroxa-boca-grande',
    '{"big_baits","pulley_rigs","bottom_rigs"}',
    8,
    true,
    false,
    4,
    5,
    100,
    '{"rocks","reef","wreck","kelp"}',
    0.20,
    0.40,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Atlantic rough ground/kelp gullies',
            'best_time', 'Dusk/night',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Whole fish/squid; strong scent',
            'temperature_effect', 'Fair year-round; deeper in heat',
            'weather_effect', 'Unfazed by coloured water',
            'distance_depth', 'Rocky ledges 5-20 m',
            'restrictions', 'Handle carefully; abrasive skin',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Reefs/wrecks 20-100 m',
            'best_time', 'Dusk/night',
            'tide_sensitivity', 'Low-moderate',
            'baits_diet', 'Fish/squid baits',
            'temperature_effect', 'Cool-mild best',
            'weather_effect', 'Turbid OK',
            'distance_depth', '20-100 m',
            'restrictions', 'Local limits; many C&R',
            'authority', 'National fisheries'
        )
    ),
    'Night owl with a taste for whole squid - bring the scent.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Spotted Ray (Raja montagui)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'RJM',
    'Raja montagui',
    'Spotted Ray',
    'Raya manchada',
    'Raie tachetée',
    'Gefleckte Rochen',
    'Razza maculata',
    'Raia-malhada',
    '{"whole_squid","sandeel","bottom_rigs"}',
    8,
    false,
    true,
    4,
    5,
    80,
    '{"sand","sandbank","mixed_ground"}',
    0.30,
    0.50,
    0.30,
    0.60,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'W Europe sandy bays/sandbanks',
            'best_time', 'Dusk/night with moving tide',
            'tide_sensitivity', 'Strong; tide run helps',
            'baits_diet', 'Whole squid, sandeel, fish strips',
            'temperature_effect', 'Mild-warm best',
            'weather_effect', 'After mild blows can fish well',
            'distance_depth', 'Surf bays 5-15 m',
            'restrictions', 'Local MLS/bag rules',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Inshore banks/channels',
            'best_time', 'Flood/ebb runs',
            'tide_sensitivity', 'Strong',
            'baits_diet', 'Sandeel/squid',
            'temperature_effect', 'Mild-warm',
            'weather_effect', 'Moderate chop ok',
            'distance_depth', '10-60 m',
            'restrictions', 'Local rules',
            'authority', 'National fisheries'
        )
    ),
    'Dappled and dashing - meet me where the tide runs.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Small-eyed Ray (Raja microocellata)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'RME',
    'Raja microocellata',
    'Small-eyed Ray',
    'Raya ojuda',
    'Raie petites-yeux',
    'Kleinochenrochen',
    'Razza occhiuta',
    'Raia-olho-pequeno',
    '{"whole_squid","sandeel","bottom_rigs"}',
    8,
    false,
    true,
    4,
    3,
    60,
    '{"sand","surf","bars"}',
    0.30,
    0.50,
    0.30,
    0.60,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Wales/Channel/Atlantic surf beaches',
            'best_time', 'Evening/night with run',
            'tide_sensitivity', 'Strong; loves banks/bars',
            'baits_diet', 'Sandeel/squid combos',
            'temperature_effect', 'Mild months best',
            'weather_effect', 'After small onshore blows',
            'distance_depth', 'Bars/holes 3-12 m',
            'restrictions', 'Check regional protections',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Inshore banks',
            'best_time', 'Moving tides',
            'tide_sensitivity', 'Strong',
            'baits_diet', 'Sandeel/squid',
            'temperature_effect', 'Mild-warm',
            'weather_effect', 'Moderate chop ok',
            'distance_depth', '10-50 m',
            'restrictions', 'Local rules',
            'authority', 'National fisheries'
        )
    ),
    'Surf-zone flirt - catch me working the bar on the flood.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Undulate Ray (Raja undulata)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'RUN',
    'Raja undulata',
    'Undulate Ray',
    'Raya mosaico',
    'Raie ondulée',
    'Wellenrochen',
    'Razza ondulata',
    'Raia-ondulada',
    '{"whole_squid","fish_baits","bottom_rigs"}',
    8,
    false,
    true,
    4,
    3,
    70,
    '{"sand","channel","bank"}',
    0.30,
    0.50,
    0.30,
    0.60,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Southern UK/Channel/Biscay',
            'best_time', 'Evening/night with run',
            'tide_sensitivity', 'Strong; channels and banks',
            'baits_diet', 'Squid/mackerel/sandeel',
            'temperature_effect', 'Prefers mild-warm',
            'weather_effect', 'Post-blow settles fish',
            'distance_depth', 'Sandy bays 3-15 m',
            'restrictions', 'Often protected or seasonal C&R only - check carefully',
            'authority', 'National/Regional regulations'
        ),
        'boat', jsonb_build_object(
            'regions', 'Sandy channels/banks',
            'best_time', 'Moving tide',
            'tide_sensitivity', 'Strong',
            'baits_diet', 'Whole squid/fish baits',
            'temperature_effect', 'Mild-warm',
            'weather_effect', 'Moderate seas fine',
            'distance_depth', '10-60 m',
            'restrictions', 'Protection varies by area',
            'authority', 'National/Regional regulations'
        )
    ),
    'Wavy-gravy heartbreaker - strictly respectful dates only.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- ======================
-- GURNARDS (RED & GREY)
-- ======================

-- Red Gurnard (Chelidonichthys cuculus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'GUR',
    'Chelidonichthys cuculus',
    'Red Gurnard',
    'Rubio',
    'Grondin rouge',
    'Rotbarbe (Seeskorpion)',
    'Gallinella rossa',
    'Patruça-vermelha',
    '{"small_fish_strips","shrimp_bait","drift"}',
    8,
    false,
    false,
    4,
    5,
    100,
    '{"sand","mixed_ground","flats"}',
    0.30,
    0.50,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'Atlantic/Channel/Biscay',
            'best_time', 'Daytime over sand/mixed',
            'tide_sensitivity', 'Moderate',
            'baits_diet', 'Fish strips, shrimp; hunts on seabed',
            'temperature_effect', 'Mild-warm months more active',
            'weather_effect', 'Moderate chop fine',
            'distance_depth', '5-20 m from beaches/rocks',
            'restrictions', 'Local MLS may apply',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Banks/flats',
            'best_time', 'Daytime drifts',
            'tide_sensitivity', 'Moderate',
            'baits_diet', 'Fish strips/shrimp; small metals',
            'temperature_effect', 'Mild-warm',
            'weather_effect', 'Moderate ok',
            'distance_depth', '15-100 m',
            'restrictions', 'Local rules',
            'authority', 'National fisheries'
        )
    ),
    'Red, rumbly, and ready to root out lunch - bring strips.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Grey Gurnard (Eutrigla gurnardus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_de,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    tide_sensitivity,
    advice,
    playful_bio_en
) VALUES (
    'GGR',
    'Eutrigla gurnardus',
    'Grey Gurnard',
    'Bejel',
    'Grondin gris',
    'Knurrhahn',
    'Cappone grigio',
    'Patruça-cinzenta',
    '{"fish_strips","worms","drift"}',
    8,
    false,
    false,
    3,
    5,
    120,
    '{"sand","mixed_ground","banks"}',
    0.30,
    0.50,
    0.30,
    0.40,
    jsonb_build_object(
        'shore', jsonb_build_object(
            'regions', 'North Sea/Atlantic',
            'best_time', 'Daytime over sand/mixed',
            'tide_sensitivity', 'Moderate',
            'baits_diet', 'Fish strips, worms; opportunist',
            'temperature_effect', 'Cool-mild water fine',
            'weather_effect', 'Moderate chop fine',
            'distance_depth', '5-20 m',
            'restrictions', 'Local rules vary',
            'authority', 'National fisheries'
        ),
        'boat', jsonb_build_object(
            'regions', 'Banks 20-120 m',
            'best_time', 'Daytime drifts',
            'tide_sensitivity', 'Moderate',
            'baits_diet', 'Fish/worm strips; small metals',
            'temperature_effect', 'Cool-mild',
            'weather_effect', 'Moderate ok',
            'distance_depth', '20-120 m',
            'restrictions', 'Local rules',
            'authority', 'National fisheries'
        )
    ),
    'Grey but not dull - I rumble when I''m into you.'
)
ON CONFLICT (species_code) DO UPDATE SET
    scientific_name = EXCLUDED.scientific_name,
    name_en = EXCLUDED.name_en,
    advice = EXCLUDED.advice,
    playful_bio_en = EXCLUDED.playful_bio_en,
    updated_at = now();


-- Re-enable triggers
SET session_replication_role = DEFAULT;
