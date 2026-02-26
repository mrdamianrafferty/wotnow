-- =============================================================================
-- Seed garden_threat_host with horticulturally accurate plant-threat mappings
-- =============================================================================
-- host_kind: 'crop_tag' | 'feature_tag'
-- host_key:  matches slugified plant names or group tags from hostTags.ts
-- host_strength: 1 = general susceptibility, 2 = moderate, 3 = primary target
--
-- Group crop_tags (from hostTags.ts):
--   brassicas, cucurbits, onion_family, leafy_greens, beans,
--   orchard, fruit_tree, greenhouse_crops, tender_plants,
--   houseplants, succulents, ornamentals, flowers
--
-- Feature tags: greenhouse, raised_beds, cold_frame
-- =============================================================================

BEGIN;

-- Helper: insert a host row via slug lookup, ignoring conflicts
-- Pattern:
--   INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
--   SELECT gt.id, <kind>, <key>, <strength>, <notes>
--   FROM garden_threat gt WHERE gt.slug = <slug>
--   ON CONFLICT DO NOTHING;

-- =============================================================================
-- PESTS
-- =============================================================================

-- ---- aphids ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           2, 'Preferred host; sap-feeder on young growth'),
  ('crop_tag', 'pepper',           2, 'Common on indoor/greenhouse peppers'),
  ('crop_tag', 'aubergine',        1, NULL),
  ('crop_tag', 'beans',            2, 'Black bean aphid colonies on broad beans'),
  ('crop_tag', 'broad_bean',       2, 'Black bean aphid primary host'),
  ('crop_tag', 'runner_bean',      1, NULL),
  ('crop_tag', 'pea',              1, NULL),
  ('crop_tag', 'lettuce',          2, 'Currant-lettuce aphid embeds in hearts'),
  ('crop_tag', 'leafy_greens',     2, NULL),
  ('crop_tag', 'spinach',          1, NULL),
  ('crop_tag', 'chard',            1, NULL),
  ('crop_tag', 'brassicas',        2, 'Mealy cabbage aphid common'),
  ('crop_tag', 'cabbage',          2, NULL),
  ('crop_tag', 'broccoli',         1, NULL),
  ('crop_tag', 'kale',             1, NULL),
  ('crop_tag', 'brussels_sprouts', 1, NULL),
  ('crop_tag', 'courgette',        1, NULL),
  ('crop_tag', 'cucumber',         1, NULL),
  ('crop_tag', 'cucurbits',        1, NULL),
  ('crop_tag', 'rose',             2, 'Greenfly highly attracted to roses'),
  ('crop_tag', 'ornamentals',      2, NULL),
  ('crop_tag', 'greenhouse_crops', 2, 'Aphids thrive in sheltered warmth'),
  ('crop_tag', 'tender_plants',    1, NULL),
  ('crop_tag', 'flowers',          1, NULL),
  ('crop_tag', 'apple',            1, 'Woolly apple aphid'),
  ('crop_tag', 'fruit_tree',       1, NULL),
  ('crop_tag', 'strawberry',       1, NULL),
  ('crop_tag', 'raspberry',        1, NULL),
  ('feature_tag', 'greenhouse',    2, 'Enclosed environment favours aphid build-up')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'aphids'
ON CONFLICT DO NOTHING;

-- ---- slugs-snails ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',       3, 'Primary target; soft leaves are irresistible'),
  ('crop_tag', 'leafy_greens',  2, NULL),
  ('crop_tag', 'spinach',       2, NULL),
  ('crop_tag', 'chard',         1, NULL),
  ('crop_tag', 'beans',         2, 'Seedlings especially vulnerable'),
  ('crop_tag', 'broad_bean',    1, NULL),
  ('crop_tag', 'runner_bean',   1, NULL),
  ('crop_tag', 'french_bean',   1, NULL),
  ('crop_tag', 'pea',           1, NULL),
  ('crop_tag', 'brassicas',     2, 'Young transplants at risk'),
  ('crop_tag', 'cabbage',       1, NULL),
  ('crop_tag', 'cauliflower',   1, NULL),
  ('crop_tag', 'broccoli',      1, NULL),
  ('crop_tag', 'hosta',         3, 'Classic slug magnet'),
  ('crop_tag', 'ornamentals',   1, NULL),
  ('crop_tag', 'strawberry',    2, 'Fruit on soil surface invites damage'),
  ('crop_tag', 'courgette',     1, 'Young seedlings'),
  ('crop_tag', 'potato',        1, 'Keeled slug damages tubers underground'),
  ('crop_tag', 'celery',        1, NULL),
  ('crop_tag', 'flowers',       1, 'Dahlias, delphiniums, marigolds'),
  ('feature_tag', 'raised_beds', 1, 'Copper tape can help on raised beds')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'slugs-snails'
ON CONFLICT DO NOTHING;

-- ---- spider-mites ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           2, 'Two-spotted spider mite thrives on tomatoes'),
  ('crop_tag', 'pepper',           2, NULL),
  ('crop_tag', 'aubergine',        2, NULL),
  ('crop_tag', 'cucumber',         2, NULL),
  ('crop_tag', 'courgette',        1, NULL),
  ('crop_tag', 'cucurbits',        1, NULL),
  ('crop_tag', 'greenhouse_crops', 3, 'Hot dry conditions under glass favour mites'),
  ('crop_tag', 'tender_plants',    1, NULL),
  ('crop_tag', 'houseplants',      2, 'Dry indoor air promotes mite outbreaks'),
  ('crop_tag', 'strawberry',       1, NULL),
  ('crop_tag', 'beans',            1, NULL),
  ('crop_tag', 'rose',             1, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('feature_tag', 'greenhouse',    3, 'Prime environment for spider mite explosions')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'spider-mites'
ON CONFLICT DO NOTHING;

-- ---- whitefly ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           3, 'Greenhouse whitefly primary host'),
  ('crop_tag', 'pepper',           2, NULL),
  ('crop_tag', 'aubergine',        1, NULL),
  ('crop_tag', 'cucumber',         1, NULL),
  ('crop_tag', 'greenhouse_crops', 2, NULL),
  ('crop_tag', 'tender_plants',    1, NULL),
  ('crop_tag', 'brassicas',        2, 'Cabbage whitefly on outdoor brassicas'),
  ('crop_tag', 'cabbage',          2, NULL),
  ('crop_tag', 'broccoli',         1, NULL),
  ('crop_tag', 'brussels_sprouts', 2, NULL),
  ('crop_tag', 'kale',             1, NULL),
  ('crop_tag', 'houseplants',      1, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('feature_tag', 'greenhouse',    3, 'Warm still air is ideal for whitefly')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'whitefly'
ON CONFLICT DO NOTHING;

-- ---- thrips ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'onion_family',     2, 'Onion thrips (Thrips tabaci) major pest'),
  ('crop_tag', 'onion',            2, NULL),
  ('crop_tag', 'garlic',           1, NULL),
  ('crop_tag', 'leek',             2, NULL),
  ('crop_tag', 'beans',            1, NULL),
  ('crop_tag', 'pea',              1, NULL),
  ('crop_tag', 'greenhouse_crops', 2, 'Western flower thrips in protected crops'),
  ('crop_tag', 'flowers',          2, 'Damage to petals and buds'),
  ('crop_tag', 'rose',             1, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('crop_tag', 'pepper',           1, NULL),
  ('crop_tag', 'cucumber',         1, NULL),
  ('crop_tag', 'houseplants',      1, NULL),
  ('feature_tag', 'greenhouse',    2, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'thrips'
ON CONFLICT DO NOTHING;

-- ---- scale-insects ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'houseplants',  3, 'Very common on indoor plants'),
  ('crop_tag', 'ornamentals',  2, NULL),
  ('crop_tag', 'fruit_tree',   2, NULL),
  ('crop_tag', 'orchard',      1, NULL),
  ('crop_tag', 'apple',        1, NULL),
  ('crop_tag', 'pear',         1, NULL),
  ('crop_tag', 'cherry',       1, NULL),
  ('crop_tag', 'plum',         1, NULL),
  ('crop_tag', 'citrus',       2, 'Citrus scale common on lemon, orange'),
  ('crop_tag', 'bay',          1, NULL),
  ('crop_tag', 'olive',        1, NULL),
  ('crop_tag', 'succulents',   1, NULL),
  ('feature_tag', 'greenhouse', 1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'scale-insects'
ON CONFLICT DO NOTHING;

-- ---- mealybugs ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'houseplants',      3, 'Most common houseplant pest'),
  ('crop_tag', 'succulents',       2, 'Hides in leaf axils and roots'),
  ('crop_tag', 'greenhouse_crops', 2, NULL),
  ('crop_tag', 'ornamentals',      2, NULL),
  ('crop_tag', 'citrus',           1, NULL),
  ('crop_tag', 'grape',            1, 'Vine mealybug'),
  ('crop_tag', 'flowers',          1, NULL),
  ('feature_tag', 'greenhouse',    2, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'mealybugs'
ON CONFLICT DO NOTHING;

-- ---- vine-weevil ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'strawberry',   3, 'Larvae devour roots; adults notch leaves'),
  ('crop_tag', 'ornamentals',  2, 'Especially heuchera, primula, cyclamen'),
  ('crop_tag', 'houseplants',  2, 'Container plants at high risk'),
  ('crop_tag', 'succulents',   1, NULL),
  ('crop_tag', 'raspberry',    1, NULL),
  ('crop_tag', 'blueberry',    1, NULL),
  ('crop_tag', 'grape',        1, NULL),
  ('crop_tag', 'flowers',      1, NULL),
  ('crop_tag', 'rhododendron', 2, NULL),
  ('feature_tag', 'greenhouse', 1, 'Overwinter in containers under cover')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'vine-weevil'
ON CONFLICT DO NOTHING;

-- ---- brassica-caterpillars ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'brassicas',        3, 'Primary host family for cabbage whites'),
  ('crop_tag', 'cabbage',          3, 'Large white caterpillars devastate cabbages'),
  ('crop_tag', 'cauliflower',      3, NULL),
  ('crop_tag', 'broccoli',         3, NULL),
  ('crop_tag', 'kale',             2, NULL),
  ('crop_tag', 'brussels_sprouts', 3, NULL),
  ('crop_tag', 'pak_choi',         2, NULL),
  ('crop_tag', 'turnip',           1, NULL),
  ('crop_tag', 'radish',           1, NULL),
  ('crop_tag', 'swede',            1, NULL),
  ('crop_tag', 'rocket',           1, 'Being brassica-family, rocket is also attacked'),
  ('crop_tag', 'mustard',          1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'brassica-caterpillars'
ON CONFLICT DO NOTHING;

-- ---- cutworms ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',      2, 'Sever stems at soil level'),
  ('crop_tag', 'leafy_greens', 1, NULL),
  ('crop_tag', 'brassicas',    2, 'Transplants especially vulnerable'),
  ('crop_tag', 'cabbage',      1, NULL),
  ('crop_tag', 'beans',        1, NULL),
  ('crop_tag', 'carrot',       2, 'Root damage'),
  ('crop_tag', 'beetroot',     1, NULL),
  ('crop_tag', 'potato',       1, NULL),
  ('crop_tag', 'turnip',       1, NULL),
  ('crop_tag', 'onion',        1, NULL),
  ('crop_tag', 'celery',       1, NULL),
  ('crop_tag', 'tomato',       1, 'Transplant stem cutting')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'cutworms'
ON CONFLICT DO NOTHING;

-- ---- fungus-gnats ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'houseplants',      3, 'Larvae feed on roots in damp compost'),
  ('crop_tag', 'greenhouse_crops', 2, 'Seedling trays and propagation areas'),
  ('crop_tag', 'succulents',       1, 'Less common if soil dries between watering'),
  ('crop_tag', 'flowers',          1, NULL),
  ('crop_tag', 'herbs',            1, 'Potted herbs on windowsills'),
  ('feature_tag', 'greenhouse',    2, 'Moist conditions promote larvae'),
  ('feature_tag', 'cold_frame',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'fungus-gnats'
ON CONFLICT DO NOTHING;

-- ---- leaf-miners ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',      2, 'Serpentine mines in leaves'),
  ('crop_tag', 'chard',        2, 'Beet leaf miner common on chard'),
  ('crop_tag', 'spinach',      2, NULL),
  ('crop_tag', 'beetroot',     2, 'Same species as chard leaf miner'),
  ('crop_tag', 'leafy_greens', 2, NULL),
  ('crop_tag', 'celery',       1, 'Celery leaf miner'),
  ('crop_tag', 'pea',          1, 'Pea leaf miner'),
  ('crop_tag', 'onion',        1, 'Allium leaf miner emerging in UK'),
  ('crop_tag', 'leek',         2, 'Allium leaf miner highly damaging'),
  ('crop_tag', 'onion_family', 1, NULL),
  ('crop_tag', 'garlic',       1, NULL),
  ('crop_tag', 'ornamentals',  1, 'Holly leaf miner, chrysanthemum leaf miner')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'leaf-miners'
ON CONFLICT DO NOTHING;

-- ---- carrot-fly ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'carrot',   3, 'Primary host; larvae tunnel through roots'),
  ('crop_tag', 'parsnip',  2, NULL),
  ('crop_tag', 'celery',   2, 'Celery fly is closely related'),
  ('crop_tag', 'celeriac', 2, NULL),
  ('crop_tag', 'parsley',  1, 'Umbelliferous herb also susceptible'),
  ('crop_tag', 'fennel',   1, NULL),
  ('feature_tag', 'raised_beds', 1, 'Height can reduce low-flying carrot fly access')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'carrot-fly'
ON CONFLICT DO NOTHING;

-- ---- cabbage-root-fly ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'brassicas',        3, 'All brassicas susceptible'),
  ('crop_tag', 'cabbage',          3, 'Larvae destroy roots causing wilting'),
  ('crop_tag', 'cauliflower',      3, NULL),
  ('crop_tag', 'broccoli',         2, NULL),
  ('crop_tag', 'brussels_sprouts', 2, NULL),
  ('crop_tag', 'kale',             1, NULL),
  ('crop_tag', 'turnip',           2, 'Root crop directly damaged'),
  ('crop_tag', 'radish',           2, NULL),
  ('crop_tag', 'swede',            2, NULL),
  ('crop_tag', 'pak_choi',         1, NULL),
  ('crop_tag', 'rocket',           1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'cabbage-root-fly'
ON CONFLICT DO NOTHING;

-- ---- flea-beetle ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'brassicas',   2, 'Shot-holing on seedling leaves'),
  ('crop_tag', 'rocket',      3, 'Extremely attractive to flea beetle'),
  ('crop_tag', 'radish',      2, NULL),
  ('crop_tag', 'turnip',      2, NULL),
  ('crop_tag', 'pak_choi',    2, NULL),
  ('crop_tag', 'cabbage',     1, NULL),
  ('crop_tag', 'broccoli',    1, NULL),
  ('crop_tag', 'kale',        1, NULL),
  ('crop_tag', 'aubergine',   1, 'Can attack outdoor aubergine transplants'),
  ('crop_tag', 'potato',      1, 'Potato flea beetle less common'),
  ('crop_tag', 'mustard',     2, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'flea-beetle'
ON CONFLICT DO NOTHING;

-- ---- codling-moth ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'apple',      3, 'Primary host; larvae bore into fruit'),
  ('crop_tag', 'pear',       2, NULL),
  ('crop_tag', 'quince',     1, NULL),
  ('crop_tag', 'fruit_tree', 2, NULL),
  ('crop_tag', 'orchard',    2, NULL),
  ('crop_tag', 'plum',       1, 'Less common than in apples'),
  ('crop_tag', 'walnut',     1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'codling-moth'
ON CONFLICT DO NOTHING;

-- ---- sawfly ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'apple',       2, 'Apple sawfly scars fruit'),
  ('crop_tag', 'pear',        1, 'Pear sawfly / pear slug'),
  ('crop_tag', 'gooseberry',  3, 'Gooseberry sawfly strips leaves completely'),
  ('crop_tag', 'fruit_tree',  1, NULL),
  ('crop_tag', 'orchard',     1, NULL),
  ('crop_tag', 'rose',        2, 'Rose sawfly (rose slug) skeletonises leaves'),
  ('crop_tag', 'cherry',      1, NULL),
  ('crop_tag', 'plum',        1, NULL),
  ('crop_tag', 'ornamentals', 1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'sawfly'
ON CONFLICT DO NOTHING;

-- ---- earwigs ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'dahlia',      3, 'Classic earwig target; ragged petal damage'),
  ('crop_tag', 'flowers',     2, 'Chrysanthemums, clematis, dahlias'),
  ('crop_tag', 'ornamentals', 1, NULL),
  ('crop_tag', 'fruit_tree',  1, 'Can damage ripe fruit'),
  ('crop_tag', 'apple',       1, NULL),
  ('crop_tag', 'pear',        1, NULL),
  ('crop_tag', 'plum',        1, NULL),
  ('crop_tag', 'strawberry',  1, NULL),
  ('crop_tag', 'peach',       1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'earwigs'
ON CONFLICT DO NOTHING;

-- ---- red-lily-beetle ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lily',         3, 'Primary host; adults and larvae defoliate'),
  ('crop_tag', 'fritillary',   2, 'Also attacks fritillaria species'),
  ('crop_tag', 'ornamentals',  1, NULL),
  ('crop_tag', 'flowers',      1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'red-lily-beetle'
ON CONFLICT DO NOTHING;

-- ---- rosemary-beetle ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'rosemary',  3, 'Primary host; adults and larvae strip leaves'),
  ('crop_tag', 'lavender',  2, NULL),
  ('crop_tag', 'thyme',     2, NULL),
  ('crop_tag', 'sage',      2, NULL),
  ('crop_tag', 'oregano',   1, 'Occasional host'),
  ('crop_tag', 'herbs',     1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'rosemary-beetle'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FUNGAL DISEASES
-- =============================================================================

-- ---- powdery-mildew ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'courgette',        3, 'Very susceptible; white coating on leaves'),
  ('crop_tag', 'cucurbits',        2, NULL),
  ('crop_tag', 'cucumber',         2, NULL),
  ('crop_tag', 'pumpkin',          2, NULL),
  ('crop_tag', 'squash',           2, NULL),
  ('crop_tag', 'melon',            1, NULL),
  ('crop_tag', 'apple',            2, 'Apple powdery mildew (Podosphaera leucotricha)'),
  ('crop_tag', 'rose',             2, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('crop_tag', 'grape',            2, NULL),
  ('crop_tag', 'gooseberry',       2, 'American gooseberry mildew'),
  ('crop_tag', 'pea',              1, NULL),
  ('crop_tag', 'strawberry',       1, NULL),
  ('crop_tag', 'greenhouse_crops', 1, NULL),
  ('crop_tag', 'flowers',          1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'powdery-mildew'
ON CONFLICT DO NOTHING;

-- ---- downy-mildew ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',      3, 'Bremia lactucae highly destructive'),
  ('crop_tag', 'leafy_greens', 2, NULL),
  ('crop_tag', 'spinach',      2, NULL),
  ('crop_tag', 'onion_family', 2, 'Onion downy mildew (Peronospora destructor)'),
  ('crop_tag', 'onion',        2, NULL),
  ('crop_tag', 'garlic',       1, NULL),
  ('crop_tag', 'shallot',      1, NULL),
  ('crop_tag', 'brassicas',    2, 'Brassica downy mildew on seedlings'),
  ('crop_tag', 'cabbage',      1, NULL),
  ('crop_tag', 'grape',        2, 'Plasmopara viticola'),
  ('crop_tag', 'pea',          1, NULL),
  ('crop_tag', 'cucumber',     1, NULL),
  ('crop_tag', 'rose',         1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'downy-mildew'
ON CONFLICT DO NOTHING;

-- ---- late-blight ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           3, 'Phytophthora infestans; devastating in damp years'),
  ('crop_tag', 'potato',           3, 'Tuber blight and foliage collapse'),
  ('crop_tag', 'greenhouse_crops', 1, 'Less common under glass if ventilated'),
  ('feature_tag', 'greenhouse',    1, 'Protection reduces but does not eliminate risk')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'late-blight'
ON CONFLICT DO NOTHING;

-- ---- early-blight ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           2, 'Alternaria solani; concentric ring spots'),
  ('crop_tag', 'potato',           2, NULL),
  ('crop_tag', 'greenhouse_crops', 1, NULL),
  ('crop_tag', 'pepper',           1, 'Occasional on peppers')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'early-blight'
ON CONFLICT DO NOTHING;

-- ---- damping-off ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'greenhouse_crops', 2, 'Seedling trays in warm moist conditions'),
  ('crop_tag', 'tomato',           1, 'Tomato seedlings'),
  ('crop_tag', 'pepper',           1, NULL),
  ('crop_tag', 'lettuce',          1, NULL),
  ('crop_tag', 'brassicas',        1, NULL),
  ('crop_tag', 'beans',            1, NULL),
  ('crop_tag', 'flowers',          1, 'Flower seedlings'),
  ('crop_tag', 'herbs',            1, NULL),
  ('feature_tag', 'greenhouse',    2, 'High humidity promotes damping-off'),
  ('feature_tag', 'cold_frame',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'damping-off'
ON CONFLICT DO NOTHING;

-- ---- rust ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'beans',        2, 'Bean rust (Uromyces appendiculatus)'),
  ('crop_tag', 'broad_bean',   2, NULL),
  ('crop_tag', 'runner_bean',  2, NULL),
  ('crop_tag', 'french_bean',  2, NULL),
  ('crop_tag', 'leek',         3, 'Leek rust (Puccinia allii) very common'),
  ('crop_tag', 'onion_family', 2, NULL),
  ('crop_tag', 'garlic',       2, NULL),
  ('crop_tag', 'onion',        1, NULL),
  ('crop_tag', 'chive',        1, NULL),
  ('crop_tag', 'rose',         2, 'Rose rust (Phragmidium spp.)'),
  ('crop_tag', 'ornamentals',  1, NULL),
  ('crop_tag', 'mint',         1, 'Mint rust'),
  ('crop_tag', 'flowers',      1, 'Hollyhock rust, antirrhinum rust'),
  ('crop_tag', 'pear',         1, 'Pear rust (Gymnosporangium)')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'rust'
ON CONFLICT DO NOTHING;

-- ---- leaf-spot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'strawberry',   2, 'Mycosphaerella fragariae'),
  ('crop_tag', 'celery',       2, 'Septoria leaf spot of celery'),
  ('crop_tag', 'beetroot',     2, 'Cercospora leaf spot'),
  ('crop_tag', 'chard',        1, NULL),
  ('crop_tag', 'leafy_greens', 1, NULL),
  ('crop_tag', 'spinach',      1, NULL),
  ('crop_tag', 'lettuce',      1, NULL),
  ('crop_tag', 'tomato',       1, 'Septoria leaf spot of tomato'),
  ('crop_tag', 'ornamentals',  1, NULL),
  ('crop_tag', 'flowers',      1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'leaf-spot'
ON CONFLICT DO NOTHING;

-- ---- root-rot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'houseplants',      3, 'Overwatered houseplants most at risk'),
  ('crop_tag', 'greenhouse_crops', 2, NULL),
  ('crop_tag', 'succulents',       1, 'Susceptible if overwatered'),
  ('crop_tag', 'tomato',           1, NULL),
  ('crop_tag', 'pepper',           1, NULL),
  ('crop_tag', 'beans',            1, NULL),
  ('crop_tag', 'pea',              1, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('crop_tag', 'herbs',            1, NULL),
  ('feature_tag', 'greenhouse',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'root-rot'
ON CONFLICT DO NOTHING;

-- ---- apple-scab ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'apple',      3, 'Venturia inaequalis; scabby lesions on fruit/leaves'),
  ('crop_tag', 'pear',       2, 'Venturia pirina on pears'),
  ('crop_tag', 'fruit_tree', 2, NULL),
  ('crop_tag', 'orchard',    2, NULL),
  ('crop_tag', 'quince',     1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'apple-scab'
ON CONFLICT DO NOTHING;

-- ---- fire-blight ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'apple',      3, 'Erwinia amylovora; blackened shoots, cankers'),
  ('crop_tag', 'pear',       3, 'Extremely susceptible'),
  ('crop_tag', 'quince',     2, NULL),
  ('crop_tag', 'fruit_tree', 3, NULL),
  ('crop_tag', 'orchard',    3, NULL),
  ('crop_tag', 'hawthorn',   2, 'Ornamental Rosaceae host'),
  ('crop_tag', 'ornamentals', 1, 'Cotoneaster, pyracantha')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'fire-blight'
ON CONFLICT DO NOTHING;

-- ---- rose-black-spot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'rose',        3, 'Diplocarpon rosae; black spots cause defoliation'),
  ('crop_tag', 'ornamentals', 1, NULL),
  ('crop_tag', 'flowers',     1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'rose-black-spot'
ON CONFLICT DO NOTHING;

-- ---- botrytis-grey-mould ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'strawberry',       3, 'Grey fuzzy mould on fruit'),
  ('crop_tag', 'grape',            2, 'Botrytis cinerea; noble rot in wine, destructive otherwise'),
  ('crop_tag', 'tomato',           2, 'Ghost spot on fruit, stem lesions'),
  ('crop_tag', 'greenhouse_crops', 2, 'High humidity promotes spore germination'),
  ('crop_tag', 'flowers',          2, 'Affects many flowers: peonies, roses'),
  ('crop_tag', 'lettuce',          1, NULL),
  ('crop_tag', 'beans',            1, NULL),
  ('crop_tag', 'courgette',        1, NULL),
  ('crop_tag', 'raspberry',        2, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('crop_tag', 'rose',             1, NULL),
  ('feature_tag', 'greenhouse',    2, 'Poor ventilation worsens Botrytis')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'botrytis-grey-mould'
ON CONFLICT DO NOTHING;

-- ---- clubroot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'brassicas',        3, 'Plasmodiophora brassicae; swollen distorted roots'),
  ('crop_tag', 'cabbage',          3, NULL),
  ('crop_tag', 'cauliflower',      3, NULL),
  ('crop_tag', 'broccoli',         3, NULL),
  ('crop_tag', 'kale',             2, NULL),
  ('crop_tag', 'brussels_sprouts', 2, NULL),
  ('crop_tag', 'turnip',           2, NULL),
  ('crop_tag', 'radish',           1, NULL),
  ('crop_tag', 'swede',            2, NULL),
  ('crop_tag', 'pak_choi',         1, NULL),
  ('crop_tag', 'rocket',           1, NULL),
  ('crop_tag', 'mustard',          1, NULL),
  ('feature_tag', 'raised_beds',   1, 'Growing in raised beds with clean soil reduces risk')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'clubroot'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- OOMYCETE DISEASES
-- =============================================================================

-- ---- phytophthora ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'potato',      3, 'Phytophthora infestans (shared with late-blight)'),
  ('crop_tag', 'tomato',      2, NULL),
  ('crop_tag', 'fruit_tree',  2, 'Phytophthora root rot on various fruit trees'),
  ('crop_tag', 'apple',       1, NULL),
  ('crop_tag', 'ornamentals', 2, 'Rhododendron Phytophthora dieback'),
  ('crop_tag', 'raspberry',   1, 'Phytophthora root rot'),
  ('crop_tag', 'strawberry',  1, NULL),
  ('crop_tag', 'pepper',      1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'phytophthora'
ON CONFLICT DO NOTHING;

-- ---- pythium ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'greenhouse_crops', 2, 'Seedling root and collar rot'),
  ('crop_tag', 'lettuce',          1, NULL),
  ('crop_tag', 'tomato',           1, NULL),
  ('crop_tag', 'pepper',           1, NULL),
  ('crop_tag', 'brassicas',        1, NULL),
  ('crop_tag', 'beans',            1, NULL),
  ('crop_tag', 'pea',              1, NULL),
  ('crop_tag', 'houseplants',      1, NULL),
  ('feature_tag', 'greenhouse',    2, 'Waterlogged seed trays'),
  ('feature_tag', 'cold_frame',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'pythium'
ON CONFLICT DO NOTHING;

-- ---- peronospora ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'brassicas',    2, 'Peronospora parasitica on brassicas'),
  ('crop_tag', 'cabbage',      1, NULL),
  ('crop_tag', 'onion_family', 2, 'Peronospora destructor on onions'),
  ('crop_tag', 'onion',        2, NULL),
  ('crop_tag', 'lettuce',      2, 'Bremia lactucae overlap'),
  ('crop_tag', 'spinach',      2, 'Peronospora farinosa on spinach'),
  ('crop_tag', 'leafy_greens', 1, NULL),
  ('crop_tag', 'beetroot',     1, NULL),
  ('crop_tag', 'pea',          1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'peronospora'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- BACTERIAL DISEASES
-- =============================================================================

-- ---- bacterial-canker ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'cherry',     3, 'Pseudomonas syringae pv. morsprunorum'),
  ('crop_tag', 'plum',       2, 'Oozing cankers on branches'),
  ('crop_tag', 'fruit_tree', 2, NULL),
  ('crop_tag', 'orchard',    1, NULL),
  ('crop_tag', 'peach',      1, NULL),
  ('crop_tag', 'apricot',    1, NULL),
  ('crop_tag', 'apple',      1, 'Apple canker (Neonectria)')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'bacterial-canker'
ON CONFLICT DO NOTHING;

-- ---- bacterial-leaf-spot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'pepper',           2, 'Xanthomonas campestris pv. vesicatoria'),
  ('crop_tag', 'tomato',           2, 'Bacterial speck and spot'),
  ('crop_tag', 'greenhouse_crops', 1, NULL),
  ('crop_tag', 'lettuce',          1, NULL),
  ('crop_tag', 'brassicas',        1, 'Xanthomonas campestris pv. campestris'),
  ('crop_tag', 'beans',            1, 'Halo blight'),
  ('feature_tag', 'greenhouse',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'bacterial-leaf-spot'
ON CONFLICT DO NOTHING;

-- ---- crown-gall ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'fruit_tree',  2, 'Agrobacterium tumefaciens'),
  ('crop_tag', 'apple',       1, NULL),
  ('crop_tag', 'pear',        1, NULL),
  ('crop_tag', 'cherry',      1, NULL),
  ('crop_tag', 'rose',        2, 'Galls on roots and crown'),
  ('crop_tag', 'ornamentals', 1, NULL),
  ('crop_tag', 'grape',       1, NULL),
  ('crop_tag', 'raspberry',   1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'crown-gall'
ON CONFLICT DO NOTHING;

-- ---- soft-rot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'potato',      3, 'Pectobacterium spp.; mushy tubers in store'),
  ('crop_tag', 'carrot',      2, 'Bacterial soft rot in wet storage'),
  ('crop_tag', 'onion_family', 2, 'Neck rot / base rot'),
  ('crop_tag', 'onion',       2, NULL),
  ('crop_tag', 'garlic',      1, NULL),
  ('crop_tag', 'leek',        1, NULL),
  ('crop_tag', 'brassicas',   1, 'Internal browning / wet rot'),
  ('crop_tag', 'cabbage',     1, NULL),
  ('crop_tag', 'cauliflower', 1, NULL),
  ('crop_tag', 'celery',      1, NULL),
  ('crop_tag', 'lettuce',     1, NULL),
  ('crop_tag', 'turnip',      1, NULL),
  ('crop_tag', 'parsnip',     1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'soft-rot'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ABIOTIC DISORDERS
-- =============================================================================

-- ---- blossom-end-rot ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',    3, 'Calcium deficiency from irregular watering'),
  ('crop_tag', 'pepper',    2, NULL),
  ('crop_tag', 'courgette', 1, NULL),
  ('crop_tag', 'cucumber',  1, NULL),
  ('crop_tag', 'aubergine', 1, NULL),
  ('crop_tag', 'melon',     1, NULL),
  ('crop_tag', 'squash',    1, NULL),
  ('feature_tag', 'greenhouse', 1, 'Container growing worsens irregular watering')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'blossom-end-rot'
ON CONFLICT DO NOTHING;

-- ---- sunscald-leaf-scorch ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           2, 'Exposed fruit scalds in intense sun'),
  ('crop_tag', 'pepper',           2, NULL),
  ('crop_tag', 'greenhouse_crops', 2, 'Glass intensifies heat'),
  ('crop_tag', 'tender_plants',    2, NULL),
  ('crop_tag', 'lettuce',          1, 'Tip burn from heat'),
  ('crop_tag', 'aubergine',        1, NULL),
  ('crop_tag', 'houseplants',      1, 'Sudden move to full sun'),
  ('crop_tag', 'cucumber',         1, NULL),
  ('feature_tag', 'greenhouse',    2, 'Glasshouse magnifies solar radiation')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'sunscald-leaf-scorch'
ON CONFLICT DO NOTHING;

-- ---- frost-damage ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tender_plants',    3, 'Cannot survive frost'),
  ('crop_tag', 'tomato',           3, 'Killed by frost; no recovery'),
  ('crop_tag', 'greenhouse_crops', 2, 'At risk if heater fails / unheated greenhouse'),
  ('crop_tag', 'beans',            2, 'French and runner beans frost-tender'),
  ('crop_tag', 'courgette',        2, NULL),
  ('crop_tag', 'cucumber',         2, NULL),
  ('crop_tag', 'pepper',           2, NULL),
  ('crop_tag', 'aubergine',        2, NULL),
  ('crop_tag', 'potato',           2, 'Late frost blackens haulms'),
  ('crop_tag', 'basil',            2, NULL),
  ('crop_tag', 'flowers',          1, 'Half-hardy annuals'),
  ('crop_tag', 'fruit_tree',       1, 'Blossom frost damage reduces yield'),
  ('crop_tag', 'strawberry',       1, 'Flower frost damage'),
  ('crop_tag', 'houseplants',      1, 'If left outdoors'),
  ('feature_tag', 'greenhouse',    1, 'Unheated greenhouse offers limited frost protection'),
  ('feature_tag', 'cold_frame',    1, 'Provides some frost protection')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'frost-damage'
ON CONFLICT DO NOTHING;

-- ---- heat-stress ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',      3, 'Bolts readily in heat'),
  ('crop_tag', 'leafy_greens', 2, NULL),
  ('crop_tag', 'spinach',      3, 'Quick to bolt'),
  ('crop_tag', 'pea',          2, 'Stops flowering above 25C'),
  ('crop_tag', 'beans',        1, 'Flower drop in extreme heat'),
  ('crop_tag', 'radish',       1, 'Bolts and turns woody'),
  ('crop_tag', 'broccoli',     1, NULL),
  ('crop_tag', 'cauliflower',  1, 'Curd quality declines'),
  ('crop_tag', 'brassicas',    1, NULL),
  ('crop_tag', 'potato',       1, 'Tuber growth slows in heat'),
  ('crop_tag', 'celery',       1, NULL),
  ('feature_tag', 'greenhouse', 2, 'Overheating risk in summer')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'heat-stress'
ON CONFLICT DO NOTHING;

-- ---- overwatering-poor-drainage ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'houseplants',      3, 'Most common cause of houseplant death'),
  ('crop_tag', 'succulents',       2, 'Rot quickly in waterlogged soil'),
  ('crop_tag', 'greenhouse_crops', 1, NULL),
  ('crop_tag', 'herbs',            1, 'Mediterranean herbs prefer dry'),
  ('crop_tag', 'rosemary',         2, 'Hates wet feet'),
  ('crop_tag', 'lavender',         2, NULL),
  ('crop_tag', 'tomato',           1, NULL),
  ('crop_tag', 'pepper',           1, NULL),
  ('crop_tag', 'ornamentals',      1, NULL),
  ('feature_tag', 'greenhouse',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'overwatering-poor-drainage'
ON CONFLICT DO NOTHING;

-- ---- wind-scorch ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tender_plants',    2, 'Thin leaves tear and desiccate'),
  ('crop_tag', 'beans',            2, 'Runner beans on supports are wind-exposed'),
  ('crop_tag', 'greenhouse_crops', 1, 'Hardening off shock'),
  ('crop_tag', 'tomato',           1, NULL),
  ('crop_tag', 'courgette',        1, 'Large leaves act as sails'),
  ('crop_tag', 'cucumber',         1, NULL),
  ('crop_tag', 'pea',              1, NULL),
  ('crop_tag', 'fruit_tree',       1, 'Wind rock damages roots'),
  ('crop_tag', 'flowers',          1, NULL),
  ('crop_tag', 'houseplants',      1, 'If placed outdoors in wind')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'wind-scorch'
ON CONFLICT DO NOTHING;

-- ---- drought-stress ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',      3, 'Wilts and bolts quickly without water'),
  ('crop_tag', 'leafy_greens', 2, NULL),
  ('crop_tag', 'spinach',      2, NULL),
  ('crop_tag', 'beans',        2, 'Flower and pod drop'),
  ('crop_tag', 'runner_bean',  2, NULL),
  ('crop_tag', 'pea',          2, NULL),
  ('crop_tag', 'cucumber',     2, 'Bitter fruit if water-stressed'),
  ('crop_tag', 'courgette',    2, NULL),
  ('crop_tag', 'celery',       2, 'Becomes stringy'),
  ('crop_tag', 'potato',       1, 'Hollow heart from uneven watering'),
  ('crop_tag', 'tomato',       1, 'Fruit splitting after drought then rain'),
  ('crop_tag', 'strawberry',   1, NULL),
  ('crop_tag', 'raspberry',    1, NULL),
  ('feature_tag', 'raised_beds', 1, 'Raised beds dry out faster')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'drought-stress'
ON CONFLICT DO NOTHING;

-- ---- waterlogging ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'carrot',      2, 'Roots rot and fork in waterlogged soil'),
  ('crop_tag', 'parsnip',     2, NULL),
  ('crop_tag', 'onion_family', 2, 'Bulb rot risk'),
  ('crop_tag', 'onion',       2, NULL),
  ('crop_tag', 'garlic',      2, NULL),
  ('crop_tag', 'potato',      2, 'Tuber rot'),
  ('crop_tag', 'beetroot',    1, NULL),
  ('crop_tag', 'turnip',      1, NULL),
  ('crop_tag', 'radish',      1, NULL),
  ('crop_tag', 'beans',       1, NULL),
  ('crop_tag', 'pea',         1, 'Root rot in wet soil'),
  ('crop_tag', 'lettuce',     1, NULL),
  ('crop_tag', 'strawberry',  1, NULL),
  ('feature_tag', 'raised_beds', 1, 'Raised beds help avoid waterlogging')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'waterlogging'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- NUTRIENT DEFICIENCIES
-- =============================================================================

-- ---- nitrogen-deficiency ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'tomato',           2, 'Heavy feeder; yellowing lower leaves'),
  ('crop_tag', 'brassicas',        2, 'Brassicas are nitrogen-hungry'),
  ('crop_tag', 'cabbage',          2, NULL),
  ('crop_tag', 'cauliflower',      2, NULL),
  ('crop_tag', 'broccoli',         1, NULL),
  ('crop_tag', 'kale',             1, NULL),
  ('crop_tag', 'leafy_greens',     2, 'Leaf crops need nitrogen for growth'),
  ('crop_tag', 'lettuce',          2, NULL),
  ('crop_tag', 'spinach',          2, NULL),
  ('crop_tag', 'chard',            1, NULL),
  ('crop_tag', 'beans',            1, 'Legumes fix N but still need starter N'),
  ('crop_tag', 'courgette',        1, NULL),
  ('crop_tag', 'sweetcorn',        2, 'Heavy nitrogen feeder'),
  ('crop_tag', 'pepper',           1, NULL),
  ('crop_tag', 'potato',           1, NULL),
  ('crop_tag', 'greenhouse_crops', 1, 'Container crops exhaust N quickly')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'nitrogen-deficiency'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- OTHER / MULTI-CATEGORY
-- =============================================================================

-- ---- nematodes ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'potato',    3, 'Potato cyst nematode (Globodera spp.)'),
  ('crop_tag', 'tomato',    2, 'Root-knot nematode on tomatoes'),
  ('crop_tag', 'carrot',    2, NULL),
  ('crop_tag', 'parsnip',   1, NULL),
  ('crop_tag', 'beetroot',  1, 'Beet cyst nematode'),
  ('crop_tag', 'onion',     1, 'Stem and bulb nematode'),
  ('crop_tag', 'onion_family', 1, NULL),
  ('crop_tag', 'strawberry', 1, NULL),
  ('crop_tag', 'beans',     1, NULL),
  ('crop_tag', 'pea',       1, NULL),
  ('crop_tag', 'pepper',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'nematodes'
ON CONFLICT DO NOTHING;

-- ---- bolting ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'lettuce',      3, 'Bolts quickly in long hot days'),
  ('crop_tag', 'spinach',      3, 'Very bolt-prone'),
  ('crop_tag', 'leafy_greens', 2, NULL),
  ('crop_tag', 'rocket',       2, 'Bolts in summer heat'),
  ('crop_tag', 'beetroot',     2, 'Bolts if sown too early'),
  ('crop_tag', 'radish',       2, NULL),
  ('crop_tag', 'coriander',    2, 'Notoriously bolt-prone'),
  ('crop_tag', 'celery',       1, NULL),
  ('crop_tag', 'chard',        1, NULL),
  ('crop_tag', 'onion',        1, 'Bolts from cold snap after warm period'),
  ('crop_tag', 'garlic',       1, NULL),
  ('crop_tag', 'pak_choi',     2, NULL),
  ('crop_tag', 'turnip',       1, NULL),
  ('crop_tag', 'broccoli',     1, 'Premature heading / buttoning')
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'bolting'
ON CONFLICT DO NOTHING;

-- ---- bird-damage ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'fruit_tree',      2, 'Bullfinches strip buds; pigeons eat fruit'),
  ('crop_tag', 'cherry',          3, 'Cherries are a primary bird target'),
  ('crop_tag', 'strawberry',      3, 'Blackbirds love ripe strawberries'),
  ('crop_tag', 'raspberry',       2, NULL),
  ('crop_tag', 'blueberry',       2, NULL),
  ('crop_tag', 'gooseberry',      1, NULL),
  ('crop_tag', 'grape',           1, NULL),
  ('crop_tag', 'pea',             2, 'Pigeons eat seedlings and pods'),
  ('crop_tag', 'beans',           1, 'Jays and pigeons pull seedlings'),
  ('crop_tag', 'broad_bean',      1, NULL),
  ('crop_tag', 'brassicas',       2, 'Pigeons strip brassica leaves'),
  ('crop_tag', 'cabbage',         2, NULL),
  ('crop_tag', 'broccoli',        1, NULL),
  ('crop_tag', 'lettuce',         1, NULL),
  ('crop_tag', 'sweetcorn',       1, 'Seed theft at sowing'),
  ('crop_tag', 'apple',           1, NULL),
  ('crop_tag', 'orchard',         1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'bird-damage'
ON CONFLICT DO NOTHING;

-- ---- deer-browsing ----
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength, notes)
SELECT gt.id, v.host_kind::garden_host_kind, v.host_key, v.host_strength, v.notes
FROM garden_threat gt
CROSS JOIN (VALUES
  ('crop_tag', 'ornamentals',  2, 'Rose, hosta, tulip all heavily browsed'),
  ('crop_tag', 'rose',         3, 'Deer relish rose buds and shoots'),
  ('crop_tag', 'hosta',        2, NULL),
  ('crop_tag', 'flowers',      2, NULL),
  ('crop_tag', 'fruit_tree',   2, 'Bark stripping and shoot browsing'),
  ('crop_tag', 'apple',        1, NULL),
  ('crop_tag', 'pear',         1, NULL),
  ('crop_tag', 'beans',        2, 'Runner and french beans browsed'),
  ('crop_tag', 'pea',          1, NULL),
  ('crop_tag', 'lettuce',      1, NULL),
  ('crop_tag', 'brassicas',    1, NULL),
  ('crop_tag', 'strawberry',   1, NULL),
  ('crop_tag', 'raspberry',    1, NULL),
  ('crop_tag', 'blueberry',    1, NULL)
) AS v(host_kind, host_key, host_strength, notes)
WHERE gt.slug = 'deer-browsing'
ON CONFLICT DO NOTHING;

COMMIT;
