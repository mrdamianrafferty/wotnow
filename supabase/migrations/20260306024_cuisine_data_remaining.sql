-- Fix: Set cuisine for 107 species missed by migration 023
-- These are additional slug variants not in the original species list

BEGIN;

-- FRUIT-TREE (10) — all edible
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'fruit-hazelnut',
  'fruit-hybrid-shipova',
  'fruit-juniper-berry',
  'fruit-mirabelle',
  'fruit-mountain-ash',
  'fruit-quandong',
  'fruit-saskatoon',
  'fruit-serviceberry',
  'fruit-sweet-chestnut',
  'fruit-walnut'
) AND cuisine IS NULL;

-- HERB (28) — all culinary herbs
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'herb-basil-thai',
  'herb-borage',
  'herb-calendula',
  'herb-chamomile-german',
  'herb-chamomile-roman',
  'herb-chervil',
  'herb-chives-common',
  'herb-coriander-leaf',
  'herb-dill-leaf',
  'herb-fennel-leaf',
  'herb-holy-basil',
  'herb-lemon-balm',
  'herb-marjoram-sweet',
  'herb-oregano',
  'herb-sage-purple',
  'herb-savoury-summer',
  'herb-savoury-winter',
  'herb-sorrel-common'
) AND cuisine IS NULL;

-- ORNAMENTAL (33) — mostly false, a few true
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'daylily',             -- edible flowers and buds
  'echinacea',           -- tea
  'rose',                -- edible petals, rosehip
  'salvia',              -- some culinary salvias
  'calendula',           -- if exists separately
  'sunflower-biomass'    -- seeds edible
) AND cuisine IS NULL;

UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'bleeding-heart',
  'brunnera',
  'californian-poppy',
  'chinese-silver-grass',
  'climbing-honeysuckle',
  'climbing-rose-rambling',
  'coreopsis',
  'creeping-jenny',
  'dahlia',
  'delphinium',
  'gaillardia',
  'gaura',
  'globe-thistle',
  'heliopsis',
  'helleborus',
  'hosta',
  'iris',
  'mazus',
  'miscanthus-giant',
  'penstemon',
  'peony',
  'phlox',
  'poppy',
  'pulmonaria',
  'scabiosa',
  'shasta-daisy',
  'snow-in-summer',
  'trillium',
  'verbena-bonariensis',
  'veronica',
  'zinnia'
) AND cuisine IS NULL;

-- SHRUB (5) — mostly false
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'hazel-hedge'          -- hedging hazel still produces edible nuts
) AND cuisine IS NULL;

UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'griselinia-hedge',
  'indigo-bush',
  'privet-common',
  'privet-oval-leaf'
) AND cuisine IS NULL;

-- TREE (17) — mixed
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'tree-hawthorn-common',   -- haw berries, tea
  'tree-hazel-treeform',    -- hazelnuts
  'tree-honeyberry-treeform', -- edible berries
  'tree-mesquite',          -- pods used in cooking
  'tree-rowan-mountain-ash', -- rowan jelly
  'walnut-english'          -- edible nuts
) AND cuisine IS NULL;

UPDATE plant_species SET cuisine = false
WHERE slug IN (
  'tree-alder-red',
  'tree-black-acacia',
  'tree-eucalyptus-niphophila',
  'tree-honey-locust',
  'tree-london-plane',
  'tree-mimosa',
  'tree-she-oak',
  'tree-silk-tree',
  'tree-sycamore-japanese',
  'tree-texas-mountain-laurel',
  'tulip-tree'
) AND cuisine IS NULL;

-- VEGETABLE (21) — all true
UPDATE plant_species SET cuisine = true
WHERE slug IN (
  'cabbage-green',
  'cabbage-red',
  'cabbage-savoy',
  'cucumber-pickling',
  'fava-bean',
  'kale-curly',
  'kale-lacinato',
  'peas-garden',
  'peas-snap',
  'peas-snow',
  'pepper-chilli',
  'pepper-hot',
  'pepper-sweet',
  'romanesco',
  'scarlet-runner-bean',
  'sprouting-broccoli',
  'squash-pattypan',
  'squash-spaghetti',
  'squash-yellow',
  'tomato-cherry',
  'tomato-plum'
) AND cuisine IS NULL;

COMMIT;
