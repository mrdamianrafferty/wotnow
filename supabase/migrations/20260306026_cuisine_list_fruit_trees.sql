-- Migration: Populate cuisine_list for fruit trees, vines, ornamental edibles, shrubs, and other edible species
-- Only updates rows where cuisine_list IS NULL

BEGIN;

-- =============================================================================
-- FRUIT (4)
-- =============================================================================

UPDATE plant_species SET cuisine_list = 'Jams, cordials, cassis liqueur, sorbets, sauces, baking'
WHERE slug = 'fruit-blackcurrant' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Jams, jellies, fresh eating, sauces, summer pudding, cordials'
WHERE slug = 'fruit-currant' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Crumbles, fools, jams, pies, chutneys, compotes'
WHERE slug = 'fruit-gooseberry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, salads, jams, infused water, dessert garnish'
WHERE slug = 'wild-strawberry' AND cuisine_list IS NULL;

-- =============================================================================
-- FRUIT-TREE (41)
-- =============================================================================

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, crumbles, cider, sauce, drying, butter'
WHERE slug = 'fruit-apple' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, drying, tarts, compotes, Turkish dried apricot, kernels in amaretti'
WHERE slug = 'fruit-apricot' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Juicing, jams, syrups, smoothies, baking, wine'
WHERE slug = 'fruit-aronia' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Jams, sauces, fruit leather, juicing, dried as seasoning'
WHERE slug = 'fruit-autumn-olive' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Baking, ice cream, salads, candied, oil pressing, liqueurs'
WHERE slug = 'fruit-black-walnut' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, sorbets, smoothies, ice cream, mousse'
WHERE slug = 'fruit-cherimoya' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Damson gin, jams, cheese, sauces for game, pies, chutney'
WHERE slug = 'fruit-damson' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Cordial, champagne, fritters, syrups, infused vinegar, wine, jelly from berries'
WHERE slug = 'fruit-elder' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Cordial, champagne, fritters, syrups, infused vinegar, wine, jelly from berries'
WHERE slug = 'fruit-elder-black-lace' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, smoothies, jams, chutneys, baking, ice cream'
WHERE slug = 'fruit-feijoa' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, roasting with honey, preserves, charcuterie boards, baking, drying'
WHERE slug = 'fruit-fig' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, tarts, compotes, preserving in syrup, liqueurs'
WHERE slug = 'fruit-gage' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, juicing, smoothies, sauces'
WHERE slug = 'fruit-guava-strawberry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh nibbling, jams, ground into flour, syrup'
WHERE slug = 'fruit-hackberry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, salads, smoothies, jams, drying, baking'
WHERE slug = 'fruit-hardy-kiwi' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, roasting, praline, nut butter, baking, dukkah, oil pressing'
WHERE slug = 'fruit-hazelnut' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, compotes, poaching'
WHERE slug = 'fruit-hybrid-shipova' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Gin flavouring, game marinades, sauerkraut seasoning, curing, syrups'
WHERE slug = 'fruit-juniper-berry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Juicing, zesting, dressings, curd, preserved lemons, baking, cocktails'
WHERE slug = 'fruit-lemon' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, poaching, syrups, salads, chutney'
WHERE slug = 'fruit-loquat' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, juicing, marmalade, salads, baking, drying'
WHERE slug = 'fruit-mandarin' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Jelly, cheese, poaching with wine, roasting with game, paste'
WHERE slug = 'fruit-medlar' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Jams, tarts, clafoutis, eau de vie, compotes, baking'
WHERE slug = 'fruit-mirabelle' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Rowan jelly, syrups, infused spirits, sauces for game'
WHERE slug = 'fruit-mountain-ash' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, syrups, sorbets, drying, wine, baking'
WHERE slug = 'fruit-mulberry-black' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, drying, syrups, baking, smoothies'
WHERE slug = 'fruit-mulberry-white' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, grilling, jams, salads, drying, pickling, bellini cocktails'
WHERE slug = 'fruit-nectarine' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Curing, oil pressing, tapenade, baking, marinating, stuffing'
WHERE slug = 'fruit-olive' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, juicing, marmalade, baking, sauces, zesting, candied peel'
WHERE slug = 'fruit-orange' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, custards, ice cream, baking, smoothies, beer brewing'
WHERE slug = 'fruit-pawpaw' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, grilling, jams, drying, bellini cocktails, chutney'
WHERE slug = 'fruit-peach' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, poaching, baking, perry, drying, preserves, salads with blue cheese'
WHERE slug = 'fruit-pear' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, drying (hoshigaki), baking, puddings, salads, vinegar'
WHERE slug = 'fruit-persimmon' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, juicing, molasses, salads, garnish, cocktails, Middle Eastern stews'
WHERE slug = 'fruit-pomegranate' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, drying, sauces, chutneys, jams'
WHERE slug = 'fruit-quandong' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Membrillo paste, jelly, poaching, tagines, roasting with meat, liqueurs'
WHERE slug = 'fruit-quince' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, jams, syrups, pemmican, muffins, wine'
WHERE slug = 'fruit-saskatoon' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Juicing, syrups, sauces, smoothies, drying, oil extraction'
WHERE slug = 'fruit-sea-buckthorn' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, jams, syrups, muffins, pancakes'
WHERE slug = 'fruit-serviceberry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasting, flour (castagnaccio), stuffing, purees, candied (marrons glaces), soups'
WHERE slug = 'fruit-sweet-chestnut' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, baking, salads, oil pressing, pickling green walnuts, nocino liqueur'
WHERE slug = 'fruit-walnut' AND cuisine_list IS NULL;

-- =============================================================================
-- ORNAMENTAL EDIBLE (10)
-- =============================================================================

UPDATE plant_species SET cuisine_list = 'Buds in stir-fries, flower petals in salads, tempura, stuffed blossoms'
WHERE slug = 'daylily' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, tinctures, infused honey, syrups'
WHERE slug = 'echinacea' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Baking, infused sugar, syrups, shortbread, ice cream, herbal tea, cocktails'
WHERE slug = 'lavender' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salad garnish, infused butter, rice colouring, herbal tea, edible decoration'
WHERE slug = 'marigold' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Flowers in salads, pickled seed pods (caper substitute), pesto, stuffed flowers'
WHERE slug = 'nasturtium' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Candied flowers, salad garnish, syrups, herbal tea'
WHERE slug = 'primrose' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Rose water, Turkish delight, jams, syrups, petal salads, infused vinegar, lassi'
WHERE slug = 'rose' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, garnish, infused syrups, salads, flavoured honey'
WHERE slug = 'salvia' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Seeds raw or roasted, seed butter, oil pressing, sprouted in salads, petals as garnish'
WHERE slug = 'sunflower' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Seeds raw or roasted, oil pressing, sprouted in salads'
WHERE slug = 'sunflower-biomass' AND cuisine_list IS NULL;

-- =============================================================================
-- SHRUB (4)
-- =============================================================================

UPDATE plant_species SET cuisine_list = 'Sloe gin, jams, syrups, sloe wine, flavouring for vodka, jelly'
WHERE slug = 'blackthorn' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Flower tea, flower wine, flower syrup, pickled buds'
WHERE slug = 'gorse-hedge' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, roasting, nut butter, praline, baking, dukkah'
WHERE slug = 'hazel-hedge' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Rose hip syrup, jams, herbal tea, jelly, wine, dried for seasoning'
WHERE slug = 'rosa-rugosa-hedge' AND cuisine_list IS NULL;

-- =============================================================================
-- TREE (25)
-- =============================================================================

UPDATE plant_species SET cuisine_list = 'Flower tea (linden tea), flower fritters, young leaf salads, honey source'
WHERE slug = 'linden-smallleaf' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Maple syrup, maple sugar, maple butter, candy, glazing, vinaigrette'
WHERE slug = 'maple-sugar' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, roasting, pies, praline, butter, baking, salads'
WHERE slug = 'pecan' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasting, flour (castagnaccio), stuffing, purees, candied (marrons glaces), soups'
WHERE slug = 'sweet-chestnut' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Jelly, pickling, cider blending, spiced crab apple butter'
WHERE slug = 'tree-crabapple-ornamental' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, dried fruit leather, sauces'
WHERE slug = 'tree-eleagnus-silverberry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Haw jelly, ketchup, young leaf salads, herbal tea, infused vinegar'
WHERE slug = 'tree-hawthorn-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, roasting, baking, nut butter'
WHERE slug = 'tree-hazel-harry-lauder' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, roasting, baking, nut butter, praline, oil pressing'
WHERE slug = 'tree-hazel-treeform' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, syrups, sauces, smoothies, baking'
WHERE slug = 'tree-honeyberry-treeform' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, jams, syrups, muffins, pancakes'
WHERE slug = 'tree-juneberry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Gin flavouring, game marinades, sauerkraut seasoning, curing, syrups'
WHERE slug = 'tree-juniper-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Inner bark tea, pine needle tea, young shoots as seasoning'
WHERE slug = 'tree-lodgepole-pine' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pods ground into flour, syrup, grilling wood smoke, tea'
WHERE slug = 'tree-mesquite' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits'
WHERE slug = 'tree-mountain-ash-dwarf' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Spruce tip syrup, herbal tea, beer brewing, young tips in salads, infused vinegar'
WHERE slug = 'tree-norway-spruce' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Acorn flour, roasted acorn coffee, acorn porridge'
WHERE slug = 'tree-oak-burr' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Acorn flour, roasted acorn coffee, acorn porridge, smoking wood'
WHERE slug = 'tree-oak-english' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Acorn flour, roasted acorn coffee, acorn porridge'
WHERE slug = 'tree-oak-red' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits'
WHERE slug = 'tree-rowan-mountain-ash' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, pies, jams, syrups, muffins, pancakes'
WHERE slug = 'tree-serviceberry-treeform' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, compotes, pies, drying'
WHERE slug = 'tree-snowy-mespilus' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasting, flour (castagnaccio), stuffing, purees, candied (marrons glaces), soups'
WHERE slug = 'tree-sweet-chestnut' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Baking, ice cream, salads, candied, oil pressing, liqueurs'
WHERE slug = 'walnut-black' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw snacking, baking, salads, oil pressing, pickling green walnuts, nocino liqueur'
WHERE slug = 'walnut-english' AND cuisine_list IS NULL;

-- =============================================================================
-- VINE (7)
-- =============================================================================

UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, stir-fries (young shoots), infused drinks'
WHERE slug = 'akebia' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, wine, juicing, raisins, vinegar, jelly, dolma (stuffed leaves)'
WHERE slug = 'grape-vine' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Beer brewing, herbal tea, young shoots in salads, infused syrups, pickled shoots'
WHERE slug = 'hop-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, smoothies, pavlova, salads, drying, juicing'
WHERE slug = 'kiwi-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, salads, smoothies, jams, drying, baking'
WHERE slug = 'kiwi-hardy' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, juicing, syrups, cocktails, jams, baking'
WHERE slug = 'passionflower' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, tinctures, dried berries as seasoning, infused spirits, syrups'
WHERE slug = 'schisandra' AND cuisine_list IS NULL;

COMMIT;
