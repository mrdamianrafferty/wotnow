-- Migration: Populate sunlight column for 325 plant species
-- sunlight is text[] with values: "full sun", "part sun/part shade", "part shade", "shade"
-- Values reflect the full range each species can tolerate, based on horticultural best practice.

BEGIN;

-- ============================================================
-- FRUIT (berry bushes, soft fruit)
-- ============================================================

UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-blackcurrant';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-currant';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-gooseberry';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'wild-strawberry';

-- ============================================================
-- FRUIT TREES & NUT TREES
-- ============================================================

UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-black-walnut';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-elder';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-gage';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-hackberry';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-hardy-kiwi';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-hazelnut';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-hybrid-shipova';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-juniper-berry';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-mirabelle';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-mountain-ash';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-quandong';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-saskatoon';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fruit-serviceberry';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-sweet-chestnut';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fruit-walnut';

-- ============================================================
-- HERBS (culinary, medicinal, aromatic)
-- ============================================================

-- Full sun herbs (Mediterranean types, aromatic herbs)
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'anise-hyssop';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'buckwheat';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'burdock';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'catmint';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'chervil';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'chive';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'coltsfoot';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'coriander';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'corsican-mint';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'crimson-clover';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'dill';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'epazote';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fennel-perennial';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'feverfew';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'garden-sorrel';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-angelica';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-anise-hyssop';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-basil-greek';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-basil-sweet';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-basil-thai';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-bay-laurel';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-borage';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-calendula';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-catmint-ornamental';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-catnip';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-chamomile-german';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-chamomile-roman';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-chervil';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-chives-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-comfrey';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-coriander-leaf';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-dill-leaf';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-fennel-leaf';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-gotu-kola';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-holy-basil';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-hyssop';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-lemon-balm';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-lemon-verbena';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-lovage';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-marjoram-sweet';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-marshmallow';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-milk-thistle';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-mint-peppermint';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-mint-spearmint';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-oregano';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-oregano-greek';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-parsley-curly';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-parsley-flat';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-rosemary';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-sage-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-sage-pineapple';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-sage-purple';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-savoury-summer';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-savoury-winter';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-skullcap';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'herb-sorrel-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-st-johns-wort';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-stevia';
UPDATE plant_species SET sunlight = '{"part shade","shade"}'::text[] WHERE slug = 'herb-sweet-woodruff';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-tansy';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-tarragon-french';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-thyme-common';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-thyme-lemon';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'herb-valerian';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'herb-wormwood';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'hyssop';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'italian-ryegrass';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'joe-pye-weed';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'kidney-vetch';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'lemon-balm';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'lupin-yellow';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'monarda';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'monarda-wild';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'mugwort';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'mullein';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'oats-green-manure';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'parsley';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'pennyroyal';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'perennial-pea';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'phacelia-covercrop';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'red-clover';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'rue';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'russian-comfrey';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'rye-cereal';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'self-heal';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'sheep-sorrel';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'sheep-sorrel-2';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'southernwood';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sweet-clover';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'tansy';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'thyme-creeping';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'valerian';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'verbena-blue';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'vetch-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'white-clover';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'woolly-thyme';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'wormwood';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'yellow-dock';

-- ============================================================
-- ORNAMENTALS (flowers, perennials, grasses)
-- ============================================================

-- Shade-loving ornamentals
UPDATE plant_species SET sunlight = '{"part shade","shade"}'::text[] WHERE slug = 'ajuga-reptans';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'astilbe';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade","shade"}'::text[] WHERE slug = 'bleeding-heart';
UPDATE plant_species SET sunlight = '{"part shade","shade"}'::text[] WHERE slug = 'brunnera';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'columbine';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'foxglove';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade","shade"}'::text[] WHERE slug = 'helleborus';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'heuchera';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade","shade"}'::text[] WHERE slug = 'hosta';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'primrose';
UPDATE plant_species SET sunlight = '{"part shade","shade"}'::text[] WHERE slug = 'pulmonaria';
UPDATE plant_species SET sunlight = '{"part shade","shade"}'::text[] WHERE slug = 'trillium';

-- Full sun ornamentals
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'alyssum';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'alyssum-perennial';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'asclepias';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'black-eyed-susan';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'californian-poppy';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'campanula';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'chinese-silver-grass';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'climbing-honeysuckle';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'climbing-rose-rambling';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'coreopsis';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'cosmos';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'creeping-jenny';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'dahlia';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'daylily';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'delphinium';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'echinacea';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'gaillardia';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'gaura';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'geranium-hardy';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'globe-thistle';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'heliopsis';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'hollyhock';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'iris';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'lavender';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'lupin';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'marigold';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'mazus';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'miscanthus-giant';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'nasturtium';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'penstemon';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'peony';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'petunia';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'phlox';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'poppy';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'rose';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'rudbeckia';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'salvia';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'scabiosa';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sedum';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'shasta-daisy';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'snapdragon';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'snow-in-summer';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sunflower';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sunflower-biomass';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'sweet-pea';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'verbena-bonariensis';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'veronica';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'yarrow';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'zinnia';

-- ============================================================
-- SHRUBS & HEDGING
-- ============================================================

UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'blackthorn';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'dogwood-blood-red';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'dogwood-red-stem';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'escallonia-hedge';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'gorse-hedge';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'griselinia-hedge';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'hazel-hedge';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'indigo-bush';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'privet-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'privet-oval-leaf';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'rosa-rugosa-hedge';

-- ============================================================
-- TREES (timber, shade, ornamental, native)
-- ============================================================

UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'hornbeam-hedge';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'linden-smallleaf';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sweet-chestnut';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-acacia-longifolia';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'tree-alder-black';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'tree-alder-red';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-black-acacia';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-eucalyptus-niphophila';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'tree-hawthorn-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'tree-hazel-treeform';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-honey-locust';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'tree-honeyberry-treeform';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-london-plane';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-mesquite';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-mimosa';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'tree-rowan-mountain-ash';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-she-oak';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-silk-tree';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'tree-sycamore-japanese';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tree-texas-mountain-laurel';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tulip-tree';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'walnut-english';

-- ============================================================
-- VEGETABLES (alliums, brassicas, cucurbits, legumes, roots,
--             leafy greens, nightshades, misc)
-- ============================================================

-- Leafy greens (many tolerate some shade)
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'amaranth-leaves';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'endive';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'escarole';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'lettuce';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'lettuce-butterhead';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'lettuce-iceberg';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'lettuce-looseleaf';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'lettuce-romaine';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'mizuna';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'mustard-greens';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'pak-choi';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'radicchio';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'rocket';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'spinach';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'swiss-chard';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'tatsoi';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'watercress';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'malabar-spinach';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'purslane';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fenugreek-greens';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'chinese-cabbage';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'sorrel';

-- Brassicas
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'broccoli';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'brussels-sprout';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'cabbage';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'cabbage-green';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'cabbage-red';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'cabbage-savoy';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'cauliflower';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'kale-curly';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'kale-lacinato';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'kohlrabi';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'romanesco';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'sprouting-broccoli';

-- Nightshades (heat/sun lovers)
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'aubergine';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'pepper';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'pepper-chilli';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'pepper-hot';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'pepper-sweet';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'potato';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tomato';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tomato-cherry';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tomato-plum';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'tomatillo';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'ground-cherry';

-- Cucurbits (heat/sun lovers)
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'courgette';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'cucumber';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'cucumber-pickling';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'chayote';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'melon-cantaloupe';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'pumpkin';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'squash-pattypan';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'squash-spaghetti';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'squash-winter';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'squash-yellow';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'watermelon';

-- Legumes
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'bean';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'broad-bean';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'chickpea';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'cowpea-blackeye';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'fava-bean';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'french-bean';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'lima-bean';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'pea';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'peas-garden';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'peas-snap';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'peas-snow';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'runner-bean';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'scarlet-runner-bean';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'soybean-edamame';

-- Root vegetables
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'beetroot';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'black-salsify';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'burdock-root';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'carrot';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'celeriac';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'daikon-radish';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'horseradish';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'jerusalem-artichoke';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'jicama';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'parsnip';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'radish';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'salsify';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'swede-rutabaga';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sweet-potato';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'turnip';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'cassava';

-- Alliums
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'elephant-garlic';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'garlic';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'garlic-chive';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'leek';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'multiplier-onion';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'onion';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'onion-bulb';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'rakkyo';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'shallot';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'spring-onion';

-- Other vegetables
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'artichoke-globe';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'asparagus';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'cardoon';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'celery';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'fennel-bulb';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'ginger';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'okra';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'rhubarb';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'sweetcorn';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'taro';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'yacon';

-- ============================================================
-- VINES
-- ============================================================

UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade","part shade"}'::text[] WHERE slug = 'akebia';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'grape-vine';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'hop-common';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'kiwi-common';
UPDATE plant_species SET sunlight = '{"full sun","part sun/part shade"}'::text[] WHERE slug = 'kiwi-hardy';
UPDATE plant_species SET sunlight = '{"full sun"}'::text[] WHERE slug = 'passionflower';
UPDATE plant_species SET sunlight = '{"part sun/part shade","part shade"}'::text[] WHERE slug = 'schisandra';

COMMIT;
