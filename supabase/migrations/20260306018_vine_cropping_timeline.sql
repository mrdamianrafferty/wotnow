-- Migration: Add cropping timeline data for vine species
-- Created: 2026-03-06

BEGIN;

-- Grape vine (Vitis vinifera)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Grape vines are usually trained hard in their first two years to establish a strong framework, with any fruit removed to direct energy into root and wood growth. A small crop is typical from year three, with full production from year five onwards. Dessert grapes in cooler climates do best against a south-facing wall or in a greenhouse. Wine grapes outdoors need a sheltered, sunny site. Vines are long-lived — a well-maintained plant can crop heavily for decades.'
WHERE slug = 'grape-vine';

-- Common hop (Humulus lupulus)
UPDATE plant_species SET
  years_to_first_crop = 1,
  years_to_full_production = 3,
  cropping_timeline_note = 'Hops are herbaceous perennial climbers that die back to the ground each winter and put on astonishing growth each spring — up to 6 metres in a season. A newly planted rhizome often produces a light crop of cones in its very first year. By year three the root system is fully established and yields increase substantially. Female plants produce the cones used in brewing; you only need a male if you want seeds. They are vigorous and easy once established, though watch out for aphids and downy mildew in damp summers.'
WHERE slug = 'hop-common';

-- Kiwi - common (Actinidia deliciosa)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 7,
  cropping_timeline_note = 'Kiwi vines are dioecious — you need both a male and female plant for fruit, with one male pollinating up to eight females. Grafted plants from a nursery usually fruit from their third or fourth year, but they take time to build up to full production. They need a long, warm growing season to ripen fruit properly, so in cooler climates a sheltered south-facing wall or polytunnel helps enormously. The vines are vigorous and need sturdy support — a mature plant can produce 50kg or more of fruit per year once established.'
WHERE slug = 'kiwi-common';

-- Hardy kiwi (Actinidia arguta)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Hardy kiwi produces smaller, smooth-skinned fruit that can be eaten whole — no peeling needed. Like the common kiwi, you need male and female plants for pollination (one male covers several females). Grafted plants typically start fruiting in their third year and reach full production by year six. They are significantly hardier than common kiwi and will crop reliably outdoors in most of the UK and Ireland. The vines are extremely vigorous and need a strong support system.'
WHERE slug = 'kiwi-hardy';

-- Passionflower (Passiflora caerulea)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 4,
  cropping_timeline_note = 'Passiflora caerulea is the hardiest passionflower and will survive outdoors in milder parts of the UK and Ireland, though it fruits much more reliably against a warm, sunny wall. The orange egg-shaped fruits appear after the spectacular flowers and are technically edible but bland compared to the tropical passionfruit (P. edulis). A young plant from a nursery can flower and fruit in its second year. In cooler climates, treat the fruit as a bonus rather than the main attraction — the flowers are the real star.'
WHERE slug = 'passionflower';

-- Schisandra berry (Schisandra chinensis)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 7,
  cropping_timeline_note = 'Schisandra is a twining woodland-edge vine that takes a few years to settle in before it starts to fruit. Plants are usually dioecious, so you need both male and female for the distinctive red berry clusters. Expect first fruit around year four from nursery plants, with full production building gradually. The berries are known as "five-flavour berry" in Chinese medicine. Schisandra prefers a sheltered spot with dappled shade and humus-rich, moist soil — think forest edge conditions.'
WHERE slug = 'schisandra';

-- Chocolate vine (Akebia quinata)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Akebia is a vigorous semi-evergreen climber grown mainly for its fragrant chocolate-scented flowers. It can produce unusual sausage-shaped purple fruit, but only if two genetically distinct plants are grown together for cross-pollination — a single plant or divisions of the same clone will not fruit. Even with cross-pollination, fruiting is unreliable in cooler climates. In warmer regions the vine can become invasive. The fruit pulp is edible with a mild, sweet flavour, and the thick rind is sometimes stuffed and fried in Japanese cuisine.'
WHERE slug = 'akebia';

COMMIT;
