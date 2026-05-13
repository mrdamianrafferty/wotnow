-- ============================================================
-- Grow Daisy slug normalisation — SECOND SWEEP
-- ============================================================
-- Date: 13 May 2026
-- Author: Cowork (drafted) → Damian (review) → Code (apply)
-- Depends on: first-sweep migration in PR #76 already merged
--
-- Scope: 181 prefixed slugs remaining after the first sweep.
-- Source: sitemap of the live preview after PR #76 merged
--   $ curl -s <preview>/sitemap.xml | grep -oE '/grow/species/[a-z0-9-]+' \
--     | sed 's|/grow/species/||' | sort -u \
--     | grep -E '^(fruit|tree|herb|squash|pepper|kale|onion)-'
--
-- Breakdown:
--   97 tree-*    (most are mechanical strip)
--   39 herb-*    (mix of strip + merges into existing canonical herbs)
--   38 fruit-*   (mix of strip + merges + a few disambiguation calls)
--    3 squash-*  (mechanical strip)
--    2 pepper-*  (both MERGES — pepper-hot → chilli, pepper-sweet → sweet-pepper)
--    2 kale-*    (kale-curly → kale MERGE; kale-lacinato keep with rename)
--
-- Categories below:
--   §1  Simple renames   (~160 slugs)  — strip prefix, add alias, update slug
--   §2  Merges           (15 slugs)    — UPDATE FK refs → INSERT alias → DELETE duplicate
--   §3  Edge cases       (handful)     — flagged for human review before applying
--
-- Pattern reference (do not modify):
--   RENAME:
--     INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('X', 'Y');
--     UPDATE plant_species SET slug = 'Y' WHERE slug = 'X';
--   MERGE (Y already exists):
--     UPDATE grow_user_plants       SET species_slug  = 'Y'   WHERE species_slug  = 'X';
--     UPDATE plant_companions       SET plant_slug    = 'Y'   WHERE plant_slug    = 'X';
--     UPDATE plant_companions       SET companion_slug= 'Y'   WHERE companion_slug= 'X';
--     UPDATE grow_planting_calendar SET plant_slug    = 'Y'   WHERE plant_slug    = 'X';
--     INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('X', 'Y');
--     DELETE FROM plant_species WHERE slug = 'X';
--
-- Wrap the whole sweep in a single transaction for safe rollback.
-- ============================================================

BEGIN;

-- =====================================================================
-- §1 SIMPLE RENAMES — strip prefix, no collision
-- =====================================================================

-- --- fruit-* simple renames -----------------------------------------
UPDATE plant_species SET slug = 'apricot' WHERE slug = 'fruit-apricot';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-apricot', 'apricot');

UPDATE plant_species SET slug = 'aronia' WHERE slug = 'fruit-aronia';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-aronia', 'aronia');

UPDATE plant_species SET slug = 'black-walnut' WHERE slug = 'fruit-black-walnut';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-black-walnut', 'black-walnut');

UPDATE plant_species SET slug = 'cherimoya' WHERE slug = 'fruit-cherimoya';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-cherimoya', 'cherimoya');

-- fruit-cherry-sour → sour-cherry (word order fix: noun first)
UPDATE plant_species SET slug = 'sour-cherry' WHERE slug = 'fruit-cherry-sour';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-cherry-sour', 'sour-cherry');

UPDATE plant_species SET slug = 'chinese-haw' WHERE slug = 'fruit-chinese-haw';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-chinese-haw', 'chinese-haw');

UPDATE plant_species SET slug = 'cornelian-cherry' WHERE slug = 'fruit-cornelian-cherry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-cornelian-cherry', 'cornelian-cherry');

UPDATE plant_species SET slug = 'damson' WHERE slug = 'fruit-damson';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-damson', 'damson');

-- fruit-elder-black-lace → black-lace-elder (cultivar of Sambucus nigra)
UPDATE plant_species SET slug = 'black-lace-elder' WHERE slug = 'fruit-elder-black-lace';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-elder-black-lace', 'black-lace-elder');

UPDATE plant_species SET slug = 'gage' WHERE slug = 'fruit-gage';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-gage', 'gage');

UPDATE plant_species SET slug = 'gooseberry' WHERE slug = 'fruit-gooseberry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-gooseberry', 'gooseberry');

-- fruit-guava-strawberry → strawberry-guava (word order fix)
UPDATE plant_species SET slug = 'strawberry-guava' WHERE slug = 'fruit-guava-strawberry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-guava-strawberry', 'strawberry-guava');

-- fruit-honeyberry-treeform → see §2 (merge with tree-honeyberry-treeform → honeyberry)

UPDATE plant_species SET slug = 'shipova' WHERE slug = 'fruit-hybrid-shipova';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-hybrid-shipova', 'shipova');

UPDATE plant_species SET slug = 'lemon' WHERE slug = 'fruit-lemon';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-lemon', 'lemon');

UPDATE plant_species SET slug = 'loquat' WHERE slug = 'fruit-loquat';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-loquat', 'loquat');

UPDATE plant_species SET slug = 'mayhaw' WHERE slug = 'fruit-mayhaw';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-mayhaw', 'mayhaw');

UPDATE plant_species SET slug = 'medlar' WHERE slug = 'fruit-medlar';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-medlar', 'medlar');

UPDATE plant_species SET slug = 'mirabelle' WHERE slug = 'fruit-mirabelle';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-mirabelle', 'mirabelle');

-- fruit-mulberry-black → black-mulberry (Morus nigra)
UPDATE plant_species SET slug = 'black-mulberry' WHERE slug = 'fruit-mulberry-black';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-mulberry-black', 'black-mulberry');

-- fruit-mulberry-white → white-mulberry (Morus alba)
UPDATE plant_species SET slug = 'white-mulberry' WHERE slug = 'fruit-mulberry-white';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-mulberry-white', 'white-mulberry');

UPDATE plant_species SET slug = 'nectarine' WHERE slug = 'fruit-nectarine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-nectarine', 'nectarine');

UPDATE plant_species SET slug = 'olive' WHERE slug = 'fruit-olive';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-olive', 'olive');

UPDATE plant_species SET slug = 'pawpaw' WHERE slug = 'fruit-pawpaw';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-pawpaw', 'pawpaw');

UPDATE plant_species SET slug = 'peach' WHERE slug = 'fruit-peach';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-peach', 'peach');

UPDATE plant_species SET slug = 'persimmon' WHERE slug = 'fruit-persimmon';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-persimmon', 'persimmon');

UPDATE plant_species SET slug = 'pomegranate' WHERE slug = 'fruit-pomegranate';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-pomegranate', 'pomegranate');

UPDATE plant_species SET slug = 'quandong' WHERE slug = 'fruit-quandong';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-quandong', 'quandong');

UPDATE plant_species SET slug = 'quince' WHERE slug = 'fruit-quince';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-quince', 'quince');

UPDATE plant_species SET slug = 'saskatoon' WHERE slug = 'fruit-saskatoon';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-saskatoon', 'saskatoon');

UPDATE plant_species SET slug = 'sea-buckthorn' WHERE slug = 'fruit-sea-buckthorn';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-sea-buckthorn', 'sea-buckthorn');

-- fruit-serviceberry → see §2 (merge with tree-juneberry + tree-serviceberry-treeform → serviceberry)
-- fruit-sweet-chestnut → see §2 (merge with sweet-chestnut existing canonical)
-- fruit-walnut → see §2 (merge with walnut existing canonical)
-- fruit-hackberry → see §2 (merge with tree-hackberry-common → hackberry)
-- fruit-mountain-ash → see §2 (merge with tree-rowan-mountain-ash → rowan)

-- --- herb-* simple renames -----------------------------------------
UPDATE plant_species SET slug = 'angelica' WHERE slug = 'herb-angelica';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-angelica', 'angelica');

-- herb-bay-laurel → bay (the UK-standard cooking herb name; bay-laurel is the formal name)
UPDATE plant_species SET slug = 'bay' WHERE slug = 'herb-bay-laurel';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-bay-laurel', 'bay');

UPDATE plant_species SET slug = 'calendula' WHERE slug = 'herb-calendula';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-calendula', 'calendula');

UPDATE plant_species SET slug = 'catnip' WHERE slug = 'herb-catnip';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-catnip', 'catnip');

-- herb-chamomile-german → german-chamomile (Matricaria recutita — the annual one for tea)
UPDATE plant_species SET slug = 'german-chamomile' WHERE slug = 'herb-chamomile-german';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-chamomile-german', 'german-chamomile');

-- herb-chamomile-roman → roman-chamomile (Chamaemelum nobile — the perennial creeping one)
UPDATE plant_species SET slug = 'roman-chamomile' WHERE slug = 'herb-chamomile-roman';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-chamomile-roman', 'roman-chamomile');

-- herb-fennel-leaf → fennel-herb (parallels fennel-bulb already in DB; "leaf" reads oddly)
UPDATE plant_species SET slug = 'fennel-herb' WHERE slug = 'herb-fennel-leaf';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-fennel-leaf', 'fennel-herb');

UPDATE plant_species SET slug = 'gotu-kola' WHERE slug = 'herb-gotu-kola';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-gotu-kola', 'gotu-kola');

UPDATE plant_species SET slug = 'holy-basil' WHERE slug = 'herb-holy-basil';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-holy-basil', 'holy-basil');

UPDATE plant_species SET slug = 'lemon-verbena' WHERE slug = 'herb-lemon-verbena';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-lemon-verbena', 'lemon-verbena');

UPDATE plant_species SET slug = 'lovage' WHERE slug = 'herb-lovage';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-lovage', 'lovage');

-- herb-marjoram-sweet → sweet-marjoram (Origanum majorana — UK gardener calls it sweet marjoram)
UPDATE plant_species SET slug = 'sweet-marjoram' WHERE slug = 'herb-marjoram-sweet';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-marjoram-sweet', 'sweet-marjoram');

UPDATE plant_species SET slug = 'marshmallow' WHERE slug = 'herb-marshmallow';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-marshmallow', 'marshmallow');

UPDATE plant_species SET slug = 'milk-thistle' WHERE slug = 'herb-milk-thistle';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-milk-thistle', 'milk-thistle');

-- herb-mint-peppermint → peppermint (Mentha × piperita — the strong distinct mint)
UPDATE plant_species SET slug = 'peppermint' WHERE slug = 'herb-mint-peppermint';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-mint-peppermint', 'peppermint');

-- herb-oregano-greek → greek-oregano (Origanum vulgare subsp. hirtum — the strongest oregano)
UPDATE plant_species SET slug = 'greek-oregano' WHERE slug = 'herb-oregano-greek';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-oregano-greek', 'greek-oregano');

-- herb-sage-pineapple → pineapple-sage (Salvia elegans — distinct ornamental sage)
UPDATE plant_species SET slug = 'pineapple-sage' WHERE slug = 'herb-sage-pineapple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-sage-pineapple', 'pineapple-sage');

-- herb-sage-purple → purple-sage (Salvia officinalis 'Purpurascens' — cultivar of common sage)
UPDATE plant_species SET slug = 'purple-sage' WHERE slug = 'herb-sage-purple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-sage-purple', 'purple-sage');

-- herb-savoury-summer → summer-savory (UK spells "savory" with one 'u' in cookery context)
UPDATE plant_species SET slug = 'summer-savory' WHERE slug = 'herb-savoury-summer';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-savoury-summer', 'summer-savory');

UPDATE plant_species SET slug = 'winter-savory' WHERE slug = 'herb-savoury-winter';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-savoury-winter', 'winter-savory');

UPDATE plant_species SET slug = 'skullcap' WHERE slug = 'herb-skullcap';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-skullcap', 'skullcap');

-- herb-sorrel-common → sorrel (MERGE — 'sorrel' canonical already exists)
UPDATE cultivars              SET species_slug  = 'sorrel' WHERE species_slug  = 'herb-sorrel-common';
UPDATE guild_blueprint        SET focal_slug    = 'sorrel' WHERE focal_slug    = 'herb-sorrel-common';
UPDATE guild_blueprint_member SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE plant_companions       SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE plant_companions       SET companion_slug= 'sorrel' WHERE companion_slug= 'herb-sorrel-common';
UPDATE plant_function         SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE grow_user_plants SET species_slug = 'sorrel' WHERE species_slug = 'herb-sorrel-common'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'sorrel');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-sorrel-common';
UPDATE grow_planting_calendar SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE grow_nursery_inventory SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE grow_seed_listings     SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE grow_user_tasks        SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
UPDATE perenual_sync_logs     SET our_slug      = 'sorrel' WHERE our_slug      = 'herb-sorrel-common';
UPDATE user_task_completions  SET plant_slug    = 'sorrel' WHERE plant_slug    = 'herb-sorrel-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-sorrel-common', 'sorrel');
DELETE FROM plant_species WHERE slug = 'herb-sorrel-common';

UPDATE plant_species SET slug = 'st-johns-wort' WHERE slug = 'herb-st-johns-wort';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-st-johns-wort', 'st-johns-wort');

UPDATE plant_species SET slug = 'stevia' WHERE slug = 'herb-stevia';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-stevia', 'stevia');

UPDATE plant_species SET slug = 'sweet-woodruff' WHERE slug = 'herb-sweet-woodruff';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-sweet-woodruff', 'sweet-woodruff');

-- herb-tarragon-french → french-tarragon (Artemisia dracunculus var. sativa — the culinary one)
UPDATE plant_species SET slug = 'french-tarragon' WHERE slug = 'herb-tarragon-french';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-tarragon-french', 'french-tarragon');

-- herb-thyme-lemon → lemon-thyme (Thymus citriodorus — distinct cultivar/hybrid)
UPDATE plant_species SET slug = 'lemon-thyme' WHERE slug = 'herb-thyme-lemon';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-thyme-lemon', 'lemon-thyme');

-- herb-basil-thai → thai-basil (Ocimum basilicum var. thyrsiflora — distinct cultivar)
UPDATE plant_species SET slug = 'thai-basil' WHERE slug = 'herb-basil-thai';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-basil-thai', 'thai-basil');

-- --- squash-* simple renames ---------------------------------------
UPDATE plant_species SET slug = 'pattypan-squash' WHERE slug = 'squash-pattypan';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('squash-pattypan', 'pattypan-squash');

UPDATE plant_species SET slug = 'spaghetti-squash' WHERE slug = 'squash-spaghetti';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('squash-spaghetti', 'spaghetti-squash');

UPDATE plant_species SET slug = 'yellow-squash' WHERE slug = 'squash-yellow';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('squash-yellow', 'yellow-squash');

-- --- kale-* simple rename (kale-curly handled as MERGE in §2) ------
-- kale-lacinato → cavolo-nero (UK gardeners know it as cavolo nero — the popular name)
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('kale-lacinato', 'cavolo-nero');
UPDATE plant_species SET slug = 'cavolo-nero' WHERE slug = 'kale-lacinato';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('kale-lacinato', 'lacinato-kale');  -- keep both aliases

-- --- tree-* simple renames (the big batch) -------------------------
-- Most are mechanical strip. Where a noun-first word order makes more sense
-- in UK plain English, the rename reflects that. Some cultivar-style names
-- (e.g. "Harry Lauder's walking stick") are flagged as comments.

-- Acacias / wattles
UPDATE plant_species SET slug = 'cootamundra-wattle' WHERE slug = 'tree-acacia-baileyana';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-acacia-baileyana', 'cootamundra-wattle');

UPDATE plant_species SET slug = 'silver-wattle' WHERE slug = 'tree-acacia-dealbata';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-acacia-dealbata', 'silver-wattle');

UPDATE plant_species SET slug = 'sydney-golden-wattle' WHERE slug = 'tree-acacia-longifolia';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-acacia-longifolia', 'sydney-golden-wattle');

-- tree-albizia-julibrissin → see §2 (merge with tree-silk-tree → silk-tree, Damian decision 2026-05-13)

-- Alders
UPDATE plant_species SET slug = 'black-alder' WHERE slug = 'tree-alder-black';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-alder-black', 'black-alder');

UPDATE plant_species SET slug = 'green-alder' WHERE slug = 'tree-alder-green';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-alder-green', 'green-alder');

UPDATE plant_species SET slug = 'grey-alder' WHERE slug = 'tree-alder-grey';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-alder-grey', 'grey-alder');

UPDATE plant_species SET slug = 'red-alder' WHERE slug = 'tree-alder-red';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-alder-red', 'red-alder');

-- Maples
UPDATE plant_species SET slug = 'amber-maple' WHERE slug = 'tree-amber-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-amber-maple', 'amber-maple');

UPDATE plant_species SET slug = 'field-maple' WHERE slug = 'tree-field-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-field-maple', 'field-maple');

UPDATE plant_species SET slug = 'japanese-maple' WHERE slug = 'tree-japanese-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-japanese-maple', 'japanese-maple');

UPDATE plant_species SET slug = 'norway-maple' WHERE slug = 'tree-norway-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-norway-maple', 'norway-maple');

UPDATE plant_species SET slug = 'paperbark-maple' WHERE slug = 'tree-paperbark-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-paperbark-maple', 'paperbark-maple');

UPDATE plant_species SET slug = 'red-maple' WHERE slug = 'tree-red-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-red-maple', 'red-maple');

UPDATE plant_species SET slug = 'silver-maple' WHERE slug = 'tree-silver-maple';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-silver-maple', 'silver-maple');

-- Arborvitae / cedars / cypresses
UPDATE plant_species SET slug = 'arborvitae' WHERE slug = 'tree-arborvitae-thuja';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-arborvitae-thuja', 'arborvitae');

UPDATE plant_species SET slug = 'atlas-cedar' WHERE slug = 'tree-cedar-atlas';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-cedar-atlas', 'atlas-cedar');

UPDATE plant_species SET slug = 'cedar-of-lebanon' WHERE slug = 'tree-cedar-lebanon';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-cedar-lebanon', 'cedar-of-lebanon');

UPDATE plant_species SET slug = 'lawson-cypress' WHERE slug = 'tree-lawson-cypress';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-lawson-cypress', 'lawson-cypress');

UPDATE plant_species SET slug = 'western-redcedar' WHERE slug = 'tree-western-redcedar';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-western-redcedar', 'western-redcedar');

-- Ash / aspen / beech (single-word stripped)
UPDATE plant_species SET slug = 'european-ash' WHERE slug = 'tree-ash-european';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-ash-european', 'european-ash');

UPDATE plant_species SET slug = 'aspen' WHERE slug = 'tree-aspen';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-aspen', 'aspen');

UPDATE plant_species SET slug = 'beech' WHERE slug = 'tree-beech';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-beech', 'beech');

UPDATE plant_species SET slug = 'copper-beech' WHERE slug = 'tree-copper-beech';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-copper-beech', 'copper-beech');

-- Black-prefix (some need word-order fixing)
UPDATE plant_species SET slug = 'black-acacia' WHERE slug = 'tree-black-acacia';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-black-acacia', 'black-acacia');

UPDATE plant_species SET slug = 'black-locust' WHERE slug = 'tree-black-locust';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-black-locust', 'black-locust');

UPDATE plant_species SET slug = 'black-spruce' WHERE slug = 'tree-black-spruce';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-black-spruce', 'black-spruce');

UPDATE plant_species SET slug = 'black-willow' WHERE slug = 'tree-black-willow';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-black-willow', 'black-willow');

UPDATE plant_species SET slug = 'blue-spruce' WHERE slug = 'tree-blue-spruce';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-blue-spruce', 'blue-spruce');

-- Caragana / catalpa / chinaberry / etc.
UPDATE plant_species SET slug = 'siberian-pea-tree' WHERE slug = 'tree-caragana-arborescens';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-caragana-arborescens', 'siberian-pea-tree');

-- Birches
UPDATE plant_species SET slug = 'downy-birch' WHERE slug = 'tree-downy-birch';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-downy-birch', 'downy-birch');

UPDATE plant_species SET slug = 'silver-birch' WHERE slug = 'tree-silver-birch';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-silver-birch', 'silver-birch');

-- Crabapple / hornbeam / hawthorns / hazels
UPDATE plant_species SET slug = 'ornamental-crabapple' WHERE slug = 'tree-crabapple-ornamental';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-crabapple-ornamental', 'ornamental-crabapple');

UPDATE plant_species SET slug = 'crimson-hawthorn' WHERE slug = 'tree-hawthorn-crimson';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hawthorn-crimson', 'crimson-hawthorn');

UPDATE plant_species SET slug = 'midland-hawthorn' WHERE slug = 'tree-hawthorn-midland';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hawthorn-midland', 'midland-hawthorn');

-- tree-hazel-harry-lauder → harry-lauders-walking-stick (the corkscrew hazel cultivar)
UPDATE plant_species SET slug = 'harry-lauders-walking-stick' WHERE slug = 'tree-hazel-harry-lauder';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hazel-harry-lauder', 'harry-lauders-walking-stick');

-- tree-hazel-treeform → see §2 (merge with hazelnut row if it exists)

UPDATE plant_species SET slug = 'hornbeam' WHERE slug = 'tree-hornbeam';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hornbeam', 'hornbeam');

-- Corsican / douglas / etc. pines & firs
UPDATE plant_species SET slug = 'corsican-pine' WHERE slug = 'tree-corsican-pine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-corsican-pine', 'corsican-pine');

UPDATE plant_species SET slug = 'douglas-fir' WHERE slug = 'tree-douglas-fir';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-douglas-fir', 'douglas-fir');

UPDATE plant_species SET slug = 'european-fir' WHERE slug = 'tree-european-fir';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-european-fir', 'european-fir');

UPDATE plant_species SET slug = 'european-larch' WHERE slug = 'tree-larch-european';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-larch-european', 'european-larch');

UPDATE plant_species SET slug = 'lodgepole-pine' WHERE slug = 'tree-lodgepole-pine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-lodgepole-pine', 'lodgepole-pine');

UPDATE plant_species SET slug = 'monterey-pine' WHERE slug = 'tree-monterey-pine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-monterey-pine', 'monterey-pine');

UPDATE plant_species SET slug = 'norway-spruce' WHERE slug = 'tree-norway-spruce';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-norway-spruce', 'norway-spruce');

UPDATE plant_species SET slug = 'ponderosa-pine' WHERE slug = 'tree-ponderosa-pine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-ponderosa-pine', 'ponderosa-pine');

UPDATE plant_species SET slug = 'scots-pine' WHERE slug = 'tree-scots-pine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-scots-pine', 'scots-pine');

-- Eleagnus
UPDATE plant_species SET slug = 'eleagnus-ebbingei' WHERE slug = 'tree-eleagnus-ebbingei';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-eleagnus-ebbingei', 'eleagnus-ebbingei');

UPDATE plant_species SET slug = 'silverberry' WHERE slug = 'tree-eleagnus-silverberry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-eleagnus-silverberry', 'silverberry');

-- Elms
UPDATE plant_species SET slug = 'siberian-elm' WHERE slug = 'tree-elm-siberian';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-elm-siberian', 'siberian-elm');

UPDATE plant_species SET slug = 'wych-elm' WHERE slug = 'tree-elm-wych';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-elm-wych', 'wych-elm');

-- Eucalyptus
UPDATE plant_species SET slug = 'cider-gum' WHERE slug = 'tree-eucalyptus-gunnii';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-eucalyptus-gunnii', 'cider-gum');

UPDATE plant_species SET slug = 'snow-gum' WHERE slug = 'tree-eucalyptus-niphophila';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-eucalyptus-niphophila', 'snow-gum');

-- Golden chain / golden rain (different species, both retained)
UPDATE plant_species SET slug = 'golden-chain' WHERE slug = 'tree-golden-chain';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-golden-chain', 'golden-chain');

UPDATE plant_species SET slug = 'golden-rain' WHERE slug = 'tree-golden-rain';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-golden-rain', 'golden-rain');

-- tree-hackberry-common → see §2 (merge with fruit-hackberry → hackberry)

-- Japanese zelkova / juneberry / juniper
UPDATE plant_species SET slug = 'japanese-zelkova' WHERE slug = 'tree-japanese-zelkova';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-japanese-zelkova', 'japanese-zelkova');

-- tree-juneberry → see §2 (merge with fruit-serviceberry → serviceberry)

-- tree-juniper-common → juniper (MERGE — 'juniper' canonical already exists)
UPDATE cultivars              SET species_slug  = 'juniper' WHERE species_slug  = 'tree-juniper-common';
UPDATE guild_blueprint        SET focal_slug    = 'juniper' WHERE focal_slug    = 'tree-juniper-common';
UPDATE guild_blueprint_member SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE plant_companions       SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE plant_companions       SET companion_slug= 'juniper' WHERE companion_slug= 'tree-juniper-common';
UPDATE plant_function         SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE grow_user_plants SET species_slug = 'juniper' WHERE species_slug = 'tree-juniper-common'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'juniper');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-juniper-common';
UPDATE grow_planting_calendar SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE grow_nursery_inventory SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE grow_seed_listings     SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE grow_user_tasks        SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
UPDATE perenual_sync_logs     SET our_slug      = 'juniper' WHERE our_slug      = 'tree-juniper-common';
UPDATE user_task_completions  SET plant_slug    = 'juniper' WHERE plant_slug    = 'tree-juniper-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-juniper-common', 'juniper');
DELETE FROM plant_species WHERE slug = 'tree-juniper-common';

-- Katsura / lime / london plane
UPDATE plant_species SET slug = 'katsura' WHERE slug = 'tree-katsura';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-katsura', 'katsura');

UPDATE plant_species SET slug = 'small-leaved-lime' WHERE slug = 'tree-lime-small-leaved';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-lime-small-leaved', 'small-leaved-lime');

UPDATE plant_species SET slug = 'london-plane' WHERE slug = 'tree-london-plane';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-london-plane', 'london-plane');

-- Lilac (treeform)
UPDATE plant_species SET slug = 'tree-lilac' WHERE slug = 'tree-lilac-treeform';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-lilac-treeform', 'tree-lilac');

-- Magnolias
UPDATE plant_species SET slug = 'southern-magnolia' WHERE slug = 'tree-magnolia-grandiflora';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-magnolia-grandiflora', 'southern-magnolia');

UPDATE plant_species SET slug = 'saucer-magnolia' WHERE slug = 'tree-magnolia-soulangea';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-magnolia-soulangea', 'saucer-magnolia');

UPDATE plant_species SET slug = 'star-magnolia' WHERE slug = 'tree-magnolia-stellata';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-magnolia-stellata', 'star-magnolia');

-- Mesquite / mimosa
UPDATE plant_species SET slug = 'mesquite' WHERE slug = 'tree-mesquite';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-mesquite', 'mesquite');

UPDATE plant_species SET slug = 'mimosa' WHERE slug = 'tree-mimosa';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-mimosa', 'mimosa');

-- Mountain ash dwarf → dwarf-rowan
UPDATE plant_species SET slug = 'dwarf-rowan' WHERE slug = 'tree-mountain-ash-dwarf';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-mountain-ash-dwarf', 'dwarf-rowan');

-- tree-rowan-mountain-ash → see §2 (merge with fruit-mountain-ash → rowan)

-- Oaks
UPDATE plant_species SET slug = 'burr-oak' WHERE slug = 'tree-oak-burr';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-oak-burr', 'burr-oak');

UPDATE plant_species SET slug = 'english-oak' WHERE slug = 'tree-oak-english';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-oak-english', 'english-oak');

UPDATE plant_species SET slug = 'red-oak' WHERE slug = 'tree-oak-red';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-oak-red', 'red-oak');

-- Pagoda tree
UPDATE plant_species SET slug = 'pagoda-tree' WHERE slug = 'tree-pagoda-tree';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-pagoda-tree', 'pagoda-tree');

-- Poplars
UPDATE plant_species SET slug = 'lombardy-poplar' WHERE slug = 'tree-poplar-lombardy';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-poplar-lombardy', 'lombardy-poplar');

UPDATE plant_species SET slug = 'white-poplar' WHERE slug = 'tree-poplar-white';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-poplar-white', 'white-poplar');

-- Redbud / redwoods / sequoia
UPDATE plant_species SET slug = 'eastern-redbud' WHERE slug = 'tree-redbud-eastern';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-redbud-eastern', 'eastern-redbud');

UPDATE plant_species SET slug = 'giant-redwood' WHERE slug = 'tree-redwood-giant';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-redwood-giant', 'giant-redwood');

UPDATE plant_species SET slug = 'dawn-redwood' WHERE slug = 'tree-sequoia-dawn';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-sequoia-dawn', 'dawn-redwood');

-- Service tree / serviceberry-treeform → see §2

UPDATE plant_species SET slug = 'service-tree' WHERE slug = 'tree-service-tree';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-service-tree', 'service-tree');

-- She-oak
UPDATE plant_species SET slug = 'she-oak' WHERE slug = 'tree-she-oak';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-she-oak', 'she-oak');

-- tree-silk-tree → see §2 (consolidated with tree-albizia-julibrissin → silk-tree)

-- Silver linden / smoke tree / snowy mespilus / sweetgum
UPDATE plant_species SET slug = 'silver-linden' WHERE slug = 'tree-silver-linden';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-silver-linden', 'silver-linden');

UPDATE plant_species SET slug = 'smoke-tree' WHERE slug = 'tree-smoke-tree';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-smoke-tree', 'smoke-tree');

UPDATE plant_species SET slug = 'snowy-mespilus' WHERE slug = 'tree-snowy-mespilus';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-snowy-mespilus', 'snowy-mespilus');

UPDATE plant_species SET slug = 'sweetgum' WHERE slug = 'tree-sweetgum';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-sweetgum', 'sweetgum');

-- Sycamores
UPDATE plant_species SET slug = 'sycamore' WHERE slug = 'tree-sycamore';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-sycamore', 'sycamore');

UPDATE plant_species SET slug = 'japanese-sycamore' WHERE slug = 'tree-sycamore-japanese';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-sycamore-japanese', 'japanese-sycamore');

-- Tamarisk
UPDATE plant_species SET slug = 'tamarisk' WHERE slug = 'tree-tamarisk';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-tamarisk', 'tamarisk');

-- Texas mountain laurel
UPDATE plant_species SET slug = 'texas-mountain-laurel' WHERE slug = 'tree-texas-mountain-laurel';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-texas-mountain-laurel', 'texas-mountain-laurel');

-- Tulip poplar
UPDATE plant_species SET slug = 'tulip-poplar' WHERE slug = 'tree-tulip-poplar';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-tulip-poplar', 'tulip-poplar');

-- Weeping willow
UPDATE plant_species SET slug = 'weeping-willow' WHERE slug = 'tree-weeping-willow';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-weeping-willow', 'weeping-willow');

-- Yew (English)
UPDATE plant_species SET slug = 'english-yew' WHERE slug = 'tree-yew-english';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-yew-english', 'english-yew');

-- Albizia julibrissin / silk tree — collision with tree-silk-tree, see §3

-- Honey locust / honeyberry → see §2

-- =====================================================================
-- §2 MERGES — target slug already exists, must consolidate rows
-- =====================================================================
--
-- Full merge pattern (matches first-sweep 20260513011):
--   UPDATE cultivars, guild_blueprint, guild_blueprint_member (FK → ON UPDATE CASCADE,
--     but manual update needed before DELETE since ON DELETE is SET NULL not CASCADE)
--   UPDATE plant_companions (both plant_slug and companion_slug)
--   UPDATE plant_function
--   UPDATE grow_user_plants with NOT EXISTS guard + DELETE remainder
--   UPDATE grow_planting_calendar, grow_nursery_inventory, grow_seed_listings
--   UPDATE grow_user_tasks, perenual_sync_logs, user_task_completions (non-FK tables)
--   INSERT alias + DELETE old plant_species row
--
-- Note: plant_companions has ON UPDATE CASCADE so renames in §1 don't need manual
-- companion updates. For merges (DELETE), manual update is required before DELETE.

-- (1) kale-curly → kale
-- (kale-lacinato handled above as a normal rename to cavolo-nero)
UPDATE cultivars              SET species_slug  = 'kale'  WHERE species_slug  = 'kale-curly';
UPDATE guild_blueprint        SET focal_slug    = 'kale'  WHERE focal_slug    = 'kale-curly';
UPDATE guild_blueprint_member SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE plant_companions       SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE plant_companions       SET companion_slug= 'kale'  WHERE companion_slug= 'kale-curly';
UPDATE plant_function         SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE grow_user_plants SET species_slug = 'kale' WHERE species_slug = 'kale-curly'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'kale');
DELETE FROM grow_user_plants WHERE species_slug = 'kale-curly';
UPDATE grow_planting_calendar SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE grow_nursery_inventory SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE grow_seed_listings     SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE grow_user_tasks        SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
UPDATE perenual_sync_logs     SET our_slug      = 'kale'  WHERE our_slug      = 'kale-curly';
UPDATE user_task_completions  SET plant_slug    = 'kale'  WHERE plant_slug    = 'kale-curly';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('kale-curly', 'kale');
DELETE FROM plant_species WHERE slug = 'kale-curly';

-- (2) pepper-hot → chilli
UPDATE cultivars              SET species_slug  = 'chilli' WHERE species_slug  = 'pepper-hot';
UPDATE guild_blueprint        SET focal_slug    = 'chilli' WHERE focal_slug    = 'pepper-hot';
UPDATE guild_blueprint_member SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE plant_companions       SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE plant_companions       SET companion_slug= 'chilli' WHERE companion_slug= 'pepper-hot';
UPDATE plant_function         SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE grow_user_plants SET species_slug = 'chilli' WHERE species_slug = 'pepper-hot'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'chilli');
DELETE FROM grow_user_plants WHERE species_slug = 'pepper-hot';
UPDATE grow_planting_calendar SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE grow_nursery_inventory SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE grow_seed_listings     SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE grow_user_tasks        SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
UPDATE perenual_sync_logs     SET our_slug      = 'chilli' WHERE our_slug      = 'pepper-hot';
UPDATE user_task_completions  SET plant_slug    = 'chilli' WHERE plant_slug    = 'pepper-hot';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('pepper-hot', 'chilli');
DELETE FROM plant_species WHERE slug = 'pepper-hot';

-- (3) pepper-sweet → sweet-pepper
UPDATE cultivars              SET species_slug  = 'sweet-pepper' WHERE species_slug  = 'pepper-sweet';
UPDATE guild_blueprint        SET focal_slug    = 'sweet-pepper' WHERE focal_slug    = 'pepper-sweet';
UPDATE guild_blueprint_member SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE plant_companions       SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE plant_companions       SET companion_slug= 'sweet-pepper' WHERE companion_slug= 'pepper-sweet';
UPDATE plant_function         SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE grow_user_plants SET species_slug = 'sweet-pepper' WHERE species_slug = 'pepper-sweet'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'sweet-pepper');
DELETE FROM grow_user_plants WHERE species_slug = 'pepper-sweet';
UPDATE grow_planting_calendar SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE grow_nursery_inventory SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE grow_seed_listings     SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE grow_user_tasks        SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
UPDATE perenual_sync_logs     SET our_slug      = 'sweet-pepper' WHERE our_slug      = 'pepper-sweet';
UPDATE user_task_completions  SET plant_slug    = 'sweet-pepper' WHERE plant_slug    = 'pepper-sweet';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('pepper-sweet', 'sweet-pepper');
DELETE FROM plant_species WHERE slug = 'pepper-sweet';

-- (4) herb-basil-sweet → basil
UPDATE cultivars              SET species_slug  = 'basil' WHERE species_slug  = 'herb-basil-sweet';
UPDATE guild_blueprint        SET focal_slug    = 'basil' WHERE focal_slug    = 'herb-basil-sweet';
UPDATE guild_blueprint_member SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE plant_companions       SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE plant_companions       SET companion_slug= 'basil' WHERE companion_slug= 'herb-basil-sweet';
UPDATE plant_function         SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE grow_user_plants SET species_slug = 'basil' WHERE species_slug = 'herb-basil-sweet'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'basil');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-basil-sweet';
UPDATE grow_planting_calendar SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE grow_nursery_inventory SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE grow_seed_listings     SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE grow_user_tasks        SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
UPDATE perenual_sync_logs     SET our_slug      = 'basil' WHERE our_slug      = 'herb-basil-sweet';
UPDATE user_task_completions  SET plant_slug    = 'basil' WHERE plant_slug    = 'herb-basil-sweet';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-basil-sweet', 'basil');
DELETE FROM plant_species WHERE slug = 'herb-basil-sweet';

-- (5) herb-mint-spearmint → mint (UK 'mint' commonly = spearmint, Mentha spicata)
UPDATE cultivars              SET species_slug  = 'mint' WHERE species_slug  = 'herb-mint-spearmint';
UPDATE guild_blueprint        SET focal_slug    = 'mint' WHERE focal_slug    = 'herb-mint-spearmint';
UPDATE guild_blueprint_member SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE plant_companions       SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE plant_companions       SET companion_slug= 'mint' WHERE companion_slug= 'herb-mint-spearmint';
UPDATE plant_function         SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE grow_user_plants SET species_slug = 'mint' WHERE species_slug = 'herb-mint-spearmint'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'mint');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-mint-spearmint';
UPDATE grow_planting_calendar SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE grow_nursery_inventory SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE grow_seed_listings     SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE grow_user_tasks        SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
UPDATE perenual_sync_logs     SET our_slug      = 'mint' WHERE our_slug      = 'herb-mint-spearmint';
UPDATE user_task_completions  SET plant_slug    = 'mint' WHERE plant_slug    = 'herb-mint-spearmint';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-mint-spearmint', 'mint');
DELETE FROM plant_species WHERE slug = 'herb-mint-spearmint';

-- (6) herb-rosemary → rosemary
UPDATE cultivars              SET species_slug  = 'rosemary' WHERE species_slug  = 'herb-rosemary';
UPDATE guild_blueprint        SET focal_slug    = 'rosemary' WHERE focal_slug    = 'herb-rosemary';
UPDATE guild_blueprint_member SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE plant_companions       SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE plant_companions       SET companion_slug= 'rosemary' WHERE companion_slug= 'herb-rosemary';
UPDATE plant_function         SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE grow_user_plants SET species_slug = 'rosemary' WHERE species_slug = 'herb-rosemary'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'rosemary');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-rosemary';
UPDATE grow_planting_calendar SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE grow_nursery_inventory SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE grow_seed_listings     SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE grow_user_tasks        SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
UPDATE perenual_sync_logs     SET our_slug      = 'rosemary' WHERE our_slug      = 'herb-rosemary';
UPDATE user_task_completions  SET plant_slug    = 'rosemary' WHERE plant_slug    = 'herb-rosemary';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-rosemary', 'rosemary');
DELETE FROM plant_species WHERE slug = 'herb-rosemary';

-- (7) herb-oregano → oregano (RENAME — no existing 'oregano' canonical; Damian confirmed 2026-05-13)
-- Generic Origanum vulgare. The 'greek-oregano' subspecies row (renamed in §1) sits alongside.
UPDATE plant_species SET slug = 'oregano' WHERE slug = 'herb-oregano';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-oregano', 'oregano');

-- (8) herb-lemon-balm → lemon-balm (existing canonical, per check)
UPDATE cultivars              SET species_slug  = 'lemon-balm' WHERE species_slug  = 'herb-lemon-balm';
UPDATE guild_blueprint        SET focal_slug    = 'lemon-balm' WHERE focal_slug    = 'herb-lemon-balm';
UPDATE guild_blueprint_member SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE plant_companions       SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE plant_companions       SET companion_slug= 'lemon-balm' WHERE companion_slug= 'herb-lemon-balm';
UPDATE plant_function         SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE grow_user_plants SET species_slug = 'lemon-balm' WHERE species_slug = 'herb-lemon-balm'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'lemon-balm');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-lemon-balm';
UPDATE grow_planting_calendar SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE grow_nursery_inventory SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE grow_seed_listings     SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE grow_user_tasks        SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
UPDATE perenual_sync_logs     SET our_slug      = 'lemon-balm' WHERE our_slug      = 'herb-lemon-balm';
UPDATE user_task_completions  SET plant_slug    = 'lemon-balm' WHERE plant_slug    = 'herb-lemon-balm';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-lemon-balm', 'lemon-balm');
DELETE FROM plant_species WHERE slug = 'herb-lemon-balm';

-- (9) herb-anise-hyssop → anise-hyssop
UPDATE cultivars              SET species_slug  = 'anise-hyssop' WHERE species_slug  = 'herb-anise-hyssop';
UPDATE guild_blueprint        SET focal_slug    = 'anise-hyssop' WHERE focal_slug    = 'herb-anise-hyssop';
UPDATE guild_blueprint_member SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE plant_companions       SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE plant_companions       SET companion_slug= 'anise-hyssop' WHERE companion_slug= 'herb-anise-hyssop';
UPDATE plant_function         SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE grow_user_plants SET species_slug = 'anise-hyssop' WHERE species_slug = 'herb-anise-hyssop'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'anise-hyssop');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-anise-hyssop';
UPDATE grow_planting_calendar SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE grow_nursery_inventory SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE grow_seed_listings     SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE grow_user_tasks        SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
UPDATE perenual_sync_logs     SET our_slug      = 'anise-hyssop' WHERE our_slug      = 'herb-anise-hyssop';
UPDATE user_task_completions  SET plant_slug    = 'anise-hyssop' WHERE plant_slug    = 'herb-anise-hyssop';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-anise-hyssop', 'anise-hyssop');
DELETE FROM plant_species WHERE slug = 'herb-anise-hyssop';

-- (10) herb-chervil → chervil
UPDATE cultivars              SET species_slug  = 'chervil' WHERE species_slug  = 'herb-chervil';
UPDATE guild_blueprint        SET focal_slug    = 'chervil' WHERE focal_slug    = 'herb-chervil';
UPDATE guild_blueprint_member SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE plant_companions       SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE plant_companions       SET companion_slug= 'chervil' WHERE companion_slug= 'herb-chervil';
UPDATE plant_function         SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE grow_user_plants SET species_slug = 'chervil' WHERE species_slug = 'herb-chervil'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'chervil');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-chervil';
UPDATE grow_planting_calendar SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE grow_nursery_inventory SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE grow_seed_listings     SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE grow_user_tasks        SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
UPDATE perenual_sync_logs     SET our_slug      = 'chervil' WHERE our_slug      = 'herb-chervil';
UPDATE user_task_completions  SET plant_slug    = 'chervil' WHERE plant_slug    = 'herb-chervil';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-chervil', 'chervil');
DELETE FROM plant_species WHERE slug = 'herb-chervil';

-- (11) herb-hyssop → hyssop
UPDATE cultivars              SET species_slug  = 'hyssop' WHERE species_slug  = 'herb-hyssop';
UPDATE guild_blueprint        SET focal_slug    = 'hyssop' WHERE focal_slug    = 'herb-hyssop';
UPDATE guild_blueprint_member SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE plant_companions       SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE plant_companions       SET companion_slug= 'hyssop' WHERE companion_slug= 'herb-hyssop';
UPDATE plant_function         SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE grow_user_plants SET species_slug = 'hyssop' WHERE species_slug = 'herb-hyssop'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'hyssop');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-hyssop';
UPDATE grow_planting_calendar SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE grow_nursery_inventory SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE grow_seed_listings     SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE grow_user_tasks        SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
UPDATE perenual_sync_logs     SET our_slug      = 'hyssop' WHERE our_slug      = 'herb-hyssop';
UPDATE user_task_completions  SET plant_slug    = 'hyssop' WHERE plant_slug    = 'herb-hyssop';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-hyssop', 'hyssop');
DELETE FROM plant_species WHERE slug = 'herb-hyssop';

-- (12) herb-tansy → tansy
UPDATE cultivars              SET species_slug  = 'tansy' WHERE species_slug  = 'herb-tansy';
UPDATE guild_blueprint        SET focal_slug    = 'tansy' WHERE focal_slug    = 'herb-tansy';
UPDATE guild_blueprint_member SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE plant_companions       SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE plant_companions       SET companion_slug= 'tansy' WHERE companion_slug= 'herb-tansy';
UPDATE plant_function         SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE grow_user_plants SET species_slug = 'tansy' WHERE species_slug = 'herb-tansy'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'tansy');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-tansy';
UPDATE grow_planting_calendar SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE grow_nursery_inventory SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE grow_seed_listings     SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE grow_user_tasks        SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
UPDATE perenual_sync_logs     SET our_slug      = 'tansy' WHERE our_slug      = 'herb-tansy';
UPDATE user_task_completions  SET plant_slug    = 'tansy' WHERE plant_slug    = 'herb-tansy';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-tansy', 'tansy');
DELETE FROM plant_species WHERE slug = 'herb-tansy';

-- (13) herb-valerian → valerian
UPDATE cultivars              SET species_slug  = 'valerian' WHERE species_slug  = 'herb-valerian';
UPDATE guild_blueprint        SET focal_slug    = 'valerian' WHERE focal_slug    = 'herb-valerian';
UPDATE guild_blueprint_member SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE plant_companions       SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE plant_companions       SET companion_slug= 'valerian' WHERE companion_slug= 'herb-valerian';
UPDATE plant_function         SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE grow_user_plants SET species_slug = 'valerian' WHERE species_slug = 'herb-valerian'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'valerian');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-valerian';
UPDATE grow_planting_calendar SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE grow_nursery_inventory SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE grow_seed_listings     SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE grow_user_tasks        SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
UPDATE perenual_sync_logs     SET our_slug      = 'valerian' WHERE our_slug      = 'herb-valerian';
UPDATE user_task_completions  SET plant_slug    = 'valerian' WHERE plant_slug    = 'herb-valerian';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-valerian', 'valerian');
DELETE FROM plant_species WHERE slug = 'herb-valerian';

-- (14) herb-wormwood → wormwood
UPDATE cultivars              SET species_slug  = 'wormwood' WHERE species_slug  = 'herb-wormwood';
UPDATE guild_blueprint        SET focal_slug    = 'wormwood' WHERE focal_slug    = 'herb-wormwood';
UPDATE guild_blueprint_member SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE plant_companions       SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE plant_companions       SET companion_slug= 'wormwood' WHERE companion_slug= 'herb-wormwood';
UPDATE plant_function         SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE grow_user_plants SET species_slug = 'wormwood' WHERE species_slug = 'herb-wormwood'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'wormwood');
DELETE FROM grow_user_plants WHERE species_slug = 'herb-wormwood';
UPDATE grow_planting_calendar SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE grow_nursery_inventory SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE grow_seed_listings     SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE grow_user_tasks        SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
UPDATE perenual_sync_logs     SET our_slug      = 'wormwood' WHERE our_slug      = 'herb-wormwood';
UPDATE user_task_completions  SET plant_slug    = 'wormwood' WHERE plant_slug    = 'herb-wormwood';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('herb-wormwood', 'wormwood');
DELETE FROM plant_species WHERE slug = 'herb-wormwood';

-- (15) fruit-sweet-chestnut → sweet-chestnut (target exists per canonical-slug check)
UPDATE cultivars              SET species_slug  = 'sweet-chestnut' WHERE species_slug  = 'fruit-sweet-chestnut';
UPDATE guild_blueprint        SET focal_slug    = 'sweet-chestnut' WHERE focal_slug    = 'fruit-sweet-chestnut';
UPDATE guild_blueprint_member SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE plant_companions       SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE plant_companions       SET companion_slug= 'sweet-chestnut' WHERE companion_slug= 'fruit-sweet-chestnut';
UPDATE plant_function         SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE grow_user_plants SET species_slug = 'sweet-chestnut' WHERE species_slug = 'fruit-sweet-chestnut'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'sweet-chestnut');
DELETE FROM grow_user_plants WHERE species_slug = 'fruit-sweet-chestnut';
UPDATE grow_planting_calendar SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE grow_nursery_inventory SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE grow_seed_listings     SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE grow_user_tasks        SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
UPDATE perenual_sync_logs     SET our_slug      = 'sweet-chestnut' WHERE our_slug      = 'fruit-sweet-chestnut';
UPDATE user_task_completions  SET plant_slug    = 'sweet-chestnut' WHERE plant_slug    = 'fruit-sweet-chestnut';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-sweet-chestnut', 'sweet-chestnut');
DELETE FROM plant_species WHERE slug = 'fruit-sweet-chestnut';

-- (16) fruit-walnut → walnut (target exists per canonical-slug check)
UPDATE cultivars              SET species_slug  = 'walnut' WHERE species_slug  = 'fruit-walnut';
UPDATE guild_blueprint        SET focal_slug    = 'walnut' WHERE focal_slug    = 'fruit-walnut';
UPDATE guild_blueprint_member SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE plant_companions       SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE plant_companions       SET companion_slug= 'walnut' WHERE companion_slug= 'fruit-walnut';
UPDATE plant_function         SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE grow_user_plants SET species_slug = 'walnut' WHERE species_slug = 'fruit-walnut'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'walnut');
DELETE FROM grow_user_plants WHERE species_slug = 'fruit-walnut';
UPDATE grow_planting_calendar SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE grow_nursery_inventory SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE grow_seed_listings     SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE grow_user_tasks        SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
UPDATE perenual_sync_logs     SET our_slug      = 'walnut' WHERE our_slug      = 'fruit-walnut';
UPDATE user_task_completions  SET plant_slug    = 'walnut' WHERE plant_slug    = 'fruit-walnut';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-walnut', 'walnut');
DELETE FROM plant_species WHERE slug = 'fruit-walnut';

-- (17) tree-honey-locust → honey-locust (target exists per canonical-slug check)
UPDATE cultivars              SET species_slug  = 'honey-locust' WHERE species_slug  = 'tree-honey-locust';
UPDATE guild_blueprint        SET focal_slug    = 'honey-locust' WHERE focal_slug    = 'tree-honey-locust';
UPDATE guild_blueprint_member SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE plant_companions       SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE plant_companions       SET companion_slug= 'honey-locust' WHERE companion_slug= 'tree-honey-locust';
UPDATE plant_function         SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE grow_user_plants SET species_slug = 'honey-locust' WHERE species_slug = 'tree-honey-locust'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'honey-locust');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-honey-locust';
UPDATE grow_planting_calendar SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE grow_nursery_inventory SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE grow_seed_listings     SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE grow_user_tasks        SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
UPDATE perenual_sync_logs     SET our_slug      = 'honey-locust' WHERE our_slug      = 'tree-honey-locust';
UPDATE user_task_completions  SET plant_slug    = 'honey-locust' WHERE plant_slug    = 'tree-honey-locust';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-honey-locust', 'honey-locust');
DELETE FROM plant_species WHERE slug = 'tree-honey-locust';

-- (18) THREE-way merge: fruit-hackberry + tree-hackberry-common → hackberry (NEW canonical)
-- No canonical 'hackberry' yet — promote tree-hackberry-common to be the canonical,
-- and merge fruit-hackberry into it.
-- Step A: merge fruit-hackberry into tree-hackberry-common first
UPDATE cultivars              SET species_slug  = 'tree-hackberry-common' WHERE species_slug  = 'fruit-hackberry';
UPDATE guild_blueprint        SET focal_slug    = 'tree-hackberry-common' WHERE focal_slug    = 'fruit-hackberry';
UPDATE guild_blueprint_member SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE plant_companions       SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE plant_companions       SET companion_slug= 'tree-hackberry-common' WHERE companion_slug= 'fruit-hackberry';
UPDATE plant_function         SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE grow_user_plants SET species_slug = 'tree-hackberry-common' WHERE species_slug = 'fruit-hackberry'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'tree-hackberry-common');
DELETE FROM grow_user_plants WHERE species_slug = 'fruit-hackberry';
UPDATE grow_planting_calendar SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE grow_nursery_inventory SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE grow_seed_listings     SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE grow_user_tasks        SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
UPDATE perenual_sync_logs     SET our_slug      = 'tree-hackberry-common' WHERE our_slug      = 'fruit-hackberry';
UPDATE user_task_completions  SET plant_slug    = 'tree-hackberry-common' WHERE plant_slug    = 'fruit-hackberry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-hackberry', 'hackberry');
DELETE FROM plant_species WHERE slug = 'fruit-hackberry';
-- Step B: rename tree-hackberry-common → hackberry as a normal rename (CASCADE handles FKs)
UPDATE plant_species SET slug = 'hackberry' WHERE slug = 'tree-hackberry-common';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hackberry-common', 'hackberry');

-- (19) THREE-way merge: tree-juneberry + tree-serviceberry-treeform → fruit-serviceberry → serviceberry
-- No canonical 'serviceberry' yet — pick fruit-serviceberry as the survivor, merge others.
-- Step A: merge tree-juneberry into fruit-serviceberry
UPDATE cultivars              SET species_slug  = 'fruit-serviceberry' WHERE species_slug  = 'tree-juneberry';
UPDATE guild_blueprint        SET focal_slug    = 'fruit-serviceberry' WHERE focal_slug    = 'tree-juneberry';
UPDATE guild_blueprint_member SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE plant_companions       SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE plant_companions       SET companion_slug= 'fruit-serviceberry' WHERE companion_slug= 'tree-juneberry';
UPDATE plant_function         SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE grow_user_plants SET species_slug = 'fruit-serviceberry' WHERE species_slug = 'tree-juneberry'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'fruit-serviceberry');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-juneberry';
UPDATE grow_planting_calendar SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE grow_nursery_inventory SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE grow_seed_listings     SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE grow_user_tasks        SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
UPDATE perenual_sync_logs     SET our_slug      = 'fruit-serviceberry' WHERE our_slug      = 'tree-juneberry';
UPDATE user_task_completions  SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-juneberry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-juneberry', 'serviceberry');
DELETE FROM plant_species WHERE slug = 'tree-juneberry';
-- Step B: merge tree-serviceberry-treeform into fruit-serviceberry
UPDATE cultivars              SET species_slug  = 'fruit-serviceberry' WHERE species_slug  = 'tree-serviceberry-treeform';
UPDATE guild_blueprint        SET focal_slug    = 'fruit-serviceberry' WHERE focal_slug    = 'tree-serviceberry-treeform';
UPDATE guild_blueprint_member SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE plant_companions       SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE plant_companions       SET companion_slug= 'fruit-serviceberry' WHERE companion_slug= 'tree-serviceberry-treeform';
UPDATE plant_function         SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE grow_user_plants SET species_slug = 'fruit-serviceberry' WHERE species_slug = 'tree-serviceberry-treeform'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'fruit-serviceberry');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-serviceberry-treeform';
UPDATE grow_planting_calendar SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE grow_nursery_inventory SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE grow_seed_listings     SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE grow_user_tasks        SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
UPDATE perenual_sync_logs     SET our_slug      = 'fruit-serviceberry' WHERE our_slug      = 'tree-serviceberry-treeform';
UPDATE user_task_completions  SET plant_slug    = 'fruit-serviceberry' WHERE plant_slug    = 'tree-serviceberry-treeform';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-serviceberry-treeform', 'serviceberry');
DELETE FROM plant_species WHERE slug = 'tree-serviceberry-treeform';
-- Step C: rename fruit-serviceberry → serviceberry as normal rename (CASCADE handles FKs)
UPDATE plant_species SET slug = 'serviceberry' WHERE slug = 'fruit-serviceberry';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-serviceberry', 'serviceberry');

-- (20) THREE-way merge: fruit-mountain-ash + tree-rowan-mountain-ash → rowan
-- No canonical 'rowan' yet — pick tree-rowan-mountain-ash as the survivor (richer name),
-- merge fruit-mountain-ash, then rename.
-- Step A: merge fruit-mountain-ash into tree-rowan-mountain-ash
UPDATE cultivars              SET species_slug  = 'tree-rowan-mountain-ash' WHERE species_slug  = 'fruit-mountain-ash';
UPDATE guild_blueprint        SET focal_slug    = 'tree-rowan-mountain-ash' WHERE focal_slug    = 'fruit-mountain-ash';
UPDATE guild_blueprint_member SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE plant_companions       SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE plant_companions       SET companion_slug= 'tree-rowan-mountain-ash' WHERE companion_slug= 'fruit-mountain-ash';
UPDATE plant_function         SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE grow_user_plants SET species_slug = 'tree-rowan-mountain-ash' WHERE species_slug = 'fruit-mountain-ash'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'tree-rowan-mountain-ash');
DELETE FROM grow_user_plants WHERE species_slug = 'fruit-mountain-ash';
UPDATE grow_planting_calendar SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE grow_nursery_inventory SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE grow_seed_listings     SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE grow_user_tasks        SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
UPDATE perenual_sync_logs     SET our_slug      = 'tree-rowan-mountain-ash' WHERE our_slug      = 'fruit-mountain-ash';
UPDATE user_task_completions  SET plant_slug    = 'tree-rowan-mountain-ash' WHERE plant_slug    = 'fruit-mountain-ash';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-mountain-ash', 'rowan');
DELETE FROM plant_species WHERE slug = 'fruit-mountain-ash';
-- Step B: rename tree-rowan-mountain-ash → rowan as a normal rename (CASCADE handles FKs)
UPDATE plant_species SET slug = 'rowan' WHERE slug = 'tree-rowan-mountain-ash';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-rowan-mountain-ash', 'rowan');

-- (21) TWO-way merge: fruit-honeyberry-treeform + tree-honeyberry-treeform → honeyberry
-- No canonical 'honeyberry' yet — pick fruit form as survivor.
-- Step A: merge tree-honeyberry-treeform into fruit-honeyberry-treeform
UPDATE cultivars              SET species_slug  = 'fruit-honeyberry-treeform' WHERE species_slug  = 'tree-honeyberry-treeform';
UPDATE guild_blueprint        SET focal_slug    = 'fruit-honeyberry-treeform' WHERE focal_slug    = 'tree-honeyberry-treeform';
UPDATE guild_blueprint_member SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE plant_companions       SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE plant_companions       SET companion_slug= 'fruit-honeyberry-treeform' WHERE companion_slug= 'tree-honeyberry-treeform';
UPDATE plant_function         SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE grow_user_plants SET species_slug = 'fruit-honeyberry-treeform' WHERE species_slug = 'tree-honeyberry-treeform'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'fruit-honeyberry-treeform');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-honeyberry-treeform';
UPDATE grow_planting_calendar SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE grow_nursery_inventory SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE grow_seed_listings     SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE grow_user_tasks        SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
UPDATE perenual_sync_logs     SET our_slug      = 'fruit-honeyberry-treeform' WHERE our_slug      = 'tree-honeyberry-treeform';
UPDATE user_task_completions  SET plant_slug    = 'fruit-honeyberry-treeform' WHERE plant_slug    = 'tree-honeyberry-treeform';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-honeyberry-treeform', 'honeyberry');
DELETE FROM plant_species WHERE slug = 'tree-honeyberry-treeform';
-- Step B: rename fruit-honeyberry-treeform → honeyberry as a normal rename (CASCADE handles FKs)
UPDATE plant_species SET slug = 'honeyberry' WHERE slug = 'fruit-honeyberry-treeform';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-honeyberry-treeform', 'honeyberry');

-- (22) tree-hazel-treeform → hazelnut (MERGE — 'hazelnut' canonical already exists)
UPDATE cultivars              SET species_slug  = 'hazelnut' WHERE species_slug  = 'tree-hazel-treeform';
UPDATE guild_blueprint        SET focal_slug    = 'hazelnut' WHERE focal_slug    = 'tree-hazel-treeform';
UPDATE guild_blueprint_member SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE plant_companions       SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE plant_companions       SET companion_slug= 'hazelnut' WHERE companion_slug= 'tree-hazel-treeform';
UPDATE plant_function         SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE grow_user_plants SET species_slug = 'hazelnut' WHERE species_slug = 'tree-hazel-treeform'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'hazelnut');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-hazel-treeform';
UPDATE grow_planting_calendar SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE grow_nursery_inventory SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE grow_seed_listings     SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE grow_user_tasks        SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
UPDATE perenual_sync_logs     SET our_slug      = 'hazelnut' WHERE our_slug      = 'tree-hazel-treeform';
UPDATE user_task_completions  SET plant_slug    = 'hazelnut' WHERE plant_slug    = 'tree-hazel-treeform';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-hazel-treeform', 'hazelnut');
DELETE FROM plant_species WHERE slug = 'tree-hazel-treeform';

-- (23) tree-albizia-julibrissin + tree-silk-tree → silk-tree (Damian decision 2026-05-13).
-- Pick tree-albizia-julibrissin as survivor — Latin-binomial slug suggests it carries
-- richer taxonomy data than the plain-name duplicate. Then rename survivor to silk-tree.
-- Step A: merge tree-silk-tree into tree-albizia-julibrissin
UPDATE cultivars              SET species_slug  = 'tree-albizia-julibrissin' WHERE species_slug  = 'tree-silk-tree';
UPDATE guild_blueprint        SET focal_slug    = 'tree-albizia-julibrissin' WHERE focal_slug    = 'tree-silk-tree';
UPDATE guild_blueprint_member SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE plant_companions       SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE plant_companions       SET companion_slug= 'tree-albizia-julibrissin' WHERE companion_slug= 'tree-silk-tree';
UPDATE plant_function         SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE grow_user_plants SET species_slug = 'tree-albizia-julibrissin' WHERE species_slug = 'tree-silk-tree'
  AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'tree-albizia-julibrissin');
DELETE FROM grow_user_plants WHERE species_slug = 'tree-silk-tree';
UPDATE grow_planting_calendar SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE grow_nursery_inventory SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE grow_seed_listings     SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE grow_user_tasks        SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
UPDATE perenual_sync_logs     SET our_slug      = 'tree-albizia-julibrissin' WHERE our_slug      = 'tree-silk-tree';
UPDATE user_task_completions  SET plant_slug    = 'tree-albizia-julibrissin' WHERE plant_slug    = 'tree-silk-tree';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-silk-tree', 'silk-tree');
DELETE FROM plant_species WHERE slug = 'tree-silk-tree';
-- Step B: rename tree-albizia-julibrissin → silk-tree as a normal rename (CASCADE handles FKs)
UPDATE plant_species SET slug = 'silk-tree' WHERE slug = 'tree-albizia-julibrissin';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-albizia-julibrissin', 'silk-tree');

-- (24) fruit-elder → elder (defensive: rename if no canonical exists, merge if it does;
-- Damian decision 2026-05-13).
DO $elder$
BEGIN
  IF EXISTS (SELECT 1 FROM plant_species WHERE slug = 'elder') THEN
    -- Merge path: 'elder' already canonical, fold fruit-elder into it.
    UPDATE cultivars              SET species_slug  = 'elder' WHERE species_slug  = 'fruit-elder';
    UPDATE guild_blueprint        SET focal_slug    = 'elder' WHERE focal_slug    = 'fruit-elder';
    UPDATE guild_blueprint_member SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE plant_companions       SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE plant_companions       SET companion_slug= 'elder' WHERE companion_slug= 'fruit-elder';
    UPDATE plant_function         SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE grow_user_plants SET species_slug = 'elder' WHERE species_slug = 'fruit-elder'
      AND NOT EXISTS (SELECT 1 FROM grow_user_plants g2 WHERE g2.user_id = grow_user_plants.user_id AND g2.species_slug = 'elder');
    DELETE FROM grow_user_plants WHERE species_slug = 'fruit-elder';
    UPDATE grow_planting_calendar SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE grow_nursery_inventory SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE grow_seed_listings     SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE grow_user_tasks        SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    UPDATE perenual_sync_logs     SET our_slug      = 'elder' WHERE our_slug      = 'fruit-elder';
    UPDATE user_task_completions  SET plant_slug    = 'elder' WHERE plant_slug    = 'fruit-elder';
    DELETE FROM plant_species WHERE slug = 'fruit-elder';
  ELSE
    -- Rename path: 'elder' free, promote fruit-elder to canonical.
    UPDATE plant_species SET slug = 'elder' WHERE slug = 'fruit-elder';
  END IF;
END
$elder$;
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-elder', 'elder')
ON CONFLICT (old_slug) DO NOTHING;

-- (25) tree-aldershade-american → american-alder (Damian decision 2026-05-13 — typo of 'alder-shade').
-- Likely Alnus rugosa (speckled alder) or Alnus serrulata; either way "american-alder"
-- is the right common-name canonical; specific species detail stays in the row's scientific_name.
UPDATE plant_species SET slug = 'american-alder' WHERE slug = 'tree-aldershade-american';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('tree-aldershade-american', 'american-alder');

-- =====================================================================
-- §3 EDGE-CASE RESOLUTION LOG (all resolved 2026-05-13 by Damian)
-- =====================================================================
-- All four cases now have concrete migration blocks above; this section
-- is kept as a decision log for the record.

-- A) fruit-currant — SPLIT to redcurrant + whitecurrant (Damian decision, 2026-05-13).
--    Both are Ribes rubrum (same species, cultivar selections by berry colour).
--    Blackcurrant is Ribes nigrum and remains a separate canonical row.
--
--    Approach: rename existing fruit-currant row to 'redcurrant' (the dominant form
--    in UK gardens) to preserve any user data + companion refs that already reference it.
--    Then clone the redcurrant row into a new 'whitecurrant' row as a starting point —
--    Code or Cowork can refine common_name and any colour-specific copy after the rename.
--    Both `fruit-currant` and any legacy lookup → redcurrant via alias (default mapping);
--    a separate `whitecurrant` alias is not added because whitecurrant is its own canonical.

-- Step 1: rename fruit-currant → redcurrant (preserves FK refs).
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('fruit-currant', 'redcurrant');
UPDATE plant_species
SET slug = 'redcurrant',
    name = 'Redcurrant',
    scientific_name = 'Ribes rubrum'
WHERE slug = 'fruit-currant';

-- Step 2: clone the new redcurrant row into a whitecurrant row.
-- Whitecurrant is the same species, so all biology/calendar/RHS data carries over.
-- Cultivar-specific fields (cultivars list, colour notes) should be revised in a
-- follow-up content drop — that's on the soft-fruit batch queue.
INSERT INTO plant_species (
  slug, name, scientific_name,
  rhs_hardiness_min, rhs_hardiness_max,
  description, howto_steps, faqs,
  date_published, date_modified
)
SELECT
  'whitecurrant', 'Whitecurrant', 'Ribes rubrum',
  rhs_hardiness_min, rhs_hardiness_max,
  -- prepend a one-liner so the placeholder content is honest until Cowork drafts the proper version
  CASE WHEN description IS NULL
       THEN 'Whitecurrant is a paler cultivar form of Ribes rubrum, grown and cared for in exactly the same way as redcurrant. Full Grow Daisy content drop pending.'
       ELSE 'Whitecurrant is a paler cultivar form of Ribes rubrum, grown and cared for in exactly the same way as redcurrant. ' || description
  END,
  howto_steps, faqs,
  CURRENT_DATE, CURRENT_DATE
FROM plant_species
WHERE slug = 'redcurrant';
-- NOTE: if your plant_species table has additional NOT NULL columns beyond the above,
-- extend this SELECT to copy them. The set above matches the columns the content
-- drafts rely on; any other columns (taxonomy, family, etc.) should default safely.

-- B) fruit-elder → elder (Damian decision 2026-05-13). Resolved as a defensive block
--    in §2(24) that handles both "no canonical exists" (rename path) and "canonical exists"
--    (merge path) — same final state either way, no pre-flight check needed.

-- C) tree-aldershade-american → american-alder (Damian decision 2026-05-13 — typo confirmed).
--    Resolved as a simple rename in §2(25). Whichever specific Alnus species the row
--    holds, the common-name canonical 'american-alder' is correct.

-- D) tree-albizia-julibrissin + tree-silk-tree → silk-tree (Damian decision 2026-05-13).
--    Confirmed as a merge. Resolved in §2(23): tree-albizia-julibrissin picked as survivor
--    (Latin-binomial slug implies richer taxonomy data), tree-silk-tree merged into it,
--    then survivor renamed to silk-tree. Both old slugs alias to silk-tree.

-- E) herb-oregano → oregano (Damian decision 2026-05-13 — confirmed RENAME, not merge).
--    Resolved by simplifying the §2(7) block to alias + slug update only. No FK plumbing
--    needed because no existing 'oregano' canonical row to consolidate into.

COMMIT;

-- ============================================================
-- POST-APPLY VERIFICATION
-- ============================================================
-- After applying, the sitemap should contain ZERO prefixed slugs:
--   curl -s <preview>/sitemap.xml | grep -cE '/grow/species/(fruit|tree|herb|squash|pepper|kale)-'
--   → expect 0
--
-- Old prefixed URLs should 301/308 to canonical:
--   curl -sI <preview>/grow/species/fruit-apricot | head -1     # expect 308
--   curl -sI <preview>/grow/fr/species/herb-lovage | head -1    # expect 308
--   curl -sI <preview>/grow/es/species/tree-silver-birch | head -1  # expect 308
--
-- Spot-check new canonicals serve 200:
--   for slug in apricot lemon-balm silver-birch greek-oregano \
--               serviceberry rowan honeyberry hackberry; do
--     echo "$slug: $(curl -sI <preview>/grow/species/$slug | head -1)"
--   done
--
-- Alias row count should grow by ~181 (renames + merges):
--   SELECT COUNT(*) FROM plant_species_aliases;
--
-- Slug-by-slug check that nothing escaped:
--   SELECT slug FROM plant_species
--   WHERE slug ~ '^(fruit|tree|herb|squash|pepper|kale|onion)-'
--   ORDER BY slug;
--   → expect empty result set (or only the §3 edge cases if not yet resolved)
