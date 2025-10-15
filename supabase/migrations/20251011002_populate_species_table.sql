-- Migration: Populate species table with comprehensive data
-- Date: 2025-10-11
-- Description: Adds 45 unique species with shore/boat advice, playful bios, and aliases

-- Add playful_bio_en column if it doesn't exist
ALTER TABLE species ADD COLUMN IF NOT EXISTS playful_bio_en TEXT;

-- Create index for playful_bio_en
CREATE INDEX IF NOT EXISTS idx_species_playful_bio_en ON species(playful_bio_en) WHERE playful_bio_en IS NOT NULL;

-- Begin transaction for atomic insert
BEGIN;

-- Temporarily disable triggers to speed up bulk insert
SET session_replication_role = replica;

-- Clear existing species data (if any) to avoid conflicts
-- This ensures clean population on repeated migrations
DELETE FROM species;

-- Insert species data


-- Ballan Wrasse (Labrus bergylta)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'wrb',
    'Labrus bergylta',
    'Ballan Wrasse',
    '{"shore": {"regions": "Atlantic, North Sea (west), Mediterranean fringe", "best_time": "Daylight, especially on a flooding tide.", "tide_sensitivity": "Moderate; feeds as crabs and prawns shuffle with the tide.", "baits_diet": "Crab, prawn, shellfish; raids crevices and kelp fronds.", "temperature_effect": "Best in mild–warm months; sluggish in winter.", "weather_effect": "Clear water is easier; swell pushes them tight to cover.", "distance_depth": "Rocky headlands and kelp gullies right under your feet, 2–15 m.", "restrictions": "Conservation measures in some areas (wrasse for aquaculture); many anglers practise catch & release.", "authority": "Regional conservation/fisheries bodies (e.g., UK IFCAs; Norway Fiskeridirektoratet)."}}'::jsonb,
    'Always around daylight, especially on a flooding tide. Not into cold shoulders — only crab.',
    3
);


-- Black Seabream (Spondyliosoma cantharus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'brs',
    'Spondyliosoma cantharus',
    'Black Seabream',
    '{"shore": {"regions": "Mediterranean, Atlantic", "best_time": "Dawn/daylight", "tide_sensitivity": "Moderate; likes flowing water", "baits_diet": "Shellfish, worms, squid; omnivore", "temperature_effect": "Prefers mild–warm; spawns spring inshore", "weather_effect": "Feeds in calm/light chop", "distance_depth": "Piers, rocky ground 5–15m", "restrictions": "Spawning aggregations protected", "authority": "Regional Med fisheries agencies"}, "boat": {"regions": "Mediterranean, Atlantic", "best_time": "Dawn/daylight", "tide_sensitivity": "Moderate; likes flowing water", "baits_diet": "Shellfish, worms, squid; omnivore", "temperature_effect": "Prefers mild–warm; spawns spring inshore", "weather_effect": "Feeds in calm/light chop", "distance_depth": "Reefs, wrecks 20–50m", "restrictions": "Spawning aggregations protected", "authority": "Regional Med fisheries agencies"}}'::jsonb,
    'Catch me dawn/daylight. Big on group dates, especially with shellfish.',
    4
);


-- Brill (Scophthalmus rhombus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'bll',
    'Scophthalmus rhombus',
    'Brill',
    '{"shore": {"regions": "North Sea, North Atlantic", "best_time": "Dawn/dusk drifts over sandbanks and edges.", "tide_sensitivity": "Moderate; moving water over drop-offs and sandbanks fishes best.", "baits_diet": "Whole sandeel, fish strips; ambush predator on clean ground.", "temperature_effect": "Best spring–autumn; slows in very cold water.", "weather_effect": "A slight chop is fine; heavy surf buries baits.", "distance_depth": "Clean sand and shell 5–40 m from beaches and boats.", "restrictions": "Minimum sizes and protections vary—release undersized fish.", "authority": "North Sea national agencies; UK IFCA/MMO; NL/DE authorities."}, "boat": {"regions": "North Sea, North Atlantic", "best_time": "Dawn/dusk drifts over sandbanks and edges.", "tide_sensitivity": "Moderate; moving water over drop-offs and sandbanks fishes best.", "baits_diet": "Whole sandeel, fish strips; ambush predator on clean ground.", "temperature_effect": "Best spring–autumn; slows in very cold water.", "weather_effect": "A slight chop is fine; heavy surf buries baits.", "distance_depth": "Sandbanks and sloping edges 10–60 m—classic drift tactics.", "restrictions": "Minimum sizes and protections vary—release undersized fish.", "authority": "North Sea national agencies; UK IFCA/MMO; NL/DE authorities."}}'::jsonb,
    'Catch me dawn/dusk drifts over sandbanks and edges. Big on group dates, especially with whole sandeel.',
    5
);


-- Cod (Coastal) (Gadus morhua)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'cod',
    'Gadus morhua',
    'Cod (Coastal)',
    '{"shore": {"regions": "North Sea, Baltic, Norwegian waters", "best_time": "Low light and night; autumn–winter inshore peaks.", "tide_sensitivity": "Strong; running tide over rough ground best.", "baits_diet": "Lug/ragworm, squid, crab, fish baits; eats crabs, fish, shellfish.", "temperature_effect": "Cold‑water species; moves deeper when warm.", "weather_effect": "Settling after storms good; extreme swell makes it hard to fish effectively.", "distance_depth": "Shallow rough ground 5–20 m from beaches, piers, rocks.", "restrictions": "Closed areas/seasons and MLS common, especially Baltic—check locally.", "authority": "Norway Fiskeridirektoratet; Denmark/Sweden agencies; UK IFCA/MMO."}, "boat": {"regions": "North Sea, Baltic, Norwegian waters", "best_time": "Low light and night; autumn–winter inshore peaks.", "tide_sensitivity": "Strong; running tide over rough ground best.", "baits_diet": "Lug/ragworm, squid, crab, fish baits; eats crabs, fish, shellfish.", "temperature_effect": "Cold‑water species; moves deeper when warm.", "weather_effect": "Settling after storms good; extreme swell makes it hard to fish effectively.", "distance_depth": "Deeper rough ground and wrecks 20–60 m.", "restrictions": "Closed areas/seasons and MLS common, especially Baltic—check locally.", "authority": "Norway Fiskeridirektoratet; Denmark/Sweden agencies; UK IFCA/MMO."}}'::jsonb,
    'I’m most active low light and night; autumn–winter inshore peaks. Bring lug/ragworm and let’s make it a date.',
    5
);


-- Common Cuttlefish (Sepia officinalis)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'cut',
    'Sepia officinalis',
    'Common Cuttlefish',
    '{"shore": {"regions": "Atlantic (Iberia/France/UK), Mediterranean", "best_time": "Night with lights; spring runs in many ports.", "tide_sensitivity": "Low–moderate; likes a steady drift.", "baits_diet": "Squid/cuttle jigs; also takes small fish and prawns.", "temperature_effect": "Most coastal in mild seasons; heat drives them out deeper.", "weather_effect": "Clear water and small swell are best; stirred-up water after storms fishes poorly.", "distance_depth": "Harbour walls, marinas and sandy patches 2–15 m—classic pier species.", "restrictions": "Seasonal protections common; respect harbour rules and night-fishing by-laws.", "authority": "Regional fisheries (Spain MAPA/CCAA; France OFB; Italy MIPAAF; Portugal DGRM)."}, "boat": {"regions": "Atlantic (Iberia/France/UK), Mediterranean", "best_time": "Night with lights; spring runs in many ports.", "tide_sensitivity": "Low–moderate; likes a steady drift.", "baits_diet": "Squid/cuttle jigs; also takes small fish and prawns.", "temperature_effect": "Most coastal in mild seasons; heat drives them out deeper.", "weather_effect": "Clear water and small swell are best; stirred-up water after storms fishes poorly.", "distance_depth": "Sandy bays and reefs 10–40 m; gentle drifts over weed/sand edges.", "restrictions": "Seasonal protections common; respect harbour rules and night-fishing by-laws.", "authority": "Regional fisheries (Spain MAPA/CCAA; France OFB; Italy MIPAAF; Portugal DGRM)."}}'::jsonb,
    'Looking for someone who gets me night with lights; spring runs in many ports. Bonus points if you’ve got squid/cuttle jigs; also takes small',
    5
);


-- Common Ling (Molva molva)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'lin',
    'Molva molva',
    'Common Ling',
    '{"shore": {"regions": "North Atlantic, North Sea, Norwegian waters", "best_time": "Dusk and dark; year-round over rough ground.", "tide_sensitivity": "Moderate; prefers steady flow around wrecks and ledges.", "baits_diet": "Large fish baits, squid, cuttle; scavenger-predator among rocks and wrecks.", "temperature_effect": "Cold-tolerant; deep marks fish consistently regardless of season.", "weather_effect": "Big groundswell can shut down shallow rough ground; deep marks keep producing.", "distance_depth": "From deep rock ledges within casting reach to wrecks 50–200 m.", "restrictions": "Use strong tackle and safe handling; local size/bag rules may apply.", "authority": "Norway Fiskeridirektoratet; UK/NL national agencies."}, "boat": {"regions": "North Atlantic, North Sea, Norwegian waters", "best_time": "Dusk and dark; year-round over rough ground.", "tide_sensitivity": "Moderate; prefers steady flow around wrecks and ledges.", "baits_diet": "Large fish baits, squid, cuttle; scavenger-predator among rocks and wrecks.", "temperature_effect": "Cold-tolerant; deep marks fish consistently regardless of season.", "weather_effect": "Big groundswell can shut down shallow rough ground; deep marks keep producing.", "distance_depth": "Wrecks, pinnacles and heavy reef 80–300 m; big baits on strong gear.", "restrictions": "Use strong tackle and safe handling; local size/bag rules may apply.", "authority": "Norway Fiskeridirektoratet; UK/NL national agencies."}}'::jsonb,
    'Always around dusk and dark; year-round over rough ground. Not into cold shoulders — only large fish baits.',
    4
);


-- Common Octopus (Octopus vulgaris)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'oct',
    'Octopus vulgaris',
    'Common Octopus',
    '{"shore": {"regions": "Atlantic (Iberia), Mediterranean", "best_time": "Night and low light; autumn–winter peaks in many areas.", "tide_sensitivity": "Low–moderate; prefers gentle movement around rocky ground.", "baits_diet": "Egi-style octopus jigs, fish/squid baits; hunts crabs, shellfish and small fish.", "temperature_effect": "Prefers mild–warm seasons inshore; cold pushes them deeper.", "weather_effect": "Clear water and light swell help; stirred-up water after storms fishes poorly.", "distance_depth": "Breakwaters, harbour walls and rough patches 2–20 m—classic pier target at night.", "restrictions": "Local seasons/limits and gear rules apply; pots/traps regulated in many regions.", "authority": "Spain MAPA/CCAA; Portugal DGRM; Italy MIPAAF."}, "boat": {"regions": "Atlantic (Iberia), Mediterranean", "best_time": "Night and low light; autumn–winter peaks in many areas.", "tide_sensitivity": "Low–moderate; prefers gentle movement around rocky ground.", "baits_diet": "Egi-style octopus jigs, fish/squid baits; hunts crabs, shellfish and small fish.", "temperature_effect": "Prefers mild–warm seasons inshore; cold pushes them deeper.", "weather_effect": "Clear water and light swell help; stirred-up water after storms fishes poorly.", "distance_depth": "Reefs and rough ground 10–40 m; slow-drift jigs over boulders and weed.", "restrictions": "Local seasons/limits and gear rules apply; pots/traps regulated in many regions.", "authority": "Spain MAPA/CCAA; Portugal DGRM; Italy MIPAAF."}}'::jsonb,
    'Catch me night and low light; autumn–winter peaks in many areas. Big on group dates, especially with egi-style octopus jigs.',
    5
);


-- Common Squid (Loligo vulgaris)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'sqc',
    'Loligo vulgaris',
    'Common Squid',
    '{"shore": {"regions": "Atlantic, Mediterranean", "best_time": "Night with lights; peaks on dusk and first dark, autumn–winter many areas.", "tide_sensitivity": "Moderate; prefers steady run rather than slack.", "baits_diet": "Egi jigs; preys on small fish, prawns.", "temperature_effect": "Most coastal in cool to mild seasons; heat drives them deeper.", "weather_effect": "Clear water & small swell best; stirred-up water after storms fishes poorly.", "distance_depth": "From harbour walls to 5–30 m; over sand/weed beds. (shore accessible range)", "restrictions": "Local seasonal closures/limits may apply; respect harbour rules.", "authority": "Regional fisheries (e.g., Spain MAPA/CCAA; Italy MIPAAF; Portugal DGRM)."}, "boat": {"regions": "Atlantic, Mediterranean", "best_time": "Night with lights; peaks on dusk and first dark, autumn–winter many areas.", "tide_sensitivity": "Moderate; prefers steady run rather than slack.", "baits_diet": "Egi jigs; preys on small fish, prawns.", "temperature_effect": "Most coastal in cool to mild seasons; heat drives them deeper.", "weather_effect": "Clear water & small swell best; stirred-up water after storms fishes poorly.", "distance_depth": "From harbour walls to 5–30 m; over sand/weed beds. (boat marks deeper/offshore)", "restrictions": "Local seasonal closures/limits may apply; respect harbour rules.", "authority": "Regional fisheries (e.g., Spain MAPA/CCAA; Italy MIPAAF; Portugal DGRM)."}}'::jsonb,
    'Always around night with lights; peaks on dusk and first dark, autumn–winter many areas. Not into cold shoulders — only egi jigs; preys on s',
    5
);


-- Conger Eel (Conger conger)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'con',
    'Conger conger',
    'Conger Eel',
    '{"shore": {"regions": "Atlantic, Mediterranean, English Channel", "best_time": "Night; over low‑light periods year‑round.", "tide_sensitivity": "Low–moderate; prefers steady run around structure.", "baits_diet": "Whole fish/squid, fish heads; ambush predator on fish/crustaceans.", "temperature_effect": "Feeds across wide range; slightly better in mild water.", "weather_effect": "Unfazed by swell; dirty water fine if baits are scented.", "distance_depth": "Harbour walls, rocky gullies; 5–30 m.", "restrictions": "Handling care; some areas limit retention—check local laws.", "authority": "UK IFCA/MMO; Ireland SFPA; France OFB; Spain MAPA."}, "boat": {"regions": "Atlantic, Mediterranean, English Channel", "best_time": "Night; over low‑light periods year‑round.", "tide_sensitivity": "Low–moderate; prefers steady run around structure.", "baits_diet": "Whole fish/squid, fish heads; ambush predator on fish/crustaceans.", "temperature_effect": "Feeds across wide range; slightly better in mild water.", "weather_effect": "Unfazed by swell; dirty water fine if baits are scented.", "distance_depth": "Deep wrecks/reefs 30–100 m.", "restrictions": "Handling care; some areas limit retention—check local laws.", "authority": "UK IFCA/MMO; Ireland SFPA; France OFB; Spain MAPA."}}'::jsonb,
    'Looking for someone who gets me night; over low‑light periods year‑round. Bonus points if you’ve got whole fish/squid.',
    4
);


-- Cuckoo Wrasse (Labrus mixtus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'wrc',
    'Labrus mixtus',
    'Cuckoo Wrasse',
    '{"shore": {"regions": "North Atlantic, North Sea (west)", "best_time": "Daylight; over broken ground with kelp and boulders.", "tide_sensitivity": "Moderate; works best with some run.", "baits_diet": "Small crab and prawn baits; also takes small lures.", "temperature_effect": "Active in mild–warm months; slows in winter.", "weather_effect": "Clearer seas help; big swell tucks them into holes.", "distance_depth": "Rocky points and reefs in 5–25 m; piers with kelp beds can hold them.", "restrictions": "Local protections possible; bright colours make them popular for photos—handle gently.", "authority": "Regional conservation/fisheries bodies; national agencies."}}'::jsonb,
    'Looking for someone who gets me daylight; over broken ground with kelp and boulders. Bonus points if you’ve got small crab and prawn baits;',
    3
);


-- Dab (Limanda limanda)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'dab',
    'Limanda limanda',
    'Dab',
    '{"shore": {"regions": "Atlantic, North Sea", "best_time": "Daylight", "tide_sensitivity": "Moderate tidal influence", "baits_diet": "Small worms, shrimps; bottom feeder", "temperature_effect": "Tolerant to cold, feeds year-round", "weather_effect": "Less impacted by rough seas than other flatfish", "distance_depth": "Beaches, piers, sandy ground 2–20m", "restrictions": "No major restrictions; often small, returned", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, North Sea", "best_time": "Daylight", "tide_sensitivity": "Moderate tidal influence", "baits_diet": "Small worms, shrimps; bottom feeder", "temperature_effect": "Tolerant to cold, feeds year-round", "weather_effect": "Less impacted by rough seas than other flatfish", "distance_depth": "Soft muddy seabeds 20–40m", "restrictions": "No major restrictions; often small, returned", "authority": "National fisheries agencies"}}'::jsonb,
    'Always around daylight. Not into cold shoulders — only small worms.',
    3
);


-- Dentex (Dentex dentex)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'dex',
    'Dentex dentex',
    'Dentex',
    '{"boat": {"regions": "Mediterranean", "best_time": "Daytime", "tide_sensitivity": "Moderate tidal effect", "baits_diet": "Live fish, squid; predatory", "temperature_effect": "Active in warm Med summers", "weather_effect": "Best in clear calm seas", "distance_depth": "Deep rocky reefs 20–100m", "restrictions": "Strict MLS ~30–35cm; local protections", "authority": "Regional Med fisheries agencies"}}'::jsonb,
    'I’m most active daytime. Bring live fish and let’s make it a date.',
    5
);


-- Dover Sole (Solea solea)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'sol',
    'Solea solea',
    'Dover Sole',
    '{"shore": {"regions": "Atlantic, North Sea", "best_time": "Night/dusk", "tide_sensitivity": "Strong on flooding tide", "baits_diet": "Worms, ragworm, small crab; bottom-feeder", "temperature_effect": "Prefers warmer summer/autumn; winter slow", "weather_effect": "Settled calm seas best", "distance_depth": "Sandy beaches, shallow mud 2–15m", "restrictions": "MLS 24cm+; quotas apply", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, North Sea", "best_time": "Night/dusk", "tide_sensitivity": "Strong on flooding tide", "baits_diet": "Worms, ragworm, small crab; bottom-feeder", "temperature_effect": "Prefers warmer summer/autumn; winter slow", "weather_effect": "Settled calm seas best", "distance_depth": "Drifting soft grounds 20–40m", "restrictions": "MLS 24cm+; quotas apply", "authority": "National fisheries agencies"}}'::jsonb,
    'Looking for someone who gets me night/dusk. Bonus points if you’ve got worms.',
    5
);


-- Flathead Grey Mullet (Mugil cephalus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'fgm',
    'Mugil cephalus',
    'Flathead Grey Mullet',
    '{"shore": {"regions": "Atlantic, Mediterranean", "best_time": "Dawn/evening; calm days", "tide_sensitivity": "Strong in estuaries on flooding tide", "baits_diet": "Bread, algae, harbour detritus; filter feeder", "temperature_effect": "Best in mild–warm months; cold snaps shut down", "weather_effect": "After rain in estuaries good; spooked by wind/boat noise", "distance_depth": "Harbours, estuaries, surf zones 0–10m", "restrictions": "Often no EU MLS; local rules apply", "authority": "National fisheries agencies"}}'::jsonb,
    'Looking for someone who gets me dawn/evening; calm days. Bonus points if you’ve got bread.',
    4
);


-- Flounder (Platichthys flesus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'fle',
    'Platichthys flesus',
    'Flounder',
    '{"shore": {"regions": "North Sea, Baltic, Atlantic", "best_time": "Dusk/night and daylight in murky water; autumn–winter strong.", "tide_sensitivity": "Strong in estuaries/beaches; mid‑flood best.", "baits_diet": "Worms, shrimp, small crab; opportunistic scavenger.", "temperature_effect": "Tolerant; feeds in cold but slower in extremes.", "weather_effect": "Coloured water and gentle surf good; heavy weed/swell poor.", "distance_depth": "Very close in on sand/mud; 0–20 m (estuaries to open beaches). (shore accessible range)", "restrictions": "Local MLS/seasonal protections in some estuaries—verify.", "authority": "Baltic/North Sea national agencies; UK IFCA/MMO."}, "boat": {"regions": "North Sea, Baltic, Atlantic", "best_time": "Dusk/night and daylight in murky water; autumn–winter strong.", "tide_sensitivity": "Strong in estuaries/beaches; mid‑flood best.", "baits_diet": "Worms, shrimp, small crab; opportunistic scavenger.", "temperature_effect": "Tolerant; feeds in cold but slower in extremes.", "weather_effect": "Coloured water and gentle surf good; heavy weed/swell poor.", "distance_depth": "Very close in on sand/mud; 0–20 m (estuaries to open beaches). (boat marks deeper/offshore)", "restrictions": "Local MLS/seasonal protections in some estuaries—verify.", "authority": "Baltic/North Sea national agencies; UK IFCA/MMO."}}'::jsonb,
    'Catch me dusk/night and daylight in murky water; autumn–winter strong. Big on group dates, especially with worms.',
    4
);


-- Garfish (Needlefish) (Belone belone)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'gar',
    'Belone belone',
    'Garfish (Needlefish)',
    '{"shore": {"regions": "Atlantic, North Sea, Baltic", "best_time": "Daylight & dusk in spring runs; also at night under lights.", "tide_sensitivity": "Low–moderate; moving surface water helpful.", "baits_diet": "Small surface lures/float baits; eats sprats/sandeels.", "temperature_effect": "Arrives with warming water in spring–summer.", "weather_effect": "Calm/clear or slight chop best; big swell poor for floats.", "distance_depth": "Surface layers 0–5 m; close to piers/headlands. (shore accessible range)", "restrictions": "Few restrictions; sharp beak—handle with care.", "authority": "National fisheries agency/harbour by‑laws."}, "boat": {"regions": "Atlantic, North Sea, Baltic", "best_time": "Daylight & dusk in spring runs; also at night under lights.", "tide_sensitivity": "Low–moderate; moving surface water helpful.", "baits_diet": "Small surface lures/float baits; eats sprats/sandeels.", "temperature_effect": "Arrives with warming water in spring–summer.", "weather_effect": "Calm/clear or slight chop best; big swell poor for floats.", "distance_depth": "Surface layers 0–5 m; close to piers/headlands. (boat marks deeper/offshore)", "restrictions": "Few restrictions; sharp beak—handle with care.", "authority": "National fisheries agency/harbour by‑laws."}}'::jsonb,
    'Always around daylight & dusk in spring runs; also at night under lights. Not into cold shoulders — only small surface lures/float baits; ea',
    3
);


-- Gilthead Seabream (Gilthead Seabream)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'sbg',
    'Gilthead Seabream',
    'Gilthead Seabream',
    '{"shore": {"regions": "Mediterranean, Southern Atlantic", "best_time": "Dawn/dusk; warm months", "tide_sensitivity": "Strong on flooding tide", "baits_diet": "Crabs, prawns, mussels; crushes shellfish with molars", "temperature_effect": "Likes ≥15°C; sluggish in cold", "weather_effect": "Light onshore chop good; too much surf bad", "distance_depth": "Estuaries, harbours 2–10m", "restrictions": "MLS ~20–23cm+; bag limits in Med countries", "authority": "Regional Med fisheries agencies"}, "boat": {"regions": "Mediterranean, Southern Atlantic", "best_time": "Dawn/dusk; warm months", "tide_sensitivity": "Strong on flooding tide", "baits_diet": "Crabs, prawns, mussels; crushes shellfish with molars", "temperature_effect": "Likes ≥15°C; sluggish in cold", "weather_effect": "Light onshore chop good; too much surf bad", "distance_depth": "Reefs, sandy bays 10–30m", "restrictions": "MLS ~20–23cm+; bag limits in Med countries", "authority": "Regional Med fisheries agencies"}}'::jsonb,
    'I’m most active dawn/dusk; warm months. Bring crabs and let’s make it a date.',
    5
);


-- Greater Amberjack (Seriola dumerili)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'gaj',
    'Seriola dumerili',
    'Greater Amberjack',
    '{"shore": {"regions": "Mediterranean, Southern Atlantic (Iberia)", "best_time": "Dawn and late afternoon; summer into autumn.", "tide_sensitivity": "Moderate; hunts along current seams around structure.", "baits_diet": "Livebaits (mackerel, bogue), big stickbaits and jigs; apex predator on small fish.", "temperature_effect": "Loves warm water; quiet during cold spells.", "weather_effect": "Settled, clear seas favour topwater and livebaiting; lumpy seas push fish deeper.", "distance_depth": "Rocky headlands and harbour mouths from shore when bait is in; offshore reefs/pins 20–80 m.", "restrictions": "Size/bag rules vary by country; release big breeders where encouraged.", "authority": "Spain MAPA/CCAA; Italy MIPAAF; Portugal DGRM."}, "boat": {"regions": "Mediterranean, Southern Atlantic (Iberia)", "best_time": "Dawn and late afternoon; summer into autumn.", "tide_sensitivity": "Moderate; hunts along current seams around structure.", "baits_diet": "Livebaits (mackerel, bogue), big stickbaits and jigs; apex predator on small fish.", "temperature_effect": "Loves warm water; quiet during cold spells.", "weather_effect": "Settled, clear seas favour topwater and livebaiting; lumpy seas push fish deeper.", "distance_depth": "Offshore reefs, wrecks and pinnacles 20–150 m; slow-troll or jig.", "restrictions": "Size/bag rules vary by country; release big breeders where encouraged.", "authority": "Spain MAPA/CCAA; Italy MIPAAF; Portugal DGRM."}}'::jsonb,
    'Looking for someone who gets me dawn and late afternoon; summer into autumn. Bonus points if you’ve got livebaits (mackerel.',
    4
);


-- Greater Weever (Trachinus draco)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'wee',
    'Trachinus draco',
    'Greater Weever',
    '{"shore": {"regions": "Atlantic, North Sea, Mediterranean", "best_time": "Sunny calm days over warm sand; also dusk.", "tide_sensitivity": "Low; lies in wait in soft sand.", "baits_diet": "Small worms and prawn pieces; ambush predator on sand flats.", "temperature_effect": "Warmer months bring them inshore; cooler water pushes deeper.", "weather_effect": "Calm seas best; stirred-up sand reduces takes.", "distance_depth": "Edges of sandy beaches and estuary bars 1–15 m—watch those spines underfoot!", "restrictions": "Venomous spines—handle with care and wear footwear; first-aid is hot-water immersion.", "authority": "National fisheries and beach safety guidance."}}'::jsonb,
    'I’m most active sunny calm days over warm sand; also dusk. Bring small worms and prawn pieces; ambush predator on sand flats. and let’s make',
    3
);


-- Grey Mullet (Chelon labrosus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'mug',
    'Chelon labrosus',
    'Grey Mullet',
    '{"shore": {"regions": "Atlantic, Mediterranean", "best_time": "Evening/dawn; sight‑feeding in daylight on calm days.", "tide_sensitivity": "Strong in estuaries on flood; when the tide slows right down spotting fish with polarised glasses works.", "baits_diet": "Bread, tiny worms, harbour detritus; filter‑grazer.", "temperature_effect": "Best in mild–warm months; cold snaps shut them down.", "weather_effect": "After rain/run‑off they graze hard in estuaries; strong winds spook shoals.", "distance_depth": "Harbours, marinas, surf edges; 0–10 m. (shore accessible range)", "restrictions": "Local restrictions possible; avoid polluted harbours for consumption.", "authority": "Municipal/port by‑laws; national fisheries sites."}, "boat": {"regions": "Atlantic, Mediterranean", "best_time": "Evening/dawn; sight‑feeding in daylight on calm days.", "tide_sensitivity": "Strong in estuaries on flood; when the tide slows right down spotting fish with polarised glasses works.", "baits_diet": "Bread, tiny worms, harbour detritus; filter‑grazer.", "temperature_effect": "Best in mild–warm months; cold snaps shut them down.", "weather_effect": "After rain/run‑off they graze hard in estuaries; strong winds spook shoals.", "distance_depth": "Harbours, marinas, surf edges; 0–10 m. (boat marks deeper/offshore)", "restrictions": "Local restrictions possible; avoid polluted harbours for consumption.", "authority": "Municipal/port by‑laws; national fisheries sites."}}'::jsonb,
    'I’m most active evening/dawn; sight‑feeding in daylight on calm days. Bring bread and let’s make it a date.',
    4
);


-- Haddock (Melanogrammus aeglefinus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'had',
    'Melanogrammus aeglefinus',
    'Haddock',
    '{"shore": {"regions": "North Sea, North Atlantic", "best_time": "Daylight and dusk; autumn–spring are strongest inshore.", "tide_sensitivity": "Moderate; likes a steady run over clean-to-mixed ground.", "baits_diet": "Worm baits, clam/mussel, small fish or squid strips; pecks shellfish and small invertebrates.", "temperature_effect": "Prefers cool water; pushes deeper in summer warm spells.", "weather_effect": "A settling sea after wind is ideal; heavy swell makes it hard to fish effectively.", "distance_depth": "Open sandy/mixed ground from beaches and piers 5–30 m; offshore banks and marks 30–100 m.", "restrictions": "Minimum sizes and bag/area rules vary by country—check locally before retaining fish.", "authority": "UK IFCA/MMO; Norway/Denmark/Netherlands national agencies."}, "boat": {"regions": "North Sea, North Atlantic", "best_time": "Daylight and dusk; autumn–spring are strongest inshore.", "tide_sensitivity": "Moderate; likes a steady run over clean-to-mixed ground.", "baits_diet": "Worm baits, clam/mussel, small fish or squid strips; pecks shellfish and small invertebrates.", "temperature_effect": "Prefers cool water; pushes deeper in summer warm spells.", "weather_effect": "A settling sea after wind is ideal; heavy swell makes it hard to fish effectively.", "distance_depth": "Drifts over sandbanks and mixed ground 30–120 m; downtiding at anchor also works.", "restrictions": "Minimum sizes and bag/area rules vary by country—check locally before retaining fish.", "authority": "UK IFCA/MMO; Norway/Denmark/Netherlands national agencies."}}'::jsonb,
    'I’m most active daylight and dusk; autumn–spring are strongest inshore. Bring worm baits and let’s make it a date.',
    5
);


-- Herring (Clupea harengus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'her',
    'Clupea harengus',
    'Herring',
    '{"shore": {"regions": "North Sea, Baltic, Atlantic", "best_time": "𐄳 (Bait fish) Dusk/night; winter–spring runs in many areas.", "tide_sensitivity": "Low–moderate; currents concentrate schools.", "baits_diet": "Sabiki/small spoons; plankton/small fish.", "temperature_effect": "Cool‑water; seasonal coastal runs.", "weather_effect": "Calm or slight chop best; heavy swell pushes deeper.", "distance_depth": "Mid‑water shoals 5–80 m; piers to offshore banks. (shore accessible range)", "restrictions": "Closed seasons/areas common—verify before fishing. Primarily a bait species; check local rules on gathering/using live/fresh bait.", "authority": "Baltic/North Sea national agencies."}, "boat": {"regions": "North Sea, Baltic, Atlantic", "best_time": "𐄳 (Bait fish) Dusk/night; winter–spring runs in many areas.", "tide_sensitivity": "Low–moderate; currents concentrate schools.", "baits_diet": "Sabiki/small spoons; plankton/small fish.", "temperature_effect": "Cool‑water; seasonal coastal runs.", "weather_effect": "Calm or slight chop best; heavy swell pushes deeper.", "distance_depth": "Mid‑water shoals 5–80 m; piers to offshore banks. (boat marks deeper/offshore)", "restrictions": "Closed seasons/areas common—verify before fishing. Primarily a bait species; check local rules on gathering/using live/fresh bait.", "authority": "Baltic/North Sea national agencies."}}'::jsonb,
    'Catch me 𐄳 (bait fish) dusk/night; winter–spring runs in many areas. Big on group dates, especially with sabiki/small spoons; plankton/small',
    5
);


-- Horse Mackerel (Trachurus trachurus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'hom',
    'Trachurus trachurus',
    'Horse Mackerel',
    '{"shore": {"regions": "Atlantic, Mediterranean, North Sea", "best_time": "Dusk to night under lights; also at first light.", "tide_sensitivity": "Low–moderate; harbour tides concentrate plankton.", "baits_diet": "Fine sabiki, tiny metals; eats zooplankton, small fish/larvae.", "temperature_effect": "More coastal in mild–warm water; drops deeper in cold.", "weather_effect": "Clear, calm nights best; murky water after storms reduces takes.", "distance_depth": "Harbours, piers, lights; middle depths 5–50 m. (shore accessible range)", "restrictions": "Few sport rules; size/bag may apply locally.", "authority": "Port/harbour by‑laws; national fisheries agency."}, "boat": {"regions": "Atlantic, Mediterranean, North Sea", "best_time": "Dusk to night under lights; also at first light.", "tide_sensitivity": "Low–moderate; harbour tides concentrate plankton.", "baits_diet": "Fine sabiki, tiny metals; eats zooplankton, small fish/larvae.", "temperature_effect": "More coastal in mild–warm water; drops deeper in cold.", "weather_effect": "Clear, calm nights best; murky water after storms reduces takes.", "distance_depth": "Harbours, piers, lights; middle depths 5–50 m. (boat marks deeper/offshore)", "restrictions": "Few sport rules; size/bag may apply locally.", "authority": "Port/harbour by‑laws; national fisheries agency."}}'::jsonb,
    'Love a moonlit dinner dusk to night under lights; also at first light. Just add fine sabiki.',
    4
);


-- John Dory (Zeus faber)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'jod',
    'Zeus faber',
    'John Dory',
    '{"shore": {"regions": "Atlantic, Mediterranean", "best_time": "Daytime; dawn on reefs/wrecks.", "tide_sensitivity": "Low–moderate; ambushes around current seams.", "baits_diet": "Livebaits/squid; predator on small fish.", "temperature_effect": "Best in mild–warm settled periods.", "weather_effect": "Prefers calm/clear; big swell drives deeper/off the mark.", "distance_depth": "Reefs/wrecks 20–150 m; occasional inshore. (shore accessible range)", "restrictions": "Commercial species; recreational MLS/bag may apply.", "authority": "National marine fisheries (e.g., France OFB; Spain MAPA)."}, "boat": {"regions": "Atlantic, Mediterranean", "best_time": "Daytime; dawn on reefs/wrecks.", "tide_sensitivity": "Low–moderate; ambushes around current seams.", "baits_diet": "Livebaits/squid; predator on small fish.", "temperature_effect": "Best in mild–warm settled periods.", "weather_effect": "Prefers calm/clear; big swell drives deeper/off the mark.", "distance_depth": "Reefs/wrecks 20–150 m; occasional inshore. (boat marks deeper/offshore)", "restrictions": "Commercial species; recreational MLS/bag may apply.", "authority": "National marine fisheries (e.g., France OFB; Spain MAPA)."}}'::jsonb,
    'Always around daytime; dawn on reefs/wrecks. Not into cold shoulders — only livebaits/squid; predator on small fish..',
    5
);


-- Little Tunny (Euthynnus alletteratus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'lta',
    'Euthynnus alletteratus',
    'Little Tunny',
    '{"shore": {"regions": "Mediterranean, Atlantic Iberia", "best_time": "First light and late afternoon; active whenever bait showers on the surface.", "tide_sensitivity": "Low–moderate; current lines help concentrate baitfish.", "baits_diet": "Fast metals, casting jigs, stickbaits; blitzes anchovy/sardine/sprat shoals.", "temperature_effect": "Loves warm water; pushes south/deeper when it cools.", "weather_effect": "Settled conditions show surface feeds; wind pushes action into current seams.", "distance_depth": "Headlands, harbour mouths and nearshore rips from shore; offshore feeding lanes by boat.", "restrictions": "Pay attention to tuna/large pelagic regulations; some areas require release or logbooks.", "authority": "Spain MAPA/CCAA; Italy MIPAAF; Portugal DGRM."}, "boat": {"regions": "Mediterranean, Atlantic Iberia", "best_time": "First light and late afternoon; active whenever bait showers on the surface.", "tide_sensitivity": "Low–moderate; current lines help concentrate baitfish.", "baits_diet": "Fast metals, casting jigs, stickbaits; blitzes anchovy/sardine/sprat shoals.", "temperature_effect": "Loves warm water; pushes south/deeper when it cools.", "weather_effect": "Settled conditions show surface feeds; wind pushes action into current seams.", "distance_depth": "Nearshore to offshore rips and temperature breaks; troll or run-and-gun where birds work.", "restrictions": "Pay attention to tuna/large pelagic regulations; some areas require release or logbooks.", "authority": "Spain MAPA/CCAA; Italy MIPAAF; Portugal DGRM."}}'::jsonb,
    'Looking for someone who gets me first light and late afternoon; active whenever bait showers on the surface. Bonus points if you’ve got fast',
    4
);


-- Mackerel (Scomber scombrus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'mac',
    'Scomber scombrus',
    'Mackerel',
    '{"shore": {"regions": "Atlantic, North Sea, Baltic", "best_time": "Daylight when shoals are in; dawn/evening peaks in summer.", "tide_sensitivity": "Low–moderate; moving water helps push bait inshore.", "baits_diet": "Feathers/sabiki, small metals; eats sprats, sandeels, krill/zooplankton.", "temperature_effect": "Stays near the surface in warm seasons; moves offshore/deeper when cold.", "weather_effect": "Stable, settled weather concentrates shoals; heavy swell scatters bait.", "distance_depth": "Shoals close to piers/headlands; middle depths 5–20 m.", "restrictions": "Local bag limits in places; observe pier/harbour rules.", "authority": "Local harbour by‑laws; national fisheries sites (e.g., UK IFCA/MMO; Ireland SFPA)."}, "boat": {"regions": "Atlantic, North Sea, Baltic", "best_time": "Daylight when shoals are in; dawn/evening peaks in summer.", "tide_sensitivity": "Low–moderate; moving water helps push bait inshore.", "baits_diet": "Feathers/sabiki, small metals; eats sprats, sandeels, krill/zooplankton.", "temperature_effect": "Stays near the surface in warm seasons; moves offshore/deeper when cold.", "weather_effect": "Stable, settled weather concentrates shoals; heavy swell scatters bait.", "distance_depth": "Offshore shoals middle depths 20–60 m; trolling and drift feathers.", "restrictions": "Local bag limits in places; observe pier/harbour rules.", "authority": "Local harbour by‑laws; national fisheries sites (e.g., UK IFCA/MMO; Ireland SFPA)."}}'::jsonb,
    'I’m most active daylight when shoals are in; dawn/evening peaks in summer. Bring feathers/sabiki and let’s make it a date.',
    4
);


-- Megrim (Lepidorhombus whiffiagonis)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'ldb',
    'Lepidorhombus whiffiagonis',
    'Megrim',
    '{"shore": {"regions": "North Atlantic, Celtic/North Sea", "best_time": "Daytime drifts.", "tide_sensitivity": "Low–moderate; happiest on gentle runs over clean ground.", "baits_diet": "Small fish strips, sandeel, squid; ambush feeder on sand/mud.", "temperature_effect": "Cool to mild water suits; very cold slows them.", "weather_effect": "Moderate chop is fine; big surf or heavy swell makes it hard to fish effectively.", "distance_depth": "Clean ground within casting reach in deeper beaches 10–30 m; offshore flats 30–120 m.", "restrictions": "Local minimum sizes and protections—check before keeping fish.", "authority": "UK IFCA/MMO; Ireland/Spain/France national agencies."}, "boat": {"regions": "North Atlantic, Celtic/North Sea", "best_time": "Daytime drifts.", "tide_sensitivity": "Low–moderate; happiest on gentle runs over clean ground.", "baits_diet": "Small fish strips, sandeel, squid; ambush feeder on sand/mud.", "temperature_effect": "Cool to mild water suits; very cold slows them.", "weather_effect": "Moderate chop is fine; big surf or heavy swell makes it hard to fish effectively.", "distance_depth": "Wide flats 40–200 m; drift baits a metre off the bottom when dogfish are thick.", "restrictions": "Local minimum sizes and protections—check before keeping fish.", "authority": "UK IFCA/MMO; Ireland/Spain/France national agencies."}}'::jsonb,
    'Always around daytime drifts. Not into cold shoulders — only small fish strips.',
    4
);


-- Parrotfish (Sparisoma cretense)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'par',
    'Sparisoma cretense',
    'Parrotfish',
    '{"shore": {"regions": "Mediterranean (eastern and subtropical pockets)", "best_time": "Daylight; calm, clear days.", "tide_sensitivity": "Low–moderate; mooches around weedy rocks.", "baits_diet": "Shellfish, prawns, small crabs; scrapes algae and grazes.", "temperature_effect": "Heat-lover; most active in summer.", "weather_effect": "Best in calm, clear water; swell hides them in crevices.", "distance_depth": "Shallow rocky coves and jetties 1–10 m—right where you can see them.", "restrictions": "Local protections in some regions; check rules if planning to retain.", "authority": "Regional Med fisheries agencies."}}'::jsonb,
    'Love a moonlit dinner daylight; calm, clear days. Just add shellfish.',
    4
);


-- Plaice (Pleuronectes platessa)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'ple',
    'Pleuronectes platessa',
    'Plaice',
    '{"shore": {"regions": "Atlantic, North Sea", "best_time": "Daylight", "tide_sensitivity": "Better on flooding tide", "baits_diet": "Worms, clams, mussels; bottom grazer", "temperature_effect": "Mild/cool best; sluggish in cold winter", "weather_effect": "Clear calm seas favour sight feeding", "distance_depth": "Beaches and estuaries, 2–10m", "restrictions": "MLS 27cm in UK/Europe; seasonal closures", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, North Sea", "best_time": "Daylight", "tide_sensitivity": "Better on flooding tide", "baits_diet": "Worms, clams, mussels; bottom grazer", "temperature_effect": "Mild/cool best; sluggish in cold winter", "weather_effect": "Clear calm seas favour sight feeding", "distance_depth": "Drifting over offshore banks 10–40m", "restrictions": "MLS 27cm in UK/Europe; seasonal closures", "authority": "National fisheries agencies"}}'::jsonb,
    'Looking for someone who gets me daylight. Bonus points if you’ve got worms.',
    4
);


-- Pollack (Pollachius pollachius)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'pol',
    'Pollachius pollachius',
    'Pollack',
    '{"shore": {"regions": "Atlantic, North Sea", "best_time": "Dawn/dusk; overcast days with lures", "tide_sensitivity": "Moderate; works tide races around reefs/wrecks", "baits_diet": "Artificial lures (soft plastics, metals), sandeel, mackerel strip", "temperature_effect": "Active in mild water; slows in extreme cold/heat", "weather_effect": "Clear settled seas with some tidal run; poor in turbid storm water", "distance_depth": "Kelp beds, reefs 5–30m close to rocks", "restrictions": "MLS ~30cm+ locally; check rules", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, North Sea", "best_time": "Dawn/dusk; overcast days with lures", "tide_sensitivity": "Moderate; works tide races around wrecks and reefs", "baits_diet": "Artificial lures, fish strips; predatory", "temperature_effect": "Active in mild water; slows in extreme cold/heat", "weather_effect": "Clear settled seas; turbid storm water reduces success", "distance_depth": "Wrecks and offshore reefs 20–100m", "restrictions": "MLS ~30cm+ locally; check rules", "authority": "National fisheries agencies"}}'::jsonb,
    'Looking for someone who gets me dawn/dusk; overcast days with lures. Bonus points if you’ve got artificial lures (soft plastics.',
    4
);


-- Red Mullet (Mullus surmuletus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'mul',
    'Mullus surmuletus',
    'Red Mullet',
    '{"shore": {"regions": "Mediterranean, Bay of Biscay", "best_time": "Daytime; dawn on calm, clear days.", "tide_sensitivity": "Moderate; flooding tide over clean sand best.", "baits_diet": "Small worms, shrimps; uses barbels to root crustaceans.", "temperature_effect": "Warm‑water preference; summer–autumn peak.", "weather_effect": "Settled, clear water ideal; heavy swell suppresses feeding.", "distance_depth": "Sandy/muddy bays 5–50 m; often close in. (shore accessible range)", "restrictions": "Minimum sizes common; verify locally.", "authority": "Spain MAPA/CCAA; France OFB; Portugal DGRM."}, "boat": {"regions": "Mediterranean, Bay of Biscay", "best_time": "Daytime; dawn on calm, clear days.", "tide_sensitivity": "Moderate; flooding tide over clean sand best.", "baits_diet": "Small worms, shrimps; uses barbels to root crustaceans.", "temperature_effect": "Warm‑water preference; summer–autumn peak.", "weather_effect": "Settled, clear water ideal; heavy swell suppresses feeding.", "distance_depth": "Sandy/muddy bays 5–50 m; often close in. (boat marks deeper/offshore)", "restrictions": "Minimum sizes common; verify locally.", "authority": "Spain MAPA/CCAA; France OFB; Portugal DGRM."}}'::jsonb,
    'Love a moonlit dinner daytime; dawn on calm, clear days. Just add small worms.',
    5
);


-- Red Seabream (Pagellus bogaraveo)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'sbr',
    'Pagellus bogaraveo',
    'Red Seabream',
    '{"boat": {"regions": "Mediterranean, Southern Atlantic", "best_time": "Daytime", "tide_sensitivity": "Moderate tide influence", "baits_diet": "Crabs, shellfish, squid; powerful jawed feeder", "temperature_effect": "Prefers warmer Med/Atlantic waters", "weather_effect": "Clear settled seas best", "distance_depth": "Deep rocky reefs 20–100m", "restrictions": "Size/bag restrictions vary", "authority": "Regional Med fisheries agencies"}}'::jsonb,
    'Catch me daytime. Big on group dates, especially with crabs.',
    5
);


-- Saithe (Pollachius virens) (Pollachius virens)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'pok',
    'Pollachius virens',
    'Saithe (Pollachius virens)',
    '{"shore": {"regions": "North Sea, Norwegian waters, North Atlantic", "best_time": "Dawn/dusk; overcast days fish well with lures.", "tide_sensitivity": "Moderate; hunts on current edges around structure.", "baits_diet": "Metal jigs, shads, sandeel/mackerel strip; chases small fish tightly packed.", "temperature_effect": "Active in cool–mild water; very warm or very cold spells slow them.", "weather_effect": "Clear water with some movement is ideal; big swell pushes them deeper.", "distance_depth": "Kelp fringes and rock pins accessible from shore 5–20 m; harbour mouths and headlands.", "restrictions": "Local size/bag rules vary; many anglers release larger breeders.", "authority": "Norway Fiskeridirektoratet; UK/NL/DE national agencies."}, "boat": {"regions": "North Sea, Norwegian waters, North Atlantic", "best_time": "Dawn/dusk; overcast days fish well with lures.", "tide_sensitivity": "Moderate; hunts on current edges around structure.", "baits_diet": "Metal jigs, shads, sandeel/mackerel strip; chases small fish tightly packed.", "temperature_effect": "Active in cool–mild water; very warm or very cold spells slow them.", "weather_effect": "Clear water with some movement is ideal; big swell pushes them deeper.", "distance_depth": "Deep reefs and wrecks 20–120 m; vertical jigging or long casts down-tide.", "restrictions": "Local size/bag rules vary; many anglers release larger breeders.", "authority": "Norway Fiskeridirektoratet; UK/NL/DE national agencies."}}'::jsonb,
    'Always around dawn/dusk; overcast days fish well with lures. Not into cold shoulders — only metal jigs.',
    4
);


-- Saithe/Pollock (Saithe/Pollock)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'sai',
    'Saithe/Pollock',
    'Saithe/Pollock',
    '{"shore": {"regions": "North Sea, Norwegian waters", "best_time": "Dawn/dusk; overcast days with lures.", "tide_sensitivity": "Moderate; hunts on current edges around structure.", "baits_diet": "Metals, soft plastics, sandeel/mackerel strip; eats small fish.", "temperature_effect": "Active in cool–mild water; heat or deep winter slows.", "weather_effect": "Clear water with some movement ideal; big swell pushes them deeper.", "distance_depth": "Kelp fringes, reefs, wrecks 5–80 m. (shore accessible range)", "restrictions": "Local size/bag rules; some areas encourage releasing larger breeders.", "authority": "Norway Fiskeridirektoratet; UK/NL/DE national agencies."}, "boat": {"regions": "North Sea, Norwegian waters", "best_time": "Dawn/dusk; overcast days with lures.", "tide_sensitivity": "Moderate; hunts on current edges around structure.", "baits_diet": "Metals, soft plastics, sandeel/mackerel strip; eats small fish.", "temperature_effect": "Active in cool–mild water; heat or deep winter slows.", "weather_effect": "Clear water with some movement ideal; big swell pushes them deeper.", "distance_depth": "Kelp fringes, reefs, wrecks 5–80 m. (boat marks deeper/offshore)", "restrictions": "Local size/bag rules; some areas encourage releasing larger breeders.", "authority": "Norway Fiskeridirektoratet; UK/NL/DE national agencies."}}'::jsonb,
    'Catch me dawn/dusk; overcast days with lures. Big on group dates, especially with metals.',
    4
);


-- Sand Eel (Ammodytes tobianus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'san',
    'Ammodytes tobianus',
    'Sand Eel',
    '{"shore": {"regions": "North Atlantic, North Sea", "best_time": "Daylight and dusk when shoals move along the beach; night with lights in some harbours.", "tide_sensitivity": "Low–moderate; moving water helps shoals hug the shore.", "baits_diet": "Tiny sabiki or small hooks; feeds on plankton and tiny crustaceans.", "temperature_effect": "Prefers cooler to mild water; summer brings inshore shoals.", "weather_effect": "Settled weather gathers shoals; heavy surf scatters them.", "distance_depth": "Surf edges and shallow sandbars 0–10 m; harbour lights on calm nights.", "restrictions": "Often gathered as bait; local rules may restrict netting or livebait transfer—check locally.", "authority": "UK IFCA/MMO; North Sea national agencies."}, "boat": {"regions": "North Atlantic, North Sea", "best_time": "Daylight and dusk when shoals move along the beach; night with lights in some harbours.", "tide_sensitivity": "Low–moderate; moving water helps shoals hug the shore.", "baits_diet": "Tiny sabiki or small hooks; feeds on plankton and tiny crustaceans.", "temperature_effect": "Prefers cooler to mild water; summer brings inshore shoals.", "weather_effect": "Settled weather gathers shoals; heavy surf scatters them.", "distance_depth": "Nearshore shoals and shallow banks 5–30 m; small-boat drifts find bigger launce.", "restrictions": "Often gathered as bait; local rules may restrict netting or livebait transfer—check locally.", "authority": "UK IFCA/MMO; North Sea national agencies."}}'::jsonb,
    'Love a moonlit dinner daylight and dusk when shoals move along the beach; night with lights in some harbours. Just add tiny sabiki or small',
    3
);


-- Sardine (Sardina pilchardus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'pil',
    'Sardina pilchardus',
    'Sardine',
    '{"shore": {"regions": "Atlantic, Mediterranean", "best_time": "𐄳 (Bait fish) Night under lights; dawn when bait shoals push in.", "tide_sensitivity": "Low; moving water helps schooling behaviour.", "baits_diet": "Tiny sabiki; plankton feeder.", "temperature_effect": "Warmer‑water coastal; moves offshore in cold.", "weather_effect": "Settled weather aggregates shoals; storms disperse.", "distance_depth": "Surface–midwater 0–40 m near ports/bays. (shore accessible range)", "restrictions": "Commercial controls common; recreational limits vary—check locally. Primarily a bait species; check local rules on gathering/using live/fresh bait.", "authority": "Spain/Portugal DGRM/MAPA; France OFB."}, "boat": {"regions": "Atlantic, Mediterranean", "best_time": "𐄳 (Bait fish) Night under lights; dawn when bait shoals push in.", "tide_sensitivity": "Low; moving water helps schooling behaviour.", "baits_diet": "Tiny sabiki; plankton feeder.", "temperature_effect": "Warmer‑water coastal; moves offshore in cold.", "weather_effect": "Settled weather aggregates shoals; storms disperse.", "distance_depth": "Surface–midwater 0–40 m near ports/bays. (boat marks deeper/offshore)", "restrictions": "Commercial controls common; recreational limits vary—check locally. Primarily a bait species; check local rules on gathering/using live/fresh bait.", "authority": "Spain/Portugal DGRM/MAPA; France OFB."}}'::jsonb,
    'Always around 𐄳 (bait fish) night under lights; dawn when bait shoals push in. Not into cold shoulders — only tiny sabiki; plankton feeder..',
    4
);


-- Sea Bass (Dicentrarchus labrax)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'bss',
    'Dicentrarchus labrax',
    'Sea Bass',
    '{"shore": {"regions": "Atlantic, Mediterranean, North Sea", "best_time": "Dawn/dusk; warm months. Night over clean surf or estuary edges in summer.", "tide_sensitivity": "Strong; best on flooding (mid–late flood) and first of the ebb around structure.", "baits_diet": "Crab, rag/lugworm, sandeel, small fish; hunts sprats, prawns, shore crabs.", "temperature_effect": "Active ≥12–13 °C; slows in cold spells; peak June–Oct in many regions.", "weather_effect": "Feeds after onshore blow that stirs crabs/sandeels; too much swell/silt reduces success.", "distance_depth": "Surf lines, estuaries, rocky headlands; 1–10 m; often within casting range.", "restrictions": "Bag limits & seasonal rules common; typical EU/UK MLS ~42 cm—verify locally.", "authority": "Check national authority (e.g., UK IFCA/MMO; Ireland SFPA; Spain MAPA; France OFB)."}, "boat": {"regions": "Atlantic, Mediterranean, North Sea", "best_time": "Dawn/dusk; warm months. Night over clean surf or estuary edges in summer.", "tide_sensitivity": "Strong; best on flooding (mid–late flood) and first of the ebb around structure.", "baits_diet": "Crab, rag/lugworm, sandeel, small fish; hunts sprats, prawns, shore crabs.", "temperature_effect": "Active ≥12–13 °C; slows in cold spells; peak June–Oct in many regions.", "weather_effect": "Feeds after onshore blow that stirs crabs/sandeels; too much swell/silt reduces success.", "distance_depth": "Deeper reefs and wrecks 10–30 m offshore; drift fishing productive.", "restrictions": "Bag limits & seasonal rules common; typical EU/UK MLS ~42 cm—verify locally.", "authority": "Check national authority (e.g., UK IFCA/MMO; Ireland SFPA; Spain MAPA; France OFB)."}}'::jsonb,
    'Always around dawn/dusk; warm months. Not into cold shoulders — only crab.',
    5
);


-- Sea Bream (Dorada) (Sparus aurata)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'sba',
    'Sparus aurata',
    'Sea Bream (Dorada)',
    '{"shore": {"regions": "Mediterranean, Southern Atlantic", "best_time": "Dawn/dusk; warm months. Night over beaches/estuaries.", "tide_sensitivity": "Strong; mid‑flood around bars/holes excellent.", "baits_diet": "Crab, prawn, mussel; cracks shellfish with strong molars.", "temperature_effect": "Prefers ≥15 °C; sluggish in cold snaps.", "weather_effect": "Light onshore chop good; heavy surf reduces bites.", "distance_depth": "Beaches/estuaries/rocky reefs; 2–30 m. (shore accessible range)", "restrictions": "Common MLS & bag limits; check local regs.", "authority": "Spain MAPA/CCAA; Portugal DGRM; Italy MIPAAF."}, "boat": {"regions": "Mediterranean, Southern Atlantic", "best_time": "Dawn/dusk; warm months. Night over beaches/estuaries.", "tide_sensitivity": "Strong; mid‑flood around bars/holes excellent.", "baits_diet": "Crab, prawn, mussel; cracks shellfish with strong molars.", "temperature_effect": "Prefers ≥15 °C; sluggish in cold snaps.", "weather_effect": "Light onshore chop good; heavy surf reduces bites.", "distance_depth": "Beaches/estuaries/rocky reefs; 2–30 m. (boat marks deeper/offshore)", "restrictions": "Common MLS & bag limits; check local regs.", "authority": "Spain MAPA/CCAA; Portugal DGRM; Italy MIPAAF."}}'::jsonb,
    'I’m most active dawn/dusk; warm months. Bring crab and let’s make it a date.',
    5
);


-- Sea Trout (Salmo trutta)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'trs',
    'Salmo trutta',
    'Sea Trout',
    '{"shore": {"regions": "Atlantic, North Sea, Baltic", "best_time": "Dawn/dusk; at night in clear, calm conditions; spring/autumn coastal runs.", "tide_sensitivity": "Moderate; moving water around points/bars best.", "baits_diet": "Spinners, spoons, flies (sandeel, shrimp patterns); eats sandeels/shrimps.", "temperature_effect": "Cool–mild water best (5–14 °C); hot bright days are tough.", "weather_effect": "Overcast with light onshore breeze ideal; after storm a settling day fishes well.", "distance_depth": "Very close to surf edges, drop‑offs, river mouths; 0–3 m.", "restrictions": "Highly regulated: seasons, bag limits, river/coastal distinctions—check carefully.", "authority": "Baltic/Nordic agencies (e.g., Denmark, Sweden), UK/IE fisheries bodies."}, "boat": {"regions": "Atlantic, North Sea, Baltic", "best_time": "Dawn/dusk; at night in clear, calm conditions; spring/autumn coastal runs.", "tide_sensitivity": "Moderate; moving water around points/bars best.", "baits_diet": "Spinners, spoons, flies (sandeel, shrimp patterns); eats sandeels/shrimps.", "temperature_effect": "Cool–mild water best (5–14 °C); hot bright days are tough.", "weather_effect": "Overcast with light onshore breeze ideal; after storm a settling day fishes well.", "distance_depth": "Less targeted by boat; trolling near shorelines 3–10 m depth.", "restrictions": "Highly regulated: seasons, bag limits, river/coastal distinctions—check carefully.", "authority": "Baltic/Nordic agencies (e.g., Denmark, Sweden), UK/IE fisheries bodies."}}'::jsonb,
    'Love a moonlit dinner dawn/dusk; at night in clear, calm conditions; spring/autumn coastal runs. Just add spinners.',
    5
);


-- Small-spotted Catshark (Scyliorhinus canicula)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'scy',
    'Scyliorhinus canicula',
    'Small-spotted Catshark',
    '{"shore": {"regions": "Atlantic, North Sea", "best_time": "Night", "tide_sensitivity": "Not tide sensitive", "baits_diet": "Smelly fish/squid baits; scavenger", "temperature_effect": "Active in wide temp range", "weather_effect": "Feeds happily in coloured post-storm water", "distance_depth": "Surf beaches, estuaries 5–20m", "restrictions": "Generally no restrictions; often released", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, North Sea", "best_time": "Night", "tide_sensitivity": "Not tide sensitive", "baits_diet": "Smelly fish/squid baits; scavenger", "temperature_effect": "Active in wide temp range", "weather_effect": "Feeds happily in coloured post-storm water", "distance_depth": "Sandy/mud seabeds 20–100m", "restrictions": "Generally no restrictions; often released", "authority": "National fisheries agencies"}}'::jsonb,
    'I’m most active night. Bring smelly fish/squid baits; scavenger and let’s make it a date.',
    3
);


-- Spotted Bass (Dicentrarchus punctatus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'bsp',
    'Dicentrarchus punctatus',
    'Spotted Bass',
    '{"shore": {"regions": "Mediterranean, Atlantic Iberia", "best_time": "Dawn/dusk; warm months and at night over quiet beaches.", "tide_sensitivity": "Moderate–strong; loves a push of tide around bars and holes.", "baits_diet": "Crabs, prawns, mussels, sandeel and small fish; takes small lures readily.", "temperature_effect": "More active from ~15 °C upwards; sluggish in cold snaps.", "weather_effect": "Light onshore chop is friendly; heavy surf knocks them off the feed.", "distance_depth": "Small surf beaches, estuary mouths and rocky points 1–10 m.", "restrictions": "Often shares protections with European sea bass—check local rules.", "authority": "Spain MAPA/CCAA; Portugal DGRM; France OFB."}, "boat": {"regions": "Mediterranean, Atlantic Iberia", "best_time": "Dawn/dusk; warm months and at night over quiet beaches.", "tide_sensitivity": "Moderate–strong; loves a push of tide around bars and holes.", "baits_diet": "Crabs, prawns, mussels, sandeel and small fish; takes small lures readily.", "temperature_effect": "More active from ~15 °C upwards; sluggish in cold snaps.", "weather_effect": "Light onshore chop is friendly; heavy surf knocks them off the feed.", "distance_depth": "Reefs and inshore banks 5–25 m; light-boat lure fishing shines.", "restrictions": "Often shares protections with European sea bass—check local rules.", "authority": "Spain MAPA/CCAA; Portugal DGRM; France OFB."}}'::jsonb,
    'I’m most active dawn/dusk; warm months and at night over quiet beaches. Bring crabs and let’s make it a date.',
    4
);


-- Sprat (Sprattus sprattus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'spr',
    'Sprattus sprattus',
    'Sprat',
    '{"shore": {"regions": "Baltic, North Sea", "best_time": "𐄳 (Bait fish) Night under lights; winter harbours.", "tide_sensitivity": "Low; congregates where plankton concentrates.", "baits_diet": "Very fine sabiki; plankton feeder.", "temperature_effect": "Prefers cool waters; winter inshore.", "weather_effect": "Calm, clear nights best; storm murky water disperses.", "distance_depth": "Surface shoals 0–30 m in bays/ports. (shore accessible range)", "restrictions": "Often regulated with seasonal closures—check locally. Primarily a bait species; check local rules on gathering/using live/fresh bait.", "authority": "Baltic national agencies; port by‑laws."}, "boat": {"regions": "Baltic, North Sea", "best_time": "𐄳 (Bait fish) Night under lights; winter harbours.", "tide_sensitivity": "Low; congregates where plankton concentrates.", "baits_diet": "Very fine sabiki; plankton feeder.", "temperature_effect": "Prefers cool waters; winter inshore.", "weather_effect": "Calm, clear nights best; storm murky water disperses.", "distance_depth": "Surface shoals 0–30 m in bays/ports. (boat marks deeper/offshore)", "restrictions": "Often regulated with seasonal closures—check locally. Primarily a bait species; check local rules on gathering/using live/fresh bait.", "authority": "Baltic national agencies; port by‑laws."}}'::jsonb,
    'Looking for someone who gets me 𐄳 (bait fish) night under lights; winter harbours. Bonus points if you’ve got very fine sabiki; plankton fee',
    4
);


-- Thornback Ray (Raja clavata)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'rjc',
    'Raja clavata',
    'Thornback Ray',
    '{"shore": {"regions": "Atlantic, North Sea", "best_time": "Dusk/night with moving tide", "tide_sensitivity": "Strong tidal run improves feeding", "baits_diet": "Whole squid, mackerel, sandeel; small fish/crustaceans", "temperature_effect": "Prefers mild–warm water; sluggish in cold", "weather_effect": "Feeds well after mild storms stirring prey", "distance_depth": "Sandy bays 5–20m", "restrictions": "Size/bag restrictions in some countries", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, North Sea", "best_time": "Dusk/night with moving tide", "tide_sensitivity": "Strong tidal run improves feeding", "baits_diet": "Whole squid, mackerel, sandeel; small fish/crustaceans", "temperature_effect": "Prefers mild–warm water; sluggish in cold", "weather_effect": "Feeds well after mild storms stirring prey", "distance_depth": "Deeper sands/channels 20–60m", "restrictions": "Size/bag restrictions in some countries", "authority": "National fisheries agencies"}}'::jsonb,
    'Always around dusk/night with moving tide. Not into cold shoulders — only whole squid.',
    4
);


-- Tub Gurnard (Chelidonichthys lucerna)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'gug',
    'Chelidonichthys lucerna',
    'Tub Gurnard',
    '{"shore": {"regions": "Atlantic, Mediterranean", "best_time": "Daytime", "tide_sensitivity": "Moderate; over sandy/mixed ground", "baits_diet": "Small fish, shrimp, crab; hunts on seabed", "temperature_effect": "Feeds in warmer seas; less in cold winters", "weather_effect": "Feeds well in moderate chop", "distance_depth": "Shallows 5–15m", "restrictions": "MLS varies; often kept for food", "authority": "National fisheries agencies"}, "boat": {"regions": "Atlantic, Mediterranean", "best_time": "Daytime", "tide_sensitivity": "Moderate; over sandy/mixed ground", "baits_diet": "Small fish, shrimp, crab; hunts on seabed", "temperature_effect": "Feeds in warmer seas; less in cold winters", "weather_effect": "Feeds well in moderate chop", "distance_depth": "Boat drifts 20–60m over sand/mud", "restrictions": "MLS varies; often kept for food", "authority": "National fisheries agencies"}}'::jsonb,
    'Always around daytime. Not into cold shoulders — only small fish.',
    4
);


-- Turbot (Small) (Scophthalmus maximus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'tur',
    'Scophthalmus maximus',
    'Turbot (Small)',
    '{"shore": {"regions": "North Sea, Atlantic", "best_time": "Dawn/dusk drifts over sandbanks.", "tide_sensitivity": "Moderate; moving water over drop-offs and sandbanks best.", "baits_diet": "Whole sandeel, fish strips; ambush predator.", "temperature_effect": "Active spring–autumn; slows in very cold water.", "weather_effect": "Slight chop good; heavy surf buries baits.", "distance_depth": "Sandbanks 10–70 m; often just off beaches. (shore accessible range)", "restrictions": "Strict MLS & protections—release undersized (‘small’) fish.", "authority": "North Sea national agencies; UK IFCA/MMO; NL/DE authorities."}, "boat": {"regions": "North Sea, Atlantic", "best_time": "Dawn/dusk drifts over sandbanks.", "tide_sensitivity": "Moderate; moving water over drop-offs and sandbanks best.", "baits_diet": "Whole sandeel, fish strips; ambush predator.", "temperature_effect": "Active spring–autumn; slows in very cold water.", "weather_effect": "Slight chop good; heavy surf buries baits.", "distance_depth": "Sandbanks 10–70 m; often just off beaches. (boat marks deeper/offshore)", "restrictions": "Strict MLS & protections—release undersized (‘small’) fish.", "authority": "North Sea national agencies; UK IFCA/MMO; NL/DE authorities."}}'::jsonb,
    'Looking for someone who gets me dawn/dusk drifts over sandbanks. Bonus points if you’ve got whole sandeel.',
    5
);


-- Whiting (Merlangius merlangus)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'whg',
    'Merlangius merlangus',
    'Whiting',
    '{"shore": {"regions": "North Sea, Atlantic", "best_time": "Night & low‑light; peaks in colder months inshore.", "tide_sensitivity": "Moderate–strong; likes run over sand/mixed ground.", "baits_diet": "Small strips of mackerel/squid, worms; eats shrimp/small fish.", "temperature_effect": "Cool‑water oriented; less activity in heat.", "weather_effect": "Best in settled or light chop; heavy surf scatters shoals.", "distance_depth": "Inshore 5–50 m over sand/mixed. (shore accessible range)", "restrictions": "MLS and bag rules vary—verify locally.", "authority": "National fisheries websites (e.g., UK IFCA/MMO; Ireland SFPA)."}, "boat": {"regions": "North Sea, Atlantic", "best_time": "Night & low‑light; peaks in colder months inshore.", "tide_sensitivity": "Moderate–strong; likes run over sand/mixed ground.", "baits_diet": "Small strips of mackerel/squid, worms; eats shrimp/small fish.", "temperature_effect": "Cool‑water oriented; less activity in heat.", "weather_effect": "Best in settled or light chop; heavy surf scatters shoals.", "distance_depth": "Inshore 5–50 m over sand/mixed. (boat marks deeper/offshore)", "restrictions": "MLS and bag rules vary—verify locally.", "authority": "National fisheries websites (e.g., UK IFCA/MMO; Ireland SFPA)."}}'::jsonb,
    'I’m most active night & low‑light; peaks in colder months inshore. Bring small strips of mackerel/squid and let’s make it a date.',
    4
);


-- Wrasse (various) (Labridae spp.)
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    advice,
    playful_bio_en,
    eating_quality
) VALUES (
    'wra',
    'Labridae spp.',
    'Wrasse (various)',
    '{"shore": {"regions": "Atlantic, North Sea, Mediterranean", "best_time": "Daylight, especially flood tide over kelp/rocks.", "tide_sensitivity": "Moderate; feeds as crabs/prawns move with tide.", "baits_diet": "Crab, prawn, shellfish; picks in kelp/rock crevices.", "temperature_effect": "Best in mild–warm water; lethargic in winter.", "weather_effect": "Clear water preferable; heavy swell pushes them tight to cover.", "distance_depth": "Rocky kelp ground 2–20 m; very close to shore. (shore accessible range)", "restrictions": "Conservation measures in some regions (wrasse for aquaculture); many anglers practise C&R.", "authority": "Regional conservation/fisheries bodies (e.g., UK IFCAs; Norway Fiskeridirektoratet)."}, "boat": {"regions": "Atlantic, North Sea, Mediterranean", "best_time": "Daylight, especially flood tide over kelp/rocks.", "tide_sensitivity": "Moderate; feeds as crabs/prawns move with tide.", "baits_diet": "Crab, prawn, shellfish; picks in kelp/rock crevices.", "temperature_effect": "Best in mild–warm water; lethargic in winter.", "weather_effect": "Clear water preferable; heavy swell pushes them tight to cover.", "distance_depth": "Rocky kelp ground 2–20 m; very close to shore. (boat marks deeper/offshore)", "restrictions": "Conservation measures in some regions (wrasse for aquaculture); many anglers practise C&R.", "authority": "Regional conservation/fisheries bodies (e.g., UK IFCAs; Norway Fiskeridirektoratet)."}}'::jsonb,
    'Love a moonlit dinner daylight, especially flood tide over kelp/rocks. Just add crab.',
    3
);


-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Commit transaction
COMMIT;

-- Populate species name aliases
INSERT INTO species_name_alias (name_en_alias, scientific_name) VALUES
    ('Sole', 'Solea solea'),
    ('Dover Sole', 'Solea solea'),
    ('Common Sole', 'Solea solea'),
    ('Pollock', 'Pollachius pollachius'),
    ('Pollack', 'Pollachius pollachius'),
    ('Saithe', 'Pollachius virens'),
    ('Saithe/Pollock', 'Pollachius virens'),
    ('Coalfish', 'Pollachius virens'),
    ('Atlantic Mackerel', 'Scomber scombrus'),
    ('European Sea Bass', 'Dicentrarchus labrax'),
    ('Bass', 'Dicentrarchus labrax'),
    ('Scad', 'Trachurus trachurus'),
    ('Gilthead Seabream', 'Sparus aurata')

ON CONFLICT (name_en_alias) DO NOTHING;