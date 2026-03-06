-- Plant species data corrections based on horticultural expert review
-- Fixes: safety-critical poisonous/edibility flags, taxonomy, calendar, rotation groups,
--        growing conditions, and removes empty shell duplicates.
-- Date: 2026-03-06

BEGIN;

-- ============================================================================
-- SECTION 1: SAFETY-CRITICAL — Poisonous flags (wrong or missing)
-- ============================================================================

-- Sour cherry: fruit is safe to eat; only pits/leaves contain cyanogenic glycosides
UPDATE plant_species SET
  poisonous_to_humans = 0,
  poisonous_to_pets = 0
WHERE slug = 'fruit-cherry-sour';

-- Parsnip: common food crop; sap causes photodermatitis but root is safe
UPDATE plant_species SET
  poisonous_to_humans = 0,
  poisonous_to_pets = 0
WHERE slug = 'parsnip';

-- Hellebore: all parts toxic (protoanemonin, glycosides)
UPDATE plant_species SET
  poisonous_to_humans = 2,
  poisonous_to_pets = 2
WHERE slug = 'helleborus';

-- Iris: rhizomes and leaves mildly toxic
UPDATE plant_species SET
  poisonous_to_humans = 1,
  poisonous_to_pets = 1
WHERE slug = 'iris';

-- Bleeding heart: contains isoquinoline alkaloids
UPDATE plant_species SET
  poisonous_to_humans = 2,
  poisonous_to_pets = 2
WHERE slug = 'bleeding-heart';

-- Daylily: highly toxic to cats (fatal kidney failure)
UPDATE plant_species SET
  poisonous_to_pets = 3
WHERE slug = 'daylily';

-- Hosta: contains saponins, toxic to dogs and cats
UPDATE plant_species SET
  poisonous_to_pets = 2
WHERE slug = 'hosta';

-- Holly: berries poisonous to humans
UPDATE plant_species SET
  poisonous_to_humans = 2
WHERE slug = 'tree-holly';

-- Sweet pea: seeds contain lathyrogens
UPDATE plant_species SET
  poisonous_to_humans = 2,
  poisonous_to_pets = 2
WHERE slug = 'sweet-pea';

-- Asclepias (milkweed): cardiac glycosides
UPDATE plant_species SET
  poisonous_to_humans = 2,
  poisonous_to_pets = 2
WHERE slug = 'asclepias';

-- Honeysuckle: berries mildly toxic
UPDATE plant_species SET
  poisonous_to_humans = 1
WHERE slug = 'climbing-honeysuckle';

-- Wormwood: contains thujone, toxic — fix both entries
UPDATE plant_species SET
  poisonous_to_humans = 2,
  poisonous_to_pets = 1
WHERE slug IN ('herb-wormwood', 'wormwood');

-- ============================================================================
-- SECTION 2: SAFETY-CRITICAL — Wrong edible_fruit / edible_leaf flags
-- ============================================================================

-- Fruits incorrectly marked as inedible (edible_fruit defaulted to false)
UPDATE plant_species SET edible_fruit = true
WHERE slug IN (
  'fruit-cherry-sour',
  'fruit-cherry-sweet',
  'fruit-plum',
  'fruit-gage',
  'fruit-mirabelle',
  'fruit-elder',            -- edible when cooked
  'fruit-serviceberry',
  'fruit-saskatoon',
  'fruit-hackberry',
  'fruit-walnut',
  'fruit-black-walnut',
  'fruit-hazelnut',
  'fruit-sweet-chestnut',
  'fruit-juniper-berry',
  'fruit-mountain-ash',     -- edible when cooked
  'fruit-quandong',
  'fruit-hybrid-shipova',
  'fruit-hardy-kiwi',
  'grape-vine',
  'kiwi-hardy',
  'kiwi-common',
  'passionflower',
  'schisandra',
  'hop-common',
  'akebia'
);

-- London plane: fruits are NOT edible
UPDATE plant_species SET edible_fruit = false
WHERE slug = 'plane-london';

-- Leaves incorrectly marked as edible
UPDATE plant_species SET edible_leaf = false
WHERE slug IN (
  'tree-alder-common',
  'fruit-damson',       -- Prunus leaves contain cyanogenic glycosides
  'fruit-nectarine',    -- Prunus leaves contain cyanogenic glycosides
  'fruit-medlar',
  'fruit-quince',
  'fruit-pear',
  'fruit-aronia',
  'fruit-pawpaw',       -- contains acetogenins
  'fruit-loquat',
  'fruit-fig'           -- sap/leaves contain ficin, can cause irritation
);

-- ============================================================================
-- SECTION 3: TAXONOMY — Wrong genus / scientific name
-- ============================================================================

-- Orange: was mapped to Malus (apple) — correct to Citrus
UPDATE plant_species SET
  genus = 'Citrus',
  scientific_name = 'Citrus x sinensis',
  perenual_id = NULL,
  perenual_common_name = NULL,
  perenual_scientific_name = NULL,
  perenual_raw_response = NULL
WHERE slug = 'fruit-orange';

-- Plum: genus was Ceratostigma (leadwort!) — correct to Prunus
UPDATE plant_species SET
  genus = 'Prunus'
WHERE slug = 'fruit-plum';

-- Chinese haw: genus was Photinia — correct to Crataegus
UPDATE plant_species SET
  genus = 'Crataegus'
WHERE slug = 'fruit-chinese-haw';

-- Sweet chestnut: missing scientific name
UPDATE plant_species SET
  scientific_name = 'Castanea sativa'
WHERE slug = 'tree-sweet-chestnut'
  AND (scientific_name IS NULL OR scientific_name = '');

-- Lemon verbena: fix spelling (citrodora -> citriodora)
UPDATE plant_species SET
  scientific_name = 'Aloysia citriodora'
WHERE slug = 'herb-lemon-verbena';

-- Cherimoya: clear wrong Perenual data (was mapped to soursop)
UPDATE plant_species SET
  perenual_id = NULL,
  perenual_common_name = NULL,
  perenual_scientific_name = NULL,
  perenual_raw_response = NULL
WHERE slug = 'fruit-cherimoya';

-- Oak slug/name mismatch: slug says burr, name/scientific says sessile — fix slug to match data
-- (Quercus petraea = sessile oak, keeping the existing data and fixing the slug)
UPDATE plant_species SET
  slug = 'tree-oak-sessile'
WHERE slug = 'tree-oak-burr'
  AND scientific_name = 'Quercus petraea';

-- ============================================================================
-- SECTION 4: PRUNING — Prunus species must be summer-pruned (silver leaf risk)
-- ============================================================================

UPDATE plant_species SET
  pruning_months = '["6","7","8"]'::jsonb
WHERE slug = 'fruit-plum';

UPDATE plant_species SET
  pruning_months = '["6","7","8"]'::jsonb
WHERE slug = 'fruit-damson';

UPDATE plant_species SET
  pruning_months = '["7","8"]'::jsonb
WHERE slug = 'fruit-apricot';

UPDATE plant_species SET
  pruning_months = '["7","8","9"]'::jsonb
WHERE slug = 'fruit-cherry-sour';

UPDATE plant_species SET
  pruning_months = '["6","7","8"]'::jsonb
WHERE slug IN ('fruit-nectarine', 'fruit-gage', 'fruit-mirabelle');

-- Missing pruning months for other species
UPDATE plant_species SET pruning_months = '["2","3"]'::jsonb
WHERE slug = 'fruit-elder' AND (pruning_months IS NULL OR pruning_months = '[]'::jsonb);

UPDATE plant_species SET pruning_months = '["1","2"]'::jsonb
WHERE slug = 'fruit-hazelnut' AND (pruning_months IS NULL OR pruning_months = '[]'::jsonb);

UPDATE plant_species SET pruning_months = '["7","8"]'::jsonb
WHERE slug IN ('fruit-walnut', 'fruit-black-walnut')
  AND (pruning_months IS NULL OR pruning_months = '[]'::jsonb);

UPDATE plant_species SET pruning_months = '["1","2","7","8"]'::jsonb
WHERE slug = 'fruit-hardy-kiwi' AND (pruning_months IS NULL OR pruning_months = '[]'::jsonb);

-- ============================================================================
-- SECTION 5: CALENDAR — Sow / harvest month corrections for UK/Ireland
-- ============================================================================

-- Broad bean / fava bean: add autumn sowing (Oct/Nov) and February
UPDATE plant_species SET
  sow_months = '["2","3","4","5","10","11"]'::jsonb
WHERE slug IN ('broad-bean', 'fava-bean');

-- Garlic: extend planting window
UPDATE plant_species SET
  sow_months = '["10","11","12","1","2"]'::jsonb
WHERE slug = 'garlic';

-- Peas: can sow from Feb under cloches, succession through July
UPDATE plant_species SET
  sow_months = '["2","3","4","5","6","7"]'::jsonb
WHERE slug = 'pea';

-- Runner bean: not March in UK (too cold), harvest from July not June
UPDATE plant_species SET
  sow_months = '["4","5","6"]'::jsonb,
  harvest_months = '["7","8","9","10"]'::jsonb
WHERE slug = 'runner-bean';

-- French bean: April earliest, harvest from July
UPDATE plant_species SET
  sow_months = '["4","5","6","7"]'::jsonb,
  harvest_months = '["7","8","9","10"]'::jsonb
WHERE slug = 'french-bean';

-- Chilli peppers: benefit from January sowing in UK
UPDATE plant_species SET
  sow_months = '["1","2","3"]'::jsonb
WHERE slug = 'pepper-chilli';

-- Leek: winter veg, harvested autumn through spring
UPDATE plant_species SET
  harvest_months = '["9","10","11","12","1","2","3"]'::jsonb
WHERE slug = 'leek';

-- Spring onion: harvestable from May
UPDATE plant_species SET
  harvest_months = '["5","6","7","8","9","10"]'::jsonb
WHERE slug = 'spring-onion';

-- Bare-root currant/gooseberry planting months
UPDATE plant_species SET
  planting_months = '["10","11","12","1","2","3"]'::jsonb
WHERE slug IN ('fruit-currant', 'fruit-gooseberry', 'fruit-blackcurrant')
  AND (planting_months IS NULL OR planting_months = '[]'::jsonb);

-- ============================================================================
-- SECTION 6: HERB HARVEST MONTHS (systematic gap — ~28 herbs missing)
-- ============================================================================

-- Perennial herbs with long harvest windows
UPDATE plant_species SET harvest_months = '["1","2","3","4","5","6","7","8","9","10","11","12"]'::jsonb
WHERE slug IN ('herb-rosemary', 'herb-bay-laurel')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["4","5","6","7","8","9","10"]'::jsonb
WHERE slug IN ('herb-thyme-common', 'herb-sorrel-common', 'herb-lemon-balm', 'herb-savoury-winter')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["5","6","7","8","9","10"]'::jsonb
WHERE slug IN ('herb-sage-common', 'herb-sage-purple')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["5","6","7","8","9"]'::jsonb
WHERE slug IN ('herb-tarragon-french', 'herb-coriander-leaf')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["3","4","5","6","7","8","9","10"]'::jsonb
WHERE slug = 'herb-chives-common'
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["4","5","6","7","8","9"]'::jsonb
WHERE slug = 'herb-lovage'
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["4","5","6","7","8","9","10"]'::jsonb
WHERE slug IN ('herb-mint-spearmint', 'herb-mint-peppermint')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["6","7","8","9"]'::jsonb
WHERE slug IN ('herb-oregano', 'herb-dill-leaf', 'herb-borage')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["4","5","6","7","8","9","10","11"]'::jsonb
WHERE slug IN ('herb-parsley-flat', 'herb-parsley-curly')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["6","7","8","9","10"]'::jsonb
WHERE slug IN ('herb-fennel-leaf', 'herb-calendula')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["7","8","9"]'::jsonb
WHERE slug IN ('herb-basil-sweet', 'herb-basil-thai', 'herb-basil-greek', 'herb-holy-basil', 'herb-savoury-summer')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["5","6","7","8","9"]'::jsonb
WHERE slug = 'herb-chervil'
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

UPDATE plant_species SET harvest_months = '["6","7","8","9"]'::jsonb
WHERE slug IN ('herb-marjoram-sweet', 'herb-chamomile-german', 'herb-chamomile-roman')
  AND (harvest_months IS NULL OR harvest_months = '[]'::jsonb);

-- ============================================================================
-- SECTION 7: GROWING CONDITIONS — Zones, sun, frost, min_temp
-- ============================================================================

-- Basil varieties: zone_min too high — these are grown as annuals everywhere
UPDATE plant_species SET usda_zone_min = 2
WHERE slug IN ('herb-basil-sweet', 'herb-basil-thai', 'herb-basil-greek');

UPDATE plant_species SET usda_zone_min = 2
WHERE slug = 'herb-holy-basil';

-- Snapdragon: hardy to zone 4
UPDATE plant_species SET usda_zone_min = 4
WHERE slug = 'snapdragon';

-- Medlar: hardy to zone 5
UPDATE plant_species SET usda_zone_min = 5
WHERE slug = 'fruit-medlar';

-- Coriander: tolerates light frost
UPDATE plant_species SET
  frost_tolerance = 'half_hardy',
  min_temp_c = -5
WHERE slug = 'coriander';

-- Sun requirements corrections
UPDATE plant_species SET sun_requirements = 'Full sun to partial shade'
WHERE slug IN ('fruit-elder', 'fruit-aronia', 'fruit-serviceberry');

UPDATE plant_species SET sun_requirements = 'Partial shade to full sun'
WHERE slug = 'fruit-pawpaw';

-- min_temp_c corrections: 10C is growth minimum, not survival minimum
-- These tender plants die at frost (0-1C), not at 10C
UPDATE plant_species SET min_temp_c = 1
WHERE slug IN ('courgette', 'cucumber', 'pumpkin', 'watermelon', 'aubergine', 'pepper')
  AND min_temp_c = 10;

-- Potato: foliage killed at 0C, tubers survive to about -2C
UPDATE plant_species SET min_temp_c = -2
WHERE slug = 'potato' AND min_temp_c = -5;

-- ============================================================================
-- SECTION 8: ROTATION GROUPS — Fix non_rotating defaults
-- ============================================================================

-- Legumes
UPDATE plant_species SET rotation_group = 'legume'
WHERE slug IN (
  'fava-bean', 'scarlet-runner-bean', 'french-bean',
  'pea', 'peas-snap', 'peas-snow',
  'cowpea-blackeye', 'lima-bean'
) AND rotation_group = 'non_rotating';

-- Alliums
UPDATE plant_species SET rotation_group = 'root_allium'
WHERE slug IN ('shallot', 'multiplier-onion', 'leek')
  AND rotation_group = 'non_rotating';

-- Cucurbits
UPDATE plant_species SET rotation_group = 'cucurbit'
WHERE slug IN ('cucumber', 'melon-cantaloupe', 'squash-yellow', 'squash-pattypan', 'squash-spaghetti')
  AND rotation_group = 'non_rotating';

-- Solanaceae
UPDATE plant_species SET rotation_group = 'solanaceae'
WHERE slug IN ('pepper', 'pepper-sweet', 'tomato-plum', 'tomato-cherry', 'tomatillo')
  AND rotation_group = 'non_rotating';

-- Brassicas
UPDATE plant_species SET rotation_group = 'brassica'
WHERE slug IN (
  'cabbage-red', 'cabbage-green', 'cabbage-savoy',
  'sprouting-broccoli', 'romanesco',
  'kale-lacinato', 'pak-choi', 'mizuna', 'tatsoi'
) AND rotation_group = 'non_rotating';

-- Apiaceae herbs incorrectly tagged as root_allium
UPDATE plant_species SET rotation_group = 'non_rotating'
WHERE slug IN (
  'herb-angelica', 'herb-lovage', 'herb-fennel-leaf',
  'herb-chervil', 'herb-parsley-curly',
  'celery', 'celeriac', 'dill'
) AND rotation_group = 'root_allium';

-- Perennial horseradish: permanent, not rotating
UPDATE plant_species SET rotation_group = 'permanent'
WHERE slug = 'horseradish';

-- Ornamental alyssum: not really in brassica rotation
UPDATE plant_species SET rotation_group = 'non_rotating'
WHERE slug IN ('alyssum', 'alyssum-perennial')
  AND rotation_group = 'brassica';

-- ============================================================================
-- SECTION 9: CATEGORY CORRECTIONS
-- ============================================================================

UPDATE plant_species SET category = 'vegetable' WHERE slug = 'cardoon';
UPDATE plant_species SET category = 'ornamental' WHERE slug = 'californian-poppy';
UPDATE plant_species SET category = 'ornamental' WHERE slug = 'sunflower-biomass';
UPDATE plant_species SET category = 'fruit' WHERE slug = 'wild-strawberry';
UPDATE plant_species SET category = 'herb' WHERE slug IN ('dill', 'parsley', 'coriander', 'chive');

-- ============================================================================
-- SECTION 10: DAYS TO MATURITY — Wrong basis
-- ============================================================================

UPDATE plant_species SET maturity_basis = 'from_planting'
WHERE slug = 'garlic' AND maturity_basis = 'from_transplant';

UPDATE plant_species SET maturity_basis = 'from_planting'
WHERE slug = 'potato' AND maturity_basis = 'from_transplant';

-- ============================================================================
-- SECTION 11: DELETE EMPTY SHELL DUPLICATES
-- ============================================================================

DELETE FROM plant_species
WHERE slug IN (
  'tomato-slicer-solanum-lycopersicum',
  'potato-solanum-tuberosum',
  'hot-pepper-very-hot-types-capsicum-chinense',
  'plum-roma-tomato-solanum-lycopersicum',
  'pepper-capsicum-annuum'
);

COMMIT;
