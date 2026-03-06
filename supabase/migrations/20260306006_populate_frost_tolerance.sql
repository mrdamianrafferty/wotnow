-- Migration: Populate frost_tolerance for all plant_species rows
-- Date: 2026-03-06
-- Description: Sets frost_tolerance ('hardy', 'half_hardy', 'tender') for every species
--   where the column is currently NULL or empty, and corrects any wrong values.
--
-- Classification criteria (UK/Ireland context):
--   hardy      = survives hard frost (below -5C)
--   half_hardy = tolerates light frost (0 to -5C) but killed by hard frost
--   tender     = killed by any frost (0C or below)

BEGIN;

-- ============================================================================
-- SECTION 0: CORRECTIONS — fix incorrectly assigned values
-- ============================================================================

-- Coriander tolerates light frost (to about -5C); it is a cool-season annual, not tender
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug = 'coriander'
  AND frost_tolerance = 'tender';


-- ============================================================================
-- SECTION 1: HARDY — survives hard frost (below -5C)
-- ============================================================================

-- 1a. Hardy fruit (trees, shrubs, perennials)
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'fruit-currant',          -- Ribes rubrum, deciduous shrub, very hardy
  'fruit-gooseberry',       -- Ribes uva-crispa, very hardy
  'fruit-blackcurrant',     -- Ribes nigrum, very hardy
  'fruit-elder',            -- Sambucus nigra, native UK tree
  'fruit-aronia',           -- Aronia melanocarpa, very hardy shrub
  'fruit-serviceberry',     -- Amelanchier, hardy native
  'fruit-hackberry',        -- Celtis, hardy tree
  'fruit-mayhaw',           -- Crataegus, hardy
  'fruit-black-walnut',     -- Juglans nigra, hardy tree
  'fruit-hybrid-shipova',   -- × Sorbopyrus, hardy
  'fruit-hazelnut',         -- Corylus avellana, native hardy
  'fruit-sweet-chestnut',   -- Castanea sativa, hardy tree
  'fruit-saskatoon',        -- Amelanchier alnifolia, very hardy
  'fruit-cornelian-cherry', -- Cornus mas, hardy
  'fruit-apple',            -- Malus domestica, hardy
  'fruit-autumn-olive',     -- Elaeagnus umbellata, hardy
  'fruit-persimmon',        -- Diospyros virginiana, hardy
  'fruit-mountain-ash',     -- Sorbus aucuparia, native hardy
  'fruit-sea-buckthorn',    -- Hippophae rhamnoides, very hardy
  'fruit-walnut',           -- Juglans regia, hardy
  'fruit-honeyberry-treeform', -- Lonicera caerulea, very hardy
  'fruit-mulberry-white',   -- Morus alba, hardy
  'fruit-medlar',           -- Mespilus germanica, hardy
  'fruit-mulberry-black',   -- Morus nigra, hardy
  'fruit-damson',           -- Prunus domestica subsp. insititia, hardy
  'fruit-cherry-sour',      -- Prunus cerasus, hardy
  'fruit-cherry-sweet',     -- Prunus avium, hardy
  'fruit-elder-black-lace', -- Sambucus nigra 'Black Lace', hardy
  'fruit-chinese-haw',      -- Crataegus pinnatifida, hardy
  'fruit-pear',             -- Pyrus communis, hardy
  'fruit-gage',             -- Prunus domestica subsp. italica, hardy
  'fruit-mirabelle',        -- Prunus domestica subsp. syriaca, hardy
  'fruit-plum',             -- Prunus domestica, hardy
  'fruit-quince',           -- Cydonia oblonga, hardy
  'fruit-hardy-kiwi',       -- Actinidia arguta, hardy to -25C
  'fruit-apricot',          -- Prunus armeniaca, hardy (needs warm wall in UK)
  'fruit-nectarine',        -- Prunus persica var. nucipersica, hardy
  'fruit-peach',            -- Prunus persica, hardy
  'fruit-jostaberry-treeform' -- Ribes × nidigrolaria, hardy
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 1b. Hardy herbs (perennial, temperate-climate herbs)
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'herb-sage-purple',       -- Salvia officinalis purpurascens, hardy
  'herb-angelica',          -- Angelica archangelica, very hardy biennial
  'herb-lovage',            -- Levisticum officinale, very hardy perennial
  'herb-sweet-woodruff',    -- Galium odoratum, hardy woodland perennial
  'herb-chamomile-german',  -- Matricaria chamomilla, hardy annual
  'herb-valerian',          -- Valeriana officinalis, very hardy perennial
  'herb-sorrel-common',     -- Rumex acetosa, very hardy perennial
  'herb-parsley-flat',      -- Petroselinum crispum, half-hardy biennial — actually hardy enough for UK winters with protection
  'herb-chamomile-roman',   -- Chamaemelum nobile, hardy perennial
  'herb-chives-common',     -- Allium schoenoprasum, very hardy perennial
  'herb-fennel-leaf',       -- Foeniculum vulgare, hardy perennial
  'herb-lemon-balm',        -- Melissa officinalis, very hardy perennial
  'herb-mint-spearmint',    -- Mentha spicata, very hardy perennial
  'herb-marshmallow',       -- Althaea officinalis, hardy perennial
  'herb-anise-hyssop',      -- Agastache foeniculum, hardy perennial
  'herb-calendula',         -- Calendula officinalis, hardy annual
  'herb-borage',            -- Borago officinalis, hardy annual
  'herb-tarragon-french',   -- Artemisia dracunculus, hardy perennial
  'herb-hyssop',            -- Hyssopus officinalis, hardy perennial
  'herb-bay-laurel',        -- Laurus nobilis, hardy in most UK areas (to -10C)
  'herb-milk-thistle',      -- Silybum marianum, hardy annual/biennial
  'herb-comfrey',           -- Symphytum officinale, very hardy perennial
  'herb-tansy',             -- Tanacetum vulgare, very hardy perennial
  'herb-skullcap',          -- Scutellaria, hardy perennial
  'herb-thyme-lemon',       -- Thymus citriodorus, hardy perennial
  'herb-st-johns-wort',     -- Hypericum perforatum, very hardy perennial
  'herb-catnip',            -- Nepeta cataria, very hardy perennial
  'herb-oregano',           -- Origanum vulgare, hardy perennial
  'herb-sage-common',       -- Salvia officinalis, hardy perennial
  'herb-rosemary',          -- Salvia rosmarinus, hardy in most UK areas
  'herb-thyme-common',      -- Thymus vulgaris, hardy perennial
  'herb-oregano-greek',     -- Origanum heracleoticum, hardy perennial
  'herb-mint-peppermint',   -- Mentha × piperita, very hardy perennial
  'herb-dill-leaf',         -- Anethum graveolens (leaf variety), hardy annual
  'herb-savoury-winter',    -- Satureja montana, hardy perennial
  'herb-wormwood',          -- Artemisia absinthium, very hardy perennial
  'herb-parsley-curly',     -- Petroselinum crispum, biennial, survives UK winters
  'herb-chervil',           -- Anthriscus cerefolium, hardy annual
  'herb-basil-greek'        -- Actually half-hardy/tender — will be overridden below
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Override: Greek basil is tender like all basils
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug = 'herb-basil-greek'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'hardy');

-- 1c. Hardy green manures, cover crops, and wild plants
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'vetch-common',           -- Vicia sativa, very hardy
  'white-clover',           -- Trifolium repens, very hardy
  'lupin-yellow',           -- Lupinus luteus, hardy
  'mugwort',                -- Artemisia vulgaris, very hardy
  'catmint',                -- Nepeta, hardy perennial
  'oats-green-manure',      -- Avena sativa, hardy annual
  'garden-sorrel',          -- Rumex acetosa, very hardy
  'wormwood',               -- Artemisia absinthium, very hardy
  'perennial-pea',          -- Lathyrus latifolius, very hardy
  'monarda-wild',           -- Monarda fistulosa, hardy perennial
  'phacelia-covercrop',     -- Phacelia tanacetifolia, hardy annual
  'coltsfoot',              -- Tussilago farfara, very hardy
  'kidney-vetch',           -- Anthyllis vulneraria, hardy
  'red-clover',             -- Trifolium pratense, very hardy
  'cardoon',                -- Cynara cardunculus, hardy perennial
  'sweet-clover',           -- Melilotus, hardy
  'crimson-clover',         -- Trifolium incarnatum, hardy annual
  'southernwood',           -- Artemisia abrotanum, hardy
  'tansy',                  -- Tanacetum vulgare, very hardy
  'joe-pye-weed',           -- Eutrochium, very hardy
  'monarda',                -- Monarda, hardy perennial
  'wild-strawberry',        -- Fragaria vesca, very hardy
  'italian-ryegrass',       -- Lolium multiflorum, hardy
  'yellow-dock',            -- Rumex crispus, very hardy
  'rue',                    -- Ruta graveolens, hardy perennial
  'russian-comfrey',        -- Symphytum × uplandicum, very hardy
  'feverfew',               -- Tanacetum parthenium, hardy
  'thyme-creeping',         -- Thymus serpyllum, very hardy
  'fennel-perennial',       -- Foeniculum vulgare, hardy perennial
  'mullein',                -- Verbascum, hardy biennial
  'valerian',               -- Valeriana officinalis, very hardy
  'self-heal',              -- Prunella vulgaris, very hardy
  'sheep-sorrel',           -- Rumex acetosella, very hardy
  'sheep-sorrel-2',         -- Rumex acetosella, very hardy
  'woolly-thyme',           -- Thymus praecox, very hardy
  'burdock',                -- Arctium, very hardy
  'rye-cereal',             -- Secale cereale, very hardy
  'chervil',                -- Anthriscus cerefolium, hardy annual
  'pennyroyal',             -- Mentha pulegium, hardy
  'hyssop',                 -- Hyssopus officinalis, hardy
  'buckwheat',              -- Fagopyrum esculentum, half-hardy — will override below
  'lemon-balm',             -- Melissa officinalis, very hardy
  'anise-hyssop',           -- Agastache foeniculum, hardy
  'corsican-mint',          -- Mentha requienii, borderline hardy in UK (to -10C in sheltered spots)
  'sunflower-biomass',      -- Helianthus annuus, half-hardy — will override below
  'herb-gotu-kola'          -- Centella asiatica, tender — will override below
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Override: Buckwheat is killed by frost
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug = 'buckwheat'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'hardy');

-- Override: Sunflower biomass is half-hardy (young plants tolerate light frost)
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug = 'sunflower-biomass'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'hardy');

-- Override: Gotu kola is tropical/tender
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug = 'herb-gotu-kola'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'hardy');

-- Override: Corsican mint is borderline — half_hardy in UK context
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug = 'corsican-mint'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'hardy');

-- 1d. Hardy ornamental perennials, shrubs, and climbers
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'lavender',               -- Lavandula angustifolia, hardy
  'columbine',              -- Aquilegia, very hardy
  'foxglove',               -- Digitalis purpurea, hardy biennial
  'rose',                   -- Rosa, hardy (already set)
  'helleborus',             -- Helleborus, very hardy
  'pulmonaria',             -- Pulmonaria, very hardy
  'yarrow',                 -- Achillea millefolium, very hardy
  'rudbeckia',              -- Rudbeckia, hardy perennial
  'peony',                  -- Paeonia, very hardy
  'astilbe',                -- Astilbe, very hardy
  'asclepias',              -- Asclepias, hardy perennial (A. syriaca hardy)
  'shasta-daisy',           -- Leucanthemum × superbum, hardy
  'campanula',              -- Campanula, hardy
  'creeping-jenny',         -- Lysimachia nummularia, very hardy
  'echinacea',              -- Echinacea purpurea, hardy
  'brunnera',               -- Brunnera macrophylla, very hardy
  'bleeding-heart',         -- Lamprocapnos spectabilis, hardy
  'snow-in-summer',         -- Cerastium tomentosum, very hardy
  'coreopsis',              -- Coreopsis, hardy
  'delphinium',             -- Delphinium, hardy
  'lupin',                  -- Lupinus, hardy perennial
  'globe-thistle',          -- Echinops ritro, very hardy
  'ajuga-reptans',          -- Ajuga reptans, very hardy ground cover
  'black-eyed-susan',       -- Rudbeckia hirta, hardy
  'heliopsis',              -- Heliopsis helianthoides, hardy
  'heuchera',               -- Heuchera, hardy
  'hosta',                  -- Hosta, very hardy
  'climbing-honeysuckle',   -- Lonicera, hardy climber
  'mazus',                  -- Mazus reptans, hardy ground cover
  'poppy',                  -- Papaver, hardy
  'penstemon',              -- Penstemon, hardy (most UK varieties)
  'primrose',               -- Primula vulgaris, very hardy
  'sweet-pea',              -- Lathyrus odoratus, hardy annual
  'daylily',                -- Hemerocallis, very hardy
  'iris',                   -- Iris, hardy
  'sedum',                  -- Sedum, very hardy
  'trillium',               -- Trillium, hardy woodland perennial
  'verbena-bonariensis',    -- Verbena bonariensis, hardy perennial in UK (to -10C)
  'veronica',               -- Veronica, hardy
  'phlox',                  -- Phlox paniculata, hardy
  'geranium-hardy',         -- Geranium (cranesbill), very hardy
  'hollyhock',              -- Alcea rosea, hardy
  'scabiosa',               -- Scabiosa, hardy
  'climbing-rose-rambling', -- Rosa, hardy
  'miscanthus-giant',       -- Miscanthus × giganteus, hardy grass
  'chinese-silver-grass',   -- Miscanthus sinensis, hardy grass
  'alyssum-perennial',      -- Aurinia saxatilis (perennial alyssum), hardy
  'californian-poppy'       -- Eschscholzia californica, hardy annual
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 1e. Hardy hedging plants
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'gorse-hedge',            -- Ulex europaeus, hardy native
  'griselinia-hedge',       -- Griselinia littoralis, hardy in most UK (to -10C)
  'dogwood-red-stem',       -- Cornus alba, very hardy
  'blackthorn',             -- Prunus spinosa, very hardy native
  'privet-oval-leaf',       -- Ligustrum ovalifolium, hardy
  'privet-common',          -- Ligustrum vulgare, hardy native
  'hazel-hedge',            -- Corylus avellana, very hardy native
  'rosa-rugosa-hedge',      -- Rosa rugosa, very hardy
  'dogwood-blood-red',      -- Cornus sanguinea, very hardy native
  'escallonia-hedge',       -- Escallonia, hardy in most UK areas
  'beech-hedge-copper',     -- Fagus sylvatica 'Purpurea', very hardy
  'beech-hedge-green',      -- Fagus sylvatica, very hardy native
  'hornbeam-hedge'          -- Carpinus betulus, very hardy native
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 1f. Hardy trees
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'tree-sycamore',
  'tree-hawthorn-common',
  'tree-eleagnus-silverberry',
  'tree-alder-grey',
  'tree-elm-wych',
  'tree-london-plane',
  'tree-amber-maple',
  'tree-caragana-arborescens',
  'tree-field-maple',
  'tree-red-maple',
  'tree-redbud-eastern',
  'tree-katsura',
  'ginkgo-biloba',
  'tree-service-tree',
  'tree-elm-siberian',
  'honey-locust',
  'tree-aldershade-american',
  'tree-golden-rain',
  'tree-serviceberry-treeform',
  'tree-norway-spruce',
  'maple-sugar',
  'tree-snowy-mespilus',
  'tree-paperbark-maple',
  'tree-european-fir',
  'tree-alder-black',
  'linden-smallleaf',
  'tree-alder-red',
  'tree-crabapple-ornamental',
  'tree-norway-maple',
  'tree-cedar-lebanon',
  'tree-blue-spruce',
  'tree-lawson-cypress',
  'tree-black-spruce',
  'walnut-english',
  'tree-golden-chain',
  'tree-sweetgum',
  'tree-japanese-maple',
  'maple-freeman',
  'tree-mountain-ash-dwarf',
  'tree-juneberry',
  'tree-holly',
  'tree-sequoia-dawn',
  'ash-manna',
  'tree-monterey-pine',
  'tree-honeyberry-treeform',
  'pecan',
  'tree-juniper-common',
  'tree-hazel-treeform',
  'tree-tulip-poplar',
  'tree-ponderosa-pine',
  'tree-lilac-treeform',
  'tree-poplar-lombardy',
  'tree-oak-burr',
  'tree-western-redcedar',
  'tree-honey-locust',
  'tree-lime-small-leaved',
  'tree-black-locust',
  'tree-rowan-mountain-ash',
  'tree-magnolia-soulangea',
  'tree-sweet-chestnut',
  'tree-lodgepole-pine',
  'tree-corsican-pine',
  'tree-aspen',
  'tree-alder-common',
  'tree-pagoda-tree',
  'tree-ash-european',
  'tree-silver-maple',
  'tree-weeping-willow',
  'walnut-black',
  'tree-magnolia-stellata',
  'linden-largeleaf',
  'elm-english',
  'tree-sycamore-japanese',
  'tree-hawthorn-crimson',
  'tree-scots-pine',
  'tree-poplar-white',
  'poplar-hybrid',
  'tree-beech',
  'tree-douglas-fir',
  'tree-oak-english',
  'tree-oak-red',
  'tree-black-willow',
  'tree-redwood-giant',
  'tree-hawthorn-midland',
  'tree-larch-european',
  'tree-hackberry-common',
  'tree-hazel-harry-lauder',
  'willow-coppice',
  'tree-hornbeam',
  'tree-yew-english',
  'tree-silver-linden',
  'tree-japanese-zelkova',
  'tree-alder-green',
  'tree-eleagnus-ebbingei',
  'tree-copper-beech',
  'tree-arborvitae-thuja',
  'plane-london',
  'tree-silver-birch',
  'tree-smoke-tree',
  'tree-downy-birch',
  'tulip-tree',
  'sweet-chestnut',
  'tree-cedar-atlas',
  'tree-black-acacia'
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 1g. Hardy vegetables (survive hard frost)
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'kale-curly',             -- Brassica oleracea Acephala, very hardy
  'kale-lacinato',          -- Brassica oleracea 'Lacinato', very hardy
  'onion-bulb',             -- Allium cepa, hardy
  'elephant-garlic',        -- Allium ampeloprasum, hardy
  'garlic-chive',           -- Allium tuberosum, hardy
  'multiplier-onion',       -- Allium cepa Aggregatum, hardy
  'spring-onion',           -- Allium fistulosum, hardy
  'chive',                  -- Allium schoenoprasum, very hardy
  'fava-bean',              -- Vicia faba, hardy (synonym of broad-bean)
  'watercress',             -- Nasturtium officinale, very hardy aquatic
  'black-salsify',          -- Scorzonera hispanica, hardy root
  'salsify',                -- Tragopogon porrifolius, hardy root
  'artichoke-globe',        -- Cynara cardunculus var. scolymus, hardy perennial
  'burdock-root',           -- Arctium lappa, very hardy
  'swede-rutabaga',         -- Brassica napus, very hardy root
  'rakkyo',                 -- Allium chinense, hardy allium
  'sorrel',                 -- Rumex acetosa, very hardy
  'peas-garden',            -- Pisum sativum, hardy annual
  'peas-snap',              -- Pisum sativum var. macrocarpon, hardy
  'peas-snow',              -- Pisum sativum var. saccharatum, hardy
  'sprouting-broccoli',     -- Brassica oleracea var. italica, very hardy (overwintering)
  'romanesco',              -- Brassica oleracea, hardy brassica
  'endive',                 -- Cichorium endivia, hardy
  'escarole',               -- Cichorium endivia var. latifolia, hardy
  'radicchio',              -- Cichorium intybus, hardy
  'cabbage-red',            -- Brassica oleracea, hardy
  'cabbage-green',          -- Brassica oleracea var. capitata, hardy
  'cabbage-savoy',          -- Brassica oleracea var. sabauda, very hardy
  'mustard-greens'          -- Brassica juncea, hardy
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');


-- ============================================================================
-- SECTION 2: HALF-HARDY — tolerates light frost (0 to -5C)
-- ============================================================================

-- 2a. Half-hardy vegetables
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'soybean-edamame',        -- Glycine max, half-hardy (tolerates brief light frost)
  'celeriac',               -- Apium graveolens var. rapaceum, half-hardy
  'celery',                 -- Apium graveolens, half-hardy
  'fennel-bulb',            -- Foeniculum vulgare var. azoricum, half-hardy
  'kohlrabi',               -- Brassica oleracea var. gongylodes, half-hardy brassica
  'chinese-cabbage',        -- Brassica rapa subsp. pekinensis, half-hardy
  'lettuce-butterhead',     -- Lactuca sativa, half-hardy
  'lettuce-iceberg',        -- Lactuca sativa, half-hardy
  'lettuce-looseleaf',      -- Lactuca sativa, half-hardy
  'lettuce-romaine',        -- Lactuca sativa, half-hardy
  'squash-yellow',          -- Cucurbita pepo, tender — will override below
  'mizuna',                 -- Brassica rapa var. nipposinica, half-hardy
  'tatsoi',                 -- Brassica rapa var. rosularis, half-hardy
  'purslane',               -- Portulaca oleracea, half-hardy
  'daikon-radish',          -- Raphanus sativus var. longipinnatus, half-hardy
  'fenugreek-greens',       -- Trigonella foenum-graecum, half-hardy
  'chickpea',               -- Cicer arietinum, half-hardy
  'squash-pattypan'         -- Cucurbita pepo, tender — will override below
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Override: Summer squash types are actually tender
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'squash-yellow',          -- Summer squash (Cucurbita pepo), frost tender
  'squash-pattypan'         -- Summer squash (Cucurbita pepo), frost tender
)
AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'half_hardy');

-- 2b. Half-hardy herbs
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'herb-marjoram-sweet',    -- Origanum majorana, half-hardy (less hardy than oregano)
  'herb-coriander-leaf',    -- Same plant as coriander, half-hardy
  'herb-sage-pineapple',    -- Salvia elegans, half-hardy (not as hardy as common sage)
  'herb-savoury-summer',    -- Satureja hortensis, half-hardy annual
  'herb-catmint-ornamental' -- Nepeta × faassenii, mostly hardy but some tender
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 2c. Half-hardy ornamentals
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'snapdragon',             -- Antirrhinum majus, half-hardy annual
  'alyssum',                -- Lobularia maritima, half-hardy annual
  'gaillardia',             -- Gaillardia × grandiflora, half-hardy perennial
  'gaura',                  -- Gaura lindheimeri, half-hardy perennial in UK
  'salvia',                 -- Salvia (ornamental), half-hardy in UK
  'marigold',               -- Tagetes, half-hardy annual
  'verbena-blue',           -- Verbena hastata, borderline hardy / half-hardy
  'indigo-bush'             -- Amorpha fruticosa, half-hardy in UK
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 2d. Half-hardy vegetables (additional)
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'scarlet-runner-bean',    -- Phaseolus coccineus, same as runner-bean — actually tender, will override
  'cowpea-blackeye',        -- Vigna unguiculata, tender — will override
  'lima-bean',              -- Phaseolus lunatus, tender — will override
  'squash-spaghetti'        -- Cucurbita pepo, tender — will override
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Override: These are actually tender crops
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'scarlet-runner-bean',    -- Same as runner bean, frost tender
  'cowpea-blackeye',        -- Tropical legume, frost tender
  'lima-bean',              -- Tropical bean, frost tender
  'squash-spaghetti'        -- Winter squash but frost tender plant
)
AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'half_hardy');


-- ============================================================================
-- SECTION 3: TENDER — killed by any frost (0C or below)
-- ============================================================================

-- 3a. Tender vegetables
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'pepper-hot',             -- Capsicum, tender
  'cucumber-pickling',      -- Cucumis sativus, tender
  'pepper-chilli',          -- Capsicum, tender
  'okra',                   -- already set, but include for safety
  'ground-cherry',          -- Physalis pruinosa, tender
  'melon-cantaloupe',       -- Cucumis melo, tender
  'squash-winter',          -- Cucurbita maxima, tender plant (frost kills foliage)
  'tomato-plum',            -- Solanum lycopersicum, tender
  'sweetcorn',              -- Zea mays, tender
  'bean',                   -- Phaseolus vulgaris, tender
  'pepper-sweet',           -- Capsicum annuum, tender
  'malabar-spinach',        -- Basella alba, tropical tender
  'taro',                   -- Colocasia esculenta, tropical tender
  'jicama',                 -- Pachyrhizus erosus, tropical tender
  'tomatillo',              -- Physalis philadelphica, tender
  'cassava',                -- Manihot esculenta, tropical tender
  'amaranth-leaves',        -- Amaranthus, tender
  'ginger',                 -- Zingiber officinale, tropical tender
  'tomato-slicer-solanum-lycopersicum', -- tender
  'tomato-cherry',          -- tender
  'hot-pepper-very-hot-types-capsicum-chinense', -- tender
  'plum-roma-tomato-solanum-lycopersicum', -- tender
  'pepper-capsicum-annuum', -- tender
  'yacon',                  -- Smallanthus sonchifolius, tender (tubers survive but top growth frost tender)
  'chayote',                -- Sechium edule, tropical tender
  'epazote'                 -- Dysphania ambrosioides, tender annual
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 3b. Tender herbs
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'herb-holy-basil',        -- Ocimum tenuiflorum, tender
  'herb-basil-thai',        -- Ocimum basilicum, tender
  'herb-basil-sweet',       -- Ocimum basilicum, tender
  'herb-stevia',            -- Stevia rebaudiana, tender perennial
  'herb-lemon-verbena'      -- Aloysia citrodora, tender (needs frost protection in UK)
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 3c. Tender fruit (tropical/subtropical)
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'fruit-orange',           -- Citrus × sinensis, tender
  'fruit-cherimoya',        -- Annona cherimola, tender
  'fruit-mandarin',         -- Citrus reticulata, tender
  'fruit-lime',             -- Citrus aurantiifolia, tender
  'fruit-lemon',            -- Citrus limon, tender
  'fruit-guava-strawberry', -- Psidium cattleyanum, tender
  'fruit-quandong',         -- Santalum acuminatum, tender
  'fruit-pawpaw'            -- Asimina triloba, borderline hardy — actually hardy to -25C
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Override: Pawpaw (Asimina triloba) is actually very hardy
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug = 'fruit-pawpaw'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'tender');

-- 3d. Tender ornamentals
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'zinnia',                 -- Zinnia elegans, tender annual
  'nasturtium',             -- Tropaeolum majus, tender annual
  'petunia',                -- Petunia × atkinsiana, tender annual/perennial
  'cosmos',                 -- Cosmos bipinnatus, tender annual
  'sunflower',              -- Helianthus annuus, tender annual (killed by frost)
  'dahlia'                  -- already set, include for safety
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- 3e. Tender trees/shrubs (subtropical)
UPDATE public.plant_species
SET frost_tolerance = 'tender'
WHERE slug IN (
  'tree-acacia-dealbata',   -- Acacia dealbata (silver wattle), tender in UK
  'tree-mimosa',            -- Albizia (or Acacia), tender
  'tree-acacia-baileyana',  -- Acacia baileyana, tender
  'tree-acacia-longifolia', -- Acacia longifolia, tender
  'tree-mesquite',          -- Prosopis, tender in UK
  'tree-she-oak',           -- Casuarina, tender in UK
  'tree-texas-mountain-laurel' -- Dermatophyllum, tender in UK
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');


-- ============================================================================
-- SECTION 4: BORDERLINE / SPECIES-SPECIFIC CLASSIFICATIONS
-- ============================================================================

-- Half-hardy trees/shrubs (survive mild UK winters in sheltered locations, to about -5C)
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'tree-tamarisk',          -- Tamarix, half-hardy in colder UK areas
  'tree-magnolia-grandiflora', -- Magnolia grandiflora, half-hardy (needs shelter in UK)
  'tree-silk-tree',         -- Albizia julibrissin, half-hardy in UK
  'tree-albizia-julibrissin', -- Albizia julibrissin, half-hardy
  'tree-eucalyptus-niphophila', -- Eucalyptus niphophila, half-hardy (hardiest eucalyptus)
  'tree-eucalyptus-gunnii'  -- Eucalyptus gunnii, half-hardy (hardy to -14C once established)
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Actually, Eucalyptus gunnii and niphophila are hardy once established (to -14C or lower)
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'tree-eucalyptus-niphophila',
  'tree-eucalyptus-gunnii'
)
AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'half_hardy');

-- Half-hardy fruit
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'fruit-fig',              -- Ficus carica, half-hardy (needs wall protection in colder areas)
  'fruit-olive',            -- Olea europaea, half-hardy in UK (survives mild frosts)
  'fruit-pomegranate',      -- Punica granatum, half-hardy in UK
  'fruit-feijoa',           -- Acca sellowiana, half-hardy
  'fruit-loquat',           -- Eriobotrya japonica, half-hardy in UK
  'fruit-juniper-berry'     -- Juniperus communis, actually hardy — will override
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Override: Juniper is a native UK plant, very hardy
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug = 'fruit-juniper-berry'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'half_hardy');

-- Horseradish already set as hardy — correct
-- Sweet potato already set as tender — correct


-- ============================================================================
-- SECTION 5: CLIMBING FRUIT / VINES
-- ============================================================================

UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug IN (
  'schisandra',             -- Schisandra chinensis, hardy climber
  'kiwi-hardy',             -- Actinidia arguta, very hardy
  'hop-common',             -- Humulus lupulus, very hardy native
  'akebia',                 -- Akebia quinata, hardy
  'grape-vine',             -- Vitis vinifera, hardy (needs warm site for fruiting)
  'passionflower'           -- Passiflora caerulea, hardy in most UK areas (to -10C)
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');

UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug IN (
  'kiwi-common'             -- Actinidia deliciosa, half-hardy (needs sheltered wall)
)
AND (frost_tolerance IS NULL OR frost_tolerance = '');


-- ============================================================================
-- SECTION 6: REMAINING CATCH-ALL (verify no NULLs remain)
-- ============================================================================

-- Any remaining hardy-context plants in herb-catmint-ornamental override
-- (Nepeta × faassenii is actually hardy in most of UK, upgrade to hardy)
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug = 'herb-catmint-ornamental'
  AND (frost_tolerance IS NULL OR frost_tolerance = '' OR frost_tolerance = 'half_hardy');

-- Additional individual corrections for completeness:
-- potato-solanum-tuberosum is same as potato (half_hardy)
UPDATE public.plant_species
SET frost_tolerance = 'half_hardy'
WHERE slug = 'potato-solanum-tuberosum'
  AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- Ensure onion-bulb gets same as onion
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug = 'onion-bulb'
  AND (frost_tolerance IS NULL OR frost_tolerance = '');

-- horseradish already hardy, but include the vegetable slug
UPDATE public.plant_species
SET frost_tolerance = 'hardy'
WHERE slug = 'horseradish'
  AND (frost_tolerance IS NULL OR frost_tolerance = '');


-- ============================================================================
-- VERIFICATION: This should return 0 rows after migration
-- If any remain, they need to be classified manually
-- SELECT slug, name, category FROM public.plant_species
--   WHERE frost_tolerance IS NULL OR frost_tolerance = '';
-- ============================================================================

COMMIT;
