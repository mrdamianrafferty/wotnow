-- Migration: Add cropping timeline data for fruit and nut tree species
-- Created: 2026-03-06

BEGIN;

-- 1. Add new columns
ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS years_to_first_crop SMALLINT;
ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS years_to_full_production SMALLINT;
ALTER TABLE plant_species ADD COLUMN IF NOT EXISTS cropping_timeline_note TEXT;

-- 2. Populate cropping timeline data for all 50 fruit-tree species

-- Apple (Malus domestica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Most grafted apples on semi-dwarfing rootstock like MM106 start bearing within three to four years. Dwarf rootstocks like M9 can fruit even sooner but need permanent staking. Pick off fruitlets in the first year or two to help the tree build strength — it really does pay off with heavier crops later. Some varieties like Bramley and Blenheim Orange are biennial bearers, so expect a bumper crop every other year. You will need at least two different varieties for cross-pollination, or a nearby crab apple will do the job.'
WHERE scientific_name = 'Malus domestica';

-- Apricot (Prunus armeniaca)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Grafted apricots are fairly quick off the mark, often producing a first crop in their third or fourth year. The real challenge in cooler climates is not the wait but the early blossom — apricots flower very early and are vulnerable to late frosts, so a south-facing wall or fleece protection makes all the difference. They are self-fertile, so a single tree will crop, and once established they can be wonderfully productive.'
WHERE scientific_name = 'Prunus armeniaca';

-- Aronia / Chokeberry (Aronia melanocarpa)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 4,
  cropping_timeline_note = 'Aronia is more shrub than tree and gets going quickly — expect your first berries in the second year after planting. By year four you will have heavy, reliable crops of those intensely dark berries. They are self-fertile, utterly hardy, and almost disease-free. The berries are too astringent for most people to eat raw, but they make superb juice, jam, and wine. Brilliant autumn colour is a bonus.'
WHERE scientific_name = 'Aronia melanocarpa';

-- Autumn olive (Elaeagnus umbellata)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Autumn olive is vigorous and starts fruiting within three years, sometimes sooner. The small speckled berries are tart-sweet and very high in lycopene. It fixes its own nitrogen so thrives in poor soil without feeding. Be aware this species is considered invasive in parts of North America, so check local regulations before planting. You will get better crops with two plants for cross-pollination, though some cultivars set fruit alone.'
WHERE scientific_name = 'Elaeagnus umbellata';

-- Black walnut (Juglans nigra)
UPDATE plant_species SET
  years_to_first_crop = 7,
  years_to_full_production = 15,
  cropping_timeline_note = 'Black walnuts demand real patience. Even grafted selections typically take seven to ten years before meaningful nut production, and seed-grown trees can take twelve or more. The nuts have an intensely rich, distinctive flavour quite different from Persian walnuts but are notoriously difficult to crack. Be mindful of the juglone these trees exude from their roots — it inhibits many plants within the drip line, so plan your planting accordingly. Once mature, a single tree can produce huge quantities of nuts for well over a century.'
WHERE scientific_name = 'Juglans nigra';

-- Cherimoya (Annona cherimola)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 7,
  cropping_timeline_note = 'Grafted cherimoyas begin fruiting around year three to four, which is quite respectable for such an exotic tree. The unusual flowers need help with pollination — in the absence of their native beetle pollinators, hand-pollination with a small brush dramatically improves fruit set. They prefer frost-free subtropical conditions but tolerate light frost once established. The custard-like fruit is worth every bit of effort; Mark Twain called it the most delicious fruit known to man.'
WHERE scientific_name = 'Annona cherimola';

-- Cherry, sour (Prunus cerasus)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Sour cherries are wonderfully obliging — most grafted trees on Gisela or Colt rootstock produce their first crop within three years. Unlike sweet cherries, they are reliably self-fertile so a single tree will crop well. They also tolerate a north-facing wall, which is unusual for fruit trees. Morello types are especially easy-going. The fruit is too tart for fresh eating but makes the finest cherry pie and preserves you will ever taste.'
WHERE scientific_name = 'Prunus cerasus';

-- Cherry, sweet (Prunus avium)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 7,
  cropping_timeline_note = 'Sweet cherries on modern dwarfing rootstock like Gisela 5 can produce a first crop in their fourth year, a good improvement on older rootstocks that took longer. Most sweet cherries need a compatible pollination partner, so check pollination groups before buying — or choose a self-fertile variety like Stella or Sunburst. Birds are your main rival for the harvest, so netting is almost essential once fruiting starts. A well-grown tree in full crop is one of the great sights of the fruit garden.'
WHERE scientific_name = 'Prunus avium';

-- Chinese hawthorn (Crataegus pinnatifida)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Chinese hawthorn is an underappreciated fruiting tree that begins bearing within three to four years of planting. The large, bright red fruits are much bigger than our native hawthorn haws and have a pleasant tart-apple flavour. They are the fruit used in traditional Chinese tanghulu (candied fruit on sticks) and hawthorn rolls. The tree is extremely hardy and undemanding. Cross-pollination from a second tree improves fruit set noticeably.'
WHERE scientific_name = 'Crataegus pinnatifida';

-- Cornelian cherry (Cornus mas)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 8,
  cropping_timeline_note = 'Cornelian cherry is a slow-and-steady sort of plant. Grafted cultivars begin producing their olive-shaped red fruits around year four, but seed-grown plants can take seven or more years. The cheerful yellow flowers appear very early in spring, often before forsythia, providing vital early pollen for bees. The ripe fruits taste like a tart, complex cherry and make extraordinary preserves and syrups. Plant two different cultivars for better cross-pollination and heavier crops.'
WHERE scientific_name = 'Cornus mas';

-- Damson (Prunus domestica subsp. insititia)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Damsons are tough, reliable, and start fruiting within three to four years on St Julien A rootstock. Most damsons are self-fertile, so a single tree will crop well — Merryweather and Farleigh Damson are good choices. They are hardier than plums and tolerate more exposed sites and poorer soil. The fruit is too astringent to eat raw for most tastes, but damson gin, damson cheese, and damson jam are some of the finest things to come out of a garden. Once established, they crop heavily and consistently.'
WHERE scientific_name = 'Prunus domestica subsp. insititia';

-- Elder (Sambucus nigra)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 3,
  cropping_timeline_note = 'Elder is more of a large shrub than a true tree and is one of the fastest to fruit — you can expect flowers and berries within two years of planting, often in the first year from a good-sized plant. It grows vigorously in almost any soil and tolerates considerable neglect. The fragrant flowers make lovely cordial and fritters, while the berries are excellent for wine, syrup, and immune-boosting remedies. Do not eat the berries raw as they need cooking. Hard pruning in winter keeps it compact and productive.'
WHERE scientific_name = 'Sambucus nigra' AND slug = 'fruit-elder';

-- Black Lace elder (Sambucus nigra)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 3,
  cropping_timeline_note = 'Black Lace elder fruits just as quickly as the common elder — often within two years — and produces the same edible flowers and berries, but with stunning dark purple, finely cut foliage and pink flower heads that make it a real ornamental feature. The berries are slightly smaller than those of vigorous wild-type elders, but perfectly good for cordial and syrup. Prune hard each spring for the best foliage colour and to keep the plant compact and bushy.'
WHERE scientific_name = 'Sambucus nigra' AND slug = 'fruit-elder-black-lace';

-- Feijoa / Pineapple guava (Acca sellowiana)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Feijoas start producing their aromatic, pineapple-scented fruit about three to four years after planting. While some cultivars are partly self-fertile, you will get significantly better fruit set by planting two different varieties for cross-pollination. The edible flower petals are a bonus — sweet and slightly spicy, lovely in salads. In cooler climates they do best against a warm, sheltered wall. The fruit drops when ripe; just pick it up off the ground.'
WHERE scientific_name = 'Acca sellowiana';

-- Fig (Ficus carica)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 5,
  cropping_timeline_note = 'Figs are among the quickest fruit trees to crop — a well-placed tree against a sunny wall can fruit in its second or third year. Restricting the roots in a lined planting pit actually encourages fruiting rather than leafy growth. In cooler climates, the embryo figs formed in autumn overwinter on the branch tips and ripen the following summer, so avoid pruning off those precious shoot tips. Brown Turkey is the classic reliable choice for temperate gardens. Figs are self-fertile, so one tree is all you need.'
WHERE scientific_name = 'Ficus carica';

-- Greengage (Prunus domestica subsp. italica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Greengages on St Julien A rootstock begin bearing around year three to four. They have a reputation for being slightly less reliable croppers than common plums, partly because they flower early and are susceptible to frost damage. A sheltered, sunny spot makes a real difference. The flavour of a ripe greengage straight from the tree is extraordinary — honeyed and complex, far superior to anything you will find in a shop. Most varieties benefit from a pollination partner; Cambridge Gage is partially self-fertile.'
WHERE scientific_name = 'Prunus domestica subsp. italica';

-- Strawberry guava (Psidium cattleianum)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Strawberry guava is a quick and generous fruiter, often bearing within three years from a container-grown plant. The small, dark red fruits have a fragrant strawberry-guava flavour that is wonderful fresh or in jam. It is self-fertile and relatively compact, making it a good conservatory or greenhouse plant in cooler climates. In tropical and subtropical areas it can become invasive, so check local guidance. Remarkably pest-free compared to other tropical fruit.'
WHERE scientific_name = 'Psidium cattleianum';

-- Hackberry (Celtis occidentalis)
UPDATE plant_species SET
  years_to_first_crop = 5,
  years_to_full_production = 10,
  cropping_timeline_note = 'Hackberry is not typically grown as a fruit tree, but the small, sweet berries are perfectly edible with a date-like flavour and a crunchy seed. Trees begin bearing around five to six years from planting. They are incredibly tough — tolerant of drought, wind, poor soil, and urban pollution. The berries were an important food for Native Americans and are excellent wildlife forage. Crops are reliable once established, with no need for cross-pollination.'
WHERE scientific_name = 'Celtis occidentalis';

-- Hardy kiwi (Actinidia arguta)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 7,
  cropping_timeline_note = 'Hardy kiwi is a vigorous vine rather than a tree, and the wait for first fruit — typically three to four years — can feel longer because the plant puts enormous energy into vegetative growth first. You will need both a male and female plant for pollination (one male can serve up to eight females). The smooth-skinned, grape-sized fruit is sweeter and more aromatic than supermarket kiwifruit. Provide a very sturdy support structure; these vines are immensely powerful and long-lived. Issai is a self-fertile cultivar if space is limited.'
WHERE scientific_name = 'Actinidia arguta';

-- Hazelnut / Filbert (Corylus avellana)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 7,
  cropping_timeline_note = 'Hazels are among the quickest nuts to crop, with grafted cultivars often producing a first handful of nuts within three to four years. They are wind-pollinated and you will need two different varieties that flower at the same time — the catkins need to overlap with the tiny red female flowers. Kentish Cob and Cosford are a classic pairing. Squirrels are your biggest challenge; they strip the nuts weeks before you think they are ready. Traditional coppicing or annual pruning of suckers keeps plants productive and manageable.'
WHERE scientific_name = 'Corylus avellana';

-- Honeyberry (Lonicera caerulea)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 4,
  cropping_timeline_note = 'Honeyberries are shrubby plants that fruit remarkably quickly — often producing a modest first crop within two years. The elongated blue berries ripen very early in the season, sometimes weeks before strawberries, filling a real gap in the fruit calendar. You absolutely must plant two different cultivars for cross-pollination as they are not self-fertile. The flavour varies by variety from blueberry-like to more complex and winey. Extremely cold-hardy, tolerating temperatures well below -30C, but late frosts can damage the early flowers.'
WHERE scientific_name = 'Lonicera caerulea';

-- Shipova (x Sorbopyrus auricularis)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 8,
  cropping_timeline_note = 'Shipova is a rare and fascinating intergeneric hybrid between pear and rowan. Grafted trees typically begin fruiting around year four to five. The small, yellowish fruits taste like a sweet, aromatic pear with a hint of rowan complexity — genuinely delightful eaten fresh. It is a beautiful ornamental tree as well, with white spring blossom and good autumn colour. Being uncommon, it is not always easy to source, but it is a wonderful conversation piece in a fruit collection. Largely self-fertile, though a nearby pear may improve fruit set.'
WHERE scientific_name = '× Sorbopyrus auricularis';

-- Jostaberry (Ribes x nidigrolaria)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 4,
  cropping_timeline_note = 'Jostaberry is a blackcurrant-gooseberry hybrid that fruits extremely quickly — often within two years, sometimes even in the first year from a strong plant. The large, dark berries have a flavour somewhere between the two parents, sweeter than blackcurrants and without the gooseberry thorns. As a shrubby plant rather than a true tree, it establishes fast and is very disease-resistant, shrugging off mildew and big bud mite that plague its parents. Self-fertile and incredibly low-maintenance; prune out older wood every few years and it keeps going.'
WHERE scientific_name = 'Ribes × nidigrolaria';

-- Juniper (Juniperus communis)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Juniper berries take an unusual two to three years to ripen on the plant, turning from green to that distinctive blue-black. Female plants begin producing cones (the "berries") within three to four years of planting, but you will need a male plant nearby for pollination as juniper is dioecious. The berries are the classic flavouring for gin, wonderful in game dishes, and have a long history in herbal medicine. Growth is slow and the plants are long-lived. Native juniper is increasingly rare in the wild, so growing your own supports conservation too.'
WHERE scientific_name = 'Juniperus communis';

-- Lemon (Citrus limon)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Grafted lemons typically produce their first fruit within three years, and a well-grown tree can be remarkably productive — fruiting nearly year-round in the right conditions. In cooler climates they make excellent conservatory or cool greenhouse plants; just bring them inside when temperatures drop below about 7C. They are self-fertile, so one tree is sufficient. Feed regularly with a citrus fertiliser from spring to autumn and do not let them sit in waterlogged compost. Meyer lemon is especially good for containers and slightly hardier than standard varieties.'
WHERE scientific_name = 'Citrus limon';

-- Lime (Citrus aurantiifolia)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Grafted limes begin fruiting around their third year and are self-fertile, so a single plant will crop. They are the most cold-sensitive of the common citrus and really need winter protection in anything less than a subtropical climate — a warm conservatory, heated greenhouse, or bringing pots indoors is essential. Kaffir lime (Citrus hystrix) is grown more for its leaves than fruit and is worth having alongside. Feed well during the growing season and watch for scale insects, which love citrus.'
WHERE scientific_name = 'Citrus aurantiifolia';

-- Loquat (Eriobotrya japonica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Grafted loquats can surprise you with fruit as early as their third year. Uniquely among fruit trees, loquats flower in autumn and ripen their fruit in late winter or early spring, so frost is the main enemy of the crop rather than the tree itself. The large, tropical-looking evergreen leaves make it an attractive ornamental even if it never fruits. In cooler climates, grow against a warm south-facing wall. Self-fertile, but cross-pollination improves fruit set. The sweet, apricot-like fruit is a genuine treat.'
WHERE scientific_name = 'Eriobotrya japonica';

-- Mandarin / tangerine (Citrus reticulata)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Grafted mandarins typically begin bearing around their third year and are self-fertile. They are slightly more cold-tolerant than lemons and limes, but still need frost protection in temperate climates — a conservatory or unheated greenhouse suits them well. The fragrant blossom is a delight in spring. Satsuma types are among the hardiest and easiest for beginners. Thin fruit clusters to improve size and sweetness; letting the tree carry every fruitlet leads to small, disappointing fruit. Feed with citrus fertiliser through the growing season.'
WHERE scientific_name = 'Citrus reticulata';

-- Mayhaw (Crataegus aestivalis)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 7,
  cropping_timeline_note = 'Mayhaw is a native North American hawthorn that produces small, cranberry-like fruit ripening in May — hence the name. Grafted trees begin bearing in their third to fourth year. The fruit is too tart to eat fresh but makes a beautifully coloured, tart jelly that is a traditional Southern delicacy. Mayhaws naturally grow in wet, boggy ground and tolerate poorly drained sites that would kill most fruit trees. Plant two different cultivars for reliable cross-pollination. They are extremely low-maintenance once established and essentially pest-free.'
WHERE scientific_name = 'Crataegus aestivalis';

-- Medlar (Mespilus germanica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Grafted medlars often produce a first crop within three to four years, which is not bad for such an unusual fruit. The fruit needs "bletting" — leaving it to soften after the first frost until the flesh turns brown and soft, almost like fruit butter. This puts some people off, but bletted medlar has a wonderful, complex flavour reminiscent of apple butter with spice. The tree itself is beautiful, with large white flowers, good autumn colour, and an attractive spreading habit. Self-fertile and largely trouble-free.'
WHERE scientific_name = 'Mespilus germanica';

-- Mirabelle plum (Prunus domestica subsp. syriaca)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Mirabelle plums start cropping within three to four years on St Julien A rootstock. These small, golden-yellow plums have an exquisite honeyed sweetness that is quite different from standard plums — they are the pride of Lorraine in France, where they are used in tarts, preserves, and the famous eau-de-vie. Most mirabelles are self-fertile, though a nearby pollinator can improve crops. They tend to produce heavily in good years and can benefit from thinning. A warm, sheltered position gives the best-flavoured fruit.'
WHERE scientific_name = 'Prunus domestica subsp. syriaca';

-- Rowan / Mountain ash (Sorbus aucuparia)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 7,
  cropping_timeline_note = 'Rowan is primarily valued as an ornamental and wildlife tree, but the berries are perfectly edible once cooked — raw berries contain parasorbic acid which causes stomach upset. Trees begin bearing their vivid orange-red berry clusters around year four. Rowan jelly, made with crab apples, is a classic accompaniment to game and lamb. Selected cultivars like Edulis have larger, sweeter berries. Extremely hardy and wind-tolerant, rowan thrives in exposed upland sites where other fruit trees would struggle. Self-fertile and largely trouble-free.'
WHERE scientific_name = 'Sorbus aucuparia';

-- Mulberry, black (Morus nigra)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 8,
  cropping_timeline_note = 'Black mulberries have a reputation for being slow to fruit, but grafted trees often begin bearing within four to five years — much sooner than the decade sometimes quoted for seedlings. The dark, intensely flavoured fruit is fragile and impossible to buy, which makes growing your own all the more rewarding. They stain everything they touch, so do not plant near paths or washing lines. Black mulberries are very long-lived — centuries, in fact — so you are planting for generations. Self-fertile, and the gnarled mature trees are magnificent.'
WHERE scientific_name = 'Morus nigra';

-- Mulberry, white (Morus alba)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'White mulberries fruit more quickly than their black cousins, often within three to four years from a grafted plant. The fruit is sweeter and milder than black mulberry, lacking that intense complexity, but still very pleasant fresh or dried. Historically grown to feed silkworms rather than people, which tells you something about the fruit. The tree is vigorous, fast-growing, and self-fertile. Some varieties are nearly seedless. The fruit is less staining than black mulberry, making it a more practical garden choice.'
WHERE scientific_name = 'Morus alba';

-- Nectarine (Prunus persica var. nucipersica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Nectarines fruit within three to four years from grafting, on a similar timeline to peaches. They are essentially smooth-skinned peaches and share the same cultural needs — a warm, sheltered spot and protection from peach leaf curl is essential. Fan-training against a south-facing wall is the classic approach in cooler climates. Self-fertile, so one tree is enough. Thin fruitlets to about 15cm apart for decent-sized fruit. The flavour of a home-grown, tree-ripened nectarine is incomparably better than anything from a supermarket.'
WHERE scientific_name = 'Prunus persica var. nucipersica';

-- Olive (Olea europaea)
UPDATE plant_species SET
  years_to_first_crop = 5,
  years_to_full_production = 10,
  cropping_timeline_note = 'Olives require patience — grafted trees typically begin bearing around year five, and full production takes a decade. In cooler climates, fruiting is the real challenge rather than the wait; olives need long, warm summers to ripen properly. A sunny, sheltered south-facing wall is essential outside Mediterranean regions. Most varieties benefit from cross-pollination with a different cultivar. The fruit needs curing before eating as it is intensely bitter straight from the tree. Even if your tree never fruits reliably, olives are handsome, long-lived evergreens with silvery foliage.'
WHERE scientific_name = 'Olea europaea';

-- Orange (Citrus x sinensis)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Grafted oranges typically produce their first fruit within three to four years. They are self-fertile, so a single tree will crop. In temperate climates they make rewarding conservatory plants, though do not expect supermarket quantities — a good indoor tree might produce a dozen to twenty fruit, which makes each one feel rather special. They need winter minimum temperatures around 10C and good light. Blood oranges and navel types both do reasonably well in containers. Feed regularly with citrus fertiliser and watch for red spider mite in dry indoor conditions.'
WHERE scientific_name = 'Citrus x sinensis';

-- Pawpaw (Asimina triloba)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 7,
  cropping_timeline_note = 'Pawpaw is a fascinating native North American tree with tropical-tasting fruit — like a mango-banana custard — growing in a temperate climate. Grafted trees begin fruiting around year four to five. You will need two genetically different trees for cross-pollination, as individual flowers are not self-compatible. The flowers are pollinated by flies and beetles, not bees, so some growers hang rotting meat near the trees during flowering to attract pollinators. Young trees need shade, but mature trees fruit best in full sun. Worth the wait and the eccentricities.'
WHERE scientific_name = 'Asimina triloba';

-- Peach (Prunus persica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Peaches are among the quicker tree fruits to crop, with grafted trees often bearing in their third year. They are self-fertile, which is a real advantage — a single fan-trained tree against a warm wall is the classic approach. The big challenge in cooler, damp climates is peach leaf curl; either grow under cover (a rain shelter works wonders) or spray with a copper fungicide in late winter. Thin fruitlets ruthlessly for fewer but larger, sweeter peaches. Home-grown, tree-ripened peaches are a world apart from the hard, flavourless specimens in shops.'
WHERE scientific_name = 'Prunus persica';

-- Pear (Pyrus communis)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 7,
  cropping_timeline_note = 'Pears on Quince A rootstock typically start bearing around year four, sometimes sooner on the more dwarfing Quince C. They are generally a little slower to come into cropping than apples but worth the wait. Most pears need a compatible pollination partner from the same flowering group — Conference is partly self-fertile and a good starting choice. Pears are best picked slightly under-ripe and ripened indoors; left on the tree they go "sleepy" (brown and mealy) from the inside. Cordon and espalier forms are excellent for walls and small gardens.'
WHERE scientific_name = 'Pyrus communis';

-- Persimmon / Kaki (Diospyros kaki)
UPDATE plant_species SET
  years_to_first_crop = 4,
  years_to_full_production = 7,
  cropping_timeline_note = 'Grafted persimmons begin fruiting around their fourth or fifth year. There are two types to be aware of: astringent varieties (like Hachiya) must be fully soft and bletted before eating, while non-astringent types (like Fuyu) can be eaten crisp like an apple. In cooler climates, choose early-ripening varieties to ensure the fruit matures before autumn ends. Self-fertile cultivars are available, though cross-pollination can improve fruit set and quality. The autumn display of bright orange fruit hanging on bare branches is one of the most beautiful sights in the fruit garden.'
WHERE scientific_name = 'Diospyros kaki';

-- Plum (Prunus domestica)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Plums on St Julien A rootstock are reliable and begin cropping within three to four years. Victoria is the classic choice for good reason — it is self-fertile, heavy-cropping, and dual-purpose for eating fresh and cooking. In a good year, plums can crop so heavily that you need to thin the fruit and prop up branches to prevent breakage. Some varieties show biennial bearing tendencies. Most plums benefit from a pollination partner, so check compatibility groups. Wasps can be troublesome as the fruit ripens; harvest promptly.'
WHERE scientific_name = 'Prunus domestica';

-- Pomegranate (Punica granatum)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Pomegranates grown from cuttings or grafted stock often begin flowering within two to three years and setting fruit shortly after. They need long, hot summers to ripen fruit properly — in cooler climates, grow against the hottest, sunniest wall you have or in a large container that can be moved to a conservatory. Self-fertile, so one plant is sufficient, but a second improves yield. The ornamental scarlet flowers are spectacular even if the fruit does not ripen. Dwarf varieties like Nana are good container plants for conservatories.'
WHERE scientific_name = 'Punica granatum';

-- Quandong (Santalum acuminatum)
UPDATE plant_species SET
  years_to_first_crop = 5,
  years_to_full_production = 10,
  cropping_timeline_note = 'Quandong is a remarkable Australian native that presents unique growing challenges — it is a hemiparasite, needing a host plant (typically a native Acacia or cassia) to attach its roots to for part of its nutrition. First fruit typically appears around year five, though some trees take longer. The bright red fruit has a tart, peach-like flavour prized in Australian bush food cuisine, and the decorative nuts have been used for centuries in Aboriginal art. It thrives in arid, well-drained conditions and will not tolerate waterlogging. Not a beginner plant, but genuinely fascinating.'
WHERE scientific_name = 'Santalum acuminatum';

-- Quince (Cydonia oblonga)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 6,
  cropping_timeline_note = 'Quinces begin cropping within three to four years and are wonderfully low-maintenance once established. The golden, aromatic fruit cannot be eaten raw (they are hard and astringent) but transform when cooked into a gorgeous pink-orange with a complex, perfumed flavour — membrillo (quince paste) with cheese is a revelation. The blossom is exquisite, soft pink and appearing late enough to mostly avoid frost damage. Self-fertile, tolerant of damp soil, and rarely troubled by pests or diseases. An outstanding tree for the low-effort fruit garden.'
WHERE scientific_name = 'Cydonia oblonga';

-- Saskatoon berry (Amelanchier alnifolia)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 5,
  cropping_timeline_note = 'Saskatoons are generous, starting to fruit within two to three years and building to impressive harvests by year five. The sweet, mild-flavoured berries look like blueberries but are actually more closely related to apples. They are incredibly cold-hardy, tolerating brutal prairie winters, and are an important commercial crop in western Canada. Self-fertile, but planting two varieties improves fruit set. The berries are wonderful fresh, in pies (historically used like blueberries by First Nations peoples), or dried. Easy, productive, and attractive with good autumn colour.'
WHERE scientific_name = 'Amelanchier alnifolia';

-- Sea buckthorn (Hippophae rhamnoides)
UPDATE plant_species SET
  years_to_first_crop = 3,
  years_to_full_production = 5,
  cropping_timeline_note = 'Sea buckthorn starts producing its vivid orange berries within three to four years. It is dioecious, so you need both male and female plants — one male can pollinate up to six females. The thorns are fierce, making harvest tricky; some growers cut whole fruiting branches and freeze them, then shake off the frozen berries. The berries are extraordinarily high in vitamin C and omega fatty acids. The plant thrives in poor, sandy soil and coastal conditions where little else will grow, and it fixes nitrogen. A superb plant for difficult sites.'
WHERE scientific_name = 'Hippophae rhamnoides';

-- Serviceberry (Amelanchier canadensis)
UPDATE plant_species SET
  years_to_first_crop = 2,
  years_to_full_production = 5,
  cropping_timeline_note = 'Serviceberry is a close relative of the saskatoon and equally quick to fruit — usually within two to three years. The sweet, juicy berries ripen in June and taste like a mild, sweet blueberry with an almond note from the small seeds. Birds adore them, so you may need to net the tree or accept sharing the harvest. Beautiful white spring blossom and fiery autumn colour make it a first-class ornamental tree that happens to produce delicious fruit. Self-fertile and virtually maintenance-free. One of the best dual-purpose garden trees you can plant.'
WHERE scientific_name = 'Amelanchier canadensis';

-- Sweet chestnut (Castanea sativa)
UPDATE plant_species SET
  years_to_first_crop = 5,
  years_to_full_production = 15,
  cropping_timeline_note = 'Sweet chestnuts demand patience. Grafted varieties like Marigoule or Maraval can start producing a few nuts within five to seven years, but seed-grown trees may take fifteen years or more and the nut quality is unpredictable. You need two genetically different trees for cross-pollination. In cooler climates, late spring frosts and cool summers can prevent nuts from filling properly — choose early-ripening cultivars for the best chance. The nuts are delicious roasted, pureed, or in stuffing, and a mature tree in full production can yield an extraordinary quantity. Think of it as planting for the future.'
WHERE scientific_name = 'Castanea sativa';

-- Walnut (Juglans regia)
UPDATE plant_species SET
  years_to_first_crop = 5,
  years_to_full_production = 12,
  cropping_timeline_note = 'Walnuts reward patience. Grafted varieties like Broadview or Franquette usually start producing nuts after five to seven years, but seed-grown trees can take a decade or more and may never crop reliably. Late spring frosts are the main enemy of the crop, as walnuts leaf out and flower relatively early — choose a frost-free site or a late-leafing variety like Franquette. Once established, a single tree can produce impressive harvests for generations. Some varieties benefit from a pollination partner, though many are self-fertile. Wet the nuts immediately after harvest and dry them well for storage.'
WHERE scientific_name = 'Juglans regia';

COMMIT;
