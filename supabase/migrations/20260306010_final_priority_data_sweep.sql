-- =============================================================================
-- Migration: 20260306010_final_priority_data_sweep
-- Purpose:   Final sweep to fill remaining data gaps in priority order.
--            P1: days_to_maturity, rotation_group
--            P2: companions_with/companions_avoid, sun_requirements
--            P3: search_terms
-- Date:      2026-03-06
-- =============================================================================

BEGIN;

-- =============================================================================
-- P1a: DAYS TO MATURITY — fill remaining edible plants
-- Only updates where days_to_maturity_min IS NULL or 0.
-- Ornamentals, trees (non-fruit), grasses, etc. are intentionally skipped.
-- =============================================================================

-- ---------- Fruit (missing from prior migrations) ----------

-- Currant (red & white) — Ribes rubrum
-- Perennial soft fruit bush; first crop year 2, full crop year 3.
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_transplant'
WHERE slug = 'fruit-currant'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Gooseberry (fruit- prefixed slug)
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_transplant'
WHERE slug = 'fruit-gooseberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Blackcurrant (fruit- prefixed slug)
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 540,
    maturity_basis = 'from_transplant'
WHERE slug = 'fruit-blackcurrant'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Elder — fruit-tree; fruits from year 3-5 on established trees
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1460,
    maturity_basis = 'from_transplant'
WHERE slug = 'fruit-elder'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Wild strawberry — Fragaria vesca; crops from year 1
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 180,
    maturity_basis = 'from_transplant'
WHERE slug = 'wild-strawberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Medlar — fruit tree; 3-5 years to first crop
UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE slug = 'medlar'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Quince — fruit tree; 3-5 years to first crop
UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE slug = 'quince'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Mulberry — fruit tree; 3-5 years
UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE slug = 'mulberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Damson — fruit tree; 3-5 years
UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE slug = 'damson'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Tayberry — hybrid berry; fruits year 2
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 540,
    maturity_basis = 'from_transplant'
WHERE slug = 'tayberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Loganberry — hybrid berry; fruits year 2
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 540,
    maturity_basis = 'from_transplant'
WHERE slug = 'loganberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Jostaberry — hybrid currant/gooseberry; fruits year 2-3
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_transplant'
WHERE slug = 'jostaberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Cranberry — acid-loving fruit; first crop year 3
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1095,
    maturity_basis = 'from_transplant'
WHERE slug = 'cranberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Lingonberry — acid-loving; first harvest year 2-3
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1095,
    maturity_basis = 'from_transplant'
WHERE slug = 'lingonberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Goji berry — first crop year 2-3
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1095,
    maturity_basis = 'from_transplant'
WHERE slug = 'goji-berry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Honeyberry / haskap — first crop year 2-3
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1095,
    maturity_basis = 'from_transplant'
WHERE slug = 'honeyberry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Hardy kiwi (vine) — first crop year 3-5
UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE slug = 'kiwi-hardy'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Grape vine — first crop year 3-4
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1460,
    maturity_basis = 'from_transplant'
WHERE slug = 'grape-vine'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Schisandra berry (vine) — first crop year 3-5
UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE slug = 'schisandra'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Passionflower — ornamental vine but edible fruit; year 2-3
UPDATE public.plant_species
SET days_to_maturity_min = 730, days_to_maturity_max = 1095,
    maturity_basis = 'from_transplant'
WHERE slug = 'passionflower'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- ---------- Vegetable variant/duplicate slugs ----------

-- Tomato variants (same species, same maturity)
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 85,
    maturity_basis = 'from_transplant'
WHERE slug IN (
  'tomato-slicer-solanum-lycopersicum',
  'plum-roma-tomato-solanum-lycopersicum'
) AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Potato duplicate slug
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 120,
    maturity_basis = 'from_transplant'
WHERE slug = 'potato-solanum-tuberosum'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Hot pepper variant slug (very hot types)
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 150,
    maturity_basis = 'from_transplant'
WHERE slug = 'hot-pepper-very-hot-types-capsicum-chinense'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Sweet pepper variant slug
UPDATE public.plant_species
SET days_to_maturity_min = 70, days_to_maturity_max = 95,
    maturity_basis = 'from_transplant'
WHERE slug = 'pepper-capsicum-annuum'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Chayote — 120-150 days from planting
UPDATE public.plant_species
SET days_to_maturity_min = 120, days_to_maturity_max = 150,
    maturity_basis = 'from_transplant'
WHERE slug = 'chayote'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Ginger — 240-300 days from planting rhizome
UPDATE public.plant_species
SET days_to_maturity_min = 240, days_to_maturity_max = 300,
    maturity_basis = 'from_transplant'
WHERE slug = 'ginger'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Turmeric — 240-300 days from planting rhizome
UPDATE public.plant_species
SET days_to_maturity_min = 240, days_to_maturity_max = 300,
    maturity_basis = 'from_transplant'
WHERE slug = 'turmeric'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Lettuce variant slugs
UPDATE public.plant_species
SET days_to_maturity_min = 45, days_to_maturity_max = 80,
    maturity_basis = 'from_sowing'
WHERE slug IN ('lettuce-romaine', 'lettuce-butterhead', 'lettuce-iceberg', 'lettuce-looseleaf')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Cabbage variant slugs
UPDATE public.plant_species
SET days_to_maturity_min = 80, days_to_maturity_max = 180,
    maturity_basis = 'from_transplant'
WHERE slug IN ('cabbage-red', 'cabbage-green', 'cabbage-savoy')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Kale variant slugs
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_transplant'
WHERE slug IN ('kale-curly', 'kale-lacinato')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Squash variant slugs
UPDATE public.plant_species
SET days_to_maturity_min = 50, days_to_maturity_max = 70,
    maturity_basis = 'from_transplant'
WHERE slug IN ('squash-yellow', 'squash-pattypan')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Squash spaghetti — winter type, longer maturity
UPDATE public.plant_species
SET days_to_maturity_min = 85, days_to_maturity_max = 110,
    maturity_basis = 'from_transplant'
WHERE slug = 'squash-spaghetti'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Squash winter
UPDATE public.plant_species
SET days_to_maturity_min = 85, days_to_maturity_max = 110,
    maturity_basis = 'from_transplant'
WHERE slug = 'squash-winter'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Pea variant slugs
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 80,
    maturity_basis = 'from_sowing'
WHERE slug IN ('peas-garden', 'peas-snap', 'peas-snow')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Scarlet runner bean
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 75,
    maturity_basis = 'from_sowing'
WHERE slug = 'scarlet-runner-bean'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Fava bean (duplicate of broad bean)
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 120,
    maturity_basis = 'from_sowing'
WHERE slug = 'fava-bean'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Cowpea / black-eye bean — 60-90 days from sowing
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_sowing'
WHERE slug = 'cowpea-blackeye'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Lima bean — 65-90 days from sowing
UPDATE public.plant_species
SET days_to_maturity_min = 65, days_to_maturity_max = 90,
    maturity_basis = 'from_sowing'
WHERE slug = 'lima-bean'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Romanesco — similar to cauliflower, 75-100 days from transplant
UPDATE public.plant_species
SET days_to_maturity_min = 75, days_to_maturity_max = 100,
    maturity_basis = 'from_transplant'
WHERE slug = 'romanesco'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Multiplier onion — 90-120 days from planting
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 120,
    maturity_basis = 'from_transplant'
WHERE slug = 'multiplier-onion'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Horseradish — perennial; first harvest year 1 (autumn)
UPDATE public.plant_species
SET days_to_maturity_min = 150, days_to_maturity_max = 240,
    maturity_basis = 'from_transplant'
WHERE slug = 'horseradish'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Cardoon — 120-150 days from transplant
UPDATE public.plant_species
SET days_to_maturity_min = 120, days_to_maturity_max = 150,
    maturity_basis = 'from_transplant'
WHERE slug = 'cardoon'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Ground cherry / cape gooseberry — 70-90 days from transplant
UPDATE public.plant_species
SET days_to_maturity_min = 70, days_to_maturity_max = 90,
    maturity_basis = 'from_transplant'
WHERE slug = 'ground-cherry'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Melon cantaloupe
UPDATE public.plant_species
SET days_to_maturity_min = 70, days_to_maturity_max = 90,
    maturity_basis = 'from_transplant'
WHERE slug = 'melon-cantaloupe'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Watermelon
UPDATE public.plant_species
SET days_to_maturity_min = 80, days_to_maturity_max = 100,
    maturity_basis = 'from_transplant'
WHERE slug = 'watermelon'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- ---------- Herbs (missing from prior migrations) ----------

-- Lemon verbena — perennial shrub; harvestable from 90 days
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 180,
    maturity_basis = 'from_transplant'
WHERE slug IN ('herb-lemon-verbena', 'lemon-verbena')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Angelica — biennial; harvestable stems year 2
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 545,
    maturity_basis = 'from_sowing'
WHERE slug IN ('herb-angelica', 'angelica')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Comfrey — perennial; established quickly, 60-90 days to first harvest
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 120,
    maturity_basis = 'from_transplant'
WHERE slug IN ('herb-comfrey', 'comfrey')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Valerian — perennial; harvest root in year 2
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_sowing'
WHERE slug IN ('herb-valerian', 'valerian')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Hyssop — perennial; first harvest 90-120 days from transplant
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 120,
    maturity_basis = 'from_transplant'
WHERE slug IN ('herb-hyssop', 'hyssop')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Anise hyssop — perennial; first harvest 90-120 days
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 120,
    maturity_basis = 'from_sowing'
WHERE slug IN ('herb-anise-hyssop', 'anise-hyssop')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Marshmallow — perennial; root harvest year 2
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_sowing'
WHERE slug IN ('herb-marshmallow', 'marshmallow')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Catnip — perennial; first harvest 60-90 days
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_transplant'
WHERE slug IN ('herb-catnip', 'catnip')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Rosemary (herb- prefixed variant)
UPDATE public.plant_species
SET days_to_maturity_min = 180, days_to_maturity_max = 365,
    maturity_basis = 'from_transplant'
WHERE slug = 'herb-rosemary'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Bay laurel (herb- prefixed variant)
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_transplant'
WHERE slug = 'herb-bay-laurel'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Stevia — tender perennial; first harvest 60-90 days
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_transplant'
WHERE slug IN ('herb-stevia', 'stevia')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Hop (common) — perennial vine; cone harvest year 2-3
UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_transplant'
WHERE slug = 'hop-common'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- ---------- Cover crops / green manures (herb category) ----------
-- These are short-season crops with known maturity; important for garden planning.

-- Yellow lupin — 60-90 days to dig in
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_sowing'
WHERE slug = 'lupin-yellow'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Phacelia — 45-60 days to flowering (dig in before)
UPDATE public.plant_species
SET days_to_maturity_min = 45, days_to_maturity_max = 60,
    maturity_basis = 'from_sowing'
WHERE slug = 'phacelia'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Crimson clover — 60-90 days to dig in
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_sowing'
WHERE slug = 'crimson-clover'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- White clover — 60-90 days to establish
UPDATE public.plant_species
SET days_to_maturity_min = 60, days_to_maturity_max = 90,
    maturity_basis = 'from_sowing'
WHERE slug = 'white-clover'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Field bean (as green manure) — 90-120 days
UPDATE public.plant_species
SET days_to_maturity_min = 90, days_to_maturity_max = 120,
    maturity_basis = 'from_sowing'
WHERE slug = 'field-bean'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Buckwheat — 35-50 days to flowering
UPDATE public.plant_species
SET days_to_maturity_min = 35, days_to_maturity_max = 50,
    maturity_basis = 'from_sowing'
WHERE slug = 'buckwheat'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Winter rye — overwintered; 180-240 days
UPDATE public.plant_species
SET days_to_maturity_min = 180, days_to_maturity_max = 240,
    maturity_basis = 'from_sowing'
WHERE slug = 'winter-rye'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Vetch (winter / Hungarian) — overwintered; 180-240 days
UPDATE public.plant_species
SET days_to_maturity_min = 180, days_to_maturity_max = 240,
    maturity_basis = 'from_sowing'
WHERE slug IN ('vetch', 'winter-vetch', 'hungarian-vetch')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Mustard (as green manure) — 30-45 days
UPDATE public.plant_species
SET days_to_maturity_min = 30, days_to_maturity_max = 45,
    maturity_basis = 'from_sowing'
WHERE slug IN ('mustard-green-manure', 'white-mustard')
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- ---------- Catch-all for any remaining edible plants ----------
-- Use a bulk update for edible category plants that still have NULL maturity.
-- This targets fruit-tree and fruit categories with a sensible perennial default.

UPDATE public.plant_species
SET days_to_maturity_min = 1095, days_to_maturity_max = 1825,
    maturity_basis = 'from_transplant'
WHERE category = 'fruit-tree'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species
SET days_to_maturity_min = 365, days_to_maturity_max = 730,
    maturity_basis = 'from_transplant'
WHERE category = 'fruit'
  AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);


-- =============================================================================
-- P1b: ROTATION GROUP — fix vegetables/herbs with wrong or missing groups
-- Only updates where the current rotation_group does not match the plant family.
-- =============================================================================

-- Variant/duplicate solanaceae slugs that are still 'non_rotating'
UPDATE public.plant_species
SET rotation_group = 'solanaceae'
WHERE slug IN (
  'tomato-slicer-solanum-lycopersicum',
  'plum-roma-tomato-solanum-lycopersicum',
  'hot-pepper-very-hot-types-capsicum-chinense',
  'pepper-capsicum-annuum',
  'potato-solanum-tuberosum'
) AND rotation_group = 'non_rotating';

-- Ginger, turmeric — non-rotating (tropical, not in standard rotation)
-- Already non_rotating, no change needed.

-- Chayote — cucurbit family
UPDATE public.plant_species
SET rotation_group = 'cucurbit'
WHERE slug = 'chayote' AND rotation_group = 'non_rotating';

-- Lettuce variants — non_rotating is correct (Asteraceae, not in standard 4-course rotation)
-- No change needed.

-- Cabbage variants should be brassica (may already be fixed by migration 005)
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug IN ('cabbage-red', 'cabbage-green', 'cabbage-savoy')
  AND rotation_group = 'non_rotating';

-- Kale variants
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug IN ('kale-curly', 'kale-lacinato')
  AND rotation_group = 'non_rotating';

-- Romanesco — brassica
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'romanesco' AND rotation_group = 'non_rotating';

-- Pak choi, mizuna, tatsoi, Chinese cabbage — brassica
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug IN ('pak-choi', 'mizuna', 'tatsoi', 'chinese-cabbage')
  AND rotation_group = 'non_rotating';

-- Kohlrabi — brassica
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'kohlrabi' AND rotation_group = 'non_rotating';

-- Swede — brassica (Brassica napus)
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug IN ('swede', 'swede-rutabaga') AND rotation_group = 'non_rotating';

-- Turnip — brassica (Brassica rapa)
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'turnip' AND rotation_group = 'non_rotating';

-- Daikon radish — brassica (Raphanus sativus)
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'daikon-radish' AND rotation_group = 'non_rotating';

-- Radish — brassica
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'radish' AND rotation_group = 'non_rotating';

-- Mustard greens — brassica
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'mustard-greens' AND rotation_group = 'non_rotating';

-- Sprouting broccoli — brassica
UPDATE public.plant_species
SET rotation_group = 'brassica'
WHERE slug = 'sprouting-broccoli' AND rotation_group = 'non_rotating';

-- Pea variant slugs — legume
UPDATE public.plant_species
SET rotation_group = 'legume'
WHERE slug IN ('peas-garden', 'peas-snap', 'peas-snow')
  AND rotation_group = 'non_rotating';

-- Scarlet runner bean — legume
UPDATE public.plant_species
SET rotation_group = 'legume'
WHERE slug = 'scarlet-runner-bean' AND rotation_group = 'non_rotating';

-- Fava bean — legume
UPDATE public.plant_species
SET rotation_group = 'legume'
WHERE slug = 'fava-bean' AND rotation_group = 'non_rotating';

-- Cowpea / black-eye — legume
UPDATE public.plant_species
SET rotation_group = 'legume'
WHERE slug = 'cowpea-blackeye' AND rotation_group = 'non_rotating';

-- Lima bean — legume
UPDATE public.plant_species
SET rotation_group = 'legume'
WHERE slug = 'lima-bean' AND rotation_group = 'non_rotating';

-- Soybean / edamame — legume
UPDATE public.plant_species
SET rotation_group = 'legume'
WHERE slug = 'soybean-edamame' AND rotation_group = 'non_rotating';

-- Onion-bulb — root_allium
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'onion-bulb' AND rotation_group = 'non_rotating';

-- Multiplier onion — root_allium
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'multiplier-onion' AND rotation_group = 'non_rotating';

-- Shallot — root_allium
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'shallot' AND rotation_group = 'non_rotating';

-- Leek — root_allium
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'leek' AND rotation_group = 'non_rotating';

-- Garlic — root_allium
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'garlic' AND rotation_group = 'non_rotating';

-- Spring onion — root_allium
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'spring-onion' AND rotation_group = 'non_rotating';

-- Carrot, parsnip, celeriac, celery, fennel-bulb — root_allium (Apiaceae / root crops share rotation)
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug IN ('carrot', 'parsnip', 'fennel-bulb')
  AND rotation_group = 'non_rotating';

-- Beetroot — root_allium (Chenopodiaceae root crop, rotates with alliums)
UPDATE public.plant_species
SET rotation_group = 'root_allium'
WHERE slug = 'beetroot' AND rotation_group = 'non_rotating';

-- Squash variant slugs — cucurbit
UPDATE public.plant_species
SET rotation_group = 'cucurbit'
WHERE slug IN ('squash-yellow', 'squash-pattypan', 'squash-spaghetti', 'squash-winter')
  AND rotation_group = 'non_rotating';

-- Cucumber, courgette, pumpkin — cucurbit
UPDATE public.plant_species
SET rotation_group = 'cucurbit'
WHERE slug IN ('cucumber', 'courgette', 'pumpkin')
  AND rotation_group = 'non_rotating';

-- Melon, watermelon — cucurbit
UPDATE public.plant_species
SET rotation_group = 'cucurbit'
WHERE slug IN ('melon-cantaloupe', 'watermelon')
  AND rotation_group = 'non_rotating';

-- Sweetcorn — non_rotating (Poaceae, not in standard rotation)
-- Already correct.

-- Asparagus, rhubarb — permanent
UPDATE public.plant_species
SET rotation_group = 'permanent'
WHERE slug IN ('asparagus', 'rhubarb') AND rotation_group = 'non_rotating';

-- Globe artichoke — permanent (perennial)
UPDATE public.plant_species
SET rotation_group = 'permanent'
WHERE slug IN ('artichoke-globe', 'globe-artichoke') AND rotation_group = 'non_rotating';


-- =============================================================================
-- P2a: COMPANIONS_WITH / COMPANIONS_AVOID
-- Fill companion planting data for commonly grown vegetables.
-- Only uses slugs that exist in the CSV. Only updates NULL/empty values.
-- =============================================================================

-- Tomato
UPDATE public.plant_species
SET companions_with = '["basil","carrot","parsley","garlic","chives","lettuce","spinach","nasturtium"]'::jsonb
WHERE slug IN ('tomato', 'tomato-cherry', 'tomato-plum',
               'tomato-slicer-solanum-lycopersicum', 'plum-roma-tomato-solanum-lycopersicum')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["cabbage","fennel-bulb","potato","kohlrabi"]'::jsonb
WHERE slug IN ('tomato', 'tomato-cherry', 'tomato-plum',
               'tomato-slicer-solanum-lycopersicum', 'plum-roma-tomato-solanum-lycopersicum')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Carrot
UPDATE public.plant_species
SET companions_with = '["onion-bulb","spring-onion","leek","rosemary","sage","lettuce","pea","chives"]'::jsonb
WHERE slug = 'carrot'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["dill","parsnip","celery"]'::jsonb
WHERE slug = 'carrot'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Potato
UPDATE public.plant_species
SET companions_with = '["broad-bean","cabbage","sweetcorn","horseradish","nasturtium"]'::jsonb
WHERE slug IN ('potato', 'potato-solanum-tuberosum')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["tomato","courgette","cucumber","pumpkin","squash-winter","aubergine","raspberry"]'::jsonb
WHERE slug IN ('potato', 'potato-solanum-tuberosum')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Beetroot
UPDATE public.plant_species
SET companions_with = '["onion-bulb","garlic","lettuce","cabbage","kohlrabi"]'::jsonb
WHERE slug = 'beetroot'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["runner-bean","mustard-greens"]'::jsonb
WHERE slug = 'beetroot'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Cabbage (and variants)
UPDATE public.plant_species
SET companions_with = '["onion-bulb","garlic","beetroot","celery","lettuce","spinach","nasturtium"]'::jsonb
WHERE slug IN ('cabbage', 'cabbage-red', 'cabbage-green', 'cabbage-savoy')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["wild-strawberry","tomato","runner-bean"]'::jsonb
WHERE slug IN ('cabbage', 'cabbage-red', 'cabbage-green', 'cabbage-savoy')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Broccoli / cauliflower
UPDATE public.plant_species
SET companions_with = '["onion-bulb","garlic","celery","nasturtium","beetroot"]'::jsonb
WHERE slug IN ('broccoli', 'cauliflower', 'sprouting-broccoli', 'romanesco')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["tomato","wild-strawberry","runner-bean"]'::jsonb
WHERE slug IN ('broccoli', 'cauliflower', 'sprouting-broccoli', 'romanesco')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Kale (and variants)
UPDATE public.plant_species
SET companions_with = '["garlic","onion-bulb","beetroot","nasturtium"]'::jsonb
WHERE slug IN ('kale', 'kale-curly', 'kale-lacinato')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["wild-strawberry","tomato"]'::jsonb
WHERE slug IN ('kale', 'kale-curly', 'kale-lacinato')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Brussels sprout
UPDATE public.plant_species
SET companions_with = '["onion-bulb","garlic","sage","nasturtium"]'::jsonb
WHERE slug = 'brussels-sprout'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["wild-strawberry","tomato","runner-bean"]'::jsonb
WHERE slug = 'brussels-sprout'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Courgette / zucchini
UPDATE public.plant_species
SET companions_with = '["sweetcorn","runner-bean","nasturtium","radish"]'::jsonb
WHERE slug = 'courgette'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["potato"]'::jsonb
WHERE slug = 'courgette'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Cucumber
UPDATE public.plant_species
SET companions_with = '["sweetcorn","pea","lettuce","radish","nasturtium","dill"]'::jsonb
WHERE slug = 'cucumber'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["potato","sage","mint"]'::jsonb
WHERE slug = 'cucumber'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Pumpkin / squash
UPDATE public.plant_species
SET companions_with = '["sweetcorn","runner-bean","nasturtium","radish"]'::jsonb
WHERE slug IN ('pumpkin', 'squash-winter', 'squash-yellow', 'squash-pattypan', 'squash-spaghetti')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["potato"]'::jsonb
WHERE slug IN ('pumpkin', 'squash-winter', 'squash-yellow', 'squash-pattypan', 'squash-spaghetti')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Sweetcorn
UPDATE public.plant_species
SET companions_with = '["runner-bean","courgette","pumpkin","squash-winter"]'::jsonb
WHERE slug = 'sweetcorn'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["celery","tomato"]'::jsonb
WHERE slug = 'sweetcorn'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Runner bean / French bean
UPDATE public.plant_species
SET companions_with = '["sweetcorn","courgette","pumpkin","carrot","celery"]'::jsonb
WHERE slug IN ('runner-bean', 'french-bean', 'scarlet-runner-bean', 'bean')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["onion-bulb","garlic","fennel-bulb"]'::jsonb
WHERE slug IN ('runner-bean', 'french-bean', 'scarlet-runner-bean', 'bean')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Broad bean / fava bean
UPDATE public.plant_species
SET companions_with = '["potato","spinach","lettuce","cabbage"]'::jsonb
WHERE slug IN ('broad-bean', 'fava-bean')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["onion-bulb","garlic","fennel-bulb"]'::jsonb
WHERE slug IN ('broad-bean', 'fava-bean')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Pea (and variants)
UPDATE public.plant_species
SET companions_with = '["carrot","turnip","radish","broad-bean","mint","lettuce"]'::jsonb
WHERE slug IN ('pea', 'peas-garden', 'peas-snap', 'peas-snow')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["onion-bulb","garlic","shallot"]'::jsonb
WHERE slug IN ('pea', 'peas-garden', 'peas-snap', 'peas-snow')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Onion (bulb)
UPDATE public.plant_species
SET companions_with = '["carrot","beetroot","lettuce","tomato","wild-strawberry"]'::jsonb
WHERE slug = 'onion-bulb'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["pea","broad-bean","runner-bean"]'::jsonb
WHERE slug = 'onion-bulb'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Garlic
UPDATE public.plant_species
SET companions_with = '["tomato","carrot","beetroot","lettuce","wild-strawberry","raspberry"]'::jsonb
WHERE slug = 'garlic'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["pea","broad-bean","runner-bean"]'::jsonb
WHERE slug = 'garlic'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Leek
UPDATE public.plant_species
SET companions_with = '["carrot","celery","onion-bulb"]'::jsonb
WHERE slug = 'leek'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["pea","broad-bean","runner-bean"]'::jsonb
WHERE slug = 'leek'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Pepper / chilli (and variants)
UPDATE public.plant_species
SET companions_with = '["tomato","basil","carrot","onion-bulb","spinach"]'::jsonb
WHERE slug IN ('pepper', 'pepper-sweet', 'pepper-chilli', 'pepper-hot', 'chilli',
               'pepper-capsicum-annuum', 'hot-pepper-very-hot-types-capsicum-chinense')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["fennel-bulb","kohlrabi"]'::jsonb
WHERE slug IN ('pepper', 'pepper-sweet', 'pepper-chilli', 'pepper-hot', 'chilli',
               'pepper-capsicum-annuum', 'hot-pepper-very-hot-types-capsicum-chinense')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Aubergine
UPDATE public.plant_species
SET companions_with = '["pepper","tomato","basil","nasturtium"]'::jsonb
WHERE slug = 'aubergine'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["fennel-bulb"]'::jsonb
WHERE slug = 'aubergine'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Radish
UPDATE public.plant_species
SET companions_with = '["lettuce","pea","spinach","carrot","nasturtium"]'::jsonb
WHERE slug = 'radish'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Turnip
UPDATE public.plant_species
SET companions_with = '["pea","lettuce","spinach"]'::jsonb
WHERE slug = 'turnip'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Parsnip
UPDATE public.plant_species
SET companions_with = '["garlic","onion-bulb","radish","pea"]'::jsonb
WHERE slug = 'parsnip'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["carrot","celery"]'::jsonb
WHERE slug = 'parsnip'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Celery / celeriac
UPDATE public.plant_species
SET companions_with = '["tomato","leek","cabbage","broad-bean"]'::jsonb
WHERE slug IN ('celery', 'celeriac')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["parsnip","carrot"]'::jsonb
WHERE slug IN ('celery', 'celeriac')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Chard
UPDATE public.plant_species
SET companions_with = '["cabbage","lettuce","onion-bulb","radish"]'::jsonb
WHERE slug = 'chard'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Spinach
UPDATE public.plant_species
SET companions_with = '["pea","broad-bean","radish","wild-strawberry","cabbage"]'::jsonb
WHERE slug = 'spinach'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Asparagus
UPDATE public.plant_species
SET companions_with = '["tomato","parsley","basil"]'::jsonb
WHERE slug = 'asparagus'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["onion-bulb","garlic"]'::jsonb
WHERE slug = 'asparagus'
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Rhubarb
UPDATE public.plant_species
SET companions_with = '["garlic","cabbage","broad-bean"]'::jsonb
WHERE slug = 'rhubarb'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Basil
UPDATE public.plant_species
SET companions_with = '["tomato","pepper","aubergine","lettuce"]'::jsonb
WHERE slug IN ('basil', 'herb-basil-sweet', 'herb-basil-thai', 'herb-basil-greek')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["sage","rosemary"]'::jsonb
WHERE slug IN ('basil', 'herb-basil-sweet', 'herb-basil-thai', 'herb-basil-greek')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Dill
UPDATE public.plant_species
SET companions_with = '["lettuce","cabbage","cucumber","onion-bulb"]'::jsonb
WHERE slug IN ('dill', 'herb-dill-leaf')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["carrot","tomato"]'::jsonb
WHERE slug IN ('dill', 'herb-dill-leaf')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Parsley
UPDATE public.plant_species
SET companions_with = '["tomato","asparagus","carrot","chives"]'::jsonb
WHERE slug IN ('parsley', 'herb-parsley-flat', 'herb-parsley-curly')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Coriander / cilantro
UPDATE public.plant_species
SET companions_with = '["spinach","lettuce","tomato","pea"]'::jsonb
WHERE slug IN ('coriander', 'herb-coriander-leaf')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["fennel-bulb"]'::jsonb
WHERE slug IN ('coriander', 'herb-coriander-leaf')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Mint
UPDATE public.plant_species
SET companions_with = '["cabbage","tomato","pea"]'::jsonb
WHERE slug IN ('mint', 'herb-mint-spearmint', 'herb-mint-peppermint')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Chives
UPDATE public.plant_species
SET companions_with = '["carrot","tomato","apple","gooseberry"]'::jsonb
WHERE slug IN ('chives', 'herb-chives-common')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["pea","broad-bean"]'::jsonb
WHERE slug IN ('chives', 'herb-chives-common')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Rosemary
UPDATE public.plant_species
SET companions_with = '["cabbage","carrot","sage","bean"]'::jsonb
WHERE slug IN ('rosemary', 'herb-rosemary')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Sage
UPDATE public.plant_species
SET companions_with = '["cabbage","carrot","rosemary","brussels-sprout"]'::jsonb
WHERE slug IN ('sage', 'herb-sage-common', 'herb-sage-purple')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species
SET companions_avoid = '["cucumber"]'::jsonb
WHERE slug IN ('sage', 'herb-sage-common', 'herb-sage-purple')
  AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Thyme
UPDATE public.plant_species
SET companions_with = '["cabbage","tomato","aubergine","rosemary"]'::jsonb
WHERE slug IN ('thyme', 'herb-thyme-common', 'herb-thyme-lemon')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Oregano
UPDATE public.plant_species
SET companions_with = '["pepper","tomato","cabbage","broccoli"]'::jsonb
WHERE slug IN ('oregano', 'herb-oregano', 'herb-oregano-greek', 'herb-marjoram-sweet')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Nasturtium (companion plant extraordinaire)
UPDATE public.plant_species
SET companions_with = '["tomato","cabbage","cucumber","runner-bean","courgette","apple"]'::jsonb
WHERE slug = 'nasturtium'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Marigold (pest deterrent)
UPDATE public.plant_species
SET companions_with = '["tomato","pepper","courgette","potato","cucumber"]'::jsonb
WHERE slug IN ('marigold', 'marigold-french', 'marigold-pot')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Borage
UPDATE public.plant_species
SET companions_with = '["tomato","wild-strawberry","courgette","squash-winter"]'::jsonb
WHERE slug IN ('borage', 'herb-borage')
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Sunflower
UPDATE public.plant_species
SET companions_with = '["sweetcorn","courgette","cucumber","runner-bean"]'::jsonb
WHERE slug = 'sunflower'
  AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');


-- =============================================================================
-- P2b: SUN_REQUIREMENTS — standardize format
-- Dominant format is kebab-case: full-sun, part-sun, partial-shade, sun-or-partial
-- Fix outliers: "Full sun to partial shade" => "sun-or-partial"
--               "partial_shade" => "partial-shade"
-- =============================================================================

-- Fix "Full sun to partial shade" (long-form with caps) => "sun-or-partial"
UPDATE public.plant_species
SET sun_requirements = 'sun-or-partial'
WHERE sun_requirements = 'Full sun to partial shade';

-- Fix underscore variant
UPDATE public.plant_species
SET sun_requirements = 'partial-shade'
WHERE sun_requirements = 'partial_shade';

-- Fix any other capitalised variants
UPDATE public.plant_species
SET sun_requirements = 'full-sun'
WHERE sun_requirements = 'Full sun';

UPDATE public.plant_species
SET sun_requirements = 'part-sun'
WHERE sun_requirements = 'Part sun';

UPDATE public.plant_species
SET sun_requirements = 'partial-shade'
WHERE sun_requirements = 'Partial shade';


-- =============================================================================
-- P3: SEARCH_TERMS — fill for edible plants with empty search_terms
-- JSONB array of lowercase strings for search discoverability.
-- Only updates where search_terms IS NULL or empty.
-- Uses slug, name, scientific_name components.
-- =============================================================================

-- Bulk fill search_terms from name + scientific_name for edible plants
-- that currently have empty search_terms.
UPDATE public.plant_species
SET search_terms = jsonb_build_array(
  lower(slug),
  lower(name),
  lower(scientific_name)
)
WHERE category IN ('vegetable', 'herb', 'fruit', 'fruit-tree')
  AND (search_terms IS NULL OR search_terms = '{}'::integer[] OR search_terms::text = '' OR search_terms::text = 'null')
  AND name IS NOT NULL
  AND scientific_name IS NOT NULL;

-- For plants with name but no scientific_name
UPDATE public.plant_species
SET search_terms = jsonb_build_array(
  lower(slug),
  lower(name)
)
WHERE category IN ('vegetable', 'herb', 'fruit', 'fruit-tree')
  AND (search_terms IS NULL OR search_terms = '{}'::integer[] OR search_terms::text = '' OR search_terms::text = 'null')
  AND name IS NOT NULL
  AND (scientific_name IS NULL OR scientific_name = '');


COMMIT;
