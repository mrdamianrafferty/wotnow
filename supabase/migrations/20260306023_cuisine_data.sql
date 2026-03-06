-- Migration: Set cuisine boolean for 325 plant species with NULL values
-- Date: 2026-03-06
-- cuisine = true means the plant has culinary use
-- cuisine = false means the plant does not have culinary use

BEGIN;

-- ============================================================================
-- FRUIT (4 species) — All true, they produce edible fruit
-- ============================================================================
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'fruit-blackcurrant',
  'fruit-currant',
  'fruit-gooseberry',
  'wild-strawberry'
) AND cuisine IS NULL;

-- ============================================================================
-- FRUIT-TREE (15 species) — All true, they produce edible fruit/nuts
-- ============================================================================
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'fruit-black-walnut',    -- edible nuts
  'fruit-elder',           -- elderflower cordial, elderberry wine/jam
  'fruit-gage',            -- edible fruit
  'fruit-hackberry',       -- edible berries
  'fruit-hardy-kiwi',      -- edible fruit
  'fruit-hazel',           -- edible nuts (hazelnuts/cobnuts)
  'fruit-juneberry',       -- edible berries (amelanchier)
  'fruit-medlar',          -- edible fruit (bletted)
  'fruit-mulberry',        -- edible fruit
  'fruit-nectarine',       -- edible fruit
  'fruit-peach',           -- edible fruit
  'fruit-persimmon',       -- edible fruit
  'fruit-plum',            -- edible fruit
  'fruit-quince',          -- edible fruit (cooked)
  'fruit-sea-buckthorn'    -- edible berries, juice
) AND cuisine IS NULL;

-- ============================================================================
-- HERB (98 species) — Mixed: culinary herbs = true, green manures & purely
-- medicinal = false
-- ============================================================================

-- Herbs with culinary use = true (71 species)
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'anise-hyssop',          -- edible flowers and leaves, tea
  'burdock',               -- edible root (gobo), culinary in Japan
  'chervil',               -- culinary herb
  'chive',                 -- culinary herb
  'coriander',             -- culinary herb (leaves and seeds)
  'corsican-mint',         -- culinary mint
  'dill',                  -- culinary herb
  'epazote',               -- culinary herb (Mexican cuisine)
  'fennel-perennial',      -- culinary herb (leaves, seeds)
  'garden-sorrel',         -- culinary herb (soups, salads)
  'herb-angelica',         -- culinary (candied stems, gin flavouring)
  'herb-anise-hyssop',     -- edible flowers and leaves, tea
  'herb-basil-greek',      -- culinary herb
  'herb-basil-sweet',      -- culinary herb
  'herb-bay-laurel',       -- culinary herb (bay leaves)
  'herb-catnip',           -- herbal tea
  'herb-chamomile',        -- culinary tea
  'herb-chili-cayenne',    -- culinary spice
  'herb-gotu-kola',        -- culinary herb (Asian salads, drinks)
  'herb-horseradish',      -- culinary condiment
  'herb-hyssop',           -- culinary herb (salads, liqueurs)
  'herb-lemon-verbena',    -- culinary herb (tea, desserts)
  'herb-lovage',           -- culinary herb (soups, stews)
  'herb-marshmallow',      -- edible (root historically used in confection)
  'herb-milk-thistle',     -- edible leaves and seeds
  'herb-mint-peppermint',  -- culinary herb
  'herb-mint-spearmint',   -- culinary herb
  'herb-oregano-greek',    -- culinary herb
  'herb-oregano-italian',  -- culinary herb
  'herb-parsley-curly',    -- culinary herb
  'herb-parsley-flat',     -- culinary herb
  'herb-rosemary',         -- culinary herb
  'herb-sage-common',      -- culinary herb
  'herb-sage-pineapple',   -- culinary herb (fruit salads, drinks)
  'herb-stevia',           -- culinary sweetener
  'herb-sweet-woodruff',   -- culinary (Maibowle punch, flavouring)
  'herb-tarragon-french',  -- culinary herb
  'herb-thyme-common',     -- culinary herb
  'herb-thyme-lemon',      -- culinary herb
  'hyssop',                -- culinary herb
  'lemon-balm',            -- culinary herb (tea, salads, desserts)
  'mint',                  -- culinary herb
  'monarda',               -- edible flowers, tea (bee balm/bergamot)
  'monarda-wild',          -- edible flowers, tea
  'oregano',               -- culinary herb
  'parsley',               -- culinary herb
  'rosemary',              -- culinary herb
  'sage',                  -- culinary herb
  'sheep-sorrel',          -- edible leaves (salads, soups)
  'sheep-sorrel-2',        -- edible leaves
  'thyme',                 -- culinary herb
  'thyme-creeping',        -- culinary herb (milder thyme)
  'woolly-thyme',          -- culinary herb (mild thyme flavour)
  'yellow-dock',           -- edible young leaves
  'garlic-chive',          -- culinary herb
  'basil',                 -- culinary herb
  'bay',                   -- culinary herb
  'chamomile',             -- culinary tea
  'chili-pepper',          -- culinary spice
  'marjoram',              -- culinary herb
  'tarragon',              -- culinary herb
  'turmeric',              -- culinary spice
  'lavender',              -- culinary (baking, drinks, lavender honey)
  'verbena-blue'           -- herbal tea (vervain tea)
) AND cuisine IS NULL;

-- Herbs: green manures = false (13 species)
UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'buckwheat',             -- green manure / cover crop
  'crimson-clover',        -- green manure
  'italian-ryegrass',      -- green manure
  'kidney-vetch',          -- green manure
  'lupin-yellow',          -- green manure
  'oats-green-manure',     -- green manure
  'perennial-pea',         -- green manure (not culinary pea)
  'phacelia-covercrop',    -- green manure
  'red-clover',            -- green manure
  'rye-cereal',            -- green manure
  'sweet-clover',          -- green manure
  'vetch-common',          -- green manure
  'white-clover'           -- green manure
) AND cuisine IS NULL;

-- Herbs: purely medicinal / non-culinary = false (14 species)
UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'catmint',               -- ornamental/medicinal, not culinary
  'coltsfoot',             -- purely medicinal
  'feverfew',              -- purely medicinal
  'herb-catmint-ornamental', -- ornamental, not culinary
  'herb-comfrey',          -- medicinal only (internal use discouraged)
  'herb-skullcap',         -- purely medicinal
  'herb-st-johns-wort',    -- purely medicinal
  'herb-tansy',            -- toxic, not culinary
  'herb-valerian',         -- purely medicinal
  'herb-wormwood',         -- medicinal/absinthe ingredient but not culinary food
  'joe-pye-weed',          -- purely medicinal
  'mugwort',               -- medicinal (not common culinary use)
  'mullein',               -- purely medicinal
  'pennyroyal',            -- toxic in quantity, not culinary
  'rue',                   -- toxic, not culinary
  'russian-comfrey',       -- medicinal/fertiliser, not culinary
  'self-heal',             -- purely medicinal
  'southernwood',          -- medicinal/insect repellent, not culinary
  'tansy',                 -- toxic, not culinary
  'valerian',              -- purely medicinal
  'wormwood'               -- medicinal, not culinary food
) AND cuisine IS NULL;

-- ============================================================================
-- ORNAMENTAL (61 species) — Mostly false, with edible-flower exceptions
-- ============================================================================

-- Ornamentals with culinary use = true (9 species)
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'borage',                -- edible flowers (salads, drinks)
  'calendula',             -- pot marigold, edible petals (but slug is 'marigold')
  'marigold',              -- pot marigold (Calendula), edible petals
  'nasturtium',            -- edible flowers and leaves
  'pansy',                 -- edible flowers
  'sunflower',             -- edible seeds
  'viola',                 -- edible flowers
  'chrysanthemum-max',     -- edible petals (chrysanthemum tea/garnish)
  'primrose'               -- edible flowers (traditional)
) AND cuisine IS NULL;

-- Ornamentals with no culinary use = false (52 species)
UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'ajuga-reptans',
  'alyssum',
  'alyssum-perennial',
  'asclepias',
  'astilbe',
  'aubrieta',
  'bergenia',
  'black-eyed-susan',
  'buddleia',
  'campanula',
  'celosia',
  'clematis',
  'clover-ornamental',
  'columbine',
  'comfrey-ornamental',
  'cosmos',
  'daisy-english',
  'echinops',
  'erigeron',
  'eryngium',
  'foxglove',
  'geranium-hardy',
  'helenium',
  'heuchera',
  'hollyhock',
  'honesty',
  'iris-bearded',
  'japanese-anemone',
  'lamium',
  'leucanthemum',
  'lupin',
  'lysimachia',
  'michaelmas-daisy',
  'nemesia',
  'nepeta',
  'ornamental-grass-blue-fescue',
  'ornamental-grass-miscanthus',
  'ornamental-grass-stipa',
  'pelargonium',
  'petunia',
  'phlox-perennial',
  'polemonium',
  'rudbeckia',
  'sedum',
  'sidalcea',
  'snapdragon',
  'sweet-pea',
  'sweet-william',
  'teasel',
  'verbascum',
  'verbena',
  'wallflower',
  'yarrow'
) AND cuisine IS NULL;

-- ============================================================================
-- SHRUB (11 species) — Mostly false, with edible exceptions
-- ============================================================================

-- Shrubs with culinary use = true
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'blackthorn',            -- sloes for sloe gin, jelly
  'rosa-rugosa-hedge',     -- rosehips for syrup, tea, jam
  'gorse-hedge'            -- flowers edible (traditional use, gorse wine)
) AND cuisine IS NULL;

-- Shrubs with no culinary use = false
UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'dogwood-blood-red',
  'dogwood-red-stem',
  'escallonia-hedge',
  'holly-hedge',
  'lavender-hedge',        -- hedging variety, primarily ornamental
  'privet-hedge',
  'pyracantha-hedge',
  'yew-hedge'              -- toxic
) AND cuisine IS NULL;

-- ============================================================================
-- TREE (22 species) — Mostly false, with edible exceptions
-- ============================================================================

-- Trees with culinary use = true
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'sweet-chestnut',        -- edible nuts
  'linden-smallleaf',      -- linden blossom tea
  'tree-hawthorn',         -- haws used for jelly, ketchup, tea
  'tree-ginkgo',           -- edible nuts (ginkgo seeds used in Asian cuisine)
  'tree-cherry-bird'       -- small edible cherries (used for liqueur/jam)
) AND cuisine IS NULL;

-- Trees with no culinary use = false
UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'hornbeam-hedge',
  'tree-acacia-longifolia',
  'tree-alder-black',
  'tree-ailanthus',
  'tree-birch-silver',
  'tree-catalpa',
  'tree-cedar-atlas',
  'tree-cherry-ornamental',
  'tree-dawn-redwood',
  'tree-eucalyptus',
  'tree-magnolia',
  'tree-maple-field',
  'tree-monkey-puzzle',
  'tree-oak-english',
  'tree-oak-holm',
  'tree-paulownia',
  'tree-willow-white'
) AND cuisine IS NULL;

-- ============================================================================
-- VEGETABLE (107 species) — All true, they are food crops
-- ============================================================================
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'amaranth-leaves',
  'artichoke-globe',
  'asparagus',
  'aubergine',
  'bean',
  'beetroot',
  'black-salsify',
  'broad-bean',
  'broccoli',
  'brussels-sprout',
  'burdock-root',
  'cabbage',
  'capsicum',
  'cardoon',
  'carrot',
  'cassava',
  'cauliflower',
  'celeriac',
  'celery',
  'chayote',
  'chickpea',
  'chili',
  'chinese-cabbage',
  'courgette',
  'cowpea-blackeye',
  'cucumber',
  'daikon-radish',
  'elephant-garlic',
  'endive',
  'escarole',
  'fennel-bulb',
  'fenugreek-greens',
  'french-bean',
  'garlic',
  'ginger',
  'ground-cherry',
  'horseradish',
  'jerusalem-artichoke',
  'jicama',
  'kale',
  'kohlrabi',
  'leek',
  'lettuce',
  'lettuce-butterhead',
  'lettuce-iceberg',
  'lettuce-looseleaf',
  'lettuce-romaine',
  'lima-bean',
  'malabar-spinach',
  'melon-cantaloupe',
  'mizuna',
  'multiplier-onion',
  'mustard-greens',
  'okra',
  'onion',
  'onion-bulb',
  'pak-choi',
  'parsnip',
  'pea',
  'pepper',
  'potato',
  'pumpkin',
  'purslane',
  'radicchio',
  'radish',
  'rakkyo',
  'rhubarb',
  'rocket',
  'runner-bean',
  'salsify',
  'shallot',
  'sorrel',
  'soybean-edamame',
  'spinach',
  'spring-onion',
  'squash-butternut',
  'squash-winter',
  'swede-rutabaga',
  'sweet-potato',
  'sweetcorn',
  'swiss-chard',
  'taro',
  'tatsoi',
  'tomatillo',
  'tomato',
  'turnip',
  'watercress',
  'watermelon',
  'yacon'
) AND cuisine IS NULL;

-- ============================================================================
-- VINE (7 species) — All true, they produce edible fruit/flowers
-- ============================================================================
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'akebia',                -- edible fruit
  'grape-vine',            -- edible fruit, wine
  'hop-common',            -- brewing, young shoots edible
  'kiwi-common',           -- edible fruit
  'kiwi-hardy',            -- edible fruit
  'passionflower',         -- edible fruit
  'schisandra'             -- edible berries (schisandra tea, traditional use)
) AND cuisine IS NULL;

COMMIT;
