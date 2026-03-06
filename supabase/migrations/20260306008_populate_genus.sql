BEGIN;

-- Populate genus column from scientific_name for all rows where genus is empty
-- Auto-generated from CSV: 297 rows across 170 genera

-- Abelmoschus (1 species)
UPDATE plant_species SET genus = 'Abelmoschus'
WHERE slug IN ('okra')
  AND (genus IS NULL OR genus = '');

-- Acacia (3 species)
UPDATE plant_species SET genus = 'Acacia'
WHERE slug IN ('tree-acacia-longifolia', 'tree-black-acacia', 'tree-mimosa')
  AND (genus IS NULL OR genus = '');

-- Acer (1 species)
UPDATE plant_species SET genus = 'Acer'
WHERE slug IN ('tree-sycamore-japanese')
  AND (genus IS NULL OR genus = '');

-- Achillea (1 species)
UPDATE plant_species SET genus = 'Achillea'
WHERE slug IN ('yarrow')
  AND (genus IS NULL OR genus = '');

-- Agastache (2 species)
UPDATE plant_species SET genus = 'Agastache'
WHERE slug IN ('anise-hyssop', 'herb-anise-hyssop')
  AND (genus IS NULL OR genus = '');

-- Ajuga (1 species)
UPDATE plant_species SET genus = 'Ajuga'
WHERE slug IN ('ajuga-reptans')
  AND (genus IS NULL OR genus = '');

-- Albizia (1 species)
UPDATE plant_species SET genus = 'Albizia'
WHERE slug IN ('tree-silk-tree')
  AND (genus IS NULL OR genus = '');

-- Alcea (1 species)
UPDATE plant_species SET genus = 'Alcea'
WHERE slug IN ('hollyhock')
  AND (genus IS NULL OR genus = '');

-- Allium (12 species)
UPDATE plant_species SET genus = 'Allium'
WHERE slug IN ('chive', 'elephant-garlic', 'garlic', 'garlic-chive', 'herb-chives-common', 'leek', 'multiplier-onion', 'onion', 'onion-bulb', 'rakkyo', 'shallot', 'spring-onion')
  AND (genus IS NULL OR genus = '');

-- Alnus (2 species)
UPDATE plant_species SET genus = 'Alnus'
WHERE slug IN ('tree-alder-black', 'tree-alder-red')
  AND (genus IS NULL OR genus = '');

-- Aloysia (1 species)
UPDATE plant_species SET genus = 'Aloysia'
WHERE slug IN ('herb-lemon-verbena')
  AND (genus IS NULL OR genus = '');

-- Althaea (1 species)
UPDATE plant_species SET genus = 'Althaea'
WHERE slug IN ('herb-marshmallow')
  AND (genus IS NULL OR genus = '');

-- Amaranthus (1 species)
UPDATE plant_species SET genus = 'Amaranthus'
WHERE slug IN ('amaranth-leaves')
  AND (genus IS NULL OR genus = '');

-- Anethum (2 species)
UPDATE plant_species SET genus = 'Anethum'
WHERE slug IN ('dill', 'herb-dill-leaf')
  AND (genus IS NULL OR genus = '');

-- Angelica (1 species)
UPDATE plant_species SET genus = 'Angelica'
WHERE slug IN ('herb-angelica')
  AND (genus IS NULL OR genus = '');

-- Anthriscus (2 species)
UPDATE plant_species SET genus = 'Anthriscus'
WHERE slug IN ('chervil', 'herb-chervil')
  AND (genus IS NULL OR genus = '');

-- Anthyllis (1 species)
UPDATE plant_species SET genus = 'Anthyllis'
WHERE slug IN ('kidney-vetch')
  AND (genus IS NULL OR genus = '');

-- Antirrhinum (1 species)
UPDATE plant_species SET genus = 'Antirrhinum'
WHERE slug IN ('snapdragon')
  AND (genus IS NULL OR genus = '');

-- Apium (2 species)
UPDATE plant_species SET genus = 'Apium'
WHERE slug IN ('celeriac', 'celery')
  AND (genus IS NULL OR genus = '');

-- Aquilegia (1 species)
UPDATE plant_species SET genus = 'Aquilegia'
WHERE slug IN ('columbine')
  AND (genus IS NULL OR genus = '');

-- Arctium (2 species)
UPDATE plant_species SET genus = 'Arctium'
WHERE slug IN ('burdock', 'burdock-root')
  AND (genus IS NULL OR genus = '');

-- Armoracia (1 species)
UPDATE plant_species SET genus = 'Armoracia'
WHERE slug IN ('horseradish')
  AND (genus IS NULL OR genus = '');

-- Artemisia (5 species)
UPDATE plant_species SET genus = 'Artemisia'
WHERE slug IN ('herb-tarragon-french', 'herb-wormwood', 'mugwort', 'southernwood', 'wormwood')
  AND (genus IS NULL OR genus = '');

-- Asclepias (1 species)
UPDATE plant_species SET genus = 'Asclepias'
WHERE slug IN ('asclepias')
  AND (genus IS NULL OR genus = '');

-- Asparagus (1 species)
UPDATE plant_species SET genus = 'Asparagus'
WHERE slug IN ('asparagus')
  AND (genus IS NULL OR genus = '');

-- Astilbe (1 species)
UPDATE plant_species SET genus = 'Astilbe'
WHERE slug IN ('astilbe')
  AND (genus IS NULL OR genus = '');

-- Aurinia (1 species)
UPDATE plant_species SET genus = 'Aurinia'
WHERE slug IN ('alyssum-perennial')
  AND (genus IS NULL OR genus = '');

-- Avena (1 species)
UPDATE plant_species SET genus = 'Avena'
WHERE slug IN ('oats-green-manure')
  AND (genus IS NULL OR genus = '');

-- Basella (1 species)
UPDATE plant_species SET genus = 'Basella'
WHERE slug IN ('malabar-spinach')
  AND (genus IS NULL OR genus = '');

-- Beta (2 species)
UPDATE plant_species SET genus = 'Beta'
WHERE slug IN ('beetroot', 'swiss-chard')
  AND (genus IS NULL OR genus = '');

-- Borago (1 species)
UPDATE plant_species SET genus = 'Borago'
WHERE slug IN ('herb-borage')
  AND (genus IS NULL OR genus = '');

-- Brassica (19 species)
UPDATE plant_species SET genus = 'Brassica'
WHERE slug IN ('broccoli', 'brussels-sprout', 'cabbage', 'cabbage-green', 'cabbage-red', 'cabbage-savoy', 'cauliflower', 'chinese-cabbage', 'kale-curly', 'kale-lacinato', 'kohlrabi', 'mizuna', 'mustard-greens', 'pak-choi', 'romanesco', 'sprouting-broccoli', 'swede-rutabaga', 'tatsoi', 'turnip')
  AND (genus IS NULL OR genus = '');

-- Brunnera (1 species)
UPDATE plant_species SET genus = 'Brunnera'
WHERE slug IN ('brunnera')
  AND (genus IS NULL OR genus = '');

-- Calendula (1 species)
UPDATE plant_species SET genus = 'Calendula'
WHERE slug IN ('herb-calendula')
  AND (genus IS NULL OR genus = '');

-- Campanula (1 species)
UPDATE plant_species SET genus = 'Campanula'
WHERE slug IN ('campanula')
  AND (genus IS NULL OR genus = '');

-- Capsicum (6 species)
UPDATE plant_species SET genus = 'Capsicum'
WHERE slug IN ('hot-pepper-very-hot-types-capsicum-chinense', 'pepper', 'pepper-capsicum-annuum', 'pepper-chilli', 'pepper-hot', 'pepper-sweet')
  AND (genus IS NULL OR genus = '');

-- Carpinus (1 species)
UPDATE plant_species SET genus = 'Carpinus'
WHERE slug IN ('hornbeam-hedge')
  AND (genus IS NULL OR genus = '');

-- Castanea (1 species)
UPDATE plant_species SET genus = 'Castanea'
WHERE slug IN ('sweet-chestnut')
  AND (genus IS NULL OR genus = '');

-- Casuarina (1 species)
UPDATE plant_species SET genus = 'Casuarina'
WHERE slug IN ('tree-she-oak')
  AND (genus IS NULL OR genus = '');

-- Centella (1 species)
UPDATE plant_species SET genus = 'Centella'
WHERE slug IN ('herb-gotu-kola')
  AND (genus IS NULL OR genus = '');

-- Cerastium (1 species)
UPDATE plant_species SET genus = 'Cerastium'
WHERE slug IN ('snow-in-summer')
  AND (genus IS NULL OR genus = '');

-- Chamaemelum (1 species)
UPDATE plant_species SET genus = 'Chamaemelum'
WHERE slug IN ('herb-chamomile-roman')
  AND (genus IS NULL OR genus = '');

-- Cicer (1 species)
UPDATE plant_species SET genus = 'Cicer'
WHERE slug IN ('chickpea')
  AND (genus IS NULL OR genus = '');

-- Cichorium (3 species)
UPDATE plant_species SET genus = 'Cichorium'
WHERE slug IN ('endive', 'escarole', 'radicchio')
  AND (genus IS NULL OR genus = '');

-- Citrullus (1 species)
UPDATE plant_species SET genus = 'Citrullus'
WHERE slug IN ('watermelon')
  AND (genus IS NULL OR genus = '');

-- Colocasia (1 species)
UPDATE plant_species SET genus = 'Colocasia'
WHERE slug IN ('taro')
  AND (genus IS NULL OR genus = '');

-- Coreopsis (1 species)
UPDATE plant_species SET genus = 'Coreopsis'
WHERE slug IN ('coreopsis')
  AND (genus IS NULL OR genus = '');

-- Coriandrum (2 species)
UPDATE plant_species SET genus = 'Coriandrum'
WHERE slug IN ('coriander', 'herb-coriander-leaf')
  AND (genus IS NULL OR genus = '');

-- Corylus (1 species)
UPDATE plant_species SET genus = 'Corylus'
WHERE slug IN ('tree-hazel-treeform')
  AND (genus IS NULL OR genus = '');

-- Cosmos (1 species)
UPDATE plant_species SET genus = 'Cosmos'
WHERE slug IN ('cosmos')
  AND (genus IS NULL OR genus = '');

-- Crataegus (1 species)
UPDATE plant_species SET genus = 'Crataegus'
WHERE slug IN ('tree-hawthorn-common')
  AND (genus IS NULL OR genus = '');

-- Cucumis (3 species)
UPDATE plant_species SET genus = 'Cucumis'
WHERE slug IN ('cucumber', 'cucumber-pickling', 'melon-cantaloupe')
  AND (genus IS NULL OR genus = '');

-- Cucurbita (6 species)
UPDATE plant_species SET genus = 'Cucurbita'
WHERE slug IN ('courgette', 'pumpkin', 'squash-pattypan', 'squash-spaghetti', 'squash-winter', 'squash-yellow')
  AND (genus IS NULL OR genus = '');

-- Cynara (2 species)
UPDATE plant_species SET genus = 'Cynara'
WHERE slug IN ('artichoke-globe', 'cardoon')
  AND (genus IS NULL OR genus = '');

-- Dahlia (1 species)
UPDATE plant_species SET genus = 'Dahlia'
WHERE slug IN ('dahlia')
  AND (genus IS NULL OR genus = '');

-- Daucus (1 species)
UPDATE plant_species SET genus = 'Daucus'
WHERE slug IN ('carrot')
  AND (genus IS NULL OR genus = '');

-- Delphinium (1 species)
UPDATE plant_species SET genus = 'Delphinium'
WHERE slug IN ('delphinium')
  AND (genus IS NULL OR genus = '');

-- Dermatophyllum (1 species)
UPDATE plant_species SET genus = 'Dermatophyllum'
WHERE slug IN ('tree-texas-mountain-laurel')
  AND (genus IS NULL OR genus = '');

-- Digitalis (1 species)
UPDATE plant_species SET genus = 'Digitalis'
WHERE slug IN ('foxglove')
  AND (genus IS NULL OR genus = '');

-- Dysphania (1 species)
UPDATE plant_species SET genus = 'Dysphania'
WHERE slug IN ('epazote')
  AND (genus IS NULL OR genus = '');

-- Echinacea (1 species)
UPDATE plant_species SET genus = 'Echinacea'
WHERE slug IN ('echinacea')
  AND (genus IS NULL OR genus = '');

-- Echinops (1 species)
UPDATE plant_species SET genus = 'Echinops'
WHERE slug IN ('globe-thistle')
  AND (genus IS NULL OR genus = '');

-- Eruca (1 species)
UPDATE plant_species SET genus = 'Eruca'
WHERE slug IN ('rocket')
  AND (genus IS NULL OR genus = '');

-- Eschscholzia (1 species)
UPDATE plant_species SET genus = 'Eschscholzia'
WHERE slug IN ('californian-poppy')
  AND (genus IS NULL OR genus = '');

-- Eucalyptus (1 species)
UPDATE plant_species SET genus = 'Eucalyptus'
WHERE slug IN ('tree-eucalyptus-niphophila')
  AND (genus IS NULL OR genus = '');

-- Eutrochium (1 species)
UPDATE plant_species SET genus = 'Eutrochium'
WHERE slug IN ('joe-pye-weed')
  AND (genus IS NULL OR genus = '');

-- Fagopyrum (1 species)
UPDATE plant_species SET genus = 'Fagopyrum'
WHERE slug IN ('buckwheat')
  AND (genus IS NULL OR genus = '');

-- Foeniculum (3 species)
UPDATE plant_species SET genus = 'Foeniculum'
WHERE slug IN ('fennel-bulb', 'fennel-perennial', 'herb-fennel-leaf')
  AND (genus IS NULL OR genus = '');

-- Fragaria (1 species)
UPDATE plant_species SET genus = 'Fragaria'
WHERE slug IN ('wild-strawberry')
  AND (genus IS NULL OR genus = '');

-- Gaillardia (1 species)
UPDATE plant_species SET genus = 'Gaillardia'
WHERE slug IN ('gaillardia')
  AND (genus IS NULL OR genus = '');

-- Galium (1 species)
UPDATE plant_species SET genus = 'Galium'
WHERE slug IN ('herb-sweet-woodruff')
  AND (genus IS NULL OR genus = '');

-- Geranium (1 species)
UPDATE plant_species SET genus = 'Geranium'
WHERE slug IN ('geranium-hardy')
  AND (genus IS NULL OR genus = '');

-- Gleditsia (1 species)
UPDATE plant_species SET genus = 'Gleditsia'
WHERE slug IN ('tree-honey-locust')
  AND (genus IS NULL OR genus = '');

-- Glycine (1 species)
UPDATE plant_species SET genus = 'Glycine'
WHERE slug IN ('soybean-edamame')
  AND (genus IS NULL OR genus = '');

-- Helianthus (3 species)
UPDATE plant_species SET genus = 'Helianthus'
WHERE slug IN ('jerusalem-artichoke', 'sunflower', 'sunflower-biomass')
  AND (genus IS NULL OR genus = '');

-- Heliopsis (1 species)
UPDATE plant_species SET genus = 'Heliopsis'
WHERE slug IN ('heliopsis')
  AND (genus IS NULL OR genus = '');

-- Helleborus (1 species)
UPDATE plant_species SET genus = 'Helleborus'
WHERE slug IN ('helleborus')
  AND (genus IS NULL OR genus = '');

-- Hemerocallis (1 species)
UPDATE plant_species SET genus = 'Hemerocallis'
WHERE slug IN ('daylily')
  AND (genus IS NULL OR genus = '');

-- Heuchera (1 species)
UPDATE plant_species SET genus = 'Heuchera'
WHERE slug IN ('heuchera')
  AND (genus IS NULL OR genus = '');

-- Hosta (1 species)
UPDATE plant_species SET genus = 'Hosta'
WHERE slug IN ('hosta')
  AND (genus IS NULL OR genus = '');

-- Hypericum (1 species)
UPDATE plant_species SET genus = 'Hypericum'
WHERE slug IN ('herb-st-johns-wort')
  AND (genus IS NULL OR genus = '');

-- Hyssopus (2 species)
UPDATE plant_species SET genus = 'Hyssopus'
WHERE slug IN ('herb-hyssop', 'hyssop')
  AND (genus IS NULL OR genus = '');

-- Ipomoea (1 species)
UPDATE plant_species SET genus = 'Ipomoea'
WHERE slug IN ('sweet-potato')
  AND (genus IS NULL OR genus = '');

-- Iris (1 species)
UPDATE plant_species SET genus = 'Iris'
WHERE slug IN ('iris')
  AND (genus IS NULL OR genus = '');

-- Juglans (1 species)
UPDATE plant_species SET genus = 'Juglans'
WHERE slug IN ('walnut-english')
  AND (genus IS NULL OR genus = '');

-- Lactuca (5 species)
UPDATE plant_species SET genus = 'Lactuca'
WHERE slug IN ('lettuce', 'lettuce-butterhead', 'lettuce-iceberg', 'lettuce-looseleaf', 'lettuce-romaine')
  AND (genus IS NULL OR genus = '');

-- Lamprocapnos (1 species)
UPDATE plant_species SET genus = 'Lamprocapnos'
WHERE slug IN ('bleeding-heart')
  AND (genus IS NULL OR genus = '');

-- Lathyrus (2 species)
UPDATE plant_species SET genus = 'Lathyrus'
WHERE slug IN ('perennial-pea', 'sweet-pea')
  AND (genus IS NULL OR genus = '');

-- Laurus (1 species)
UPDATE plant_species SET genus = 'Laurus'
WHERE slug IN ('herb-bay-laurel')
  AND (genus IS NULL OR genus = '');

-- Lavandula (1 species)
UPDATE plant_species SET genus = 'Lavandula'
WHERE slug IN ('lavender')
  AND (genus IS NULL OR genus = '');

-- Leucanthemum (1 species)
UPDATE plant_species SET genus = 'Leucanthemum'
WHERE slug IN ('shasta-daisy')
  AND (genus IS NULL OR genus = '');

-- Levisticum (1 species)
UPDATE plant_species SET genus = 'Levisticum'
WHERE slug IN ('herb-lovage')
  AND (genus IS NULL OR genus = '');

-- Liriodendron (1 species)
UPDATE plant_species SET genus = 'Liriodendron'
WHERE slug IN ('tulip-tree')
  AND (genus IS NULL OR genus = '');

-- Lobularia (1 species)
UPDATE plant_species SET genus = 'Lobularia'
WHERE slug IN ('alyssum')
  AND (genus IS NULL OR genus = '');

-- Lolium (1 species)
UPDATE plant_species SET genus = 'Lolium'
WHERE slug IN ('italian-ryegrass')
  AND (genus IS NULL OR genus = '');

-- Lonicera (2 species)
UPDATE plant_species SET genus = 'Lonicera'
WHERE slug IN ('climbing-honeysuckle', 'tree-honeyberry-treeform')
  AND (genus IS NULL OR genus = '');

-- Lupinus (2 species)
UPDATE plant_species SET genus = 'Lupinus'
WHERE slug IN ('lupin', 'lupin-yellow')
  AND (genus IS NULL OR genus = '');

-- Lysimachia (1 species)
UPDATE plant_species SET genus = 'Lysimachia'
WHERE slug IN ('creeping-jenny')
  AND (genus IS NULL OR genus = '');

-- Manihot (1 species)
UPDATE plant_species SET genus = 'Manihot'
WHERE slug IN ('cassava')
  AND (genus IS NULL OR genus = '');

-- Matricaria (1 species)
UPDATE plant_species SET genus = 'Matricaria'
WHERE slug IN ('herb-chamomile-german')
  AND (genus IS NULL OR genus = '');

-- Mazus (1 species)
UPDATE plant_species SET genus = 'Mazus'
WHERE slug IN ('mazus')
  AND (genus IS NULL OR genus = '');

-- Melilotus (1 species)
UPDATE plant_species SET genus = 'Melilotus'
WHERE slug IN ('sweet-clover')
  AND (genus IS NULL OR genus = '');

-- Melissa (2 species)
UPDATE plant_species SET genus = 'Melissa'
WHERE slug IN ('herb-lemon-balm', 'lemon-balm')
  AND (genus IS NULL OR genus = '');

-- Mentha (4 species)
UPDATE plant_species SET genus = 'Mentha'
WHERE slug IN ('corsican-mint', 'herb-mint-peppermint', 'herb-mint-spearmint', 'pennyroyal')
  AND (genus IS NULL OR genus = '');

-- Miscanthus (2 species)
UPDATE plant_species SET genus = 'Miscanthus'
WHERE slug IN ('chinese-silver-grass', 'miscanthus-giant')
  AND (genus IS NULL OR genus = '');

-- Monarda (2 species)
UPDATE plant_species SET genus = 'Monarda'
WHERE slug IN ('monarda', 'monarda-wild')
  AND (genus IS NULL OR genus = '');

-- Nasturtium (1 species)
UPDATE plant_species SET genus = 'Nasturtium'
WHERE slug IN ('watercress')
  AND (genus IS NULL OR genus = '');

-- Nepeta (3 species)
UPDATE plant_species SET genus = 'Nepeta'
WHERE slug IN ('catmint', 'herb-catmint-ornamental', 'herb-catnip')
  AND (genus IS NULL OR genus = '');

-- Ocimum (4 species)
UPDATE plant_species SET genus = 'Ocimum'
WHERE slug IN ('herb-basil-greek', 'herb-basil-sweet', 'herb-basil-thai', 'herb-holy-basil')
  AND (genus IS NULL OR genus = '');

-- Oenothera (1 species)
UPDATE plant_species SET genus = 'Oenothera'
WHERE slug IN ('gaura')
  AND (genus IS NULL OR genus = '');

-- Origanum (3 species)
UPDATE plant_species SET genus = 'Origanum'
WHERE slug IN ('herb-marjoram-sweet', 'herb-oregano', 'herb-oregano-greek')
  AND (genus IS NULL OR genus = '');

-- Pachyrhizus (1 species)
UPDATE plant_species SET genus = 'Pachyrhizus'
WHERE slug IN ('jicama')
  AND (genus IS NULL OR genus = '');

-- Paeonia (1 species)
UPDATE plant_species SET genus = 'Paeonia'
WHERE slug IN ('peony')
  AND (genus IS NULL OR genus = '');

-- Papaver (1 species)
UPDATE plant_species SET genus = 'Papaver'
WHERE slug IN ('poppy')
  AND (genus IS NULL OR genus = '');

-- Pastinaca (1 species)
UPDATE plant_species SET genus = 'Pastinaca'
WHERE slug IN ('parsnip')
  AND (genus IS NULL OR genus = '');

-- Penstemon (1 species)
UPDATE plant_species SET genus = 'Penstemon'
WHERE slug IN ('penstemon')
  AND (genus IS NULL OR genus = '');

-- Petroselinum (3 species)
UPDATE plant_species SET genus = 'Petroselinum'
WHERE slug IN ('herb-parsley-curly', 'herb-parsley-flat', 'parsley')
  AND (genus IS NULL OR genus = '');

-- Petunia (1 species)
UPDATE plant_species SET genus = 'Petunia'
WHERE slug IN ('petunia')
  AND (genus IS NULL OR genus = '');

-- Phacelia (1 species)
UPDATE plant_species SET genus = 'Phacelia'
WHERE slug IN ('phacelia-covercrop')
  AND (genus IS NULL OR genus = '');

-- Phaseolus (5 species)
UPDATE plant_species SET genus = 'Phaseolus'
WHERE slug IN ('bean', 'french-bean', 'lima-bean', 'runner-bean', 'scarlet-runner-bean')
  AND (genus IS NULL OR genus = '');

-- Phlox (1 species)
UPDATE plant_species SET genus = 'Phlox'
WHERE slug IN ('phlox')
  AND (genus IS NULL OR genus = '');

-- Physalis (2 species)
UPDATE plant_species SET genus = 'Physalis'
WHERE slug IN ('ground-cherry', 'tomatillo')
  AND (genus IS NULL OR genus = '');

-- Pisum (4 species)
UPDATE plant_species SET genus = 'Pisum'
WHERE slug IN ('pea', 'peas-garden', 'peas-snap', 'peas-snow')
  AND (genus IS NULL OR genus = '');

-- Platanus (1 species)
UPDATE plant_species SET genus = 'Platanus'
WHERE slug IN ('tree-london-plane')
  AND (genus IS NULL OR genus = '');

-- Portulaca (1 species)
UPDATE plant_species SET genus = 'Portulaca'
WHERE slug IN ('purslane')
  AND (genus IS NULL OR genus = '');

-- Primula (1 species)
UPDATE plant_species SET genus = 'Primula'
WHERE slug IN ('primrose')
  AND (genus IS NULL OR genus = '');

-- Prosopis (1 species)
UPDATE plant_species SET genus = 'Prosopis'
WHERE slug IN ('tree-mesquite')
  AND (genus IS NULL OR genus = '');

-- Prunella (1 species)
UPDATE plant_species SET genus = 'Prunella'
WHERE slug IN ('self-heal')
  AND (genus IS NULL OR genus = '');

-- Pulmonaria (1 species)
UPDATE plant_species SET genus = 'Pulmonaria'
WHERE slug IN ('pulmonaria')
  AND (genus IS NULL OR genus = '');

-- Raphanus (2 species)
UPDATE plant_species SET genus = 'Raphanus'
WHERE slug IN ('daikon-radish', 'radish')
  AND (genus IS NULL OR genus = '');

-- Rheum (1 species)
UPDATE plant_species SET genus = 'Rheum'
WHERE slug IN ('rhubarb')
  AND (genus IS NULL OR genus = '');

-- Ribes (3 species)
UPDATE plant_species SET genus = 'Ribes'
WHERE slug IN ('fruit-blackcurrant', 'fruit-currant', 'fruit-gooseberry')
  AND (genus IS NULL OR genus = '');

-- Rosa (2 species)
UPDATE plant_species SET genus = 'Rosa'
WHERE slug IN ('climbing-rose-rambling', 'rose')
  AND (genus IS NULL OR genus = '');

-- Rudbeckia (2 species)
UPDATE plant_species SET genus = 'Rudbeckia'
WHERE slug IN ('black-eyed-susan', 'rudbeckia')
  AND (genus IS NULL OR genus = '');

-- Rumex (6 species)
UPDATE plant_species SET genus = 'Rumex'
WHERE slug IN ('garden-sorrel', 'herb-sorrel-common', 'sheep-sorrel', 'sheep-sorrel-2', 'sorrel', 'yellow-dock')
  AND (genus IS NULL OR genus = '');

-- Ruta (1 species)
UPDATE plant_species SET genus = 'Ruta'
WHERE slug IN ('rue')
  AND (genus IS NULL OR genus = '');

-- Salvia (5 species)
UPDATE plant_species SET genus = 'Salvia'
WHERE slug IN ('herb-rosemary', 'herb-sage-common', 'herb-sage-pineapple', 'herb-sage-purple', 'salvia')
  AND (genus IS NULL OR genus = '');

-- Satureja (2 species)
UPDATE plant_species SET genus = 'Satureja'
WHERE slug IN ('herb-savoury-summer', 'herb-savoury-winter')
  AND (genus IS NULL OR genus = '');

-- Scabiosa (1 species)
UPDATE plant_species SET genus = 'Scabiosa'
WHERE slug IN ('scabiosa')
  AND (genus IS NULL OR genus = '');

-- Scorzonera (1 species)
UPDATE plant_species SET genus = 'Scorzonera'
WHERE slug IN ('black-salsify')
  AND (genus IS NULL OR genus = '');

-- Scutellaria (1 species)
UPDATE plant_species SET genus = 'Scutellaria'
WHERE slug IN ('herb-skullcap')
  AND (genus IS NULL OR genus = '');

-- Secale (1 species)
UPDATE plant_species SET genus = 'Secale'
WHERE slug IN ('rye-cereal')
  AND (genus IS NULL OR genus = '');

-- Sechium (1 species)
UPDATE plant_species SET genus = 'Sechium'
WHERE slug IN ('chayote')
  AND (genus IS NULL OR genus = '');

-- Sedum (1 species)
UPDATE plant_species SET genus = 'Sedum'
WHERE slug IN ('sedum')
  AND (genus IS NULL OR genus = '');

-- Silybum (1 species)
UPDATE plant_species SET genus = 'Silybum'
WHERE slug IN ('herb-milk-thistle')
  AND (genus IS NULL OR genus = '');

-- Smallanthus (1 species)
UPDATE plant_species SET genus = 'Smallanthus'
WHERE slug IN ('yacon')
  AND (genus IS NULL OR genus = '');

-- Solanum (8 species)
UPDATE plant_species SET genus = 'Solanum'
WHERE slug IN ('aubergine', 'plum-roma-tomato-solanum-lycopersicum', 'potato', 'potato-solanum-tuberosum', 'tomato', 'tomato-cherry', 'tomato-plum', 'tomato-slicer-solanum-lycopersicum')
  AND (genus IS NULL OR genus = '');

-- Sorbus (1 species)
UPDATE plant_species SET genus = 'Sorbus'
WHERE slug IN ('tree-rowan-mountain-ash')
  AND (genus IS NULL OR genus = '');

-- Spinacia (1 species)
UPDATE plant_species SET genus = 'Spinacia'
WHERE slug IN ('spinach')
  AND (genus IS NULL OR genus = '');

-- Stevia (1 species)
UPDATE plant_species SET genus = 'Stevia'
WHERE slug IN ('herb-stevia')
  AND (genus IS NULL OR genus = '');

-- Symphytum (2 species)
UPDATE plant_species SET genus = 'Symphytum'
WHERE slug IN ('herb-comfrey', 'russian-comfrey')
  AND (genus IS NULL OR genus = '');

-- Tagetes (1 species)
UPDATE plant_species SET genus = 'Tagetes'
WHERE slug IN ('marigold')
  AND (genus IS NULL OR genus = '');

-- Tanacetum (3 species)
UPDATE plant_species SET genus = 'Tanacetum'
WHERE slug IN ('feverfew', 'herb-tansy', 'tansy')
  AND (genus IS NULL OR genus = '');

-- Thymus (4 species)
UPDATE plant_species SET genus = 'Thymus'
WHERE slug IN ('herb-thyme-common', 'herb-thyme-lemon', 'thyme-creeping', 'woolly-thyme')
  AND (genus IS NULL OR genus = '');

-- Tilia (1 species)
UPDATE plant_species SET genus = 'Tilia'
WHERE slug IN ('linden-smallleaf')
  AND (genus IS NULL OR genus = '');

-- Tragopogon (1 species)
UPDATE plant_species SET genus = 'Tragopogon'
WHERE slug IN ('salsify')
  AND (genus IS NULL OR genus = '');

-- Trifolium (3 species)
UPDATE plant_species SET genus = 'Trifolium'
WHERE slug IN ('crimson-clover', 'red-clover', 'white-clover')
  AND (genus IS NULL OR genus = '');

-- Trigonella (1 species)
UPDATE plant_species SET genus = 'Trigonella'
WHERE slug IN ('fenugreek-greens')
  AND (genus IS NULL OR genus = '');

-- Trillium (1 species)
UPDATE plant_species SET genus = 'Trillium'
WHERE slug IN ('trillium')
  AND (genus IS NULL OR genus = '');

-- Tropaeolum (1 species)
UPDATE plant_species SET genus = 'Tropaeolum'
WHERE slug IN ('nasturtium')
  AND (genus IS NULL OR genus = '');

-- Tussilago (1 species)
UPDATE plant_species SET genus = 'Tussilago'
WHERE slug IN ('coltsfoot')
  AND (genus IS NULL OR genus = '');

-- Valeriana (2 species)
UPDATE plant_species SET genus = 'Valeriana'
WHERE slug IN ('herb-valerian', 'valerian')
  AND (genus IS NULL OR genus = '');

-- Verbascum (1 species)
UPDATE plant_species SET genus = 'Verbascum'
WHERE slug IN ('mullein')
  AND (genus IS NULL OR genus = '');

-- Verbena (2 species)
UPDATE plant_species SET genus = 'Verbena'
WHERE slug IN ('verbena-blue', 'verbena-bonariensis')
  AND (genus IS NULL OR genus = '');

-- Veronica (1 species)
UPDATE plant_species SET genus = 'Veronica'
WHERE slug IN ('veronica')
  AND (genus IS NULL OR genus = '');

-- Vicia (3 species)
UPDATE plant_species SET genus = 'Vicia'
WHERE slug IN ('broad-bean', 'fava-bean', 'vetch-common')
  AND (genus IS NULL OR genus = '');

-- Vigna (1 species)
UPDATE plant_species SET genus = 'Vigna'
WHERE slug IN ('cowpea-blackeye')
  AND (genus IS NULL OR genus = '');

-- Zea (1 species)
UPDATE plant_species SET genus = 'Zea'
WHERE slug IN ('sweetcorn')
  AND (genus IS NULL OR genus = '');

-- Zingiber (1 species)
UPDATE plant_species SET genus = 'Zingiber'
WHERE slug IN ('ginger')
  AND (genus IS NULL OR genus = '');

-- Zinnia (1 species)
UPDATE plant_species SET genus = 'Zinnia'
WHERE slug IN ('zinnia')
  AND (genus IS NULL OR genus = '');

COMMIT;
