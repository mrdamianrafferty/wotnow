-- Migration: Populate harvest_season for 242 edible species
-- Date: 2026-03-06
-- Seasons based on UK/Ireland climate

BEGIN;

-- =============================================================================
-- Fix existing inconsistent season values
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE harvest_season = 'Fall';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE harvest_season = 'Autumn';

-- =============================================================================
-- FRUIT (soft fruit / bush fruit)
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-blackcurrant';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-currant';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-gooseberry';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'wild-strawberry';

-- =============================================================================
-- FRUIT-TREE
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-apricot';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-black-walnut';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-cherimoya';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-cherry-sour';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-cherry-sweet';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-elder';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-elder-black-lace';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-gage';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-guava-strawberry';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-hackberry';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-hardy-kiwi';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-hazelnut';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-hybrid-shipova';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-juniper-berry';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'fruit-mayhaw';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-mirabelle';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-mountain-ash';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-mulberry-white';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-plum';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-quandong';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-quince';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-saskatoon';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'fruit-sea-buckthorn';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fruit-serviceberry';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-sweet-chestnut';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'fruit-walnut';

-- =============================================================================
-- HERBS — Culinary herbs (leaf harvest)
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'anise-hyssop';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'buckwheat';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'burdock';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'catmint';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'chervil';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'chive';
UPDATE plant_species SET harvest_season = 'Spring' WHERE slug = 'coltsfoot';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'coriander';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'corsican-mint';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'crimson-clover';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'dill';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'epazote';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'fennel-perennial';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'feverfew';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'garden-sorrel';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'herb-angelica';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-anise-hyssop';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-basil-greek';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-basil-sweet';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-basil-thai';
UPDATE plant_species SET harvest_season = 'Year-round' WHERE slug = 'herb-bay-laurel';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-borage';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'herb-calendula';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-catmint-ornamental';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-catnip';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-chamomile-german';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-chamomile-roman';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-chervil';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-chives-common';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-comfrey';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-coriander-leaf';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-dill-leaf';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-fennel-leaf';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-gotu-kola';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-holy-basil';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-hyssop';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-lemon-balm';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-lemon-verbena';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-lovage';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-marjoram-sweet';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-marshmallow';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'herb-milk-thistle';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-mint-peppermint';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-mint-spearmint';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-oregano';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-oregano-greek';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-parsley-curly';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-parsley-flat';
UPDATE plant_species SET harvest_season = 'Year-round' WHERE slug = 'herb-rosemary';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-sage-common';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-sage-pineapple';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-sage-purple';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-savoury-summer';
UPDATE plant_species SET harvest_season = 'Year-round' WHERE slug = 'herb-savoury-winter';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-skullcap';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-sorrel-common';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-st-johns-wort';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-stevia';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'herb-sweet-woodruff';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-tansy';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-tarragon-french';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-thyme-common';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'herb-thyme-lemon';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-valerian';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'herb-wormwood';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'hyssop';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'italian-ryegrass';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'joe-pye-weed';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'kidney-vetch';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'lemon-balm';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'lupin-yellow';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'monarda';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'monarda-wild';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'mugwort';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'mullein';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'oats-green-manure';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'parsley';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'pennyroyal';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'perennial-pea';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'phacelia-covercrop';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'red-clover';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'rue';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'russian-comfrey';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'rye-cereal';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'self-heal';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'sheep-sorrel';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'sheep-sorrel-2';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'southernwood';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'sweet-clover';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'tansy';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'thyme-creeping';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'valerian';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'verbena-blue';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'vetch-common';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'white-clover';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'woolly-thyme';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'wormwood';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'yellow-dock';

-- =============================================================================
-- VEGETABLES — Salad & leafy greens
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'amaranth-leaves';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'endive';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'escarole';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'lettuce';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'lettuce-butterhead';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'lettuce-iceberg';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'lettuce-looseleaf';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'lettuce-romaine';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'malabar-spinach';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'mizuna';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'mustard-greens';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'pak-choi';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'purslane';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'radicchio';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'rocket';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'sorrel';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'spinach';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'swiss-chard';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'tatsoi';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'watercress';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'fenugreek-greens';

-- =============================================================================
-- VEGETABLES — Brassicas
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'broccoli';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'brussels-sprout';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'cabbage';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'cabbage-green';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'cabbage-red';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'cabbage-savoy';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'cauliflower';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'chinese-cabbage';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'kale-curly';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'kale-lacinato';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'kohlrabi';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'romanesco';
UPDATE plant_species SET harvest_season = 'Spring' WHERE slug = 'sprouting-broccoli';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'swede-rutabaga';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'turnip';

-- =============================================================================
-- VEGETABLES — Root vegetables
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'beetroot';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'black-salsify';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'carrot';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'celeriac';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'daikon-radish';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'horseradish';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'jerusalem-artichoke';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'parsnip';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'radish';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'salsify';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'sweet-potato';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'burdock-root';

-- =============================================================================
-- VEGETABLES — Alliums
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'garlic';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'elephant-garlic';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'garlic-chive';
UPDATE plant_species SET harvest_season = 'Autumn / Fall to Winter' WHERE slug = 'leek';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'multiplier-onion';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'onion';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'onion-bulb';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'rakkyo';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'shallot';
UPDATE plant_species SET harvest_season = 'Spring to Autumn / Fall' WHERE slug = 'spring-onion';

-- =============================================================================
-- VEGETABLES — Legumes
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'broad-bean';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'bean';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'fava-bean';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'french-bean';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'lima-bean';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'pea';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'peas-garden';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'peas-snap';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'peas-snow';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'runner-bean';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'scarlet-runner-bean';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'chickpea';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'cowpea-blackeye';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'soybean-edamame';

-- =============================================================================
-- VEGETABLES — Fruiting vegetables (solanaceae, cucurbits)
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'aubergine';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'courgette';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'cucumber';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'cucumber-pickling';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'pepper';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'pepper-chilli';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'pepper-hot';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'pepper-sweet';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'potato';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'pumpkin';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'squash-pattypan';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'squash-spaghetti';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'squash-winter';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'squash-yellow';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'sweetcorn';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'tomato';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'tomato-cherry';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'tomato-plum';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'tomatillo';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'ground-cherry';
UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'okra';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'melon-cantaloupe';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'watermelon';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'chayote';

-- =============================================================================
-- VEGETABLES — Other / Miscellaneous
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Summer' WHERE slug = 'artichoke-globe';
UPDATE plant_species SET harvest_season = 'Spring' WHERE slug = 'asparagus';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'cardoon';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'cassava';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'celery';
UPDATE plant_species SET harvest_season = 'Summer to Autumn / Fall' WHERE slug = 'fennel-bulb';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'ginger';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'jicama';
UPDATE plant_species SET harvest_season = 'Spring to Summer' WHERE slug = 'rhubarb';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'taro';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'yacon';

-- =============================================================================
-- VINES
-- =============================================================================

UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'akebia';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'grape-vine';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'hop-common';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'kiwi-common';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'kiwi-hardy';
UPDATE plant_species SET harvest_season = 'Late Summer to Autumn / Fall' WHERE slug = 'passionflower';
UPDATE plant_species SET harvest_season = 'Autumn / Fall' WHERE slug = 'schisandra';

COMMIT;
