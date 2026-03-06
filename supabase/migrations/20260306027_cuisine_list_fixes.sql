-- Migration: Fix cuisine_list entries flagged during culinary review
-- Date: 2026-03-06
-- Fixes: too-few uses, missing iconic uses, safety clarity, generic terms
-- Only updates entries that still hold the original (incorrect) value

BEGIN;

-- ============================================================
-- TOO FEW USES (< 4 items) or contained non-culinary terms
-- ============================================================

-- herb-catnip: was 3 uses, now 5
UPDATE plant_species SET cuisine_list = 'Herbal tea, cocktail garnish, salad garnish, infused syrups, flavoured honey'
WHERE slug = 'herb-catnip'
  AND cuisine_list = 'Herbal tea, cocktail garnish, salad garnish';

-- herb-milk-thistle: was 3 uses, reordered and expanded
UPDATE plant_species SET cuisine_list = 'Roasted seeds as snack, herbal tea, young leaves sautéed, stems peeled and braised, salad garnish'
WHERE slug = 'herb-milk-thistle'
  AND cuisine_list = 'Salad garnish, roasted seeds as snack, herbal tea';

-- woolly-thyme: "herb gardens" is not a culinary use
UPDATE plant_species SET cuisine_list = 'Garnish, infused vinegars, roast vegetables, herbal tea, herb butter'
WHERE slug = 'woolly-thyme'
  AND cuisine_list = 'Garnish, herb gardens, infused vinegars, roast vegetables';

-- verbena-blue: was 4 uses, now 5
UPDATE plant_species SET cuisine_list = 'Herbal tea, infused syrups, bitters, cocktails, infused honey'
WHERE slug = 'verbena-blue'
  AND cuisine_list = 'Herbal tea, infused syrups, bitters, cocktails';

-- fruit-hybrid-shipova: was 4 uses, now 6
UPDATE plant_species SET cuisine_list = 'Fresh eating, jams, compotes, poaching, baking, fruit butter'
WHERE slug = 'fruit-hybrid-shipova'
  AND cuisine_list = 'Fresh eating, jams, compotes, poaching';

-- tree-hazel-harry-lauder: was 4 uses, now 6
UPDATE plant_species SET cuisine_list = 'Raw snacking, roasting, baking, nut butter, praline, salads'
WHERE slug = 'tree-hazel-harry-lauder'
  AND cuisine_list = 'Raw snacking, roasting, baking, nut butter';

-- gorse-hedge: was 4 uses, now 6
UPDATE plant_species SET cuisine_list = 'Flower tea, flower wine, flower syrup, pickled buds, infused honey, salad garnish'
WHERE slug = 'gorse-hedge'
  AND cuisine_list = 'Flower tea, flower wine, flower syrup, pickled buds';

-- tree-lodgepole-pine: was 3 uses, expanded
UPDATE plant_species SET cuisine_list = 'Pine needle tea, inner bark flour, young shoots as seasoning, infused vinegar, pine nut harvesting'
WHERE slug = 'tree-lodgepole-pine'
  AND cuisine_list = 'Inner bark tea, pine needle tea, young shoots as seasoning';

-- ============================================================
-- SAFETY: clarify that processing/cooking is required
-- ============================================================

-- cassava: reorder to emphasise processed forms first
UPDATE plant_species SET cuisine_list = 'Fufu, tapioca, Brazilian farofa, chips (cooked), stews, fried, boiled and mashed'
WHERE slug = 'cassava'
  AND cuisine_list = 'Fufu, chips, stews, boiled, fried, tapioca, Brazilian farofa';

-- tree-oak-burr: acorns must be leached; was only 3 uses
UPDATE plant_species SET cuisine_list = 'Acorn flour (leached), roasted acorn coffee, acorn porridge (leached), acorn bread, smoking wood'
WHERE slug = 'tree-oak-burr'
  AND cuisine_list = 'Acorn flour, roasted acorn coffee, acorn porridge';

-- tree-oak-red: same leaching concern; was only 3 uses
UPDATE plant_species SET cuisine_list = 'Acorn flour (leached), roasted acorn coffee, acorn porridge (leached), acorn bread'
WHERE slug = 'tree-oak-red'
  AND cuisine_list = 'Acorn flour, roasted acorn coffee, acorn porridge';

-- fruit-elder: clarify flower vs berry parts
UPDATE plant_species SET cuisine_list = 'Elderflower cordial, elderflower champagne, fritters, syrups, elderberry jelly, elderberry wine, infused vinegar'
WHERE slug = 'fruit-elder'
  AND cuisine_list = 'Cordial, champagne, fritters, syrups, infused vinegar, wine, jelly from berries';

-- fruit-elder-black-lace: same clarification
UPDATE plant_species SET cuisine_list = 'Elderflower cordial, elderflower champagne, fritters, syrups, elderberry jelly, elderberry wine, infused vinegar'
WHERE slug = 'fruit-elder-black-lace'
  AND cuisine_list = 'Cordial, champagne, fritters, syrups, infused vinegar, wine, jelly from berries';

-- ============================================================
-- MISSING ICONIC / CULTURAL USES
-- ============================================================

-- daikon-radish: add Japanese dish names
UPDATE plant_species SET cuisine_list = 'Grated garnish (oroshi), pickled (takuan), oden, stir-fries, salads, kimchi, braised, soups'
WHERE slug = 'daikon-radish'
  AND cuisine_list = 'Pickled, stir-fries, salads, soups, grated garnish, braised, kimchi';

-- cucumber-pickling: too repetitive (4 of 5 were pickle variants)
UPDATE plant_species SET cuisine_list = 'Fermented pickles, bread and butter pickles, relish, quick-pickled, fresh snacking, salads'
WHERE slug = 'cucumber-pickling'
  AND cuisine_list = 'Pickles, relish, fermented pickles, quick-pickled, bread and butter pickles';

-- rhubarb: add gin infusion (hugely popular), drop vague "sauces"
UPDATE plant_species SET cuisine_list = 'Crumbles, pies, fool, compote, jam, cordial, gin infusion, cakes'
WHERE slug = 'rhubarb'
  AND cuisine_list = 'Crumbles, pies, compote, jam, sauces, cordial, fool, cakes';

-- fruit-blackcurrant: add summer pudding (iconic British)
UPDATE plant_species SET cuisine_list = 'Jams, cordials, cassis liqueur, summer pudding, sorbets, sauces, baking'
WHERE slug = 'fruit-blackcurrant'
  AND cuisine_list = 'Jams, cordials, cassis liqueur, sorbets, sauces, baking';

-- fruit-pawpaw: "baking" is too generic, specify pawpaw bread
UPDATE plant_species SET cuisine_list = 'Fresh eating, custards, ice cream, pawpaw bread, smoothies, beer brewing, puddings'
WHERE slug = 'fruit-pawpaw'
  AND cuisine_list = 'Fresh eating, custards, ice cream, baking, smoothies, beer brewing';

-- ground-cherry: add compotes and cocktail garnish
UPDATE plant_species SET cuisine_list = 'Salads, pies, jams, salsas, dried as snack, compotes, cocktail garnish'
WHERE slug = 'ground-cherry'
  AND cuisine_list = 'Salads, pies, jams, salsas, dried as snack, sauces';

-- fruit-mountain-ash: expand from 4 to 6 uses
UPDATE plant_species SET cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits, wine, fruit leather (cooked)'
WHERE slug = 'fruit-mountain-ash'
  AND cuisine_list = 'Rowan jelly, syrups, infused spirits, sauces for game';

-- tree-mountain-ash-dwarf: same expansion
UPDATE plant_species SET cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits, wine, fruit leather (cooked)'
WHERE slug = 'tree-mountain-ash-dwarf'
  AND cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits';

-- tree-rowan-mountain-ash: same expansion
UPDATE plant_species SET cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits, wine, fruit leather (cooked)'
WHERE slug = 'tree-rowan-mountain-ash'
  AND cuisine_list = 'Rowan jelly, syrups, sauces for game, infused spirits';

COMMIT;
