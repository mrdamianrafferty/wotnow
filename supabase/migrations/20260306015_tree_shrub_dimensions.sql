-- Migration: Set height and spread dimensions for 181 tree, shrub, and fruit-tree species
-- All values in centimetres
-- Fruit trees: semi-vigorous rootstock sizes (garden-realistic) unless otherwise noted
-- Hedging varieties: maintained hedge sizes
-- Forest/specimen trees: full mature sizes

BEGIN;

-- ============================================================
-- FRUIT TREES (50 species)
-- Default: semi-vigorous rootstock / garden conditions
-- ============================================================

-- Malus domestica — semi-vigorous (MM106 rootstock)
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 500, average_spread_cm = 350, maximum_spread_cm = 450 WHERE slug = 'fruit-apple';

-- Prunus armeniaca — semi-vigorous
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 450, average_spread_cm = 350, maximum_spread_cm = 450 WHERE slug = 'fruit-apricot';

-- Aronia melanocarpa — compact shrubby fruit, not a tree
UPDATE plant_species SET average_height_cm = 180, maximum_height_cm = 250, average_spread_cm = 150, maximum_spread_cm = 200 WHERE slug = 'fruit-aronia';

-- Elaeagnus umbellata — large spreading shrub/small tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 550, average_spread_cm = 400, maximum_spread_cm = 550 WHERE slug = 'fruit-autumn-olive';

-- Juglans nigra — large forest tree even as fruit tree
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'fruit-black-walnut';

-- Annona cherimola — subtropical small tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 700, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-cherimoya';

-- Prunus cerasus — naturally smaller than sweet cherry, semi-vigorous
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 450, average_spread_cm = 350, maximum_spread_cm = 450 WHERE slug = 'fruit-cherry-sour';

-- Prunus avium — sweet cherry, semi-vigorous (Gisela 5/Colt)
UPDATE plant_species SET average_height_cm = 450, maximum_height_cm = 600, average_spread_cm = 400, maximum_spread_cm = 550 WHERE slug = 'fruit-cherry-sweet';

-- Crataegus pinnatifida — small ornamental/fruit tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 700, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-chinese-haw';

-- Cornus mas — large shrub / small tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 350, maximum_spread_cm = 500 WHERE slug = 'fruit-cornelian-cherry';

-- Prunus domestica subsp. insititia — naturally compact plum
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'fruit-damson';

-- Sambucus nigra — vigorous large shrub / small tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-elder';

-- Sambucus nigra 'Black Lace' — more compact cultivar
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 400, average_spread_cm = 250, maximum_spread_cm = 350 WHERE slug = 'fruit-elder-black-lace';

-- Acca sellowiana — compact evergreen shrub/small tree
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 450, average_spread_cm = 300, maximum_spread_cm = 400 WHERE slug = 'fruit-feijoa';

-- Ficus carica — spreading small tree in garden conditions
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 500, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-fig';

-- Prunus domestica subsp. italica — greengage, semi-vigorous
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'fruit-gage';

-- Psidium cattleianum — subtropical shrub/small tree
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 500, average_spread_cm = 250, maximum_spread_cm = 400 WHERE slug = 'fruit-guava-strawberry';

-- Celtis occidentalis — medium-large deciduous tree
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 1800, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'fruit-hackberry';

-- Actinidia arguta — vigorous climbing vine, height on support
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 900, average_spread_cm = 400, maximum_spread_cm = 700 WHERE slug = 'fruit-hardy-kiwi';

-- Corylus avellana — multi-stemmed large shrub
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 350, maximum_spread_cm = 500 WHERE slug = 'fruit-hazelnut';

-- Lonicera caerulea — small shrub, even as tree-form
UPDATE plant_species SET average_height_cm = 150, maximum_height_cm = 200, average_spread_cm = 120, maximum_spread_cm = 180 WHERE slug = 'fruit-honeyberry-treeform';

-- x Sorbopyrus auricularis — small-medium tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-hybrid-shipova';

-- Ribes x nidigrolaria — compact bush trained as tree-form
UPDATE plant_species SET average_height_cm = 150, maximum_height_cm = 200, average_spread_cm = 120, maximum_spread_cm = 180 WHERE slug = 'fruit-jostaberry-treeform';

-- Juniperus communis — variable, columnar to prostrate; berrying types typically upright
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 150, maximum_spread_cm = 250 WHERE slug = 'fruit-juniper-berry';

-- Citrus limon — small tree in garden/pot conditions
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 500, average_spread_cm = 250, maximum_spread_cm = 400 WHERE slug = 'fruit-lemon';

-- Citrus aurantiifolia — compact citrus
UPDATE plant_species SET average_height_cm = 250, maximum_height_cm = 400, average_spread_cm = 200, maximum_spread_cm = 350 WHERE slug = 'fruit-lime';

-- Eriobotrya japonica — evergreen small tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-loquat';

-- Citrus reticulata — small citrus tree
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 450, average_spread_cm = 250, maximum_spread_cm = 400 WHERE slug = 'fruit-mandarin';

-- Crataegus aestivalis — small hawthorn tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-mayhaw';

-- Mespilus germanica — small spreading tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'fruit-medlar';

-- Prunus domestica subsp. syriaca — small plum, semi-vigorous
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 400 WHERE slug = 'fruit-mirabelle';

-- Sorbus aucuparia — medium tree (as fruit tree, smaller than forest form)
UPDATE plant_species SET average_height_cm = 800, maximum_height_cm = 1200, average_spread_cm = 500, maximum_spread_cm = 700 WHERE slug = 'fruit-mountain-ash';

-- Morus nigra — slow-growing, spreading small tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 900, average_spread_cm = 600, maximum_spread_cm = 800 WHERE slug = 'fruit-mulberry-black';

-- Morus alba — faster growing, larger than black mulberry
UPDATE plant_species SET average_height_cm = 800, maximum_height_cm = 1200, average_spread_cm = 700, maximum_spread_cm = 1000 WHERE slug = 'fruit-mulberry-white';

-- Prunus persica var. nucipersica — semi-vigorous
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 450, average_spread_cm = 350, maximum_spread_cm = 450 WHERE slug = 'fruit-nectarine';

-- Olea europaea — slow-growing, long-lived
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 700 WHERE slug = 'fruit-olive';

-- Citrus x sinensis — medium citrus
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'fruit-orange';

-- Asimina triloba — understorey tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 350, maximum_spread_cm = 500 WHERE slug = 'fruit-pawpaw';

-- Prunus persica — semi-vigorous
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 450, average_spread_cm = 350, maximum_spread_cm = 450 WHERE slug = 'fruit-peach';

-- Pyrus communis — semi-vigorous (Quince A rootstock)
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 400 WHERE slug = 'fruit-pear';

-- Diospyros kaki — medium tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 450, maximum_spread_cm = 700 WHERE slug = 'fruit-persimmon';

-- Prunus domestica — semi-vigorous (St. Julien A)
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 500, average_spread_cm = 350, maximum_spread_cm = 450 WHERE slug = 'fruit-plum';

-- Punica granatum — shrubby small tree
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 400 WHERE slug = 'fruit-pomegranate';

-- Santalum acuminatum — slow-growing Australian native
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 300, maximum_spread_cm = 500 WHERE slug = 'fruit-quandong';

-- Cydonia oblonga — small spreading tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 350, maximum_spread_cm = 500 WHERE slug = 'fruit-quince';

-- Amelanchier alnifolia — multi-stemmed large shrub
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 450, average_spread_cm = 250, maximum_spread_cm = 350 WHERE slug = 'fruit-saskatoon';

-- Hippophae rhamnoides — thorny large shrub
UPDATE plant_species SET average_height_cm = 350, maximum_height_cm = 600, average_spread_cm = 300, maximum_spread_cm = 500 WHERE slug = 'fruit-sea-buckthorn';

-- Amelanchier canadensis — multi-stemmed small tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 350, maximum_spread_cm = 500 WHERE slug = 'fruit-serviceberry';

-- Castanea sativa — large tree even as orchard specimen
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 2000 WHERE slug = 'fruit-sweet-chestnut';

-- Juglans regia — large orchard tree
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 1800, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'fruit-walnut';


-- ============================================================
-- SHRUBS (11 species)
-- ============================================================

-- Prunus spinosa — dense thorny shrub/thicket
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 500 WHERE slug = 'blackthorn';

-- Cornus sanguinea — medium deciduous shrub
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 400, average_spread_cm = 250, maximum_spread_cm = 350 WHERE slug = 'dogwood-blood-red';

-- Cornus alba — vigorous suckering shrub
UPDATE plant_species SET average_height_cm = 250, maximum_height_cm = 350, average_spread_cm = 250, maximum_spread_cm = 350 WHERE slug = 'dogwood-red-stem';

-- Escallonia x exoniensis — evergreen hedging shrub
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 300, average_spread_cm = 150, maximum_spread_cm = 250 WHERE slug = 'escallonia-hedge';

-- Ulex europaeus — spiny evergreen, hedge form
UPDATE plant_species SET average_height_cm = 150, maximum_height_cm = 250, average_spread_cm = 150, maximum_spread_cm = 250 WHERE slug = 'gorse-hedge';

-- Griselinia littoralis — evergreen hedging, coastal
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 150, maximum_spread_cm = 300 WHERE slug = 'griselinia-hedge';

-- Corylus avellana — maintained as hedge
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 150, maximum_spread_cm = 250 WHERE slug = 'hazel-hedge';

-- Amorpha fruticosa — medium shrub
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 450, average_spread_cm = 250, maximum_spread_cm = 400 WHERE slug = 'indigo-bush';

-- Ligustrum vulgare — classic hedging shrub
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 150, maximum_spread_cm = 300 WHERE slug = 'privet-common';

-- Ligustrum ovalifolium — vigorous hedging
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 150, maximum_spread_cm = 300 WHERE slug = 'privet-oval-leaf';

-- Rosa rugosa — dense rounded shrub, hedge form
UPDATE plant_species SET average_height_cm = 150, maximum_height_cm = 250, average_spread_cm = 150, maximum_spread_cm = 250 WHERE slug = 'rosa-rugosa-hedge';


-- ============================================================
-- TREES (120 species)
-- ============================================================

-- Fraxinus ornus — smaller ornamental ash
UPDATE plant_species SET average_height_cm = 1000, maximum_height_cm = 1500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'ash-manna';

-- Fagus sylvatica f. purpurea — maintained as hedge
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 100, maximum_spread_cm = 200 WHERE slug = 'beech-hedge-copper';

-- Fagus sylvatica — maintained as hedge
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 100, maximum_spread_cm = 200 WHERE slug = 'beech-hedge-green';

-- Ulmus procera — large tree (before Dutch elm disease)
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 1500, maximum_spread_cm = 2000 WHERE slug = 'elm-english';

-- Ginkgo biloba — slow-growing, eventually large
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'ginkgo-biloba';

-- Gleditsia triacanthos — medium-large tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'honey-locust';

-- Carpinus betulus — maintained as hedge
UPDATE plant_species SET average_height_cm = 200, maximum_height_cm = 400, average_spread_cm = 100, maximum_spread_cm = 200 WHERE slug = 'hornbeam-hedge';

-- Tilia platyphyllos — large lime tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 1500, maximum_spread_cm = 2000 WHERE slug = 'linden-largeleaf';

-- Tilia cordata — large lime tree
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'linden-smallleaf';

-- Acer x freemanii — medium-large maple
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2000, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'maple-freeman';

-- Acer saccharum — large maple
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 2700, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'maple-sugar';

-- Carya illinoinensis — large nut tree
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1200, maximum_spread_cm = 2000 WHERE slug = 'pecan';

-- Platanus x hispanica — very large urban tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 2000, maximum_spread_cm = 2500 WHERE slug = 'plane-london';

-- Populus x canadensis — very fast-growing, tall
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'poplar-hybrid';

-- Castanea sativa — large specimen tree
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'sweet-chestnut';

-- Acacia baileyana — small-medium Australian tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-acacia-baileyana';

-- Acacia dealbata — medium-large tree
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-acacia-dealbata';

-- Acacia longifolia — spreading large shrub/small tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-acacia-longifolia';

-- Albizia julibrissin — small-medium spreading tree
UPDATE plant_species SET average_height_cm = 700, maximum_height_cm = 1200, average_spread_cm = 700, maximum_spread_cm = 1200 WHERE slug = 'tree-albizia-julibrissin';

-- Alnus glutinosa — medium-large wetland tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-alder-black';

-- Alnus glutinosa — same as black alder
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-alder-common';

-- Alnus viridis — shrubby small alder
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 350, maximum_spread_cm = 500 WHERE slug = 'tree-alder-green';

-- Alnus incana — medium tree, smaller than common alder
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 700, maximum_spread_cm = 1000 WHERE slug = 'tree-alder-grey';

-- Alnus rubra — fast-growing medium-large tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-alder-red';

-- Betula alleghaniensis — medium-large birch
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-aldershade-american';

-- Acer ginnala — small tree/large shrub
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-amber-maple';

-- Thuja occidentalis — medium conifer
UPDATE plant_species SET average_height_cm = 1000, maximum_height_cm = 1500, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-arborvitae-thuja';

-- Fraxinus excelsior — large native tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 1500, maximum_spread_cm = 2000 WHERE slug = 'tree-ash-european';

-- Populus tremula — medium tree, often suckering
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-aspen';

-- Fagus sylvatica — large specimen tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 2000, maximum_spread_cm = 2500 WHERE slug = 'tree-beech';

-- Acacia melanoxylon — large Australian tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-black-acacia';

-- Robinia pseudoacacia — medium-large tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-black-locust';

-- Picea mariana — slender conifer
UPDATE plant_species SET average_height_cm = 1000, maximum_height_cm = 1500, average_spread_cm = 300, maximum_spread_cm = 500 WHERE slug = 'tree-black-spruce';

-- Salix nigra — medium-large willow
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-black-willow';

-- Picea pungens — medium conifer
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 1800, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-blue-spruce';

-- Caragana arborescens — small tree/large shrub
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'tree-caragana-arborescens';

-- Cedrus atlantica — large conifer
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-cedar-atlas';

-- Cedrus libani — large spreading conifer
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3500, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'tree-cedar-lebanon';

-- Fagus sylvatica f. purpurea — large specimen tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 2000, maximum_spread_cm = 2500 WHERE slug = 'tree-copper-beech';

-- Pinus nigra subsp. laricio — large pine
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-corsican-pine';

-- Malus x floribunda — small ornamental tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-crabapple-ornamental';

-- Pseudotsuga menziesii — very large conifer
UPDATE plant_species SET average_height_cm = 3000, maximum_height_cm = 5000, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-douglas-fir';

-- Betula pubescens — medium birch
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 600, maximum_spread_cm = 900 WHERE slug = 'tree-downy-birch';

-- Elaeagnus x ebbingei — large evergreen shrub/small tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-eleagnus-ebbingei';

-- Elaeagnus commutata — suckering shrub
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 450, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'tree-eleagnus-silverberry';

-- Ulmus pumila — medium tree
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-elm-siberian';

-- Ulmus glabra — large elm
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 1500, maximum_spread_cm = 2000 WHERE slug = 'tree-elm-wych';

-- Eucalyptus gunnii — fast-growing, medium-large
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-eucalyptus-gunnii';

-- Eucalyptus niphophila — smaller alpine snow gum
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-eucalyptus-niphophila';

-- Abies alba — very large conifer
UPDATE plant_species SET average_height_cm = 3000, maximum_height_cm = 5000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-european-fir';

-- Acer campestre — small-medium native tree
UPDATE plant_species SET average_height_cm = 1000, maximum_height_cm = 1500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-field-maple';

-- Laburnum x watereri — small ornamental tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 700 WHERE slug = 'tree-golden-chain';

-- Koelreuteria paniculata — small-medium ornamental
UPDATE plant_species SET average_height_cm = 800, maximum_height_cm = 1200, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-golden-rain';

-- Celtis occidentalis — medium-large tree (duplicate of fruit-hackberry, as specimen tree)
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-hackberry-common';

-- Crataegus monogyna — small native tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-hawthorn-common';

-- Crataegus laevigata — small ornamental tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 700 WHERE slug = 'tree-hawthorn-crimson';

-- Crataegus laevigata — small native tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 700 WHERE slug = 'tree-hawthorn-midland';

-- Corylus avellana 'Contorta' — compact ornamental form
UPDATE plant_species SET average_height_cm = 300, maximum_height_cm = 500, average_spread_cm = 300, maximum_spread_cm = 500 WHERE slug = 'tree-hazel-harry-lauder';

-- Corylus avellana — trained as single-stem tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-hazel-treeform';

-- Ilex aquifolium — slow-growing evergreen
UPDATE plant_species SET average_height_cm = 800, maximum_height_cm = 1500, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-holly';

-- Gleditsia triacanthos — duplicate slug
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-honey-locust';

-- Lonicera caerulea — small shrub, tree-form
UPDATE plant_species SET average_height_cm = 150, maximum_height_cm = 200, average_spread_cm = 120, maximum_spread_cm = 180 WHERE slug = 'tree-honeyberry-treeform';

-- Carpinus betulus — specimen tree form
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-hornbeam';

-- Acer palmatum — small ornamental tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-japanese-maple';

-- Zelkova serrata — medium-large tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 2000 WHERE slug = 'tree-japanese-zelkova';

-- Amelanchier lamarckii — small multi-stemmed tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-juneberry';

-- Juniperus communis — variable conifer, columnar forms
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 150, maximum_spread_cm = 250 WHERE slug = 'tree-juniper-common';

-- Cercidiphyllum japonicum — medium-large ornamental
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 800, maximum_spread_cm = 1500 WHERE slug = 'tree-katsura';

-- Larix decidua — large deciduous conifer
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-larch-european';

-- Chamaecyparis lawsoniana — large conifer
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 600, maximum_spread_cm = 1000 WHERE slug = 'tree-lawson-cypress';

-- Syringa vulgaris — small tree form
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 300, maximum_spread_cm = 500 WHERE slug = 'tree-lilac-treeform';

-- Tilia cordata — duplicate, same as linden-smallleaf
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-lime-small-leaved';

-- Pinus contorta — medium pine
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-lodgepole-pine';

-- Platanus x hispanica — duplicate of plane-london
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 2000, maximum_spread_cm = 2500 WHERE slug = 'tree-london-plane';

-- Magnolia grandiflora — large evergreen tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-magnolia-grandiflora';

-- Magnolia x soulangeana — small spreading tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-magnolia-soulangea';

-- Magnolia stellata — compact small tree/large shrub
UPDATE plant_species SET average_height_cm = 250, maximum_height_cm = 400, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'tree-magnolia-stellata';

-- Prosopis glandulosa — small-medium desert tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-mesquite';

-- Acacia dealbata — duplicate of tree-acacia-dealbata
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-mimosa';

-- Pinus radiata — large fast-growing pine
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-monterey-pine';

-- Sorbus aucuparia — dwarf cultivar
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 300, maximum_spread_cm = 450 WHERE slug = 'tree-mountain-ash-dwarf';

-- Acer platanoides — large maple
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-norway-maple';

-- Picea abies — large conifer
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-norway-spruce';

-- Quercus macrocarpa — very large oak
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 2000, maximum_spread_cm = 2500 WHERE slug = 'tree-oak-burr';

-- Quercus robur — large native oak
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3500, average_spread_cm = 2000, maximum_spread_cm = 2500 WHERE slug = 'tree-oak-english';

-- Quercus rubra — large oak
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1500, maximum_spread_cm = 2000 WHERE slug = 'tree-oak-red';

-- Styphnolobium japonicum — medium-large tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 2000 WHERE slug = 'tree-pagoda-tree';

-- Acer griseum — small ornamental tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-paperbark-maple';

-- Pinus ponderosa — very large pine
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-ponderosa-pine';

-- Populus nigra 'Italica' — narrow columnar
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-poplar-lombardy';

-- Populus alba — large suckering tree
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-poplar-white';

-- Acer rubrum — large maple
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-red-maple';

-- Cercis canadensis — small ornamental tree
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 600, maximum_spread_cm = 1000 WHERE slug = 'tree-redbud-eastern';

-- Sequoiadendron giganteum — truly massive conifer
UPDATE plant_species SET average_height_cm = 5000, maximum_height_cm = 8000, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'tree-redwood-giant';

-- Sorbus aucuparia — medium native tree
UPDATE plant_species SET average_height_cm = 800, maximum_height_cm = 1500, average_spread_cm = 500, maximum_spread_cm = 800 WHERE slug = 'tree-rowan-mountain-ash';

-- Pinus sylvestris — large native pine
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-scots-pine';

-- Metasequoia glyptostroboides — large deciduous conifer
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-sequoia-dawn';

-- Sorbus domestica — medium tree
UPDATE plant_species SET average_height_cm = 1000, maximum_height_cm = 1500, average_spread_cm = 600, maximum_spread_cm = 1000 WHERE slug = 'tree-service-tree';

-- Amelanchier canadensis — tree-form
UPDATE plant_species SET average_height_cm = 600, maximum_height_cm = 1000, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-serviceberry-treeform';

-- Casuarina equisetifolia — medium-large tropical tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-she-oak';

-- Albizia julibrissin — duplicate of tree-albizia-julibrissin
UPDATE plant_species SET average_height_cm = 700, maximum_height_cm = 1200, average_spread_cm = 700, maximum_spread_cm = 1200 WHERE slug = 'tree-silk-tree';

-- Betula pendula — medium tree with weeping habit
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 700, maximum_spread_cm = 1000 WHERE slug = 'tree-silver-birch';

-- Tilia tomentosa — large lime
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-silver-linden';

-- Acer saccharinum — large fast-growing maple
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-silver-maple';

-- Cotinus coggygria — large shrub / small tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-smoke-tree';

-- Amelanchier x grandiflora — small multi-stemmed tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-snowy-mespilus';

-- Castanea sativa — duplicate, large tree
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'tree-sweet-chestnut';

-- Liquidambar styraciflua — large ornamental tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1000, maximum_spread_cm = 1500 WHERE slug = 'tree-sweetgum';

-- Acer pseudoplatanus — large tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 3500, average_spread_cm = 1500, maximum_spread_cm = 2000 WHERE slug = 'tree-sycamore';

-- Acer pictum — medium maple
UPDATE plant_species SET average_height_cm = 1200, maximum_height_cm = 2000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-sycamore-japanese';

-- Tamarix ramosissima — large shrub/small tree
UPDATE plant_species SET average_height_cm = 400, maximum_height_cm = 600, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-tamarisk';

-- Dermatophyllum secundiflorum — small evergreen tree
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'tree-texas-mountain-laurel';

-- Liriodendron tulipifera — very large tree
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tree-tulip-poplar';

-- Salix x sepulcralis — large weeping tree
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'tree-weeping-willow';

-- Thuja plicata — large conifer
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 800, maximum_spread_cm = 1200 WHERE slug = 'tree-western-redcedar';

-- Taxus baccata — slow-growing, medium
UPDATE plant_species SET average_height_cm = 1000, maximum_height_cm = 2000, average_spread_cm = 800, maximum_spread_cm = 1500 WHERE slug = 'tree-yew-english';

-- Liriodendron tulipifera — duplicate
UPDATE plant_species SET average_height_cm = 2500, maximum_height_cm = 4000, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'tulip-tree';

-- Juglans nigra — large tree (specimen form)
UPDATE plant_species SET average_height_cm = 2000, maximum_height_cm = 3000, average_spread_cm = 1500, maximum_spread_cm = 2500 WHERE slug = 'walnut-black';

-- Juglans regia — large tree (specimen form)
UPDATE plant_species SET average_height_cm = 1500, maximum_height_cm = 2500, average_spread_cm = 1200, maximum_spread_cm = 1800 WHERE slug = 'walnut-english';

-- Salix viminalis — coppiced willow, maintained
UPDATE plant_species SET average_height_cm = 500, maximum_height_cm = 800, average_spread_cm = 400, maximum_spread_cm = 600 WHERE slug = 'willow-coppice';

COMMIT;
