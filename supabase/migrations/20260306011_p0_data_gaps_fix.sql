-- P0 Data Gaps Fix: min_temp_c, poisonous_to_humans, poisonous_to_pets, vegetable maturity
-- Generated 2026-03-06

BEGIN;

-- ============================================================================
-- SECTION 1: min_temp_c (284 species)
-- Values represent absolute minimum survivable temperature in Celsius
-- Based on USDA hardiness zones and species-specific cold tolerance data
-- ============================================================================

-- --- Fruit Trees ---
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'fruit-autumn-olive';       -- Elaeagnus umbellata, USDA Zone 3b
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'fruit-chinese-haw';        -- Crataegus pinnatifida, Zone 4
UPDATE plant_species SET min_temp_c = -25 WHERE slug = 'fruit-cornelian-cherry';   -- Cornus mas, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'fruit-hackberry';          -- Celtis occidentalis, Zone 3
UPDATE plant_species SET min_temp_c = -45 WHERE slug = 'fruit-honeyberry-treeform'; -- Lonicera caerulea, Zone 2
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'fruit-hybrid-shipova';     -- x Sorbopyrus auricularis, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'fruit-jostaberry-treeform'; -- Ribes x nidigrolaria, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'fruit-juniper-berry';      -- Juniperus communis, Zone 2
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'fruit-mayhaw';             -- Crataegus aestivalis, Zone 6
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'fruit-mountain-ash';       -- Sorbus aucuparia, Zone 3
UPDATE plant_species SET min_temp_c = -25 WHERE slug = 'fruit-pawpaw';             -- Asimina triloba, Zone 5
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'fruit-persimmon';          -- Diospyros kaki, Zone 7 (Asian persimmon)
UPDATE plant_species SET min_temp_c = 2 WHERE slug = 'fruit-quandong';             -- Santalum acuminatum, Zone 10 (Australian native)
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'fruit-sea-buckthorn';      -- Hippophae rhamnoides, Zone 3

-- --- Herbs ---
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'anise-hyssop';             -- Agastache foeniculum, Zone 4
UPDATE plant_species SET min_temp_c = -2 WHERE slug = 'buckwheat';                 -- Fagopyrum esculentum, frost-tender annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'burdock';                  -- Arctium lappa, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'catmint';                  -- Nepeta x faassenii, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'coltsfoot';                -- Tussilago farfara, Zone 3
UPDATE plant_species SET min_temp_c = -7 WHERE slug = 'corsican-mint';             -- Mentha requienii, Zone 7
UPDATE plant_species SET min_temp_c = -15 WHERE slug = 'crimson-clover';           -- Trifolium incarnatum, Zone 6 annual
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'epazote';                   -- Dysphania ambrosioides, tender annual
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'fennel-perennial';         -- Foeniculum vulgare, Zone 6
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'feverfew';                 -- Tanacetum parthenium, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'garden-sorrel';            -- Rumex acetosa, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'herb-angelica';            -- Angelica archangelica, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'herb-catmint-ornamental';  -- Nepeta x faassenii, Zone 4
UPDATE plant_species SET min_temp_c = 0 WHERE slug = 'herb-gotu-kola';             -- Centella asiatica, Zone 9
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'herb-milk-thistle';        -- Silybum marianum, Zone 5 (self-sows)
UPDATE plant_species SET min_temp_c = -5 WHERE slug = 'herb-sage-pineapple';       -- Salvia elegans, Zone 8
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'herb-skullcap';            -- Scutellaria lateriflora, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'herb-st-johns-wort';       -- Hypericum perforatum, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'herb-sweet-woodruff';      -- Galium odoratum, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'herb-tansy';               -- Tanacetum vulgare, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'herb-wormwood';            -- Artemisia absinthium, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'hyssop';                   -- Hyssopus officinalis, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'italian-ryegrass';         -- Lolium multiflorum, Zone 6
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'joe-pye-weed';             -- Eutrochium purpureum, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'kidney-vetch';             -- Anthyllis vulneraria, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'lemon-balm';               -- Melissa officinalis, Zone 4
UPDATE plant_species SET min_temp_c = -15 WHERE slug = 'lupin-yellow';             -- Lupinus luteus, Zone 6 annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'monarda';                  -- Monarda didyma, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'monarda-wild';             -- Monarda fistulosa, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'mugwort';                  -- Artemisia vulgaris, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'mullein';                  -- Verbascum thapsus, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'oats-green-manure';        -- Avena sativa, Zone 5 (dies at hard frost)
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'pennyroyal';               -- Mentha pulegium, Zone 6
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'perennial-pea';            -- Lathyrus latifolius, Zone 4
UPDATE plant_species SET min_temp_c = -7 WHERE slug = 'phacelia-covercrop';        -- Phacelia tanacetifolia, Zone 7 (annual, killed by hard frost)
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'red-clover';               -- Trifolium pratense, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'rue';                      -- Ruta graveolens, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'russian-comfrey';          -- Symphytum x uplandicum, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'rye-cereal';               -- Secale cereale, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'self-heal';                -- Prunella vulgaris, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'sheep-sorrel';             -- Rumex acetosella, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'sheep-sorrel-2';           -- Rumex acetosella, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'southernwood';             -- Artemisia abrotanum, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'sweet-clover';             -- Melilotus officinalis, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tansy';                    -- Tanacetum vulgare, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'thyme-creeping';           -- Thymus serpyllum, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'valerian';                 -- Valeriana officinalis, Zone 4
UPDATE plant_species SET min_temp_c = -7 WHERE slug = 'verbena-blue';              -- Verbena hastata, Zone 3 (but marked half_hardy; perennial roots survive -29, stems die back)
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'vetch-common';             -- Vicia sativa, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'white-clover';             -- Trifolium repens, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'woolly-thyme';             -- Thymus pseudolanuginosus, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'wormwood';                 -- Artemisia absinthium, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'yellow-dock';              -- Rumex crispus, Zone 3

-- --- Ornamentals ---
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'ajuga-reptans';            -- Ajuga reptans, Zone 4
UPDATE plant_species SET min_temp_c = -3 WHERE slug = 'alyssum';                   -- Lobularia maritima, Zone 9 annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'alyssum-perennial';        -- Aurinia saxatilis, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'asclepias';                -- Asclepias tuberosa, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'astilbe';                  -- Astilbe x arendsii, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'black-eyed-susan';         -- Rudbeckia fulgida, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'bleeding-heart';           -- Lamprocapnos spectabilis, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'brunnera';                 -- Brunnera macrophylla, Zone 3
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'californian-poppy';        -- Eschscholzia californica, Zone 6 annual (self-sows)
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'campanula';                -- Campanula persicifolia, Zone 3
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'chinese-silver-grass';     -- Miscanthus sinensis, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'climbing-honeysuckle';     -- Lonicera periclymenum, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'climbing-rose-rambling';   -- Rosa multiflora, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'columbine';                -- Aquilegia vulgaris, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'coreopsis';                -- Coreopsis grandiflora, Zone 4
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'cosmos';                    -- Cosmos bipinnatus, tender annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'creeping-jenny';           -- Lysimachia nummularia, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'daylily';                  -- Hemerocallis fulva, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'delphinium';               -- Delphinium x cultorum, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'echinacea';                -- Echinacea purpurea, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'foxglove';                 -- Digitalis purpurea, Zone 4 (biennial)
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'gaillardia';               -- Gaillardia x grandiflora, Zone 5 (short-lived)
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'gaura';                    -- Oenothera lindheimeri, Zone 6
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'geranium-hardy';           -- Geranium sanguineum, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'globe-thistle';            -- Echinops ritro, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'heliopsis';                -- Heliopsis helianthoides, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'helleborus';               -- Helleborus orientalis, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'heuchera';                 -- Heuchera x hybrida, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'hollyhock';                -- Alcea rosea, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'hosta';                    -- Hosta spp., Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'iris';                     -- Iris germanica, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'lupin';                    -- Lupinus polyphyllus, Zone 4
UPDATE plant_species SET min_temp_c = -2 WHERE slug = 'marigold';                  -- Tagetes patula, tender annual
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'mazus';                    -- Mazus reptans, Zone 5
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'miscanthus-giant';         -- Miscanthus x giganteus, Zone 5
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'nasturtium';                -- Tropaeolum majus, tender annual
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'penstemon';                -- Penstemon x hybrida, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'peony';                    -- Paeonia lactiflora, Zone 3
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'petunia';                   -- Petunia x hybrida, tender annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'phlox';                    -- Phlox paniculata, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'poppy';                    -- Papaver rhoeas, Zone 6 annual (seeds survive colder)
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'primrose';                 -- Primula vulgaris, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'pulmonaria';               -- Pulmonaria officinalis, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'rudbeckia';                -- Rudbeckia hirta, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'salvia';                   -- Salvia nemorosa, Zone 4 (but marked half_hardy)
UPDATE plant_species SET min_temp_c = -15 WHERE slug = 'scabiosa';                 -- Scabiosa atropurpurea, Zone 6 annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'sedum';                    -- Sedum spectabile, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'shasta-daisy';             -- Leucanthemum x superbum, Zone 4
UPDATE plant_species SET min_temp_c = -5 WHERE slug = 'snapdragon';                -- Antirrhinum majus, Zone 7
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'snow-in-summer';           -- Cerastium tomentosum, Zone 3
UPDATE plant_species SET min_temp_c = -2 WHERE slug = 'sunflower';                 -- Helianthus annuus, tender annual
UPDATE plant_species SET min_temp_c = -2 WHERE slug = 'sunflower-biomass';         -- Helianthus annuus, tender annual
UPDATE plant_species SET min_temp_c = -15 WHERE slug = 'sweet-pea';                -- Lathyrus odoratus, Zone 6 annual (hardy seedlings to -5 or so)
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'trillium';                 -- Trillium grandiflorum, Zone 3
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'verbena-bonariensis';      -- Verbena bonariensis, Zone 7
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'veronica';                 -- Veronica spicata, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'yarrow';                   -- Achillea millefolium, Zone 3
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'zinnia';                    -- Zinnia elegans, tender annual

-- --- Shrubs ---
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'blackthorn';               -- Prunus spinosa, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'dogwood-blood-red';        -- Cornus sanguinea, Zone 5
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'dogwood-red-stem';         -- Cornus alba, Zone 2
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'escallonia-hedge';         -- Escallonia x exoniensis, Zone 8
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'gorse-hedge';              -- Ulex europaeus, Zone 7
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'griselinia-hedge';         -- Griselinia littoralis, Zone 8
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'hazel-hedge';              -- Corylus avellana, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'indigo-bush';              -- Amorpha fruticosa, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'privet-common';            -- Ligustrum vulgare, Zone 5
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'privet-oval-leaf';         -- Ligustrum ovalifolium, Zone 6
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'rosa-rugosa-hedge';        -- Rosa rugosa, Zone 3

-- --- Trees ---
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'ash-manna';               -- Fraxinus ornus, Zone 6
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'beech-hedge-copper';       -- Fagus sylvatica f. purpurea, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'beech-hedge-green';        -- Fagus sylvatica, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'elm-english';              -- Ulmus procera, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'ginkgo-biloba';            -- Ginkgo biloba, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'honey-locust';             -- Gleditsia triacanthos, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'hornbeam-hedge';           -- Carpinus betulus, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'linden-largeleaf';         -- Tilia platyphyllos, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'linden-smallleaf';         -- Tilia cordata, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'maple-freeman';            -- Acer x freemanii, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'maple-sugar';              -- Acer saccharum, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'pecan';                    -- Carya illinoinensis, Zone 6
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'plane-london';             -- Platanus x hispanica, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'poplar-hybrid';            -- Populus x canadensis, Zone 3
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'sweet-chestnut';           -- Castanea sativa, Zone 5
UPDATE plant_species SET min_temp_c = -7 WHERE slug = 'tree-acacia-baileyana';     -- Acacia baileyana, Zone 9
UPDATE plant_species SET min_temp_c = -5 WHERE slug = 'tree-acacia-dealbata';      -- Acacia dealbata, Zone 9
UPDATE plant_species SET min_temp_c = -4 WHERE slug = 'tree-acacia-longifolia';    -- Acacia longifolia, Zone 9
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'tree-albizia-julibrissin'; -- Albizia julibrissin, Zone 7
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-alder-black';         -- Alnus glutinosa, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-alder-common';        -- Alnus glutinosa, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-alder-green';         -- Alnus viridis, Zone 2
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-alder-grey';          -- Alnus incana, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-alder-red';           -- Alnus rubra, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-aldershade-american'; -- Betula alleghaniensis, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-amber-maple';         -- Acer ginnala, Zone 2
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-arborvitae-thuja';    -- Thuja occidentalis, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-ash-european';        -- Fraxinus excelsior, Zone 4
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-aspen';               -- Populus tremula, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-beech';               -- Fagus sylvatica, Zone 4
UPDATE plant_species SET min_temp_c = -7 WHERE slug = 'tree-black-acacia';         -- Acacia melanoxylon, Zone 9
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-black-locust';        -- Robinia pseudoacacia, Zone 4
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-black-spruce';        -- Picea mariana, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-black-willow';        -- Salix nigra, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-blue-spruce';         -- Picea pungens, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-caragana-arborescens'; -- Caragana arborescens, Zone 2
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-cedar-atlas';         -- Cedrus atlantica, Zone 6
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-cedar-lebanon';       -- Cedrus libani, Zone 6
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-copper-beech';        -- Fagus sylvatica f. purpurea, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-corsican-pine';       -- Pinus nigra subsp. laricio, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-crabapple-ornamental'; -- Malus x floribunda, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-douglas-fir';         -- Pseudotsuga menziesii, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-downy-birch';         -- Betula pubescens, Zone 3
UPDATE plant_species SET min_temp_c = -15 WHERE slug = 'tree-eleagnus-ebbingei';   -- Elaeagnus x ebbingei, Zone 7
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-eleagnus-silverberry'; -- Elaeagnus commutata, Zone 2
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-elm-siberian';        -- Ulmus pumila, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-elm-wych';            -- Ulmus glabra, Zone 4
UPDATE plant_species SET min_temp_c = -14 WHERE slug = 'tree-eucalyptus-gunnii';   -- Eucalyptus gunnii, Zone 7 (hardiest eucalyptus)
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-eucalyptus-niphophila'; -- Eucalyptus niphophila, Zone 7 (snow gum)
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-european-fir';        -- Abies alba, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-field-maple';         -- Acer campestre, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-golden-chain';        -- Laburnum x watereri, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-golden-rain';         -- Koelreuteria paniculata, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-hackberry-common';    -- Celtis occidentalis, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-hawthorn-common';     -- Crataegus monogyna, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-hawthorn-crimson';    -- Crataegus laevigata, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-hawthorn-midland';    -- Crataegus laevigata, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-hazel-harry-lauder';  -- Corylus avellana, Zone 4
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-hazel-treeform';      -- Corylus avellana, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-holly';               -- Ilex aquifolium, Zone 6
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-honey-locust';        -- Gleditsia triacanthos, Zone 4
UPDATE plant_species SET min_temp_c = -45 WHERE slug = 'tree-honeyberry-treeform'; -- Lonicera caerulea, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-hornbeam';            -- Carpinus betulus, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-japanese-maple';      -- Acer palmatum, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-japanese-zelkova';    -- Zelkova serrata, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-juneberry';           -- Amelanchier lamarckii, Zone 4
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-juniper-common';      -- Juniperus communis, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-katsura';             -- Cercidiphyllum japonicum, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-larch-european';      -- Larix decidua, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-lawson-cypress';      -- Chamaecyparis lawsoniana, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-lilac-treeform';      -- Syringa vulgaris, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-lime-small-leaved';   -- Tilia cordata, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-lodgepole-pine';      -- Pinus contorta, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-london-plane';        -- Platanus x hispanica, Zone 5
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'tree-magnolia-grandiflora'; -- Magnolia grandiflora, Zone 7
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-magnolia-soulangea';  -- Magnolia x soulangeana, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-magnolia-stellata';   -- Magnolia stellata, Zone 4
UPDATE plant_species SET min_temp_c = -7 WHERE slug = 'tree-mesquite';             -- Prosopis glandulosa, Zone 8
UPDATE plant_species SET min_temp_c = -5 WHERE slug = 'tree-mimosa';               -- Acacia dealbata, Zone 9
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'tree-monterey-pine';       -- Pinus radiata, Zone 8
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-mountain-ash-dwarf';  -- Sorbus aucuparia, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-norway-maple';        -- Acer platanoides, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-norway-spruce';       -- Picea abies, Zone 2
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-oak-burr';            -- Quercus macrocarpa, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-oak-english';         -- Quercus robur, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-oak-red';             -- Quercus rubra, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-pagoda-tree';         -- Styphnolobium japonicum, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-paperbark-maple';     -- Acer griseum, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-ponderosa-pine';      -- Pinus ponderosa, Zone 3
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-poplar-lombardy';     -- Populus nigra, Zone 3
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-poplar-white';        -- Populus alba, Zone 4
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-red-maple';           -- Acer rubrum, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-redbud-eastern';      -- Cercis canadensis, Zone 5
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-redwood-giant';       -- Sequoiadendron giganteum, Zone 6
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-rowan-mountain-ash';  -- Sorbus aucuparia, Zone 3
UPDATE plant_species SET min_temp_c = -40 WHERE slug = 'tree-scots-pine';          -- Pinus sylvestris, Zone 2
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-sequoia-dawn';        -- Metasequoia glyptostroboides, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-service-tree';        -- Sorbus domestica, Zone 6
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-serviceberry-treeform'; -- Amelanchier canadensis, Zone 3
UPDATE plant_species SET min_temp_c = 2 WHERE slug = 'tree-she-oak';               -- Casuarina equisetifolia, Zone 10
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'tree-silk-tree';           -- Albizia julibrissin, Zone 7
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-silver-birch';        -- Betula pendula, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-silver-linden';       -- Tilia tomentosa, Zone 5
UPDATE plant_species SET min_temp_c = -34 WHERE slug = 'tree-silver-maple';        -- Acer saccharinum, Zone 3
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-smoke-tree';          -- Cotinus coggygria, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-snowy-mespilus';      -- Amelanchier x grandiflora, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-sweet-chestnut';      -- Castanea sativa, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-sweetgum';            -- Liquidambar styraciflua, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-sycamore';            -- Acer pseudoplatanus, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-sycamore-japanese';   -- Acer pictum, Zone 5
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'tree-tamarisk';            -- Tamarix ramosissima, Zone 7
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'tree-texas-mountain-laurel'; -- Dermatophyllum secundiflorum, Zone 8
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-tulip-poplar';        -- Liriodendron tulipifera, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'tree-weeping-willow';      -- Salix x sepulcralis, Zone 4
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'tree-western-redcedar';    -- Thuja plicata, Zone 5
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tree-yew-english';         -- Taxus baccata, Zone 6
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'tulip-tree';               -- Liriodendron tulipifera, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'walnut-black';             -- Juglans nigra, Zone 4
UPDATE plant_species SET min_temp_c = -23 WHERE slug = 'walnut-english';           -- Juglans regia, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'willow-coppice';           -- Salix viminalis, Zone 4

-- --- Vegetables ---
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'amaranth-leaves';           -- Amaranthus tricolor, tropical annual
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'burdock-root';             -- Arctium lappa, Zone 3
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'cardoon';                  -- Cynara cardunculus, Zone 7
UPDATE plant_species SET min_temp_c = 0 WHERE slug = 'cassava';                    -- Manihot esculenta, Zone 10
UPDATE plant_species SET min_temp_c = 0 WHERE slug = 'chayote';                    -- Sechium edule, Zone 9
UPDATE plant_species SET min_temp_c = -3 WHERE slug = 'chickpea';                  -- Cicer arietinum, half-hardy annual
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'cowpea-blackeye';           -- Vigna unguiculata, tender annual
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'cucumber-pickling';         -- Cucumis sativus, tender annual
UPDATE plant_species SET min_temp_c = -3 WHERE slug = 'fenugreek-greens';          -- Trigonella foenum-graecum, half-hardy annual
UPDATE plant_species SET min_temp_c = 5 WHERE slug = 'ginger';                     -- Zingiber officinale, tropical
UPDATE plant_species SET min_temp_c = 0 WHERE slug = 'jicama';                     -- Pachyrhizus erosus, tropical
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'lima-bean';                 -- Phaseolus lunatus, tender annual
UPDATE plant_species SET min_temp_c = 3 WHERE slug = 'malabar-spinach';            -- Basella alba, tropical
UPDATE plant_species SET min_temp_c = -3 WHERE slug = 'purslane';                  -- Portulaca oleracea, half-hardy annual
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'rakkyo';                   -- Allium chinense, Zone 6
UPDATE plant_species SET min_temp_c = -10 WHERE slug = 'romanesco';                -- Brassica oleracea var. botrytis, Zone 7
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'sorrel';                   -- Rumex acetosa, Zone 3
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'squash-pattypan';           -- Cucurbita pepo, tender annual
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'squash-spaghetti';          -- Cucurbita pepo, tender annual
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'squash-winter';             -- Cucurbita moschata, tender annual
UPDATE plant_species SET min_temp_c = -1 WHERE slug = 'squash-yellow';             -- Cucurbita pepo, tender annual
UPDATE plant_species SET min_temp_c = 2 WHERE slug = 'taro';                       -- Colocasia esculenta, Zone 9
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'watercress';               -- Nasturtium officinale, Zone 7 (aquatic perennial)
UPDATE plant_species SET min_temp_c = -3 WHERE slug = 'yacon';                     -- Smallanthus sonchifolius, tubers survive mild frost

-- --- Vines ---
UPDATE plant_species SET min_temp_c = -18 WHERE slug = 'akebia';                   -- Akebia quinata, Zone 5
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'hop-common';               -- Humulus lupulus, Zone 4
UPDATE plant_species SET min_temp_c = -12 WHERE slug = 'passionflower';            -- Passiflora caerulea, Zone 7
UPDATE plant_species SET min_temp_c = -29 WHERE slug = 'schisandra';               -- Schisandra chinensis, Zone 4


-- ============================================================================
-- SECTION 2: poisonous_to_humans (117 species)
-- ============================================================================

-- --- Fruits ---
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-blackcurrant';    -- Ribes nigrum, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-currant';          -- Ribes rubrum, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-gooseberry';       -- Ribes uva-crispa, edible fruit

-- --- Fruit Trees ---
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-black-walnut';    -- Juglans nigra, edible nuts
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'fruit-elder';             -- Sambucus nigra, raw berries/leaves/bark contain cyanogenic glycosides
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-gage';             -- Prunus domestica, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-hackberry';        -- Celtis occidentalis, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-hardy-kiwi';       -- Actinidia arguta, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-hazelnut';         -- Corylus avellana, edible nut
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-hybrid-shipova';   -- x Sorbopyrus auricularis, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-juniper-berry';    -- Juniperus communis, culinary use (gin)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-mirabelle';        -- Prunus domestica, edible fruit
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'fruit-mountain-ash';      -- Sorbus aucuparia, raw berries contain parasorbic acid (cooked are fine)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-quandong';         -- Santalum acuminatum, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-saskatoon';        -- Amelanchier alnifolia, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-serviceberry';     -- Amelanchier canadensis, edible fruit
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-sweet-chestnut';   -- Castanea sativa, edible nut
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fruit-walnut';           -- Juglans regia, edible nut

-- --- Herbs ---
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'buckwheat';              -- Fagopyrum esculentum, edible grain (photosensitivity in livestock, not humans at culinary doses)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'chervil';                -- Anthriscus cerefolium, culinary herb
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'coltsfoot';               -- Tussilago farfara, contains pyrrolizidine alkaloids (hepatotoxic)
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'epazote';                 -- Dysphania ambrosioides, toxic in large quantities (ascaridole)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fennel-perennial';       -- Foeniculum vulgare, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-anise-hyssop';      -- Agastache foeniculum, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-basil-sweet';       -- Ocimum basilicum, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-basil-thai';        -- Ocimum basilicum var. thyrsiflorum, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-coriander-leaf';    -- Coriandrum sativum, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-dill-leaf';         -- Anethum graveolens, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-gotu-kola';         -- Centella asiatica, culinary/medicinal herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-holy-basil';        -- Ocimum tenuiflorum, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-parsley-flat';      -- Petroselinum crispum, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-sage-purple';       -- Salvia officinalis, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-savoury-winter';    -- Satureja montana, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-sorrel-common';     -- Rumex acetosa, culinary herb (oxalic acid in large quantities)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'herb-valerian';          -- Valeriana officinalis, medicinal herb, safe at normal doses
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'hyssop';                 -- Hyssopus officinalis, culinary herb
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'kidney-vetch';           -- Anthyllis vulneraria, traditional medicinal, not toxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'lemon-balm';             -- Melissa officinalis, culinary herb
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'lupin-yellow';            -- Lupinus luteus, contains quinolizidine alkaloids (seeds toxic if not processed)
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'pennyroyal';              -- Mentha pulegium, pulegone is hepatotoxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'phacelia-covercrop';     -- Phacelia tanacetifolia, not toxic (skin irritant for some)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'rye-cereal';             -- Secale cereale, edible grain
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'sheep-sorrel-2';         -- Rumex acetosella, edible in small amounts
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'sweet-clover';            -- Melilotus officinalis, contains coumarin, can form dicoumarol when spoiled
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'white-clover';           -- Trifolium repens, edible (flowers, leaves)

-- --- Ornamentals ---
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'miscanthus-giant';       -- Miscanthus x giganteus, not toxic (grass)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'rose';                   -- Rosa x hybrida, not toxic (petals edible)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'sunflower-biomass';      -- Helianthus annuus, not toxic (seeds edible)

-- --- Shrubs ---
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'gorse-hedge';             -- Ulex europaeus, seeds contain toxins
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'griselinia-hedge';        -- Griselinia littoralis, berries may cause GI upset
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'hazel-hedge';            -- Corylus avellana, edible nuts

-- --- Trees ---
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'hornbeam-hedge';         -- Carpinus betulus, not toxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'linden-smallleaf';       -- Tilia cordata, flowers make safe tea
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'sweet-chestnut';         -- Castanea sativa, edible nuts
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-acacia-longifolia'; -- Acacia longifolia, not notably toxic to humans
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-alder-black';       -- Alnus glutinosa, not toxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-alder-red';         -- Alnus rubra, not toxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-black-acacia';      -- Acacia melanoxylon, not notably toxic to humans
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'tree-eucalyptus-niphophila'; -- Eucalyptus niphophila, oil is toxic if ingested
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-hawthorn-common';   -- Crataegus monogyna, berries edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-hazel-treeform';    -- Corylus avellana, edible nuts
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-honey-locust';      -- Gleditsia triacanthos, pods edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-honeyberry-treeform'; -- Lonicera caerulea, edible berries
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-london-plane';      -- Platanus x hispanica, not toxic
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'tree-mesquite';           -- Prosopis glandulosa, pods edible but thorns; pods safe, marking false
-- (correcting mesquite: pods are edible)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-mesquite';
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-mimosa';            -- Acacia dealbata, not notably toxic to humans
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'tree-rowan-mountain-ash'; -- Sorbus aucuparia, raw berries contain parasorbic acid
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-she-oak';           -- Casuarina equisetifolia, not toxic
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'tree-silk-tree';          -- Albizia julibrissin, seeds/pods mildly toxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tree-sycamore-japanese'; -- Acer pictum, not toxic
UPDATE plant_species SET poisonous_to_humans = 1 WHERE slug = 'tree-texas-mountain-laurel'; -- Dermatophyllum secundiflorum, seeds highly toxic (cytisine)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tulip-tree';             -- Liriodendron tulipifera, not notably toxic
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'walnut-english';         -- Juglans regia, edible nuts

-- --- Vegetables ---
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'artichoke-globe';        -- Cynara scolymus, edible vegetable
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'black-salsify';          -- Scorzonera hispanica, edible root
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'burdock-root';           -- Arctium lappa, edible root (gobo)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'cabbage-green';          -- Brassica oleracea, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'cabbage-red';            -- Brassica oleracea, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'cabbage-savoy';          -- Brassica oleracea, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'chayote';                -- Sechium edule, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'cowpea-blackeye';        -- Vigna unguiculata, edible (cooked)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'cucumber';               -- Cucumis sativus, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'escarole';               -- Cichorium endivia, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fava-bean';              -- Vicia faba, edible (risk of favism in G6PD deficiency)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'fenugreek-greens';       -- Trigonella foenum-graecum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'french-bean';            -- Phaseolus vulgaris, edible (cooked; raw contains lectins)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'kale-lacinato';          -- Brassica oleracea, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'leek';                   -- Allium ampeloprasum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'lettuce-iceberg';        -- Lactuca sativa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'lettuce-looseleaf';      -- Lactuca sativa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'lima-bean';              -- Phaseolus lunatus, edible (cooked; raw contains linamarin)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'melon-cantaloupe';       -- Cucumis melo, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'mizuna';                 -- Brassica rapa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'multiplier-onion';       -- Allium cepa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'pak-choi';               -- Brassica rapa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'pea';                    -- Pisum sativum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'peas-snap';              -- Pisum sativum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'peas-snow';              -- Pisum sativum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'pepper';                 -- Capsicum annuum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'pepper-sweet';           -- Capsicum annuum, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'radicchio';              -- Cichorium intybus, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'rakkyo';                 -- Allium chinense, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'romanesco';              -- Brassica oleracea, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'salsify';                -- Tragopogon porrifolius, edible root
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'scarlet-runner-bean';    -- Phaseolus coccineus, edible (cooked)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'shallot';                -- Allium cepa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'sprouting-broccoli';     -- Brassica oleracea, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'squash-pattypan';        -- Cucurbita pepo, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'squash-spaghetti';       -- Cucurbita pepo, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'squash-yellow';          -- Cucurbita pepo, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'sweetcorn';              -- Zea mays, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tatsoi';                 -- Brassica rapa, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tomatillo';              -- Physalis philadelphica, edible (ripe fruit only)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tomato-cherry';          -- Solanum lycopersicum, fruit edible (leaves toxic)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'tomato-plum';            -- Solanum lycopersicum, fruit edible (leaves toxic)
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'watercress';             -- Nasturtium officinale, edible
UPDATE plant_species SET poisonous_to_humans = 0 WHERE slug = 'yacon';                  -- Smallanthus sonchifolius, edible tuber


-- ============================================================================
-- SECTION 3: poisonous_to_pets (116 species)
-- Cats and dogs are more sensitive. Allium family = toxic to pets.
-- ============================================================================

-- --- Fruits ---
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-blackcurrant';       -- Ribes nigrum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-currant';             -- Ribes rubrum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-gooseberry';          -- Ribes uva-crispa, safe for pets

-- --- Fruit Trees ---
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-black-walnut';        -- Juglans nigra, toxic to dogs (juglone)
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-elder';                -- Sambucus nigra, toxic to pets (cyanogenic glycosides)
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-gage';                 -- Prunus domestica, pits contain cyanide; risk of obstruction
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-hackberry';           -- Celtis occidentalis, not toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-hardy-kiwi';          -- Actinidia arguta, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-hazelnut';            -- Corylus avellana, not toxic (choking risk)
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-hybrid-shipova';      -- x Sorbopyrus auricularis, not known to be toxic
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-juniper-berry';        -- Juniperus communis, essential oils toxic to cats/dogs
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-mirabelle';            -- Prunus domestica, pits contain cyanide
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-mountain-ash';         -- Sorbus aucuparia, berries cause GI upset in pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-quandong';            -- Santalum acuminatum, not known toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-saskatoon';           -- Amelanchier alnifolia, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-serviceberry';        -- Amelanchier canadensis, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fruit-sweet-chestnut';      -- Castanea sativa, safe in small amounts
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fruit-walnut';               -- Juglans regia, can cause GI upset; moldy walnuts produce tremorgenic mycotoxins

-- --- Herbs ---
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'buckwheat';                 -- Fagopyrum esculentum, not notably toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'chervil';                   -- Anthriscus cerefolium, safe for pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'coltsfoot';                  -- Tussilago farfara, pyrrolizidine alkaloids toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'epazote';                    -- Dysphania ambrosioides, toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'fennel-perennial';           -- Foeniculum vulgare, essential oils can be toxic to cats
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-anise-hyssop';         -- Agastache foeniculum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-basil-sweet';          -- Ocimum basilicum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-basil-thai';           -- Ocimum basilicum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-coriander-leaf';       -- Coriandrum sativum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-dill-leaf';            -- Anethum graveolens, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-gotu-kola';            -- Centella asiatica, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-holy-basil';           -- Ocimum tenuiflorum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-parsley-flat';         -- Petroselinum crispum, safe in small amounts
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-sage-purple';          -- Salvia officinalis, safe for pets in small amounts
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'herb-savoury-winter';       -- Satureja montana, safe for pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'herb-sorrel-common';         -- Rumex acetosa, oxalates toxic to pets in quantity
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'herb-valerian';              -- Valeriana officinalis, can cause GI upset/sedation in pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'hyssop';                    -- Hyssopus officinalis, not notably toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'kidney-vetch';              -- Anthyllis vulneraria, not known toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'lemon-balm';                -- Melissa officinalis, safe for pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'lupin-yellow';               -- Lupinus luteus, alkaloids toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'pennyroyal';                 -- Mentha pulegium, highly toxic to pets (liver failure)
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'phacelia-covercrop';        -- Phacelia tanacetifolia, not toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'rye-cereal';                -- Secale cereale, not toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'sheep-sorrel-2';             -- Rumex acetosella, oxalates toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'sweet-clover';               -- Melilotus officinalis, coumarin/dicoumarol toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'white-clover';              -- Trifolium repens, generally safe for pets

-- --- Ornamentals ---
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'miscanthus-giant';          -- Miscanthus x giganteus, not toxic
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'rose';                       -- Rosa x hybrida, thorns can injure; GI upset from large amounts but not truly toxic. Marking false.
-- (correcting rose: ASPCA lists roses as non-toxic to dogs and cats)
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'rose';
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'sunflower-biomass';         -- Helianthus annuus, not toxic to pets

-- --- Shrubs ---
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'gorse-hedge';                -- Ulex europaeus, seeds contain toxins
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'griselinia-hedge';           -- Griselinia littoralis, berries may cause GI issues
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'hazel-hedge';               -- Corylus avellana, not toxic

-- --- Trees ---
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'hornbeam-hedge';            -- Carpinus betulus, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'linden-smallleaf';          -- Tilia cordata, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'sweet-chestnut';            -- Castanea sativa, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-acacia-longifolia';    -- Acacia longifolia, not notably toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-alder-black';          -- Alnus glutinosa, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-alder-red';            -- Alnus rubra, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-black-acacia';         -- Acacia melanoxylon, not notably toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tree-eucalyptus-niphophila'; -- Eucalyptus niphophila, eucalyptus oil toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-hawthorn-common';      -- Crataegus monogyna, not toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-hazel-treeform';       -- Corylus avellana, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-honey-locust';         -- Gleditsia triacanthos, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-honeyberry-treeform';  -- Lonicera caerulea, edible berries, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-london-plane';         -- Platanus x hispanica, not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-mesquite';             -- Prosopis glandulosa, pods not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-mimosa';               -- Acacia dealbata, not notably toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tree-rowan-mountain-ash';    -- Sorbus aucuparia, berries cause GI upset in pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-she-oak';              -- Casuarina equisetifolia, not toxic
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tree-silk-tree';             -- Albizia julibrissin, ASPCA lists as toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tree-sycamore-japanese';    -- Acer pictum, not notably toxic
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tree-texas-mountain-laurel'; -- Dermatophyllum secundiflorum, seeds highly toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'walnut-english';            -- Juglans regia, not as toxic as black walnut; still risky moldy but marking false for tree itself

-- --- Vegetables ---
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'artichoke-globe';           -- Cynara scolymus, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'black-salsify';             -- Scorzonera hispanica, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'burdock-root';              -- Arctium lappa, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'cabbage-green';             -- Brassica oleracea, safe (GI upset in large amounts)
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'cabbage-red';               -- Brassica oleracea, safe
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'cabbage-savoy';             -- Brassica oleracea, safe
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'chayote';                   -- Sechium edule, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'cowpea-blackeye';           -- Vigna unguiculata, safe for pets (cooked)
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'cucumber';                  -- Cucumis sativus, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'escarole';                  -- Cichorium endivia, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fava-bean';                 -- Vicia faba, safe for pets in small amounts
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'fenugreek-greens';          -- Trigonella foenum-graecum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'french-bean';               -- Phaseolus vulgaris, safe when cooked
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'kale-lacinato';             -- Brassica oleracea, safe for pets in moderation
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'leek';                       -- Allium ampeloprasum, ALLIUM = toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'lettuce-iceberg';           -- Lactuca sativa, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'lettuce-looseleaf';         -- Lactuca sativa, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'lima-bean';                 -- Phaseolus lunatus, safe when cooked
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'melon-cantaloupe';          -- Cucumis melo, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'mizuna';                    -- Brassica rapa, safe for pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'multiplier-onion';           -- Allium cepa, ALLIUM = toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'pak-choi';                  -- Brassica rapa, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'pea';                       -- Pisum sativum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'peas-snap';                 -- Pisum sativum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'peas-snow';                 -- Pisum sativum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'pepper';                    -- Capsicum annuum, mild GI upset possible but not toxic
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'pepper-sweet';              -- Capsicum annuum, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'radicchio';                 -- Cichorium intybus, safe for pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'rakkyo';                     -- Allium chinense, ALLIUM = toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'romanesco';                 -- Brassica oleracea, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'salsify';                   -- Tragopogon porrifolius, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'scarlet-runner-bean';       -- Phaseolus coccineus, safe when cooked
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'shallot';                    -- Allium cepa, ALLIUM = toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'sprouting-broccoli';        -- Brassica oleracea, safe for pets in moderation
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'squash-pattypan';           -- Cucurbita pepo, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'squash-spaghetti';          -- Cucurbita pepo, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'squash-yellow';             -- Cucurbita pepo, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'sweetcorn';                 -- Zea mays, safe for pets (cob is choking hazard)
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'tatsoi';                    -- Brassica rapa, safe for pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tomatillo';                  -- Physalis philadelphica, Solanaceae; unripe fruit/leaves toxic to pets
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tomato-cherry';              -- Solanum lycopersicum, leaves/stems toxic to pets (solanine/tomatine)
UPDATE plant_species SET poisonous_to_pets = 1 WHERE slug = 'tomato-plum';                -- Solanum lycopersicum, leaves/stems toxic to pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'watercress';                -- Nasturtium officinale, safe for pets
UPDATE plant_species SET poisonous_to_pets = 0 WHERE slug = 'yacon';                     -- Smallanthus sonchifolius, safe for pets


-- ============================================================================
-- SECTION 4: Vegetable maturity data (16 vegetables)
-- days_to_maturity_min, days_to_maturity_max, maturity_basis
-- ============================================================================

UPDATE plant_species SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 60,
  maturity_basis = 'from_sowing'
WHERE slug = 'swiss-chard';
-- Beta vulgaris Cicla Group: 50-60 days from direct sowing to first harvest

UPDATE plant_species SET
  days_to_maturity_min = 210,
  days_to_maturity_max = 270,
  maturity_basis = 'from_sowing'
WHERE slug = 'elephant-garlic';
-- Allium ampeloprasum: planted as cloves in autumn, 7-9 months to harvest

UPDATE plant_species SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 90,
  maturity_basis = 'from_sowing'
WHERE slug = 'garlic-chive';
-- Allium tuberosum: 60-90 days from seed to first light harvest

UPDATE plant_species SET
  days_to_maturity_min = 210,
  days_to_maturity_max = 270,
  maturity_basis = 'from_sowing'
WHERE slug = 'rakkyo';
-- Allium chinense: planted as bulbs, 7-9 months to harvest

UPDATE plant_species SET
  days_to_maturity_min = 40,
  days_to_maturity_max = 55,
  maturity_basis = 'from_sowing'
WHERE slug = 'amaranth-leaves';
-- Amaranthus tricolor: 40-55 days from sowing for leaf harvest

UPDATE plant_species SET
  days_to_maturity_min = 120,
  days_to_maturity_max = 180,
  maturity_basis = 'from_sowing'
WHERE slug = 'burdock-root';
-- Arctium lappa: 120-180 days from sowing to root harvest (gobo)

UPDATE plant_species SET
  days_to_maturity_min = 21,
  days_to_maturity_max = 35,
  maturity_basis = 'from_sowing'
WHERE slug = 'fenugreek-greens';
-- Trigonella foenum-graecum: 21-35 days from sowing for leaf harvest (microgreen to full leaf)

UPDATE plant_species SET
  days_to_maturity_min = 55,
  days_to_maturity_max = 80,
  maturity_basis = 'from_sowing'
WHERE slug = 'malabar-spinach';
-- Basella alba: 55-80 days from sowing to harvest (vining, cut-and-come-again)

UPDATE plant_species SET
  days_to_maturity_min = 90,
  days_to_maturity_max = 120,
  maturity_basis = 'from_sowing'
WHERE slug = 'chickpea';
-- Cicer arietinum: 90-120 days from sowing to dry harvest

UPDATE plant_species SET
  days_to_maturity_min = 180,
  days_to_maturity_max = 240,
  maturity_basis = 'from_sowing'
WHERE slug = 'taro';
-- Colocasia esculenta: 180-240 days from planting corms to harvest

UPDATE plant_species SET
  days_to_maturity_min = 120,
  days_to_maturity_max = 150,
  maturity_basis = 'from_sowing'
WHERE slug = 'jerusalem-artichoke';
-- Helianthus tuberosus: 120-150 days from planting tubers to harvest

UPDATE plant_species SET
  days_to_maturity_min = 240,
  days_to_maturity_max = 365,
  maturity_basis = 'from_sowing'
WHERE slug = 'cassava';
-- Manihot esculenta: 8-12 months from stem cuttings to root harvest

UPDATE plant_species SET
  days_to_maturity_min = 150,
  days_to_maturity_max = 270,
  maturity_basis = 'from_sowing'
WHERE slug = 'jicama';
-- Pachyrhizus erosus: 150-270 days from sowing to tuber harvest

UPDATE plant_species SET
  days_to_maturity_min = 40,
  days_to_maturity_max = 60,
  maturity_basis = 'from_sowing'
WHERE slug = 'purslane';
-- Portulaca oleracea: 40-60 days from sowing to harvest

UPDATE plant_species SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 70,
  maturity_basis = 'from_sowing'
WHERE slug = 'sorrel';
-- Rumex acetosa: 50-70 days from sowing to first leaf harvest

UPDATE plant_species SET
  days_to_maturity_min = 150,
  days_to_maturity_max = 210,
  maturity_basis = 'from_sowing'
WHERE slug = 'yacon';
-- Smallanthus sonchifolius: 150-210 days from planting tubers to harvest

COMMIT;
