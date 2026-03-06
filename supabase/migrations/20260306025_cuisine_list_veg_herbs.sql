-- Migration: Populate cuisine_list for vegetables and herbs
-- Date: 2026-03-06
-- Covers 171 species (64 herbs + 107 vegetables)

BEGIN;

-- ============================================================
-- HERBS (64)
-- ============================================================

UPDATE plant_species SET cuisine_list = 'Fruit salads, cocktails, herbal tea, garnishes, infused honey, summer drinks'
WHERE slug = 'anise-hyssop' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Kinpira stir-fry, miso soup, tempura, pickles, simmered dishes'
WHERE slug = 'burdock' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Omelettes, cream sauces, soups, salad dressing, fines herbes, fish dishes'
WHERE slug = 'chervil' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Baked potatoes, omelettes, cream cheese, salads, soups, dumplings'
WHERE slug = 'chive' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Curries, salsa, Thai soups, guacamole, stir-fries, chutneys, pho'
WHERE slug = 'coriander' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Crème de menthe, chocolate desserts, cocktail garnish, ice cream'
WHERE slug = 'corsican-mint' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Gravlax, pickles, potato salad, tzatziki, fish sauces, cucumber salad'
WHERE slug = 'dill' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Black beans, quesadillas, mole, pozole, tamales, enchiladas'
WHERE slug = 'epazote' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sausages, fish dishes, salads, pasta, risotto, herb vinaigrette'
WHERE slug = 'fennel-perennial' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sorrel soup, sauces for fish, omelettes, salads, cream-based sauces'
WHERE slug = 'garden-sorrel' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Candied stems, cakes, gin infusions, rhubarb compote, liqueurs'
WHERE slug = 'herb-angelica' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fruit salads, cocktails, herbal tea, garnishes, infused honey, summer drinks'
WHERE slug = 'herb-anise-hyssop' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pizza margherita, bruschetta, caprese salad, pasta, garnishes'
WHERE slug = 'herb-basil-greek' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pesto, pasta sauces, caprese salad, pizza, bruschetta, infused oils'
WHERE slug = 'herb-basil-sweet' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Thai curries, pho, stir-fries, spring rolls, pad kra pao, Thai basil chicken'
WHERE slug = 'herb-basil-thai' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stews, soups, bouquet garni, béchamel, braised meats, rice pudding'
WHERE slug = 'herb-bay-laurel' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salad garnish, cocktails, Pimms, cucumber sandwiches, frozen in ice cubes'
WHERE slug = 'herb-borage' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salad garnish, rice colouring, butter infusion, herbal tea, baked goods'
WHERE slug = 'herb-calendula' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, cocktail garnish, salad garnish'
WHERE slug = 'herb-catnip' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, apple desserts, infused cream, cocktails, ice cream'
WHERE slug = 'herb-chamomile-german' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, infused syrups, apple compote, cocktails, scones'
WHERE slug = 'herb-chamomile-roman' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Omelettes, cream sauces, soups, salad dressing, fines herbes, fish dishes'
WHERE slug = 'herb-chervil' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Baked potatoes, omelettes, cream cheese, salads, soups, sour cream dips'
WHERE slug = 'herb-chives-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Curries, salsa, Thai soups, guacamole, stir-fries, chutneys, pho'
WHERE slug = 'herb-coriander-leaf' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Gravlax, pickles, potato salad, tzatziki, fish sauces, cucumber salad'
WHERE slug = 'herb-dill-leaf' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fish dishes, salads, pasta, risotto, sausages, herb vinaigrette'
WHERE slug = 'herb-fennel-leaf' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sri Lankan salads, sambol, herbal tea, Southeast Asian drinks'
WHERE slug = 'herb-gotu-kola' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Thai curries, tulsi tea, stir-fries, Indian chutneys, pad kra pao'
WHERE slug = 'herb-holy-basil' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Bean dishes, roast meats, herbal tea, salads, liqueurs'
WHERE slug = 'herb-hyssop' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, cocktails, fruit salads, ice cream, lemon desserts, cordials'
WHERE slug = 'herb-lemon-balm' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, sorbets, fruit salads, cocktails, custards, infused syrups'
WHERE slug = 'herb-lemon-verbena' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Soups, stews, stocks, potato dishes, Bloody Mary, celery substitute'
WHERE slug = 'herb-lovage' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pizza, pasta sauces, grilled meats, vegetables, stuffings, herb butter'
WHERE slug = 'herb-marjoram-sweet' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, root in stews, young leaves in salads, cough syrups'
WHERE slug = 'herb-marshmallow' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salad garnish, roasted seeds as snack, herbal tea'
WHERE slug = 'herb-milk-thistle' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Mojitos, mint sauce, tabbouleh, chocolate desserts, herbal tea, iced drinks'
WHERE slug = 'herb-mint-peppermint' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Mint sauce, lamb dishes, tabbouleh, raita, mojitos, herbal tea, salads'
WHERE slug = 'herb-mint-spearmint' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pizza, pasta sauces, Greek salad, grilled meats, tomato dishes, chilli'
WHERE slug = 'herb-oregano' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Greek salad, moussaka, souvlaki, pizza, grilled meats, tomato sauces'
WHERE slug = 'herb-oregano-greek' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Garnish, tabbouleh, chimichurri, soups, sauces, potato dishes'
WHERE slug = 'herb-parsley-curly' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Chimichurri, tabbouleh, gremolata, pasta, sauces, salads, bouquet garni'
WHERE slug = 'herb-parsley-flat' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roast lamb, roast potatoes, focaccia, marinades, herb butter, stews'
WHERE slug = 'herb-rosemary' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Saltimbocca, brown butter sauce, stuffing, sausages, pork roasts, gnocchi'
WHERE slug = 'herb-sage-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fruit salads, cocktails, dessert garnish, infused syrups, iced tea'
WHERE slug = 'herb-sage-pineapple' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stuffing, pork dishes, brown butter pasta, sausages, bean dishes'
WHERE slug = 'herb-sage-purple' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Bean dishes, grilled meats, herbes de Provence, egg dishes, sausages'
WHERE slug = 'herb-savoury-summer' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Bean stews, roast meats, hearty soups, stuffing, herbes de Provence'
WHERE slug = 'herb-savoury-winter' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sorrel soup, fish sauces, omelettes, salads, cream-based sauces'
WHERE slug = 'herb-sorrel-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sugar substitute in baking, herbal tea, smoothies, lemonade'
WHERE slug = 'herb-stevia' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'May wine (Maibowle), infused syrups, panna cotta, cocktails, jelly'
WHERE slug = 'herb-sweet-woodruff' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Béarnaise sauce, chicken dishes, fish, vinaigrettes, egg dishes, mustard sauces'
WHERE slug = 'herb-tarragon-french' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roast chicken, stews, soups, herb butter, bouquet garni, marinades'
WHERE slug = 'herb-thyme-common' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fish dishes, roast chicken, desserts, herbal tea, salad dressings, cocktails'
WHERE slug = 'herb-thyme-lemon' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Bean dishes, roast meats, herbal tea, salads, liqueurs'
WHERE slug = 'hyssop' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, cocktails, fruit salads, ice cream, lemon desserts, cordials'
WHERE slug = 'lemon-balm' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salad garnish, herbal tea, cake decoration, cocktails, infused syrups'
WHERE slug = 'monarda' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, salad garnish, infused honey, cocktails'
WHERE slug = 'monarda-wild' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Tabbouleh, chimichurri, gremolata, soups, sauces, garnish, salads'
WHERE slug = 'parsley' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, soups, sauces for fish, omelettes, smoothies'
WHERE slug = 'sheep-sorrel' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, soups, sauces for fish, omelettes, smoothies'
WHERE slug = 'sheep-sorrel-2' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Garnish, herb gardens, salads, infused vinegars, roast vegetables'
WHERE slug = 'thyme-creeping' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Herbal tea, infused syrups, bitters, cocktails'
WHERE slug = 'verbena-blue' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Garnish, herb gardens, infused vinegars, roast vegetables'
WHERE slug = 'woolly-thyme' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads (young leaves), cooked greens, herbal tea, flour from seeds'
WHERE slug = 'yellow-dock' AND cuisine_list IS NULL;

-- ============================================================
-- VEGETABLES (107)
-- ============================================================

UPDATE plant_species SET cuisine_list = 'Stir-fries, soups, sautéed greens, curries, grain bowls, smoothies'
WHERE slug = 'amaranth-leaves' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Steamed with butter, grilled, barigoule, dips, pasta, pizza, risotto'
WHERE slug = 'artichoke-globe' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Steamed with hollandaise, risotto, quiche, grilled, pasta, soup'
WHERE slug = 'asparagus' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Moussaka, baba ganoush, ratatouille, parmigiana, curries, stir-fries, grilling'
WHERE slug = 'aubergine' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Chilli, stews, salads, burritos, soups, casseroles, rice and beans'
WHERE slug = 'bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasting, salads, borscht, pickling, hummus, smoothies, crisps'
WHERE slug = 'beetroot' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, soups, mashed, gratin, sautéed with butter, salads'
WHERE slug = 'black-salsify' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, stews, falafel, risotto, pasta, dips, sautéed with garlic'
WHERE slug = 'broad-bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Steamed, stir-fries, roasted, pasta, soup, gratin, salads'
WHERE slug = 'broccoli' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, gratin, sautéed with bacon, steamed, stir-fried, hash'
WHERE slug = 'brussels-sprout' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Kinpira stir-fry, miso soup, tempura, pickles, simmered dishes'
WHERE slug = 'burdock-root' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Coleslaw, stir-fries, sauerkraut, soups, stuffed rolls, braised, kimchi'
WHERE slug = 'cabbage' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Coleslaw, stir-fries, soups, stuffed cabbage rolls, braised, salads'
WHERE slug = 'cabbage-green' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Braised, pickled, coleslaw, roasted wedges, salads, sauerkraut'
WHERE slug = 'cabbage-red' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stuffed cabbage, soups, braised, stir-fries, colcannon, gratin'
WHERE slug = 'cabbage-savoy' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Braised, grilled, battered and fried, gratins, raw in salads, risotto'
WHERE slug = 'cardoon' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, stuffed peppers, salads, roasted, fajitas, ratatouille'
WHERE slug = 'capsicum' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, soups, salads, stews, cakes, stir-fries, juice, glazed'
WHERE slug = 'carrot' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fufu, chips, stews, boiled, fried, tapioca, Brazilian farofa'
WHERE slug = 'cassava' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Cauliflower cheese, roasted, curries, rice substitute, soup, gratin, tempura'
WHERE slug = 'cauliflower' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Remoulade, mashed, roasted, soups, gratin, salads, purée'
WHERE slug = 'celeriac' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Soups, stir-fries, salads, Bloody Mary, braised, stuffing, stocks'
WHERE slug = 'celery' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stuffed, stir-fries, salads, pickled, sautéed, soups, gratin'
WHERE slug = 'chayote' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Hummus, curries, falafel, salads, stews, roasted snack, chana masala'
WHERE slug = 'chickpea' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Hot sauces, curries, stir-fries, salsas, pickled, chilli con carne, sambals'
WHERE slug = 'chili' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, kimchi, dumplings, soups, spring rolls, salads'
WHERE slug = 'chinese-cabbage' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Grilled, ratatouille, pasta, fritters, stuffed, stir-fries, tempura'
WHERE slug = 'courgette' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Hoppin John, curries, stews, salads, fritters, rice and peas'
WHERE slug = 'cowpea-blackeye' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, sandwiches, tzatziki, pickles, raita, sushi, cold soups'
WHERE slug = 'cucumber' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pickles, relish, fermented pickles, quick-pickled, bread and butter pickles'
WHERE slug = 'cucumber-pickling' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pickled, stir-fries, salads, soups, grated garnish, braised, kimchi'
WHERE slug = 'daikon-radish' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, mashed, spreads, baked whole, sauces, confit, bread'
WHERE slug = 'elephant-garlic' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, grilled, braised, risotto, soups, appetiser platters'
WHERE slug = 'endive' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, soups, braised, sautéed with garlic, pasta, gratins'
WHERE slug = 'escarole' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stews, salads, risotto, falafel, dips, pasta, sautéed with garlic'
WHERE slug = 'fava-bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, salads, risotto, gratin, braised, pasta, fish accompaniment'
WHERE slug = 'fennel-bulb' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Curries, aloo methi, parathas, dal, salads, stir-fries'
WHERE slug = 'fenugreek-greens' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, stir-fries, steamed, casseroles, niçoise salad, pasta'
WHERE slug = 'french-bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, pasta, bread, roasted, aioli, marinades, pickled, confit'
WHERE slug = 'garlic' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, dumplings, omelettes, noodle soups, garnish, pancakes'
WHERE slug = 'garlic-chive' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, curries, soups, tea, marinades, baking, pickled, dressings'
WHERE slug = 'ginger' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, pies, jams, salsas, dried as snack, sauces'
WHERE slug = 'ground-cherry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sauces, roast beef, Bloody Mary, pickled fish, cream dips, wasabi substitute'
WHERE slug = 'horseradish' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, soups, mashed, gratin, pickled, chips, sautéed'
WHERE slug = 'jerusalem-artichoke' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, stir-fries, slaws, with lime and chilli, salsas, spring rolls'
WHERE slug = 'jicama' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sautéed, soups, smoothies, crisps, salads, stir-fries, pesto'
WHERE slug = 'kale' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Crisps, sautéed, smoothies, salads, soups, stir-fries, pesto'
WHERE slug = 'kale-curly' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sautéed, salads, soups, smoothies, braised, pasta, pizza topping'
WHERE slug = 'kale-lacinato' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Slaws, roasted, gratin, steamed, stir-fries, soups, stuffed'
WHERE slug = 'kohlrabi' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Vichyssoise, quiche, braised, gratin, pie, stir-fries, risotto'
WHERE slug = 'leek' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, sandwiches, wraps, burgers, tacos, garnish'
WHERE slug = 'lettuce' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, wraps, sandwiches, burgers, garnish, lettuce cups'
WHERE slug = 'lettuce-butterhead' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, burgers, sandwiches, tacos, wedge salad, wraps'
WHERE slug = 'lettuce-iceberg' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, sandwiches, burgers, wraps, garnish, smoothies'
WHERE slug = 'lettuce-looseleaf' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Caesar salad, grilled, wraps, sandwiches, burgers, braised'
WHERE slug = 'lettuce-romaine' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Succotash, soups, casseroles, salads, dips, rice and beans'
WHERE slug = 'lima-bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, curries, salads, soups, sautéed, spinach substitute'
WHERE slug = 'malabar-spinach' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, fruit salads, smoothies, sorbets, wrapped in prosciutto, salsas'
WHERE slug = 'melon-cantaloupe' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, stir-fries, soups, garnish, sandwiches, sautéed'
WHERE slug = 'mizuna' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pickling, stir-fries, soups, roasted, braised, omelettes'
WHERE slug = 'multiplier-onion' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, soups, sautéed, salads, pasta, Indian saag, braised'
WHERE slug = 'mustard-greens' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Gumbo, stir-fries, curries, fried, pickled, stews, grilled'
WHERE slug = 'okra' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Soups, stir-fries, curries, caramelised, salads, sauces, rings, pickled'
WHERE slug = 'onion' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, soups, caramelised, stews, French onion soup, curries, rings'
WHERE slug = 'onion-bulb' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, soups, steamed, noodle dishes, braised, dumplings, ramen'
WHERE slug = 'pak-choi' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, mashed, soups, stews, crisps, gratin, roast dinners, purée'
WHERE slug = 'parsnip' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, soups, risotto, salads, pasta, curries, mushy peas'
WHERE slug = 'pea' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Soups, risotto, salads, pasta, mushy peas, stir-fries, curries'
WHERE slug = 'peas-garden' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, salads, snacking raw, noodle dishes, spring rolls'
WHERE slug = 'peas-snap' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, salads, steamed, noodle dishes, tempura, spring rolls'
WHERE slug = 'peas-snow' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, stuffed, roasted, salads, fajitas, sauces, salsas'
WHERE slug = 'pepper' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Hot sauces, curries, stir-fries, salsas, pickled, sambals, jerk seasoning'
WHERE slug = 'pepper-chilli' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Hot sauces, curries, stir-fries, salsas, pickled, chilli flakes, jerk seasoning'
WHERE slug = 'pepper-hot' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stuffed peppers, roasted, salads, fajitas, stir-fries, pizza, hummus'
WHERE slug = 'pepper-sweet' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, mashed, chips, baked, gratin, gnocchi, salads, soup'
WHERE slug = 'potato' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pies, soups, roasted, curries, risotto, ravioli, bread, seeds roasted'
WHERE slug = 'pumpkin' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, stir-fries, tacos, smoothies, fattoush, pickled'
WHERE slug = 'purslane' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, risotto, grilled, pasta, pizza, braised, appetiser'
WHERE slug = 'radicchio' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, pickled, roasted, sandwiches, tacos, butter radishes, slaws'
WHERE slug = 'radish' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Pickled, stir-fries, tempura, Japanese curry, salads'
WHERE slug = 'rakkyo' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Crumbles, pies, compote, jam, sauces, cordial, fool, cakes'
WHERE slug = 'rhubarb' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, pizza, pasta, pesto, sandwiches, garnish, wilted'
WHERE slug = 'rocket' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, gratin, pasta, steamed, soup, salads, pickled'
WHERE slug = 'romanesco' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stews, salads, steamed, pasta, stir-fries, casseroles, minestrone'
WHERE slug = 'runner-bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, mashed, soups, gratin, sautéed with butter, salads'
WHERE slug = 'salsify' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stews, salads, steamed, stir-fries, tempura, minestrone, casseroles'
WHERE slug = 'scarlet-runner-bean' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Vinaigrettes, sauces, pickled, caramelised, stir-fries, Thai curries, confit'
WHERE slug = 'shallot' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Soups, sauces for fish, omelettes, salads, cream sauces, pasta'
WHERE slug = 'sorrel' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Edamame snack, stir-fries, salads, hummus, tofu, tempeh, miso'
WHERE slug = 'soybean-edamame' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, sautéed, soups, quiche, smoothies, pasta, curries, spanakopita'
WHERE slug = 'spinach' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, stir-fries, garnish, grilled, soups, omelettes, noodle dishes'
WHERE slug = 'spring-onion' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Steamed, stir-fries, gratin, pasta, soup, roasted, quiche'
WHERE slug = 'sprouting-broccoli' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, soups, risotto, curries, mashed, gratin, pasta, ravioli'
WHERE slug = 'squash-butternut' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Grilled, stuffed, sautéed, pickled, pasta, salads'
WHERE slug = 'squash-pattypan' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Baked and shredded as pasta substitute, bolognese, stir-fries, casseroles'
WHERE slug = 'squash-spaghetti' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, soups, stews, pies, curries, mashed, gratin, risotto'
WHERE slug = 'squash-winter' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Grilled, sautéed, stir-fries, salads, casseroles, pasta, fritters'
WHERE slug = 'squash-yellow' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Mashed, roasted, stews, soups, gratin, chips, haggis accompaniment'
WHERE slug = 'swede-rutabaga' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, mashed, pies, curries, fries, casseroles, soups, gnocchi'
WHERE slug = 'sweet-potato' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Grilled, boiled, salads, chowder, salsa, polenta, fritters, on the cob'
WHERE slug = 'sweetcorn' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sautéed, quiche, gratins, soups, pasta, wraps, stir-fries'
WHERE slug = 'swiss-chard' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Poi, chips, curries, stews, boiled, stir-fries, soups'
WHERE slug = 'taro' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Stir-fries, salads, soups, steamed, sautéed, noodle dishes'
WHERE slug = 'tatsoi' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salsa verde, enchiladas, chilli verde, guacamole, sauces, soups, grilled'
WHERE slug = 'tomatillo' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, sauces, soups, roasting, bruschetta, sandwiches, pizza'
WHERE slug = 'tomato' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, roasted, pasta, bruschetta, snacking, kebabs, pizza topping'
WHERE slug = 'tomato-cherry' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Sauces, passata, slow-roasted, pizza, sun-dried, soups, paste'
WHERE slug = 'tomato-plum' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Roasted, mashed, stews, pickled, gratin, soups, glazed, turnip greens'
WHERE slug = 'turnip' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Salads, sandwiches, soups, garnish, stir-fries, pesto, smoothies'
WHERE slug = 'watercress' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Fresh eating, fruit salads, juiced, smoothies, grilled, sorbets, agua fresca'
WHERE slug = 'watermelon' AND cuisine_list IS NULL;

UPDATE plant_species SET cuisine_list = 'Raw in salads, juiced, smoothies, syrup, sliced as snack, pickled'
WHERE slug = 'yacon' AND cuisine_list IS NULL;

COMMIT;
