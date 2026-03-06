-- =============================================================================
-- Migration: 20260306021_companion_planting_52_vegetables
-- Purpose:   Populate companions_with and companions_avoid for 52 vegetables
--            that currently have NULL companion data.
-- Date:      2026-03-06
-- Notes:     All referenced slugs verified to exist in plant_species table.
--            Companion relationships based on established horticultural evidence:
--            - Allelopathy (chemical inhibition/promotion)
--            - Pest/disease management (trap cropping, repellent planting)
--            - Nutrient sharing (nitrogen fixation, dynamic accumulators)
--            - Physical complementarity (shade, support, ground cover)
--            Only updates rows where companions_with IS NULL.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- LETTUCES (butterhead, iceberg, looseleaf, romaine)
-- All lettuce types share similar companion relationships.
-- Good with: shallow-rooted, provide light shade or pest deterrence.
-- Bad with: celery family can attract same pests; alliums sometimes crowd.
-- ---------------------------------------------------------------------------

UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','chives','onion-bulb','beetroot','wild-strawberry','nasturtium']::text[],
  companions_avoid = ARRAY['celery','parsley']::text[]
WHERE slug = 'lettuce-butterhead'
  AND companions_with IS NULL;

UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','chives','onion-bulb','beetroot','wild-strawberry','nasturtium']::text[],
  companions_avoid = ARRAY['celery','parsley']::text[]
WHERE slug = 'lettuce-iceberg'
  AND companions_with IS NULL;

UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','chives','onion-bulb','beetroot','wild-strawberry','nasturtium']::text[],
  companions_avoid = ARRAY['celery','parsley']::text[]
WHERE slug = 'lettuce-looseleaf'
  AND companions_with IS NULL;

UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','chives','onion-bulb','beetroot','wild-strawberry','nasturtium']::text[],
  companions_avoid = ARRAY['celery','parsley']::text[]
WHERE slug = 'lettuce-romaine'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- ALLIUMS (elephant garlic, garlic chive, multiplier onion, shallot, rakkyo)
-- Alliums share broadly similar companions: good with carrots, beetroot,
-- tomatoes, lettuce; bad with legumes (peas, beans).
-- ---------------------------------------------------------------------------

-- Elephant garlic (Allium ampeloprasum) — behaves like leek/garlic hybrid
UPDATE plant_species SET
  companions_with = ARRAY['carrot','beetroot','tomato','lettuce','wild-strawberry','raspberry']::text[],
  companions_avoid = ARRAY['pea','broad-bean','runner-bean']::text[]
WHERE slug = 'elephant-garlic'
  AND companions_with IS NULL;

-- Garlic chive (Allium tuberosum) — similar to regular chives
UPDATE plant_species SET
  companions_with = ARRAY['carrot','tomato','beetroot','lettuce','wild-strawberry']::text[],
  companions_avoid = ARRAY['pea','broad-bean','runner-bean']::text[]
WHERE slug = 'garlic-chive'
  AND companions_with IS NULL;

-- Multiplier onion (Allium cepa Aggregatum) — same guild as onion-bulb
UPDATE plant_species SET
  companions_with = ARRAY['carrot','beetroot','lettuce','tomato','wild-strawberry']::text[],
  companions_avoid = ARRAY['pea','broad-bean','runner-bean']::text[]
WHERE slug = 'multiplier-onion'
  AND companions_with IS NULL;

-- Shallot (Allium cepa Aggregatum) — close relative of onion
UPDATE plant_species SET
  companions_with = ARRAY['carrot','beetroot','lettuce','tomato','wild-strawberry']::text[],
  companions_avoid = ARRAY['pea','broad-bean','runner-bean']::text[]
WHERE slug = 'shallot'
  AND companions_with IS NULL;

-- Rakkyo / Chinese onion (Allium chinense) — allium family
UPDATE plant_species SET
  companions_with = ARRAY['carrot','beetroot','lettuce','tomato']::text[],
  companions_avoid = ARRAY['pea','broad-bean','runner-bean']::text[]
WHERE slug = 'rakkyo'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- BRASSICAS (chinese cabbage, kohlrabi, pak choi, mizuna, tatsoi,
--            mustard greens, rocket, endive, escarole, radicchio)
-- Brassicas benefit from alliums (pest deterrence), nasturtium (trap crop),
-- and aromatic herbs. Avoid strawberries and tomatoes (disease pressure).
-- ---------------------------------------------------------------------------

-- Chinese cabbage (Brassica rapa subsp. pekinensis)
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','beetroot','celery','nasturtium']::text[],
  companions_avoid = ARRAY['wild-strawberry','tomato','runner-bean']::text[]
WHERE slug = 'chinese-cabbage'
  AND companions_with IS NULL;

-- Kohlrabi (Brassica oleracea Gongylodes)
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','beetroot','lettuce','nasturtium']::text[],
  companions_avoid = ARRAY['tomato','wild-strawberry','runner-bean','fennel-bulb']::text[]
WHERE slug = 'kohlrabi'
  AND companions_with IS NULL;

-- Pak choi / Bok choy (Brassica rapa subsp. chinensis)
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','beetroot','nasturtium','celery']::text[],
  companions_avoid = ARRAY['wild-strawberry','tomato','runner-bean']::text[]
WHERE slug = 'pak-choi'
  AND companions_with IS NULL;

-- Mizuna (Brassica rapa subsp. nipposinica)
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','beetroot','nasturtium','lettuce']::text[],
  companions_avoid = ARRAY['wild-strawberry','tomato']::text[]
WHERE slug = 'mizuna'
  AND companions_with IS NULL;

-- Tatsoi (Brassica rapa subsp. narinosa)
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','beetroot','nasturtium','lettuce']::text[],
  companions_avoid = ARRAY['wild-strawberry','tomato']::text[]
WHERE slug = 'tatsoi'
  AND companions_with IS NULL;

-- Mustard greens (Brassica juncea)
-- Note: beetroot already lists mustard-greens as avoid, so this is reciprocal.
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','celery','nasturtium']::text[],
  companions_avoid = ARRAY['beetroot','wild-strawberry','tomato']::text[]
WHERE slug = 'mustard-greens'
  AND companions_with IS NULL;

-- Rocket / Arugula (Eruca vesicaria) — brassica family
UPDATE plant_species SET
  companions_with = ARRAY['onion-bulb','garlic','lettuce','beetroot','nasturtium']::text[],
  companions_avoid = ARRAY['wild-strawberry','tomato']::text[]
WHERE slug = 'rocket'
  AND companions_with IS NULL;

-- Endive (Cichorium endivia) — chicory family, similar needs to lettuce
UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','onion-bulb','chives','nasturtium']::text[],
  companions_avoid = ARRAY['celery']::text[]
WHERE slug = 'endive'
  AND companions_with IS NULL;

-- Escarole (Cichorium endivia var. latifolia) — broad-leaved endive
UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','onion-bulb','chives','nasturtium']::text[],
  companions_avoid = ARRAY['celery']::text[]
WHERE slug = 'escarole'
  AND companions_with IS NULL;

-- Radicchio (Cichorium intybus) — chicory family
UPDATE plant_species SET
  companions_with = ARRAY['carrot','radish','onion-bulb','chives','nasturtium']::text[],
  companions_avoid = ARRAY['celery']::text[]
WHERE slug = 'radicchio'
  AND companions_with IS NULL;

-- Swede / Rutabaga (Brassica napus subsp. rapifera)
UPDATE plant_species SET
  companions_with = ARRAY['pea','onion-bulb','garlic','lettuce','nasturtium']::text[],
  companions_avoid = ARRAY['wild-strawberry','tomato','fennel-bulb']::text[]
WHERE slug = 'swede-rutabaga'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- LEGUMES (chickpea, cowpea-blackeye, lima bean, soybean-edamame)
-- Legumes fix nitrogen, benefit from sweetcorn and cucurbits (Three Sisters).
-- Avoid alliums which inhibit nitrogen-fixing bacteria.
-- ---------------------------------------------------------------------------

-- Chickpea (Cicer arietinum)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','cucumber','lettuce','spinach','radish']::text[],
  companions_avoid = ARRAY['onion-bulb','garlic','fennel-bulb']::text[]
WHERE slug = 'chickpea'
  AND companions_with IS NULL;

-- Cowpea / Black-eyed pea (Vigna unguiculata)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','courgette','pumpkin','radish','nasturtium']::text[],
  companions_avoid = ARRAY['onion-bulb','garlic','fennel-bulb']::text[]
WHERE slug = 'cowpea-blackeye'
  AND companions_with IS NULL;

-- Lima bean (Phaseolus lunatus)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','courgette','carrot','celery','radish']::text[],
  companions_avoid = ARRAY['onion-bulb','garlic','fennel-bulb']::text[]
WHERE slug = 'lima-bean'
  AND companions_with IS NULL;

-- Soybean / Edamame (Glycine max)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','potato','courgette','lettuce']::text[],
  companions_avoid = ARRAY['onion-bulb','garlic','fennel-bulb']::text[]
WHERE slug = 'soybean-edamame'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- CUCURBITS (chayote, melon-cantaloupe, watermelon)
-- Cucurbits benefit from sweetcorn (shade/support), nasturtium (pest trap),
-- and radish (trap crop for cucumber beetles).
-- ---------------------------------------------------------------------------

-- Chayote (Sechium edule)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','runner-bean','nasturtium','sunflower']::text[],
  companions_avoid = ARRAY['potato','fennel-bulb']::text[]
WHERE slug = 'chayote'
  AND companions_with IS NULL;

-- Melon / Cantaloupe (Cucumis melo)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','radish','nasturtium','lettuce','sunflower']::text[],
  companions_avoid = ARRAY['potato','fennel-bulb']::text[]
WHERE slug = 'melon-cantaloupe'
  AND companions_with IS NULL;

-- Watermelon (Citrullus lanatus)
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','radish','nasturtium','lettuce','sunflower']::text[],
  companions_avoid = ARRAY['potato','fennel-bulb']::text[]
WHERE slug = 'watermelon'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- SOLANACEAE (tomatillo, ground cherry)
-- Same family as tomato; benefit from basil, carrot, alliums.
-- ---------------------------------------------------------------------------

-- Tomatillo (Physalis philadelphica)
UPDATE plant_species SET
  companions_with = ARRAY['basil','carrot','onion-bulb','parsley','nasturtium','pepper']::text[],
  companions_avoid = ARRAY['fennel-bulb','kohlrabi','potato']::text[]
WHERE slug = 'tomatillo'
  AND companions_with IS NULL;

-- Ground cherry / Cape gooseberry (Physalis pruinosa / P. peruviana)
UPDATE plant_species SET
  companions_with = ARRAY['basil','carrot','onion-bulb','parsley','nasturtium']::text[],
  companions_avoid = ARRAY['fennel-bulb','kohlrabi','potato']::text[]
WHERE slug = 'ground-cherry'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- OKRA (Abelmoschus esculentus)
-- Tropical/warm-season crop; benefits from pepper, basil, sweetcorn.
-- Avoid: fennel-bulb inhibits growth.
-- ---------------------------------------------------------------------------

UPDATE plant_species SET
  companions_with = ARRAY['pepper','basil','sweetcorn','lettuce','cucumber','sunflower']::text[],
  companions_avoid = ARRAY['fennel-bulb']::text[]
WHERE slug = 'okra'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- ROOT VEGETABLES (daikon radish, horseradish, salsify, black salsify,
--                  jerusalem artichoke, jicama, sweet potato, ginger, taro,
--                  cassava, yacon, burdock root)
-- ---------------------------------------------------------------------------

-- Daikon radish (Raphanus sativus var. longipinnatus) — brassica family
UPDATE plant_species SET
  companions_with = ARRAY['lettuce','pea','spinach','carrot','nasturtium']::text[],
  companions_avoid = ARRAY['wild-strawberry']::text[]
WHERE slug = 'daikon-radish'
  AND companions_with IS NULL;

-- Horseradish (Armoracia rusticana)
-- Strong pest deterrent; traditional potato companion. Can be invasive.
UPDATE plant_species SET
  companions_with = ARRAY['potato','rhubarb','asparagus']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'horseradish'
  AND companions_with IS NULL;

-- Salsify (Tragopogon porrifolius)
-- Root vegetable; similar needs to parsnip/carrot.
UPDATE plant_species SET
  companions_with = ARRAY['carrot','onion-bulb','lettuce','leek']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'salsify'
  AND companions_with IS NULL;

-- Black salsify / Scorzonera (Scorzonera hispanica)
UPDATE plant_species SET
  companions_with = ARRAY['carrot','onion-bulb','lettuce','leek']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'black-salsify'
  AND companions_with IS NULL;

-- Jerusalem artichoke (Helianthus tuberosus)
-- Tall, vigorous sunflower relative. Can shade out neighbours.
-- Good windbreak for tender crops. Avoid near potatoes (disease).
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','runner-bean','sunflower']::text[],
  companions_avoid = ARRAY['potato','tomato']::text[]
WHERE slug = 'jerusalem-artichoke'
  AND companions_with IS NULL;

-- Jicama (Pachyrhizus erosus) — legume family, tropical
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','courgette','sunflower']::text[],
  companions_avoid = ARRAY['fennel-bulb']::text[]
WHERE slug = 'jicama'
  AND companions_with IS NULL;

-- Sweet potato (Ipomoea batatas)
-- Good ground cover. Benefits from legumes (nitrogen). Avoid root competition.
UPDATE plant_species SET
  companions_with = ARRAY['runner-bean','sweetcorn','radish','nasturtium']::text[],
  companions_avoid = ARRAY['tomato','squash-winter']::text[]
WHERE slug = 'sweet-potato'
  AND companions_with IS NULL;

-- Ginger (Zingiber officinale)
-- Tropical understorey plant; benefits from shade and nitrogen fixers.
UPDATE plant_species SET
  companions_with = ARRAY['runner-bean','spinach','lettuce']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'ginger'
  AND companions_with IS NULL;

-- Taro (Colocasia esculenta)
-- Tropical wetland crop; benefits from legumes and leafy companions.
UPDATE plant_species SET
  companions_with = ARRAY['runner-bean','sweetcorn','lettuce']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'taro'
  AND companions_with IS NULL;

-- Cassava / Manioc (Manihot esculenta)
-- Tropical staple; benefits from legume intercropping (nitrogen).
UPDATE plant_species SET
  companions_with = ARRAY['runner-bean','sweetcorn','pumpkin']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'cassava'
  AND companions_with IS NULL;

-- Yacon (Smallanthus sonchifolius) — Andean root, sunflower family
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','runner-bean','lettuce']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'yacon'
  AND companions_with IS NULL;

-- Burdock root / Gobo (Arctium lappa)
-- Deep-rooted; breaks compacted soil. Tolerant companion.
UPDATE plant_species SET
  companions_with = ARRAY['carrot','lettuce','onion-bulb']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'burdock-root'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- THISTLE / ARTICHOKE FAMILY (artichoke globe, cardoon)
-- Large perennial thistles; need space. Attract beneficial insects.
-- ---------------------------------------------------------------------------

-- Globe artichoke (Cynara scolymus)
UPDATE plant_species SET
  companions_with = ARRAY['broad-bean','pea','lettuce','sunflower','nasturtium']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'artichoke-globe'
  AND companions_with IS NULL;

-- Cardoon (Cynara cardunculus)
UPDATE plant_species SET
  companions_with = ARRAY['broad-bean','pea','lettuce','sunflower']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'cardoon'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- FENNEL (bulb)
-- Fennel is allelopathic to most vegetables. It benefits from dill
-- but should be isolated from nearly everything else.
-- ---------------------------------------------------------------------------

UPDATE plant_species SET
  companions_with = ARRAY['dill']::text[],
  companions_avoid = ARRAY['tomato','runner-bean','carrot','coriander','aubergine','pepper','cabbage','kohlrabi','broad-bean','pea']::text[]
WHERE slug = 'fennel-bulb'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- LEAFY GREENS / SPINACH RELATIVES (swiss chard, malabar spinach,
--                                    watercress, purslane, sorrel,
--                                    amaranth leaves, fenugreek greens)
-- ---------------------------------------------------------------------------

-- Swiss chard (Beta vulgaris subsp. vulgaris) — same species as beetroot
UPDATE plant_species SET
  companions_with = ARRAY['cabbage','lettuce','onion-bulb','radish','runner-bean']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'swiss-chard'
  AND companions_with IS NULL;

-- Malabar spinach (Basella alba) — tropical vine
UPDATE plant_species SET
  companions_with = ARRAY['runner-bean','sweetcorn','lettuce','radish']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'malabar-spinach'
  AND companions_with IS NULL;

-- Watercress (Nasturtium officinale) — aquatic/semi-aquatic brassica
UPDATE plant_species SET
  companions_with = ARRAY['lettuce','radish','mint']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'watercress'
  AND companions_with IS NULL;

-- Purslane (Portulaca oleracea) — succulent ground cover
-- Excellent living mulch; cool soil for root crops.
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','tomato','lettuce','pepper']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'purslane'
  AND companions_with IS NULL;

-- Sorrel (Rumex acetosa)
-- Perennial leafy green; acidic leaves may deter some pests.
UPDATE plant_species SET
  companions_with = ARRAY['wild-strawberry','lettuce','cabbage','tomato']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'sorrel'
  AND companions_with IS NULL;

-- Amaranth leaves (Amaranthus tricolor / A. cruentus)
-- Tall grain/leaf crop; provides shade, attracts beneficial insects.
UPDATE plant_species SET
  companions_with = ARRAY['sweetcorn','onion-bulb','runner-bean','potato']::text[],
  companions_avoid = ARRAY[]::text[]
WHERE slug = 'amaranth-leaves'
  AND companions_with IS NULL;

-- Fenugreek greens (Trigonella foenum-graecum) — legume family
-- Fixes nitrogen; good green manure. Used as companion in Indian agriculture.
UPDATE plant_species SET
  companions_with = ARRAY['potato','cabbage','lettuce','cucumber']::text[],
  companions_avoid = ARRAY['fennel-bulb']::text[]
WHERE slug = 'fenugreek-greens'
  AND companions_with IS NULL;

-- ---------------------------------------------------------------------------
-- REMAINING VEGETABLES
-- ---------------------------------------------------------------------------

-- Daikon radish already handled above in root vegetables section.

-- Endive, escarole, radicchio already handled above in brassica section.

COMMIT;
