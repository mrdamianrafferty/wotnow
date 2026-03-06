-- Migration: Fill remaining data gaps for vegetables, herbs, and fruits
-- Date: 2026-03-06
-- Focus: sow_indoors_months, direct_sow_months, plant_out_months, days_to_maturity,
--        maturity_basis, companions, min_temp_c, height/spread, descriptions
-- Does NOT duplicate fixes from 20260306005 or 20260306006

BEGIN;

-- ============================================================================
-- SECTION 1: SOW INDOORS MONTHS (when to start under cover)
-- ============================================================================

-- Tomato
UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug = 'tomato' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug = 'tomato-cherry' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug = 'tomato-plum' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Peppers & chillies
UPDATE public.plant_species SET sow_indoors_months = '{1,2,3}'::integer[]
WHERE slug = 'pepper-chilli' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_indoors_months = '{2,3}'::integer[]
WHERE slug = 'pepper' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_indoors_months = '{2,3}'::integer[]
WHERE slug = 'pepper-sweet' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_indoors_months = '{1,2,3}'::integer[]
WHERE slug = 'pepper-hot' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Aubergine
UPDATE public.plant_species SET sow_indoors_months = '{2,3}'::integer[]
WHERE slug = 'aubergine' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Cucurbits
UPDATE public.plant_species SET sow_indoors_months = '{4,5}'::integer[]
WHERE slug IN ('courgette','cucumber','pumpkin','squash-winter','squash-yellow','squash-pattypan','squash-spaghetti','melon-cantaloupe','watermelon')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Sweetcorn
UPDATE public.plant_species SET sow_indoors_months = '{4}'::integer[]
WHERE slug = 'sweetcorn' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Runner & French beans
UPDATE public.plant_species SET sow_indoors_months = '{4,5}'::integer[]
WHERE slug IN ('runner-bean','french-bean','scarlet-runner-bean')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Broad bean
UPDATE public.plant_species SET sow_indoors_months = '{1,2}'::integer[]
WHERE slug IN ('broad-bean','fava-bean')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Cauliflower
UPDATE public.plant_species SET sow_indoors_months = '{1,2,3,4}'::integer[]
WHERE slug = 'cauliflower' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Broccoli / sprouting broccoli
UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug IN ('broccoli','sprouting-broccoli','romanesco')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Cabbage
UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Brussels sprouts
UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug = 'brussels-sprout' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Kale
UPDATE public.plant_species SET sow_indoors_months = '{3,4,5}'::integer[]
WHERE slug IN ('kale','kale-curly','kale-lacinato')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Leek
UPDATE public.plant_species SET sow_indoors_months = '{1,2,3}'::integer[]
WHERE slug = 'leek' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Onion (from seed)
UPDATE public.plant_species SET sow_indoors_months = '{1,2}'::integer[]
WHERE slug = 'onion-bulb' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Lettuce
UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug IN ('lettuce','lettuce-butterhead','lettuce-iceberg','lettuce-looseleaf','lettuce-romaine')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Celery / celeriac
UPDATE public.plant_species SET sow_indoors_months = '{2,3}'::integer[]
WHERE slug IN ('celery','celeriac')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Fennel (bulb)
UPDATE public.plant_species SET sow_indoors_months = '{3,4}'::integer[]
WHERE slug = 'fennel-bulb' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Tomatillo
UPDATE public.plant_species SET sow_indoors_months = '{2,3,4}'::integer[]
WHERE slug = 'tomatillo' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Ground cherry
UPDATE public.plant_species SET sow_indoors_months = '{2,3}'::integer[]
WHERE slug = 'ground-cherry' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Okra
UPDATE public.plant_species SET sow_indoors_months = '{3,4}'::integer[]
WHERE slug = 'okra' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Basil herbs (indoor start essential in UK)
UPDATE public.plant_species SET sow_indoors_months = '{3,4,5}'::integer[]
WHERE slug IN ('herb-basil-sweet','herb-basil-thai','herb-basil-greek','herb-holy-basil')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Parsley
UPDATE public.plant_species SET sow_indoors_months = '{2,3}'::integer[]
WHERE slug IN ('herb-parsley-flat','herb-parsley-curly','parsley')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Coriander
UPDATE public.plant_species SET sow_indoors_months = '{3,4}'::integer[]
WHERE slug IN ('coriander','herb-coriander-leaf')
AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);

-- Edamame / soybean
UPDATE public.plant_species SET sow_indoors_months = '{4,5}'::integer[]
WHERE slug = 'soybean-edamame' AND (sow_indoors_months IS NULL OR sow_indoors_months = '{}'::integer[]);


-- ============================================================================
-- SECTION 2: DIRECT SOW MONTHS (when to sow outdoors directly)
-- ============================================================================

-- Pea
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7}'::integer[]
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Broad bean
UPDATE public.plant_species SET direct_sow_months = '{2,3,4,10,11}'::integer[]
WHERE slug IN ('broad-bean','fava-bean')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Runner & French beans (outdoor sow after frost)
UPDATE public.plant_species SET direct_sow_months = '{5,6}'::integer[]
WHERE slug IN ('runner-bean','french-bean','scarlet-runner-bean','bean')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Beetroot
UPDATE public.plant_species SET direct_sow_months = '{4,5,6,7}'::integer[]
WHERE slug = 'beetroot' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Carrot
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7}'::integer[]
WHERE slug = 'carrot' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Parsnip
UPDATE public.plant_species SET direct_sow_months = '{2,3,4,5}'::integer[]
WHERE slug = 'parsnip' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Turnip
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8}'::integer[]
WHERE slug = 'turnip' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Radish
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8,9}'::integer[]
WHERE slug = 'radish' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Swede
UPDATE public.plant_species SET direct_sow_months = '{5,6}'::integer[]
WHERE slug = 'swede-rutabaga' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Spinach
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,8,9}'::integer[]
WHERE slug = 'spinach' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Lettuce
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8}'::integer[]
WHERE slug IN ('lettuce','lettuce-butterhead','lettuce-iceberg','lettuce-looseleaf','lettuce-romaine')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Sweetcorn (direct sow late May only in mild areas)
UPDATE public.plant_species SET direct_sow_months = '{5}'::integer[]
WHERE slug = 'sweetcorn' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Courgette / cucumber (direct sow late May/June)
UPDATE public.plant_species SET direct_sow_months = '{5,6}'::integer[]
WHERE slug IN ('courgette','cucumber','pumpkin','squash-winter','squash-yellow','squash-pattypan','squash-spaghetti')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Spring onion
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8,9}'::integer[]
WHERE slug = 'spring-onion' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Coriander (direct sow preferred, dislikes transplant)
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8,9}'::integer[]
WHERE slug IN ('coriander','herb-coriander-leaf')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Dill (direct sow, dislikes transplant)
UPDATE public.plant_species SET direct_sow_months = '{4,5,6,7}'::integer[]
WHERE slug IN ('dill','herb-dill-leaf')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Rocket / arugula
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8,9}'::integer[]
WHERE slug = 'rocket' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Chard / Swiss chard
UPDATE public.plant_species SET direct_sow_months = '{4,5,6,7}'::integer[]
WHERE slug = 'chard' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Kale (direct sow)
UPDATE public.plant_species SET direct_sow_months = '{4,5,6,7}'::integer[]
WHERE slug IN ('kale','kale-curly','kale-lacinato')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Pak choi / mizuna / tatsoi (direct sow)
UPDATE public.plant_species SET direct_sow_months = '{4,5,6,7,8,9}'::integer[]
WHERE slug IN ('pak-choi','mizuna','tatsoi')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Mustard greens
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,8,9}'::integer[]
WHERE slug = 'mustard-greens' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Endive / escarole / radicchio
UPDATE public.plant_species SET direct_sow_months = '{4,5,6,7}'::integer[]
WHERE slug IN ('endive','escarole','radicchio')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Kohlrabi
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,6,7,8}'::integer[]
WHERE slug = 'kohlrabi' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Chinese cabbage
UPDATE public.plant_species SET direct_sow_months = '{6,7,8}'::integer[]
WHERE slug = 'chinese-cabbage' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Borage
UPDATE public.plant_species SET direct_sow_months = '{4,5,6}'::integer[]
WHERE slug = 'herb-borage' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Calendula
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,9}'::integer[]
WHERE slug = 'herb-calendula' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Chervil
UPDATE public.plant_species SET direct_sow_months = '{3,4,5,8,9}'::integer[]
WHERE slug IN ('herb-chervil','chervil')
AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Daikon radish
UPDATE public.plant_species SET direct_sow_months = '{7,8,9}'::integer[]
WHERE slug = 'daikon-radish' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Garlic (plant cloves directly)
UPDATE public.plant_species SET direct_sow_months = '{10,11,12,1,2}'::integer[]
WHERE slug = 'garlic' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);

-- Shallot (plant sets directly)
UPDATE public.plant_species SET direct_sow_months = '{2,3,11,12}'::integer[]
WHERE slug = 'shallot' AND (direct_sow_months IS NULL OR direct_sow_months = '{}'::integer[]);


-- ============================================================================
-- SECTION 3: PLANT OUT MONTHS (transplant outdoors)
-- ============================================================================

-- Tomato
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug IN ('tomato','tomato-cherry','tomato-plum')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Peppers
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug IN ('pepper','pepper-sweet','pepper-chilli','pepper-hot')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Aubergine
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug = 'aubergine' AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Cucurbits
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug IN ('courgette','cucumber','pumpkin','squash-winter','squash-yellow','squash-pattypan','squash-spaghetti','melon-cantaloupe','watermelon')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Runner & French beans
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug IN ('runner-bean','french-bean','scarlet-runner-bean','bean')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Sweetcorn
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug = 'sweetcorn' AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Brassicas (transplant)
UPDATE public.plant_species SET plant_out_months = '{5,6,7}'::integer[]
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy','broccoli','sprouting-broccoli','romanesco','brussels-sprout')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Cauliflower
UPDATE public.plant_species SET plant_out_months = '{4,5,6,7}'::integer[]
WHERE slug = 'cauliflower' AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Kale
UPDATE public.plant_species SET plant_out_months = '{5,6,7}'::integer[]
WHERE slug IN ('kale','kale-curly','kale-lacinato')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Leek
UPDATE public.plant_species SET plant_out_months = '{5,6,7}'::integer[]
WHERE slug = 'leek' AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Celery / celeriac
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug IN ('celery','celeriac')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Lettuce (transplants)
UPDATE public.plant_species SET plant_out_months = '{4,5,6,7,8}'::integer[]
WHERE slug IN ('lettuce','lettuce-butterhead','lettuce-iceberg','lettuce-looseleaf','lettuce-romaine')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Tomatillo / ground cherry
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug IN ('tomatillo','ground-cherry')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Okra
UPDATE public.plant_species SET plant_out_months = '{6}'::integer[]
WHERE slug = 'okra' AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Basil
UPDATE public.plant_species SET plant_out_months = '{6}'::integer[]
WHERE slug IN ('herb-basil-sweet','herb-basil-thai','herb-basil-greek','herb-holy-basil')
AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);

-- Edamame
UPDATE public.plant_species SET plant_out_months = '{5,6}'::integer[]
WHERE slug = 'soybean-edamame' AND (plant_out_months IS NULL OR plant_out_months = '{}'::integer[]);


-- ============================================================================
-- SECTION 4: HARVEST MONTHS (fill gaps only)
-- ============================================================================

-- Beetroot
UPDATE public.plant_species SET harvest_months = '{6,7,8,9,10,11}'::integer[]
WHERE slug = 'beetroot' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Carrot
UPDATE public.plant_species SET harvest_months = '{6,7,8,9,10,11,12}'::integer[]
WHERE slug = 'carrot' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Parsnip
UPDATE public.plant_species SET harvest_months = '{10,11,12,1,2,3}'::integer[]
WHERE slug = 'parsnip' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Turnip
UPDATE public.plant_species SET harvest_months = '{5,6,7,8,9,10,11}'::integer[]
WHERE slug = 'turnip' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Radish
UPDATE public.plant_species SET harvest_months = '{4,5,6,7,8,9,10}'::integer[]
WHERE slug = 'radish' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Swede
UPDATE public.plant_species SET harvest_months = '{9,10,11,12,1,2}'::integer[]
WHERE slug = 'swede-rutabaga' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Chard
UPDATE public.plant_species SET harvest_months = '{6,7,8,9,10,11}'::integer[]
WHERE slug = 'chard' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Rocket
UPDATE public.plant_species SET harvest_months = '{4,5,6,7,8,9,10}'::integer[]
WHERE slug = 'rocket' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Pak choi / mizuna / tatsoi
UPDATE public.plant_species SET harvest_months = '{5,6,7,8,9,10,11}'::integer[]
WHERE slug IN ('pak-choi','mizuna','tatsoi')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Endive / escarole
UPDATE public.plant_species SET harvest_months = '{7,8,9,10,11}'::integer[]
WHERE slug IN ('endive','escarole')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Radicchio
UPDATE public.plant_species SET harvest_months = '{9,10,11,12}'::integer[]
WHERE slug = 'radicchio' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Kohlrabi
UPDATE public.plant_species SET harvest_months = '{5,6,7,8,9,10}'::integer[]
WHERE slug = 'kohlrabi' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Chinese cabbage
UPDATE public.plant_species SET harvest_months = '{8,9,10,11}'::integer[]
WHERE slug = 'chinese-cabbage' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Brussels sprout
UPDATE public.plant_species SET harvest_months = '{10,11,12,1,2,3}'::integer[]
WHERE slug = 'brussels-sprout' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Kale
UPDATE public.plant_species SET harvest_months = '{9,10,11,12,1,2,3}'::integer[]
WHERE slug IN ('kale','kale-curly','kale-lacinato')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Broccoli / sprouting broccoli
UPDATE public.plant_species SET harvest_months = '{7,8,9,10}'::integer[]
WHERE slug = 'broccoli' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

UPDATE public.plant_species SET harvest_months = '{2,3,4,5}'::integer[]
WHERE slug = 'sprouting-broccoli' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Romanesco
UPDATE public.plant_species SET harvest_months = '{9,10,11}'::integer[]
WHERE slug = 'romanesco' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Cabbage
UPDATE public.plant_species SET harvest_months = '{6,7,8,9,10,11,12}'::integer[]
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Tomato
UPDATE public.plant_species SET harvest_months = '{7,8,9,10}'::integer[]
WHERE slug IN ('tomato','tomato-cherry','tomato-plum')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Pepper
UPDATE public.plant_species SET harvest_months = '{7,8,9,10}'::integer[]
WHERE slug IN ('pepper','pepper-sweet','pepper-hot')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Pepper chilli
UPDATE public.plant_species SET harvest_months = '{8,9,10}'::integer[]
WHERE slug = 'pepper-chilli' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Aubergine
UPDATE public.plant_species SET harvest_months = '{7,8,9,10}'::integer[]
WHERE slug = 'aubergine' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Courgette
UPDATE public.plant_species SET harvest_months = '{7,8,9,10}'::integer[]
WHERE slug = 'courgette' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Cucumber
UPDATE public.plant_species SET harvest_months = '{7,8,9}'::integer[]
WHERE slug IN ('cucumber','cucumber-pickling')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Pumpkin / winter squash
UPDATE public.plant_species SET harvest_months = '{9,10}'::integer[]
WHERE slug IN ('pumpkin','squash-winter','squash-spaghetti')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Summer squash
UPDATE public.plant_species SET harvest_months = '{7,8,9}'::integer[]
WHERE slug IN ('squash-yellow','squash-pattypan')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Sweetcorn
UPDATE public.plant_species SET harvest_months = '{8,9,10}'::integer[]
WHERE slug = 'sweetcorn' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Celery
UPDATE public.plant_species SET harvest_months = '{8,9,10,11}'::integer[]
WHERE slug = 'celery' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Celeriac
UPDATE public.plant_species SET harvest_months = '{10,11,12,1,2,3}'::integer[]
WHERE slug = 'celeriac' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Fennel (bulb)
UPDATE public.plant_species SET harvest_months = '{7,8,9,10}'::integer[]
WHERE slug = 'fennel-bulb' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Tomatillo
UPDATE public.plant_species SET harvest_months = '{8,9,10}'::integer[]
WHERE slug = 'tomatillo' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Ground cherry
UPDATE public.plant_species SET harvest_months = '{8,9,10}'::integer[]
WHERE slug = 'ground-cherry' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Okra
UPDATE public.plant_species SET harvest_months = '{7,8,9}'::integer[]
WHERE slug = 'okra' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Pea
UPDATE public.plant_species SET harvest_months = '{6,7,8,9}'::integer[]
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Broad bean
UPDATE public.plant_species SET harvest_months = '{6,7,8}'::integer[]
WHERE slug IN ('broad-bean','fava-bean')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Edamame
UPDATE public.plant_species SET harvest_months = '{8,9,10}'::integer[]
WHERE slug = 'soybean-edamame' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Potato (already has harvest months but check)
UPDATE public.plant_species SET harvest_months = '{6,7,8,9,10}'::integer[]
WHERE slug = 'potato' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Garlic
UPDATE public.plant_species SET harvest_months = '{6,7}'::integer[]
WHERE slug = 'garlic' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Shallot
UPDATE public.plant_species SET harvest_months = '{7,8}'::integer[]
WHERE slug = 'shallot' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Sweet potato
UPDATE public.plant_species SET harvest_months = '{9,10}'::integer[]
WHERE slug = 'sweet-potato' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Artichoke globe
UPDATE public.plant_species SET harvest_months = '{6,7,8,9}'::integer[]
WHERE slug = 'artichoke-globe' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Asparagus
UPDATE public.plant_species SET harvest_months = '{4,5,6}'::integer[]
WHERE slug = 'asparagus' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Rhubarb
UPDATE public.plant_species SET harvest_months = '{3,4,5,6,7}'::integer[]
WHERE slug = 'rhubarb' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Horseradish
UPDATE public.plant_species SET harvest_months = '{10,11,12,1,2}'::integer[]
WHERE slug = 'horseradish' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Mustard greens
UPDATE public.plant_species SET harvest_months = '{5,6,7,8,9,10}'::integer[]
WHERE slug = 'mustard-greens' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Watercress
UPDATE public.plant_species SET harvest_months = '{4,5,6,7,8,9,10}'::integer[]
WHERE slug = 'watercress' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Daikon radish
UPDATE public.plant_species SET harvest_months = '{10,11,12}'::integer[]
WHERE slug = 'daikon-radish' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Salsify / scorzonera
UPDATE public.plant_species SET harvest_months = '{10,11,12,1,2,3}'::integer[]
WHERE slug IN ('salsify','black-salsify')
AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);

-- Jerusalem artichoke
UPDATE public.plant_species SET harvest_months = '{10,11,12,1,2,3}'::integer[]
WHERE slug = 'artichoke-jerusalem' AND (harvest_months IS NULL OR harvest_months = '{}'::integer[]);


-- ============================================================================
-- SECTION 5: DAYS TO MATURITY
-- ============================================================================

-- Tomato
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 85, maturity_basis = 'from_transplant'
WHERE slug IN ('tomato','tomato-cherry','tomato-plum')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Pepper
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_transplant'
WHERE slug IN ('pepper','pepper-sweet')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Chilli
UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 120, maturity_basis = 'from_transplant'
WHERE slug = 'pepper-chilli' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Hot pepper (superhots)
UPDATE public.plant_species SET days_to_maturity_min = 90, days_to_maturity_max = 150, maturity_basis = 'from_transplant'
WHERE slug = 'pepper-hot' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Aubergine
UPDATE public.plant_species SET days_to_maturity_min = 65, days_to_maturity_max = 85, maturity_basis = 'from_transplant'
WHERE slug = 'aubergine' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Courgette
UPDATE public.plant_species SET days_to_maturity_min = 45, days_to_maturity_max = 65, maturity_basis = 'from_seed'
WHERE slug = 'courgette' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Cucumber
UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug IN ('cucumber','cucumber-pickling')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Pumpkin
UPDATE public.plant_species SET days_to_maturity_min = 90, days_to_maturity_max = 120, maturity_basis = 'from_seed'
WHERE slug = 'pumpkin' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Winter squash
UPDATE public.plant_species SET days_to_maturity_min = 85, days_to_maturity_max = 110, maturity_basis = 'from_seed'
WHERE slug IN ('squash-winter','squash-spaghetti')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Summer squash
UPDATE public.plant_species SET days_to_maturity_min = 45, days_to_maturity_max = 60, maturity_basis = 'from_seed'
WHERE slug IN ('squash-yellow','squash-pattypan')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Sweetcorn
UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 100, maturity_basis = 'from_seed'
WHERE slug = 'sweetcorn' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Runner bean
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 75, maturity_basis = 'from_seed'
WHERE slug IN ('runner-bean','scarlet-runner-bean')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- French bean
UPDATE public.plant_species SET days_to_maturity_min = 55, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug IN ('french-bean','bean')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Broad bean
UPDATE public.plant_species SET days_to_maturity_min = 80, days_to_maturity_max = 120, maturity_basis = 'from_seed'
WHERE slug IN ('broad-bean','fava-bean')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Pea
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Beetroot
UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug = 'beetroot' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Carrot
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 80, maturity_basis = 'from_seed'
WHERE slug = 'carrot' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Parsnip
UPDATE public.plant_species SET days_to_maturity_min = 100, days_to_maturity_max = 130, maturity_basis = 'from_seed'
WHERE slug = 'parsnip' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Turnip
UPDATE public.plant_species SET days_to_maturity_min = 40, days_to_maturity_max = 80, maturity_basis = 'from_seed'
WHERE slug = 'turnip' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Radish
UPDATE public.plant_species SET days_to_maturity_min = 25, days_to_maturity_max = 45, maturity_basis = 'from_seed'
WHERE slug = 'radish' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Swede
UPDATE public.plant_species SET days_to_maturity_min = 80, days_to_maturity_max = 110, maturity_basis = 'from_seed'
WHERE slug = 'swede-rutabaga' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Onion (from sets)
UPDATE public.plant_species SET days_to_maturity_min = 90, days_to_maturity_max = 140, maturity_basis = 'from_planting'
WHERE slug = 'onion-bulb' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Spring onion
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'spring-onion' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Shallot
UPDATE public.plant_species SET days_to_maturity_min = 90, days_to_maturity_max = 120, maturity_basis = 'from_planting'
WHERE slug = 'shallot' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Leek
UPDATE public.plant_species SET days_to_maturity_min = 120, days_to_maturity_max = 180, maturity_basis = 'from_seed'
WHERE slug = 'leek' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Brussels sprout
UPDATE public.plant_species SET days_to_maturity_min = 150, days_to_maturity_max = 200, maturity_basis = 'from_seed'
WHERE slug = 'brussels-sprout' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Broccoli
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_transplant'
WHERE slug = 'broccoli' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Sprouting broccoli
UPDATE public.plant_species SET days_to_maturity_min = 180, days_to_maturity_max = 270, maturity_basis = 'from_seed'
WHERE slug = 'sprouting-broccoli' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Cabbage
UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 120, maturity_basis = 'from_transplant'
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Kale
UPDATE public.plant_species SET days_to_maturity_min = 55, days_to_maturity_max = 75, maturity_basis = 'from_transplant'
WHERE slug IN ('kale','kale-curly','kale-lacinato')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Chard
UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 60, maturity_basis = 'from_seed'
WHERE slug = 'chard' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Rocket
UPDATE public.plant_species SET days_to_maturity_min = 25, days_to_maturity_max = 40, maturity_basis = 'from_seed'
WHERE slug = 'rocket' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Pak choi
UPDATE public.plant_species SET days_to_maturity_min = 30, days_to_maturity_max = 50, maturity_basis = 'from_seed'
WHERE slug = 'pak-choi' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Mizuna / tatsoi
UPDATE public.plant_species SET days_to_maturity_min = 25, days_to_maturity_max = 45, maturity_basis = 'from_seed'
WHERE slug IN ('mizuna','tatsoi')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Kohlrabi
UPDATE public.plant_species SET days_to_maturity_min = 45, days_to_maturity_max = 60, maturity_basis = 'from_seed'
WHERE slug = 'kohlrabi' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Chinese cabbage
UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug = 'chinese-cabbage' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Endive / escarole
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug IN ('endive','escarole')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Radicchio
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 100, maturity_basis = 'from_seed'
WHERE slug = 'radicchio' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Celery
UPDATE public.plant_species SET days_to_maturity_min = 80, days_to_maturity_max = 120, maturity_basis = 'from_transplant'
WHERE slug = 'celery' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Celeriac
UPDATE public.plant_species SET days_to_maturity_min = 100, days_to_maturity_max = 140, maturity_basis = 'from_transplant'
WHERE slug = 'celeriac' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Fennel (bulb)
UPDATE public.plant_species SET days_to_maturity_min = 65, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'fennel-bulb' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Tomatillo
UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 90, maturity_basis = 'from_transplant'
WHERE slug = 'tomatillo' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Okra
UPDATE public.plant_species SET days_to_maturity_min = 55, days_to_maturity_max = 75, maturity_basis = 'from_seed'
WHERE slug = 'okra' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Sweet potato
UPDATE public.plant_species SET days_to_maturity_min = 90, days_to_maturity_max = 130, maturity_basis = 'from_planting'
WHERE slug = 'sweet-potato' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Asparagus
UPDATE public.plant_species SET days_to_maturity_min = 730, days_to_maturity_max = 1095, maturity_basis = 'from_planting'
WHERE slug = 'asparagus' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Globe artichoke
UPDATE public.plant_species SET days_to_maturity_min = 365, days_to_maturity_max = 545, maturity_basis = 'from_seed'
WHERE slug = 'artichoke-globe' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Rhubarb
UPDATE public.plant_species SET days_to_maturity_min = 365, days_to_maturity_max = 730, maturity_basis = 'from_planting'
WHERE slug = 'rhubarb' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Garlic (already corrected in 005, but fill if still empty)
UPDATE public.plant_species SET days_to_maturity_min = 180, days_to_maturity_max = 270, maturity_basis = 'from_planting'
WHERE slug = 'garlic' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Daikon radish
UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug = 'daikon-radish' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Salsify / scorzonera
UPDATE public.plant_species SET days_to_maturity_min = 120, days_to_maturity_max = 150, maturity_basis = 'from_seed'
WHERE slug IN ('salsify','black-salsify')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Mustard greens
UPDATE public.plant_species SET days_to_maturity_min = 30, days_to_maturity_max = 50, maturity_basis = 'from_seed'
WHERE slug = 'mustard-greens' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Edamame
UPDATE public.plant_species SET days_to_maturity_min = 80, days_to_maturity_max = 110, maturity_basis = 'from_seed'
WHERE slug = 'soybean-edamame' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Watermelon
UPDATE public.plant_species SET days_to_maturity_min = 80, days_to_maturity_max = 100, maturity_basis = 'from_transplant'
WHERE slug = 'watermelon' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Melon
UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 90, maturity_basis = 'from_transplant'
WHERE slug = 'melon-cantaloupe' AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);


-- ============================================================================
-- SECTION 6: COMPANIONS WITH — fill gaps using JSONB arrays
-- ============================================================================

-- Tomato
UPDATE public.plant_species SET companions_with = '["basil","carrot","parsley","marigold","garlic","chive"]'::jsonb
WHERE slug IN ('tomato','tomato-cherry','tomato-plum')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Carrot
UPDATE public.plant_species SET companions_with = '["onion-bulb","spring-onion","leek","rosemary","sage","chive"]'::jsonb
WHERE slug = 'carrot'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Beetroot
UPDATE public.plant_species SET companions_with = '["onion-bulb","garlic","lettuce","cabbage"]'::jsonb
WHERE slug = 'beetroot'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Cucumber
UPDATE public.plant_species SET companions_with = '["pea","broad-bean","lettuce","radish","sunflower"]'::jsonb
WHERE slug IN ('cucumber','cucumber-pickling')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Courgette
UPDATE public.plant_species SET companions_with = '["sweetcorn","runner-bean","nasturtium","borage"]'::jsonb
WHERE slug = 'courgette'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Pumpkin
UPDATE public.plant_species SET companions_with = '["sweetcorn","runner-bean","nasturtium"]'::jsonb
WHERE slug IN ('pumpkin','squash-winter','squash-spaghetti')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Pea
UPDATE public.plant_species SET companions_with = '["carrot","turnip","radish","broad-bean","mint"]'::jsonb
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Runner bean
UPDATE public.plant_species SET companions_with = '["sweetcorn","courgette","marigold"]'::jsonb
WHERE slug IN ('runner-bean','scarlet-runner-bean')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- French bean
UPDATE public.plant_species SET companions_with = '["sweetcorn","courgette","carrot","celery"]'::jsonb
WHERE slug IN ('french-bean','bean')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Broad bean
UPDATE public.plant_species SET companions_with = '["potato","spinach","lettuce"]'::jsonb
WHERE slug IN ('broad-bean','fava-bean')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Garlic
UPDATE public.plant_species SET companions_with = '["carrot","tomato","beetroot","lettuce","wild-strawberry"]'::jsonb
WHERE slug = 'garlic'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Onion
UPDATE public.plant_species SET companions_with = '["carrot","beetroot","lettuce","tomato"]'::jsonb
WHERE slug = 'onion-bulb'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Leek
UPDATE public.plant_species SET companions_with = '["carrot","celery","onion-bulb"]'::jsonb
WHERE slug = 'leek'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Radish
UPDATE public.plant_species SET companions_with = '["lettuce","pea","spinach","carrot"]'::jsonb
WHERE slug = 'radish'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Turnip
UPDATE public.plant_species SET companions_with = '["pea","broad-bean"]'::jsonb
WHERE slug = 'turnip'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Sweetcorn
UPDATE public.plant_species SET companions_with = '["runner-bean","courgette","pumpkin","squash-winter"]'::jsonb
WHERE slug = 'sweetcorn'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Cabbage family
UPDATE public.plant_species SET companions_with = '["nasturtium","onion-bulb","garlic","dill"]'::jsonb
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy','broccoli','sprouting-broccoli','romanesco','brussels-sprout','cauliflower')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Pepper
UPDATE public.plant_species SET companions_with = '["tomato","basil","carrot","onion-bulb"]'::jsonb
WHERE slug IN ('pepper','pepper-sweet','pepper-chilli','pepper-hot')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Aubergine
UPDATE public.plant_species SET companions_with = '["pepper","tomato","basil","marigold"]'::jsonb
WHERE slug = 'aubergine'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

-- Parsnip
UPDATE public.plant_species SET companions_with = '["pea","radish","onion-bulb"]'::jsonb
WHERE slug = 'parsnip'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');


-- ============================================================================
-- SECTION 7: COMPANIONS AVOID
-- ============================================================================

-- Tomato
UPDATE public.plant_species SET companions_avoid = '["cabbage","fennel-bulb","potato"]'::jsonb
WHERE slug IN ('tomato','tomato-cherry','tomato-plum')
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Cucumber
UPDATE public.plant_species SET companions_avoid = '["potato","sage"]'::jsonb
WHERE slug IN ('cucumber','cucumber-pickling')
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Pea
UPDATE public.plant_species SET companions_avoid = '["onion-bulb","garlic","shallot"]'::jsonb
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow')
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Broad bean / runner bean
UPDATE public.plant_species SET companions_avoid = '["onion-bulb","garlic","fennel-bulb"]'::jsonb
WHERE slug IN ('broad-bean','fava-bean','runner-bean','scarlet-runner-bean','french-bean','bean')
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Carrot
UPDATE public.plant_species SET companions_avoid = '["dill","parsnip"]'::jsonb
WHERE slug = 'carrot'
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Garlic
UPDATE public.plant_species SET companions_avoid = '["pea","broad-bean","runner-bean"]'::jsonb
WHERE slug = 'garlic'
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Onion
UPDATE public.plant_species SET companions_avoid = '["pea","broad-bean","runner-bean"]'::jsonb
WHERE slug = 'onion-bulb'
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Cabbage family: avoid strawberry
UPDATE public.plant_species SET companions_avoid = '["wild-strawberry","runner-bean"]'::jsonb
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy','broccoli','sprouting-broccoli','romanesco','brussels-sprout','cauliflower')
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Pepper / aubergine
UPDATE public.plant_species SET companions_avoid = '["fennel-bulb"]'::jsonb
WHERE slug IN ('pepper','pepper-sweet','pepper-chilli','pepper-hot','aubergine')
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Sweetcorn
UPDATE public.plant_species SET companions_avoid = '["tomato"]'::jsonb
WHERE slug = 'sweetcorn'
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');

-- Fennel (bulb) - bad neighbour to most things
UPDATE public.plant_species SET companions_avoid = '["tomato","pepper","runner-bean","carrot"]'::jsonb
WHERE slug = 'fennel-bulb'
AND (companions_avoid IS NULL OR companions_avoid = '{}'::integer[] OR companions_avoid::text = '');


-- ============================================================================
-- SECTION 8: MIN_TEMP_C — minimum survival temperature
-- ============================================================================

-- Tender crops (killed by any frost, ~1C)
UPDATE public.plant_species SET min_temp_c = 1
WHERE slug IN ('tomato','tomato-cherry','tomato-plum','pepper','pepper-sweet','pepper-chilli','pepper-hot',
               'runner-bean','scarlet-runner-bean','french-bean','bean',
               'sweetcorn','okra','tomatillo','ground-cherry','melon-cantaloupe','watermelon',
               'sweet-potato','soybean-edamame','herb-basil-sweet','herb-basil-thai','herb-basil-greek','herb-holy-basil')
AND (min_temp_c IS NULL);

-- Half-hardy (tolerate light frost, ~-3C)
UPDATE public.plant_species SET min_temp_c = -3
WHERE slug IN ('celery','celeriac','fennel-bulb','kohlrabi','chinese-cabbage',
               'lettuce-butterhead','lettuce-iceberg','lettuce-looseleaf','lettuce-romaine',
               'chard','pak-choi','mizuna','tatsoi','endive','escarole')
AND (min_temp_c IS NULL);

-- Hardy brassicas (-10C)
UPDATE public.plant_species SET min_temp_c = -10
WHERE slug IN ('kale','kale-curly','kale-lacinato','brussels-sprout','sprouting-broccoli',
               'cabbage','cabbage-red','cabbage-green','cabbage-savoy')
AND (min_temp_c IS NULL);

-- Hardy alliums (-10C)
UPDATE public.plant_species SET min_temp_c = -10
WHERE slug IN ('onion-bulb','spring-onion','shallot','leek','garlic','multiplier-onion','elephant-garlic','chive','garlic-chive')
AND (min_temp_c IS NULL);

-- Hardy roots (-8C)
UPDATE public.plant_species SET min_temp_c = -8
WHERE slug IN ('carrot','parsnip','beetroot','turnip','swede-rutabaga','salsify','black-salsify','radish','horseradish')
AND (min_temp_c IS NULL);

-- Hardy legumes (-5C)
UPDATE public.plant_species SET min_temp_c = -5
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow','broad-bean','fava-bean')
AND (min_temp_c IS NULL);

-- Lettuce (generic)
UPDATE public.plant_species SET min_temp_c = -3
WHERE slug = 'lettuce' AND (min_temp_c IS NULL);

-- Rocket
UPDATE public.plant_species SET min_temp_c = -5
WHERE slug = 'rocket' AND (min_temp_c IS NULL);

-- Rhubarb (very hardy)
UPDATE public.plant_species SET min_temp_c = -20
WHERE slug = 'rhubarb' AND (min_temp_c IS NULL);

-- Asparagus
UPDATE public.plant_species SET min_temp_c = -20
WHERE slug = 'asparagus' AND (min_temp_c IS NULL);

-- Globe artichoke
UPDATE public.plant_species SET min_temp_c = -10
WHERE slug = 'artichoke-globe' AND (min_temp_c IS NULL);

-- Daikon
UPDATE public.plant_species SET min_temp_c = -3
WHERE slug = 'daikon-radish' AND (min_temp_c IS NULL);

-- Mustard greens
UPDATE public.plant_species SET min_temp_c = -8
WHERE slug = 'mustard-greens' AND (min_temp_c IS NULL);

-- Radicchio
UPDATE public.plant_species SET min_temp_c = -8
WHERE slug = 'radicchio' AND (min_temp_c IS NULL);


-- ============================================================================
-- SECTION 9: HERB SOW/HARVEST/MATURITY DATA
-- ============================================================================

-- Herb sow months (fill gaps only)
UPDATE public.plant_species SET sow_months = '{3,4,5}'::integer[]
WHERE slug IN ('herb-basil-sweet','herb-basil-thai','herb-basil-greek','herb-holy-basil')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5,6,7}'::integer[]
WHERE slug IN ('herb-dill-leaf','dill')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5}'::integer[]
WHERE slug IN ('herb-parsley-flat','herb-parsley-curly','parsley')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5,6,7}'::integer[]
WHERE slug IN ('herb-chervil','chervil')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5}'::integer[]
WHERE slug = 'herb-marjoram-sweet'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5}'::integer[]
WHERE slug = 'herb-savoury-summer'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{4,5}'::integer[]
WHERE slug = 'herb-borage'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5,9}'::integer[]
WHERE slug = 'herb-calendula'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4}'::integer[]
WHERE slug IN ('herb-oregano','herb-oregano-greek')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4}'::integer[]
WHERE slug IN ('herb-thyme-common','herb-thyme-lemon')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4}'::integer[]
WHERE slug IN ('herb-sage-common','herb-sage-purple')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4}'::integer[]
WHERE slug = 'herb-chives-common'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4}'::integer[]
WHERE slug IN ('herb-chamomile-german','herb-chamomile-roman')
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4,5}'::integer[]
WHERE slug = 'herb-fennel-leaf'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

UPDATE public.plant_species SET sow_months = '{3,4}'::integer[]
WHERE slug = 'herb-lovage'
AND (sow_months IS NULL OR sow_months = '{}'::integer[]);

-- Herb days to maturity
UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug IN ('herb-basil-sweet','herb-basil-thai','herb-basil-greek','herb-holy-basil')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 40, days_to_maturity_max = 60, maturity_basis = 'from_seed'
WHERE slug IN ('herb-dill-leaf','dill')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug IN ('herb-parsley-flat','herb-parsley-curly','parsley')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 40, days_to_maturity_max = 60, maturity_basis = 'from_seed'
WHERE slug IN ('herb-coriander-leaf')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug IN ('herb-oregano','herb-oregano-greek','herb-marjoram-sweet')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 85, days_to_maturity_max = 120, maturity_basis = 'from_seed'
WHERE slug IN ('herb-thyme-common','herb-thyme-lemon')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 75, days_to_maturity_max = 100, maturity_basis = 'from_seed'
WHERE slug IN ('herb-sage-common','herb-sage-purple')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'herb-chives-common'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug = 'herb-borage'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 40, days_to_maturity_max = 55, maturity_basis = 'from_seed'
WHERE slug IN ('herb-chervil','chervil')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'herb-calendula'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 80, maturity_basis = 'from_seed'
WHERE slug IN ('herb-chamomile-german','herb-chamomile-roman')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 65, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'herb-fennel-leaf'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 70, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'herb-lovage'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug IN ('herb-lemon-balm','herb-mint-spearmint','herb-mint-peppermint')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 50, days_to_maturity_max = 70, maturity_basis = 'from_seed'
WHERE slug = 'herb-savoury-summer'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 90, days_to_maturity_max = 120, maturity_basis = 'from_seed'
WHERE slug = 'herb-savoury-winter'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 60, days_to_maturity_max = 90, maturity_basis = 'from_seed'
WHERE slug = 'herb-sorrel-common'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 80, days_to_maturity_max = 120, maturity_basis = 'from_seed'
WHERE slug = 'herb-tarragon-french'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Herb min_temp_c
UPDATE public.plant_species SET min_temp_c = -15
WHERE slug IN ('herb-rosemary','herb-thyme-common','herb-thyme-lemon','herb-oregano','herb-oregano-greek',
               'herb-sage-common','herb-sage-purple','herb-chives-common','herb-lovage',
               'herb-mint-spearmint','herb-mint-peppermint','herb-lemon-balm',
               'herb-sorrel-common','herb-tarragon-french','herb-bay-laurel',
               'herb-fennel-leaf','herb-savoury-winter','herb-comfrey','herb-valerian',
               'herb-hyssop','herb-anise-hyssop','herb-marshmallow','herb-catnip')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = -5
WHERE slug IN ('herb-parsley-flat','herb-parsley-curly','parsley','herb-coriander-leaf',
               'herb-dill-leaf','dill','herb-chervil','chervil',
               'herb-chamomile-german','herb-chamomile-roman',
               'herb-borage','herb-calendula','herb-marjoram-sweet','herb-savoury-summer')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = 1
WHERE slug IN ('herb-basil-sweet','herb-basil-thai','herb-basil-greek','herb-holy-basil',
               'herb-stevia','herb-lemon-verbena')
AND (min_temp_c IS NULL);


-- ============================================================================
-- SECTION 10: AVERAGE/MAXIMUM HEIGHT AND SPREAD (cm)
-- ============================================================================

-- Common vegetables
UPDATE public.plant_species SET average_height_cm = 150, maximum_height_cm = 200, average_spread_cm = 45, maximum_spread_cm = 60
WHERE slug IN ('tomato','tomato-cherry','tomato-plum')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 90, average_spread_cm = 40, maximum_spread_cm = 50
WHERE slug IN ('pepper','pepper-sweet','pepper-chilli','pepper-hot')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 75, maximum_height_cm = 100, average_spread_cm = 50, maximum_spread_cm = 60
WHERE slug = 'aubergine'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 90, maximum_spread_cm = 120
WHERE slug = 'courgette'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 200, maximum_height_cm = 300, average_spread_cm = 60, maximum_spread_cm = 100
WHERE slug IN ('cucumber','cucumber-pickling')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 100, average_spread_cm = 200, maximum_spread_cm = 300
WHERE slug IN ('pumpkin','squash-winter','squash-spaghetti')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 90, maximum_spread_cm = 120
WHERE slug IN ('squash-yellow','squash-pattypan')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 180, maximum_height_cm = 250, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'sweetcorn'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 200, maximum_height_cm = 300, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug IN ('runner-bean','scarlet-runner-bean')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 20, maximum_spread_cm = 30
WHERE slug IN ('french-bean','bean')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 90, maximum_height_cm = 120, average_spread_cm = 25, maximum_spread_cm = 35
WHERE slug IN ('broad-bean','fava-bean')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 90, maximum_height_cm = 180, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug IN ('pea','peas-garden','peas-snap','peas-snow')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 75, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'potato'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 40, average_spread_cm = 15, maximum_spread_cm = 25
WHERE slug IN ('lettuce','lettuce-butterhead','lettuce-iceberg','lettuce-looseleaf','lettuce-romaine')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 25, maximum_height_cm = 30, average_spread_cm = 15, maximum_spread_cm = 20
WHERE slug = 'spinach'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 50, maximum_height_cm = 60, average_spread_cm = 25, maximum_spread_cm = 35
WHERE slug = 'chard'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 25, maximum_height_cm = 30, average_spread_cm = 15, maximum_spread_cm = 20
WHERE slug = 'rocket'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 15, maximum_spread_cm = 25
WHERE slug = 'beetroot'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 15, maximum_spread_cm = 20
WHERE slug = 'carrot'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 35, maximum_height_cm = 50, average_spread_cm = 20, maximum_spread_cm = 30
WHERE slug = 'parsnip'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 40, average_spread_cm = 20, maximum_spread_cm = 30
WHERE slug = 'turnip'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 15, maximum_height_cm = 25, average_spread_cm = 15, maximum_spread_cm = 20
WHERE slug = 'radish'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 40, maximum_height_cm = 50, average_spread_cm = 25, maximum_spread_cm = 35
WHERE slug = 'swede-rutabaga'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 50, maximum_height_cm = 60, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'onion-bulb'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 40, average_spread_cm = 10, maximum_spread_cm = 15
WHERE slug = 'spring-onion'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 15, maximum_spread_cm = 20
WHERE slug = 'shallot'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 80, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'garlic'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 70, maximum_height_cm = 90, average_spread_cm = 15, maximum_spread_cm = 20
WHERE slug = 'leek'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 75, average_spread_cm = 60, maximum_spread_cm = 75
WHERE slug = 'cauliflower'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 80, average_spread_cm = 45, maximum_spread_cm = 60
WHERE slug IN ('broccoli','sprouting-broccoli','romanesco')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 90, maximum_height_cm = 120, average_spread_cm = 50, maximum_spread_cm = 60
WHERE slug = 'brussels-sprout'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 40, maximum_height_cm = 50, average_spread_cm = 50, maximum_spread_cm = 60
WHERE slug IN ('cabbage','cabbage-red','cabbage-green','cabbage-savoy')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 90, average_spread_cm = 45, maximum_spread_cm = 60
WHERE slug IN ('kale','kale-curly','kale-lacinato')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 20, maximum_spread_cm = 30
WHERE slug = 'celery'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 35, maximum_height_cm = 50, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'celeriac'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 80, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'fennel-bulb'
AND (average_height_cm IS NULL OR average_height_cm = 0);

-- Herbs heights
UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug IN ('herb-basil-sweet','herb-basil-thai')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 25, maximum_height_cm = 35, average_spread_cm = 25, maximum_spread_cm = 35
WHERE slug = 'herb-basil-greek'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug IN ('herb-parsley-flat','herb-parsley-curly','parsley')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 50, maximum_height_cm = 60, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug IN ('herb-coriander-leaf','coriander')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 90, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug IN ('herb-dill-leaf','dill')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug IN ('herb-thyme-common','herb-thyme-lemon')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 45, maximum_height_cm = 60, average_spread_cm = 40, maximum_spread_cm = 50
WHERE slug IN ('herb-oregano','herb-oregano-greek')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 80, average_spread_cm = 45, maximum_spread_cm = 60
WHERE slug IN ('herb-sage-common','herb-sage-purple')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 100, maximum_height_cm = 150, average_spread_cm = 40, maximum_spread_cm = 60
WHERE slug = 'herb-rosemary'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 25, maximum_spread_cm = 35
WHERE slug = 'herb-chives-common'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 90, average_spread_cm = 60, maximum_spread_cm = 90
WHERE slug IN ('herb-mint-spearmint','herb-mint-peppermint')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 80, average_spread_cm = 45, maximum_spread_cm = 60
WHERE slug = 'herb-lemon-balm'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 80, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug = 'herb-borage'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 150, maximum_height_cm = 200, average_spread_cm = 60, maximum_spread_cm = 90
WHERE slug = 'herb-lovage'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 150, maximum_height_cm = 180, average_spread_cm = 40, maximum_spread_cm = 60
WHERE slug = 'herb-fennel-leaf'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 200, maximum_height_cm = 800, average_spread_cm = 200, maximum_spread_cm = 400
WHERE slug = 'herb-bay-laurel'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 75, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug = 'herb-tarragon-french'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 40, maximum_height_cm = 60, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'herb-sorrel-common'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 25, maximum_spread_cm = 30
WHERE slug IN ('herb-chamomile-german','herb-chamomile-roman')
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 40, maximum_height_cm = 50, average_spread_cm = 30, maximum_spread_cm = 40
WHERE slug = 'herb-calendula'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 40, average_spread_cm = 25, maximum_spread_cm = 30
WHERE slug = 'herb-marjoram-sweet'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 40, average_spread_cm = 20, maximum_spread_cm = 30
WHERE slug = 'herb-savoury-summer'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 40, average_spread_cm = 25, maximum_spread_cm = 35
WHERE slug = 'herb-savoury-winter'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 30, maximum_height_cm = 45, average_spread_cm = 20, maximum_spread_cm = 30
WHERE slug IN ('herb-chervil','chervil')
AND (average_height_cm IS NULL OR average_height_cm = 0);

-- Perennial vegetables heights
UPDATE public.plant_species SET average_height_cm = 150, maximum_height_cm = 200, average_spread_cm = 100, maximum_spread_cm = 150
WHERE slug = 'artichoke-globe'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 120, maximum_height_cm = 180, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug = 'asparagus'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 90, average_spread_cm = 60, maximum_spread_cm = 90
WHERE slug = 'rhubarb'
AND (average_height_cm IS NULL OR average_height_cm = 0);

UPDATE public.plant_species SET average_height_cm = 60, maximum_height_cm = 100, average_spread_cm = 30, maximum_spread_cm = 45
WHERE slug = 'horseradish'
AND (average_height_cm IS NULL OR average_height_cm = 0);


-- ============================================================================
-- SECTION 11: FRUIT TREE/BUSH DATA GAPS
-- ============================================================================

-- Fruit: days to first crop (from planting bare-root/pot)
UPDATE public.plant_species SET days_to_maturity_min = 730, days_to_maturity_max = 1460, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-apple','fruit-pear','fruit-plum','fruit-damson','fruit-gage','fruit-mirabelle',
               'fruit-cherry-sour','fruit-cherry-sweet')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 1095, days_to_maturity_max = 1825, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-walnut','fruit-black-walnut','fruit-sweet-chestnut')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 365, days_to_maturity_max = 730, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-currant','fruit-gooseberry','fruit-blackcurrant','fruit-jostaberry-treeform')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 730, days_to_maturity_max = 1095, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-peach','fruit-nectarine','fruit-apricot','fruit-fig','fruit-quince','fruit-medlar')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 365, days_to_maturity_max = 730, maturity_basis = 'from_planting'
WHERE slug = 'wild-strawberry'
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 1095, days_to_maturity_max = 1825, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-hardy-kiwi','grape-vine','kiwi-hardy','kiwi-common')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 365, days_to_maturity_max = 1095, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-elder','fruit-elder-black-lace')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

UPDATE public.plant_species SET days_to_maturity_min = 730, days_to_maturity_max = 1460, maturity_basis = 'from_planting'
WHERE slug IN ('fruit-hazelnut','fruit-mulberry-black','fruit-mulberry-white')
AND (days_to_maturity_min IS NULL OR days_to_maturity_min = 0);

-- Fruit: min_temp_c
UPDATE public.plant_species SET min_temp_c = -25
WHERE slug IN ('fruit-apple','fruit-pear','fruit-cherry-sour','fruit-cherry-sweet',
               'fruit-damson','fruit-plum','fruit-gage','fruit-mirabelle',
               'fruit-currant','fruit-gooseberry','fruit-blackcurrant',
               'fruit-elder','fruit-elder-black-lace',
               'fruit-hazelnut','fruit-sweet-chestnut')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = -20
WHERE slug IN ('fruit-walnut','fruit-black-walnut','fruit-hardy-kiwi','kiwi-hardy','grape-vine',
               'fruit-aronia','fruit-serviceberry','fruit-saskatoon','fruit-mulberry-black','fruit-mulberry-white')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = -15
WHERE slug IN ('fruit-peach','fruit-nectarine','fruit-apricot','fruit-quince','fruit-medlar')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = -10
WHERE slug IN ('fruit-fig','fruit-olive','fruit-pomegranate')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = -5
WHERE slug IN ('kiwi-common','fruit-loquat','fruit-feijoa')
AND (min_temp_c IS NULL);

UPDATE public.plant_species SET min_temp_c = 2
WHERE slug IN ('fruit-orange','fruit-lemon','fruit-lime','fruit-mandarin','fruit-cherimoya',
               'fruit-guava-strawberry')
AND (min_temp_c IS NULL);

-- Wild strawberry
UPDATE public.plant_species SET min_temp_c = -25
WHERE slug = 'wild-strawberry' AND (min_temp_c IS NULL);

-- Fruit: companions_with
UPDATE public.plant_species SET companions_with = '["herb-chives-common","nasturtium","herb-comfrey","garlic"]'::jsonb
WHERE slug IN ('fruit-apple','fruit-pear')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species SET companions_with = '["garlic","herb-chives-common","nasturtium"]'::jsonb
WHERE slug IN ('fruit-cherry-sour','fruit-cherry-sweet','fruit-plum','fruit-damson','fruit-gage',
               'fruit-peach','fruit-nectarine','fruit-apricot')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species SET companions_with = '["herb-borage","garlic","onion-bulb"]'::jsonb
WHERE slug = 'wild-strawberry'
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');

UPDATE public.plant_species SET companions_with = '["herb-comfrey","garlic","nasturtium"]'::jsonb
WHERE slug IN ('fruit-currant','fruit-gooseberry','fruit-blackcurrant')
AND (companions_with IS NULL OR companions_with = '{}'::integer[] OR companions_with::text = '');


-- ============================================================================
-- SECTION 12: DESCRIPTIONS — fill empty or very short descriptions
-- ============================================================================

UPDATE public.plant_species SET description = 'Versatile climbing or bush bean producing flat, wide green pods. Very productive in UK summers, growing quickly up supports. A staple of the British kitchen garden.'
WHERE slug = 'runner-bean' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Dwarf or climbing beans producing slender round pods. More compact than runner beans, ideal for smaller spaces. Excellent fresh, frozen, or dried.'
WHERE slug IN ('french-bean','bean') AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Fast-growing annual salad leaf with a peppery mustard flavour. Easy to grow as cut-and-come-again; bolt-resistant varieties available for summer sowing.'
WHERE slug = 'rocket' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Leafy brassica with colourful stems in red, yellow, orange, or white. Ornamental and productive, harvested leaf by leaf over a long season. Tolerates light frost.'
WHERE slug = 'chard' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Fast-growing root vegetable ready in as little as 4 weeks. Perfect for succession sowing in gaps between slower crops. Many shapes and colours available.'
WHERE slug = 'radish' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Hardy biennial root crop that improves in flavour after frost. Sow early as germination is slow. Leave in the ground and harvest through winter.'
WHERE slug = 'parsnip' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Sweet-flavoured root vegetable in deep red, golden, or candy-striped varieties. Easy to grow, stores well, and the leaves are also edible.'
WHERE slug = 'beetroot' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Essential root vegetable available in early, maincrop, and rainbow varieties. Sow successionally for fresh roots from June to December.'
WHERE slug = 'carrot' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Hardy root vegetable resembling a large turnip with yellow flesh. Excellent roasted or mashed. Very cold-hardy, stores well in the ground.'
WHERE slug = 'swede-rutabaga' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Quick-growing root crop for spring and autumn. Baby turnips are mild and sweet; larger roots stronger in flavour. Tops are also edible.'
WHERE slug = 'turnip' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Tall brassica producing sprouts along the stem from autumn to spring. Very cold-hardy and improved by frost. A key winter vegetable.'
WHERE slug = 'brussels-sprout' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Overwintering brassica producing tender purple or white spears in early spring. Sow in summer for harvest the following February to April.'
WHERE slug = 'sprouting-broccoli' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Striking Italian brassica with fractal, lime-green heads. Grown like cauliflower but slightly hardier. Nutty flavour excellent roasted.'
WHERE slug = 'romanesco' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Rapid-growing Chinese brassica forming loose, spoon-shaped leaves. Mild, versatile flavour for stir-fries and salads. Sow from spring to autumn.'
WHERE slug = 'pak-choi' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Feathery Japanese salad green related to mustard. Mild, peppery flavour. Cut-and-come-again harvesting; very fast from seed.'
WHERE slug = 'mizuna' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Flat-rosetted Asian green with thick, dark spoon-shaped leaves. Mild flavour, cold-hardy, and quick to mature. Excellent as baby leaf or full size.'
WHERE slug = 'tatsoi' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Bulb-forming brassica with a mild, sweet, turnip-like flavour. Fast to mature; can be sown successionally from spring to late summer.'
WHERE slug = 'kohlrabi' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Large-headed Chinese brassica forming barrel-shaped heads. Best sown in summer to avoid bolting. Used fresh, stir-fried, or pickled.'
WHERE slug = 'chinese-cabbage' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Slightly bitter salad green with frilly or broad leaves. Excellent for autumn and winter harvest. Can be blanched for milder flavour.'
WHERE slug IN ('endive','escarole') AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Italian chicory forming tight, red-and-white heads with a pleasantly bitter flavour. Best sown in summer for autumn harvest.'
WHERE slug = 'radicchio' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Pungent Asian radish growing up to 30cm long. Best sown in late summer for autumn/winter harvest. Excellent pickled, raw, or in soups.'
WHERE slug = 'daikon-radish' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Old-fashioned root vegetable with a delicate oyster-like flavour. Sow in spring, harvest from autumn through winter. Attractive purple flowers if left.'
WHERE slug = 'salsify' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Long, black-skinned root with white flesh and mild, slightly sweet flavour. Easier to grow than salsify. Harvest autumn to spring.'
WHERE slug = 'black-salsify' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Spicy Asian greens growing rapidly from seed. Young leaves for salads, larger leaves for stir-frying. Many varieties from mild to fiery.'
WHERE slug = 'mustard-greens' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Perennial tuber producing knobbly roots with a sweet, nutty flavour. Very productive and hardy; harvest from late autumn through winter.'
WHERE slug = 'artichoke-jerusalem' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Aquatic or semi-aquatic perennial with peppery-flavoured leaves rich in vitamins. Can be grown in containers with standing water.'
WHERE slug = 'watercress' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Sprawling legume producing furry green pods harvested young for edamame. Needs warm soil to germinate; a novel crop for UK gardens.'
WHERE slug = 'soybean-edamame' AND (description IS NULL OR length(description) < 20);

-- Herb descriptions where missing
UPDATE public.plant_species SET description = 'The king of Italian herbs. Aromatic annual with large, bright green leaves essential in pesto, salads, and Mediterranean cooking. Needs warmth.'
WHERE slug = 'herb-basil-sweet' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Compact, bushy basil with tiny leaves and intense flavour. More cold-tolerant than sweet basil. Excellent in pots on a windowsill.'
WHERE slug = 'herb-basil-greek' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Bushy annual herb with star-shaped blue flowers. Self-seeds readily. Young leaves taste of cucumber; flowers are edible and attract pollinators.'
WHERE slug = 'herb-borage' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Hardy annual pot marigold with bright orange and yellow flowers. Petals are edible and medicinal. Self-seeds freely and attracts beneficial insects.'
WHERE slug = 'herb-calendula' AND (description IS NULL OR length(description) < 20);

UPDATE public.plant_species SET description = 'Delicate, anise-flavoured annual herb used in French cooking. Best in cool conditions; sow in spring and late summer for continuous supply.'
WHERE slug = 'herb-chervil' AND (description IS NULL OR length(description) < 20);


COMMIT;
