-- Fix factual issues flagged by horticulture expert review
BEGIN;

-- Align hardy kiwi entries (vine=6, fruit-tree=7 → both to 6)
UPDATE plant_species SET years_to_full_production = 6
WHERE slug = 'fruit-hardy-kiwi';

-- Black Lace elder: add raw berry warning (missing from original)
UPDATE plant_species SET
  cropping_timeline_note = 'Black Lace elder is primarily grown for its dramatic dark foliage and pink flowers, but it produces perfectly usable berries for cordial, wine, and preserves — the same as common elder. Expect flowers and berries from the second year onwards. Do not eat the berries raw as they need cooking to break down mildly toxic compounds. The flowers are safe to use fresh for cordials and fritters.'
WHERE slug = 'fruit-elder-black-lace';

-- Grape vine: add variety guidance and rootstock info
UPDATE plant_species SET
  cropping_timeline_note = 'Grape vines are usually trained hard in their first two years to establish a strong framework, with any fruit removed to direct energy into root and wood growth. A small crop is typical from year three, with full production from year five onwards. Most dessert and wine grapes are self-fertile, so a single vine will crop. In cooler climates, reliable outdoor varieties include Boskoop Glory, Regent, and Solaris; Muscat of Alexandria does well under glass. If buying a vine, check whether it is on its own roots or grafted onto phylloxera-resistant rootstock — own-rooted vines are vulnerable in affected soils. A well-maintained vine can crop heavily for decades.'
WHERE slug = 'grape-vine';

-- Black walnut: clarify juglone source
UPDATE plant_species SET
  cropping_timeline_note = 'Black walnut is a magnificent tree but demands serious patience and plenty of space. Grafted selections usually start producing after seven to eight years, with full production taking fifteen years or more. The tree produces juglone throughout its leaves, bark, roots, and nut hulls, which leaches into the soil and inhibits many other plants — tomatoes, apples, and blueberries are particularly sensitive. Plan the planting site carefully, as this is a very long-term commitment. The nuts are prized for their intense, distinctive flavour.'
WHERE slug = 'fruit-black-walnut';

-- Olive: adjust timeline for grafted trees
UPDATE plant_species SET
  years_to_full_production = 8,
  cropping_timeline_note = 'Olives are slow starters but extraordinarily long-lived — some trees in the Mediterranean are over a thousand years old. Grafted trees from nursery stock may produce a light first crop after about five years, with reasonable production from seven to eight years. In cooler climates, a sheltered south-facing wall and excellent drainage are essential. Self-fertile varieties are available, but a second tree improves yield. In the UK and Ireland, olives often survive outdoors in milder areas but fruiting is unreliable — a conservatory or polytunnel gives much better results.'
WHERE slug = 'fruit-olive';

-- Fig: explain planting pit more clearly
UPDATE plant_species SET
  cropping_timeline_note = 'Figs are among the quickest fruit trees to crop — a well-placed tree against a sunny wall can fruit in its second or third year. Restricting the roots is the key to good fruiting: dig a 60cm square pit lined with paving slabs or sink a large container into the ground, which forces the tree to put energy into fruit rather than excessive leafy growth. In cooler climates, the embryo figs formed in autumn overwinter and ripen the following summer. Figs are self-fertile, so a single tree is all you need.'
WHERE slug = 'fruit-fig';

-- Peach: add rootstock guidance for consistency with plum/cherry
UPDATE plant_species SET
  cropping_timeline_note = 'Grafted peaches on semi-dwarfing rootstock like St Julien A or Montclair reach a manageable 3-4 metres and usually start cropping in their third year. A south-facing wall is ideal in cooler climates, as the early blossom needs protection from late frosts. Peach leaf curl is the main disease worry — covering the tree from late autumn to mid-spring with a rain shelter is the most effective organic prevention. Peaches are self-fertile, so a single tree will crop well. Hand-pollinate early flowers with a soft paintbrush if pollinators are scarce.'
WHERE slug = 'fruit-peach';

-- Nectarine: add rootstock guidance
UPDATE plant_species SET
  cropping_timeline_note = 'Nectarines are essentially smooth-skinned peaches and share the same rootstock and growing requirements. On semi-dwarfing rootstock like St Julien A, expect first fruit in the third year and full cropping by year five. They need a warm, sheltered spot — a south-facing wall is ideal. Like peaches, they are self-fertile and susceptible to peach leaf curl, so a rain shelter from late autumn to mid-spring makes a big difference. Nectarines are slightly less hardy than peaches, so in marginal areas a fan-trained tree under a lean-to shelter works well.'
WHERE slug = 'fruit-nectarine';

-- Apricot: add rootstock guidance
UPDATE plant_species SET
  cropping_timeline_note = 'Grafted apricots on St Julien A or Torinel rootstock are fairly quick off the mark, often producing a first crop in their third or fourth year. The real challenge in cooler climates is not the wait but the very early blossom — apricots flower before most other fruit trees and are vulnerable to late frosts, so a south-facing wall or fleece protection makes all the difference. They are self-fertile, so a single tree will crop, and once established they can be wonderfully productive.'
WHERE slug = 'fruit-apricot';

COMMIT;
