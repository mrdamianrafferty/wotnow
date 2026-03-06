# Plant Species Database Review

**Date:** 2026-03-06
**Reviewer:** Horticultural expert review (automated)
**Scope:** All 463 rows of `public.plant_species` table
**Target climate:** UK/Ireland/Europe

---

## 1. Taxonomy / Scientific Names

### 1.1 Wrong genus column vs scientific_name

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `fruit-orange` | genus | `Malus` | `Citrus` | Orange is Citrus x sinensis. Malus is the apple genus. Perenual data is also wrong -- it pulled in Cox's Orange Pippin Apple (Malus) instead of Orange (Citrus). |
| `fruit-plum` | genus | `Ceratostigma` | `Prunus` | Plum is Prunus domestica. Ceratostigma is leadwort/plumbago, a completely unrelated ornamental shrub. |
| `fruit-chinese-haw` | genus | `Photinia` | `Crataegus` | Chinese hawthorn is Crataegus pinnatifida. Photinia is a different Rosaceae genus. |

### 1.2 Perenual data mismatches (wrong species matched from API)

| Slug | Issue | Details |
|------|-------|---------|
| `fruit-orange` | perenual_id 358 | Perenual data is for Cox's Orange Pippin Apple (Malus 'Cox's Orange Pippin'), not Orange (Citrus x sinensis). All perenual-sourced fields (care_guides, dimensions, etc.) are for the wrong plant. |
| `fruit-cherimoya` | perenual_id 842 | Perenual data is for Soursop (Annona muricata), not Cherimoya (Annona cherimola). These are different species within the same genus -- soursop is strictly tropical, cherimoya is subtropical. |

### 1.3 Missing scientific_name

| Slug | Column | Current Value | Correct Value |
|------|--------|---------------|---------------|
| `tree-sweet-chestnut` | scientific_name | *(empty)* | `Castanea sativa` |

### 1.4 Outdated or debatable scientific names

| Slug | Column | Current Value | Notes |
|------|--------|---------------|-------|
| `herb-lemon-verbena` | scientific_name | `Aloysia citrodora` | The accepted spelling is `Aloysia citriodora` (with an 'i'). `Aloysia citrodora` is a common variant but technically a misspelling/synonym. |
| `fruit-lime` | scientific_name | `Citrus aurantiifolia` | This is the Key/Mexican lime. If the intent is to cover common limes grown in the UK (e.g., Tahiti/Persian lime), the correct name would be `Citrus x latifolia`. |

---

## 2. Growing Conditions

### 2.1 Wrong USDA Hardiness Zones

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `herb-basil-sweet` | usda_zone_min | `9` | `2` (annual) or remove | Sweet basil is grown as a frost-tender annual everywhere. Zone 9-11 implies it only grows in zones 9+, but it is sown/grown in all UK zones (which are ~7-9). As an annual, the hardiness zone is less relevant, but zone_min=9 is misleading for UK users. |
| `herb-basil-thai` | usda_zone_min | `9` | Same issue as sweet basil | Thai basil is also a frost-tender annual grown widely as a summer crop. |
| `herb-basil-greek` | usda_zone_min | `9` | Same issue as sweet basil | Greek basil is also a frost-tender annual. |
| `herb-holy-basil` | usda_zone_min | `10` | Same issue | Holy basil is a tender annual in the UK. Zone 10-12 makes it appear ungrowable. |
| `petunia` | usda_zone_min | `8` | `2` (annual) or adjust | Petunia is grown as a half-hardy annual throughout UK. Zone 8-11 is for perennial survival only. |
| `snapdragon` | usda_zone_min | `7` | `4` or lower | Snapdragons are hardy annuals/short-lived perennials tolerant to zone 4-5. Zone 7 is too restrictive. |
| `fruit-medlar` | usda_zone_min | `6` | `5` | Medlar (Mespilus germanica) is hardy to zone 5. |
| `coriander` | frost_tolerance | `tender` | `half_hardy` | Coriander tolerates light frost (to about -5C). It is not truly tender. |
| `coriander` | min_temp_c | `5` | `-5` | Coriander survives light frosts; min_temp_c of 5 is far too high. |
| `lettuce` | sun_requirements | `partial_shade` | `full-sun` or `sun-or-partial` | Lettuce prefers full sun in UK/Ireland with partial shade beneficial only in high summer. "partial_shade" as the primary requirement is misleading -- it grows best in good light. |
| `tree-oak-burr` | name | `Sessile oak` | `Burr oak` or keep as `Sessile oak` but fix slug | The slug says "burr" but the name says "Sessile oak" and the scientific name is Quercus petraea (sessile oak). Either the slug is wrong (should be `tree-oak-sessile`) or the name/scientific_name should be for Burr oak (Quercus macrocarpa). This is an internal inconsistency. |

### 2.2 Wrong sun_requirements

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `fruit-elder` | sun_requirements | `full-sun` | `sun-or-partial` or `Full sun to partial shade` | Elder (Sambucus nigra) tolerates and often grows in partial shade. Full sun is not required. |
| `fruit-aronia` | sun_requirements | `full-sun` | `Full sun to partial shade` | Aronia grows well in partial shade. |
| `fruit-pawpaw` | sun_requirements | `full-sun` | `part-sun` or `partial-shade` | Pawpaw (Asimina triloba) is an understory tree that prefers partial shade, especially when young. |
| `fruit-serviceberry` | sun_requirements | `full-sun` | `Full sun to partial shade` | Serviceberry tolerates partial shade. |

### 2.3 Wrong frost_tolerance / min_temp_c

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `potato` | min_temp_c | `-5` | `0` to `-2` | Potato foliage is killed by any frost (0C). The tubers may survive brief dips to -2C underground, but -5C is too generous. |
| `courgette` | min_temp_c | `10` | `0` to `1` | Courgette plants are killed by frost but 10C is the *growth* minimum, not the death minimum. min_temp_c should represent the lowest temperature the plant survives. |
| `cucumber` | min_temp_c | `10` | `0` to `1` | Same issue as courgette. Plants are killed by frost, not at 10C. |
| `pumpkin` | min_temp_c | `10` | `0` to `1` | Same issue. |
| `watermelon` | min_temp_c | `10` | `0` to `1` | Same issue. |
| `aubergine` | min_temp_c | `10` | `0` to `2` | Same issue -- 10C is growth threshold, not survival. |
| `pepper` | min_temp_c | `10` | `0` to `2` | Same issue. |

**Note:** If `min_temp_c` is intended to represent the minimum temperature for *growth* rather than *survival*, the above are arguably correct, but the field is inconsistently defined -- `onion` has min_temp_c=-20 (survival), `tomato` has min_temp_c=10 (growth), `broad-bean` has min_temp_c=-5 (survival). This inconsistency needs to be resolved with a clear definition.

### 2.4 Wrong soil_type

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `nasturtium` | soil_type | `poor soil` | `well drained` or `loam` | While nasturtiums *tolerate* poor soil and flower more in it, listing "poor soil" as the soil_type is unusual. They grow in any well-drained soil. |
| `horseradish` | rotation_group | `brassica` | `root_allium` or `non_rotating` | Horseradish (Armoracia rusticana) is technically in Brassicaceae, so `brassica` rotation is defensible. However, it is a permanent perennial -- rotating it makes no sense. Should be `permanent` or `non_rotating`. |

---

## 3. Calendar / Timing (UK/Ireland)

### 3.1 Wrong or incomplete sow/harvest months

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `broad-bean` | sow_months | `["3","4","5","6"]` | `["2","3","4","5","10","11"]` | Broad beans can be autumn-sown (Oct/Nov) in mild areas of UK/Ireland for early crops, and spring-sown from February. Missing autumn sowing and February. |
| `fava-bean` | sow_months | `["3","4","5","6"]` | Same as broad-bean | This is the same plant (Vicia faba). Should include autumn sowing. |
| `garlic` | sow_months | `["10","11"]` | `["10","11","12","1","2"]` | Garlic can also be planted Dec-Feb in milder UK/Ireland areas, though autumn is preferred. |
| `pea` | sow_months | `["3","4","5","6"]` | `["2","3","4","5","6","7"]` | Peas can be sown from February under cloches and succession-sown through July for autumn crops. |
| `runner-bean` | sow_months | `["3","4","5","6"]` | `["4","5","6"]` | Runner beans should not be sown in March in the UK -- too cold. April at earliest under cover. Also harvest months `["6","7","8","9"]` -- June is too early for UK runner beans; `["7","8","9","10"]` is more accurate. |
| `french-bean` | sow_months | `["3","4","5","6"]` | `["4","5","6","7"]` | French beans can't be sown outdoors until late April/May in UK. March is too early. |
| `french-bean` | harvest_months | `["6","7","8","9"]` | `["7","8","9","10"]` | June harvest is unlikely for UK-sown French beans. |
| `pepper-chilli` | sow_months | `["2","3","4"]` | `["1","2","3"]` | Chilli peppers benefit from very early sowing (January) in UK due to long growing season needed. April sowing is too late for most varieties. |
| `leek` | harvest_months | `["7","8","9","10"]` | `["9","10","11","12","1","2","3"]` | Leeks are a winter vegetable in the UK, harvested from autumn through to spring. Months 7-8 are too early for most, and the key months of Nov-Mar are missing. |
| `spring-onion` | harvest_months | `["8","9","10"]` | `["5","6","7","8","9","10"]` | Spring onions can be harvested from May/June if sown in March. |
| `fruit-currant` | planting_months | *(empty)* | `["10","11","12","1","2","3"]` | Bare-root currant bushes should have planting months for dormant season. |
| `fruit-gooseberry` | planting_months | *(empty)* | `["10","11","12","1","2","3"]` | Same -- bare-root gooseberry planting in dormant season. |
| `fruit-blackcurrant` | planting_months | *(empty)* | `["10","11","12","1","2","3"]` | Same for blackcurrant. |

### 3.2 Fruit trees using plant_out_months instead of planting_months

Many fruit trees have `plant_out_months` populated with `["11","12","1","2","3"]` but `planting_months` is empty. For bare-root trees, `planting_months` is the more appropriate field. This applies to virtually all fruit-tree category entries. This may be a design choice rather than an error, but is worth noting for consistency.

### 3.3 Missing pruning months

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `fruit-currant` | pruning_months | `["11","12","1","2"]` | Should also include removal of old wood after fruiting | The range is reasonable but could include light summer pruning. |
| `fruit-elder` | pruning_months | *(empty)* | `["2","3"]` | Elder should be pruned in late winter. |
| `fruit-hazelnut` | pruning_months | *(empty)* | `["1","2"]` | Hazels are pruned in late winter while still dormant. |
| `fruit-walnut` | pruning_months | *(empty)* | `["7","8"]` | Walnuts bleed sap if pruned in winter. Should be pruned in mid-late summer. |
| `fruit-black-walnut` | pruning_months | *(empty)* | `["7","8"]` | Same as walnut -- must be pruned in summer to avoid bleeding. |
| `fruit-hardy-kiwi` | pruning_months | *(empty)* | `["1","2","7","8"]` | Hardy kiwi needs winter structural pruning and summer maintenance pruning. (Note: kiwi-hardy vine entry has correct pruning.) |
| `fruit-plum` | pruning_months | `["1","2","3","4","5","8","12"]` | `["6","7","8"]` | Plums (and all Prunus) should NOT be pruned in winter due to silver leaf disease risk. Prune only in summer (June-August). Months 1-5 and 12 are dangerous. |
| `fruit-damson` | pruning_months | `["3","4"]` | `["6","7","8"]` | Same Prunus issue -- damsons must be summer-pruned, not spring/winter-pruned. |
| `fruit-nectarine` | pruning_months | `["2","3","4"]` | `["6","7","8"]` or `["2","3"]` with caution | Nectarines are Prunus -- ideally summer-pruned, though spring pruning at bud burst is sometimes done for trained forms. |
| `fruit-apricot` | pruning_months | `["2"]` | `["7","8"]` | Apricot is Prunus -- should be summer-pruned to avoid silver leaf and bacterial canker. |
| `fruit-cherry-sour` | pruning_months | `["2","3","4"]` | `["7","8","9"]` | Sour cherries are Prunus -- prune after fruiting in summer, not winter/spring. |
| `fruit-gage` | pruning_months | *(empty)* | `["6","7","8"]` | Gages are Prunus domestica -- need summer pruning. |
| `fruit-mirabelle` | pruning_months | *(empty)* | `["6","7","8"]` | Mirabelle is Prunus -- needs summer pruning. |

### 3.4 Herb harvest_months missing

Many herbs in the `herb` category have empty `harvest_months` despite being edible. These include:

| Slug | Expected harvest_months |
|------|------------------------|
| `herb-sage-purple` | `["5","6","7","8","9","10"]` |
| `herb-lovage` | `["4","5","6","7","8","9"]` |
| `herb-chives-common` | `["3","4","5","6","7","8","9","10"]` |
| `herb-sorrel-common` | `["4","5","6","7","8","9","10"]` |
| `herb-basil-sweet` | `["7","8","9"]` |
| `herb-basil-thai` | `["7","8","9"]` |
| `herb-mint-spearmint` | `["4","5","6","7","8","9","10"]` |
| `herb-mint-peppermint` | `["4","5","6","7","8","9","10"]` |
| `herb-rosemary` | `["1","2","3","4","5","6","7","8","9","10","11","12"]` |
| `herb-thyme-common` | `["4","5","6","7","8","9","10"]` |
| `herb-oregano` | `["6","7","8","9"]` |
| `herb-parsley-flat` | `["4","5","6","7","8","9","10","11"]` |
| `herb-parsley-curly` | `["4","5","6","7","8","9","10","11"]` |
| `herb-dill-leaf` | `["6","7","8","9"]` |
| `herb-coriander-leaf` | `["5","6","7","8","9"]` |
| `herb-fennel-leaf` | `["6","7","8","9","10"]` |
| `herb-bay-laurel` | `["1","2","3","4","5","6","7","8","9","10","11","12"]` |
| `herb-sage-common` | `["5","6","7","8","9","10"]` |
| `herb-tarragon-french` | `["5","6","7","8","9"]` |
| `herb-chervil` | `["5","6","7","8","9"]` |
| `herb-borage` | `["6","7","8","9"]` |
| `herb-marjoram-sweet` | `["6","7","8","9"]` |
| `herb-lemon-balm` | `["5","6","7","8","9","10"]` |
| `herb-chamomile-german` | `["6","7","8"]` |
| `herb-chamomile-roman` | `["6","7","8"]` |
| `herb-calendula` | `["6","7","8","9","10"]` |
| `herb-savoury-summer` | `["7","8","9"]` |
| `herb-savoury-winter` | `["5","6","7","8","9","10"]` |

This is a systematic gap -- essentially all herbs in the `herb` category are missing harvest_months, while vegetable-category entries with herbs (like `parsley`, `dill`, `coriander`) do have them.

---

## 4. Plant Characteristics

### 4.1 SAFETY CRITICAL -- Wrong poisonous flags

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `fruit-cherry-sour` | poisonous_to_humans | `1` | `0` | Sour cherry fruit is edible and safe. The pits contain amygdalin (cyanogenic glycoside) but the fruit itself is not poisonous. This flag is wrong and could deter users from eating perfectly safe fruit. |
| `fruit-cherry-sour` | poisonous_to_pets | `1` | `0` (or `1` with note about pits) | The fruit flesh is safe. Pits, leaves, and stems contain cyanide precursors, but the whole plant should not be flagged as poisonous outright. |
| `fruit-cherry-sour` | edible_fruit | `false` | `true` | Sour cherries are absolutely edible -- they are the primary pie/jam cherry. This is wrong. |
| `fruit-cherry-sweet` | edible_fruit | `false` | `true` | Sweet cherries are a major edible fruit crop. |
| `parsnip` | poisonous_to_humans | `1` | `0` | Parsnip root is edible. The plant sap can cause phytophotodermatitis (skin burns in sunlight), but the root vegetable itself is not poisonous. Flagging it as poisonous_to_humans=1 is misleading for a food crop. |
| `parsnip` | poisonous_to_pets | `1` | `0` | Same issue -- parsnip is a common edible root vegetable. |
| `helleborus` | poisonous_to_humans | `0` | `1` | Hellebores are poisonous if ingested. All parts contain toxins (protoanemonin, glycosides). |
| `helleborus` | poisonous_to_pets | `0` | `1` | Hellebores are toxic to cats and dogs. |
| `iris` | poisonous_to_humans | `0` | `1` | Iris rhizomes and leaves are mildly toxic if ingested. |
| `iris` | poisonous_to_pets | `0` | `1` | Iris is toxic to dogs and cats. |
| `bleeding-heart` | poisonous_to_humans | `0` | `1` | Lamprocapnos spectabilis is toxic -- contains isoquinoline alkaloids. |
| `bleeding-heart` | poisonous_to_pets | `0` | `1` | Toxic to dogs and cats. |
| `daylily` | poisonous_to_pets | `0` | `1` | Daylilies (Hemerocallis) are highly toxic to cats (can cause fatal kidney failure). This is a well-documented and serious toxicity. |
| `hosta` | poisonous_to_pets | `0` | `1` | Hostas are toxic to dogs and cats (contain saponins). |
| `tree-holly` | poisonous_to_humans | `0` | `1` | Holly berries are poisonous to humans if ingested. |
| `sweet-pea` | poisonous_to_humans | *(empty)* | `1` | Sweet pea seeds are toxic (contain lathyrogens). This is a well-known toxicity. |
| `sweet-pea` | poisonous_to_pets | *(empty)* | `1` | Toxic to dogs and cats. |
| `asclepias` | poisonous_to_humans | `0` | `1` | Milkweed (Asclepias) contains cardiac glycosides and is toxic if ingested. |
| `asclepias` | poisonous_to_pets | `0` | `1` | Toxic to dogs, cats, and horses. |
| `climbing-honeysuckle` | poisonous_to_humans | `0` | `1` | Honeysuckle berries are mildly toxic to humans. |
| `fruit-elder` | edible_fruit | `false` | `true` (when cooked) | Elderberries are edible when cooked. Raw berries and other parts are mildly toxic. The edible_fruit should be true with a note that cooking is required. |
| `fruit-serviceberry` | edible_fruit | `false` | `true` | Serviceberries are edible and delicious. |
| `fruit-hackberry` | edible_fruit | `false` | `true` | Hackberry fruit is edible, though small and dry. |
| `fruit-black-walnut` | edible_fruit | `false` | `true` | Black walnuts are edible nuts. |
| `fruit-hazelnut` | edible_fruit | `false` | `true` | Hazelnuts/filberts are a major edible nut crop. |
| `fruit-sweet-chestnut` | edible_fruit | `false` | `true` | Sweet chestnuts are edible (roasted chestnuts). |
| `fruit-saskatoon` | edible_fruit | `false` | `true` | Saskatoon berries are edible. |
| `fruit-walnut` | edible_fruit | `false` | `true` | Walnuts are a major edible nut. |
| `fruit-juniper-berry` | edible_fruit | `false` | `true` | Juniper berries are used in cooking and gin production. |
| `fruit-mountain-ash` | edible_fruit | `false` | `true` (when cooked) | Rowan berries are edible when cooked (raw berries contain parasorbic acid but cooking converts it to harmless sorbic acid). |
| `fruit-plum` | edible_fruit | `false` | `true` | Plums are a major edible fruit. This is clearly wrong. |
| `fruit-gage` | edible_fruit | `false` | `true` | Greengages are edible. |
| `fruit-mirabelle` | edible_fruit | `false` | `true` | Mirabelle plums are edible. |
| `fruit-quandong` | edible_fruit | `false` | `true` | Quandong fruit is edible (Australian native food). |
| `fruit-hybrid-shipova` | edible_fruit | `false` | `true` | Shipova fruit is edible. |
| `fruit-hardy-kiwi` | edible_fruit | `false` | `true` | Hardy kiwi berries are edible. |
| `grape-vine` | edible_fruit | `false` | `true` | Grapes are edible. |
| `kiwi-hardy` | edible_fruit | `false` | `true` | Same plant as fruit-hardy-kiwi, edible. |
| `kiwi-common` | edible_fruit | `false` | `true` | Kiwi fruit is edible. |
| `passionflower` | edible_fruit | `false` | `true` | Passiflora caerulea produces edible (though not very tasty) fruit. |
| `schisandra` | edible_fruit | `false` | `true` | Schisandra berries are edible (used in traditional medicine and as food). |
| `hop-common` | edible_fruit | `false` | `true` | Hop cones/strobiles are used in brewing and are edible. |
| `akebia` | edible_fruit | `false` | `true` | Akebia fruit is edible. |
| `plane-london` | edible_fruit | `true` | `false` | London plane fruits are NOT edible. |
| `tree-alder-common` | edible_leaf | `true` | `false` | Alder leaves are not edible. |
| `elm-english` | edible_leaf | `true` | Debatable | Young elm leaves are technically edible but not commonly eaten. Low priority but questionable. |
| `fruit-damson` | edible_leaf | `true` | `false` | Damson (Prunus) leaves are not edible -- they contain cyanogenic glycosides. |
| `fruit-nectarine` | edible_leaf | `true` | `false` | Nectarine (Prunus) leaves contain cyanogenic glycosides and are not edible. |
| `fruit-medlar` | edible_leaf | `true` | `false` | Medlar leaves are not typically eaten. |
| `fruit-quince` | edible_leaf | `true` | `false` | Quince leaves are not edible. |
| `fruit-pear` | edible_leaf | `true` | `false` | Pear leaves are not edible. |
| `fruit-aronia` | edible_leaf | `true` | `false` | Aronia leaves are not typically eaten. |
| `fruit-pawpaw` | edible_leaf | `true` | `false` | Pawpaw leaves contain acetogenins and are not edible. |
| `fruit-loquat` | edible_leaf | `true` | `false` | Loquat leaves are used medicinally in teas but are not edible in the conventional sense. |
| `fruit-fig` | edible_leaf | `true` | `false` | Fig leaves can cause skin irritation. While used in some cooking traditions, they contain ficin which can be irritant. Flagging as edible is questionable. |

### 4.2 Wrong category

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `cardoon` | category | `herb` | `vegetable` | Cardoon (Cynara cardunculus) is grown as a vegetable (blanched leaf stalks are eaten). It is not an herb. |
| `californian-poppy` | category | `herb` | `ornamental` | Californian poppy (Eschscholzia californica) is primarily grown as an ornamental. |
| `sunflower-biomass` | category | `herb` | `ornamental` or a custom category | A biomass sunflower is not an herb. |
| `wild-strawberry` | category | `herb` | `fruit` | Wild strawberry (Fragaria vesca) is a fruit-bearing plant, not an herb. |
| `herb-calendula` | category | `herb` | `herb` or `ornamental` | Borderline -- calendula is used both as herb and ornamental. Current category is defensible. |
| `fruit-juniper-berry` | category | `fruit-tree` | `shrub` or `tree` | Juniper is a coniferous shrub/small tree, not a fruit tree. |
| `dill` | category | `vegetable` | `herb` | Dill is an herb, not a vegetable. |
| `parsley` | category | `vegetable` | `herb` | Parsley is an herb. |
| `coriander` | category | `vegetable` | `herb` | Coriander/cilantro is an herb. |
| `chive` | category | `vegetable` | `herb` | Chive is an herb. |
| `sorrel` | category | `vegetable` | `herb` or `vegetable` | Borderline -- sorrel is used both ways. |
| `watercress` | category | `vegetable` | `vegetable` or `herb` | Watercress as vegetable is defensible. |

**Note on herb/vegetable categorisation:** There is a clear split in the data where some herbs appear in the `herb` category with the `herb-` slug prefix (e.g., `herb-dill-leaf`, `herb-parsley-flat`, `herb-coriander-leaf`) and duplicates appear in the `vegetable` category without the prefix (e.g., `dill`, `parsley`, `coriander`). This appears to be a deliberate design choice with different schemas, but it creates confusion about which entry is canonical.

---

## 5. Companion Planting

### 5.1 Missing rotation_group

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `fava-bean` | rotation_group | `non_rotating` | `legume` | Broad/fava beans are legumes and should be in the legume rotation group. |
| `scarlet-runner-bean` | rotation_group | `non_rotating` | `legume` | Runner beans are legumes. |
| `french-bean` | rotation_group | `non_rotating` | `legume` | French beans are legumes. |
| `pea` | rotation_group | `non_rotating` | `legume` | Peas are legumes. |
| `peas-snap` | rotation_group | `non_rotating` | `legume` | Snap peas are legumes. |
| `peas-snow` | rotation_group | `non_rotating` | `legume` | Snow peas are legumes. |
| `cowpea-blackeye` | rotation_group | `non_rotating` | `legume` | Cowpeas are legumes. |
| `lima-bean` | rotation_group | `non_rotating` | `legume` | Lima beans are legumes. |
| `shallot` | rotation_group | `non_rotating` | `root_allium` | Shallots are alliums. |
| `multiplier-onion` | rotation_group | `non_rotating` | `root_allium` | Multiplier onions are alliums. |
| `leek` | rotation_group | `non_rotating` | `root_allium` | Leeks are alliums. |
| `cucumber` | rotation_group | `non_rotating` | `cucurbit` | Cucumbers are cucurbits. |
| `melon-cantaloupe` | rotation_group | `non_rotating` | `cucurbit` | Melons are cucurbits. |
| `squash-yellow` | rotation_group | `non_rotating` | `cucurbit` | Yellow squash is a cucurbit. |
| `squash-pattypan` | rotation_group | `non_rotating` | `cucurbit` | Pattypan squash is a cucurbit. |
| `squash-spaghetti` | rotation_group | `non_rotating` | `cucurbit` | Spaghetti squash is a cucurbit. |
| `pepper` | rotation_group | `non_rotating` | `solanaceae` | Peppers are solanaceae. |
| `pepper-sweet` | rotation_group | `non_rotating` | `solanaceae` | Sweet peppers are solanaceae. |
| `tomato-plum` | rotation_group | `non_rotating` | `solanaceae` | Tomatoes are solanaceae. |
| `tomato-cherry` | rotation_group | `non_rotating` | `solanaceae` | Cherry tomatoes are solanaceae. |
| `tomatillo` | rotation_group | `non_rotating` | `solanaceae` | Tomatillos are solanaceae. |
| `ground-cherry` | rotation_group | Already `solanaceae` | Correct | -- |
| `beetroot` | rotation_group | `non_rotating` | `root_allium` or `beet` | Beetroot benefits from rotation. Often grouped with root veg. |
| `swiss-chard` | rotation_group | `non_rotating` | `beet` or `root_allium` | Swiss chard is Beta vulgaris, same family as beetroot. |
| `cabbage-red` | rotation_group | `non_rotating` | `brassica` | Red cabbage is a brassica. |
| `cabbage-green` | rotation_group | `non_rotating` | `brassica` | Green cabbage is a brassica. |
| `cabbage-savoy` | rotation_group | `non_rotating` | `brassica` | Savoy cabbage is a brassica. |
| `sprouting-broccoli` | rotation_group | `non_rotating` | `brassica` | Broccoli is a brassica. |
| `romanesco` | rotation_group | `non_rotating` | `brassica` | Romanesco is a brassica. |
| `kale-lacinato` | rotation_group | `non_rotating` | `brassica` | Kale is a brassica. |
| `pak-choi` | rotation_group | `non_rotating` | `brassica` | Pak choi is a brassica. |
| `mizuna` | rotation_group | `non_rotating` | `brassica` | Mizuna is a brassica. |
| `tatsoi` | rotation_group | `non_rotating` | `brassica` | Tatsoi is a brassica. |
| `lettuce-butterhead` | rotation_group | `non_rotating` | `non_rotating` | Correct (lettuce doesn't need strict rotation). |
| `dill` | rotation_group | `root_allium` | `non_rotating` or `umbelliferae` | Dill is not an allium. If grouped by botanical family it would be umbelliferae/apiaceae (same as carrots). |

### 5.2 Incorrect herb rotation groups

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `herb-angelica` | rotation_group | `root_allium` | `non_rotating` | Angelica is an Apiaceae, not an allium. Perennial herbs generally don't rotate. |
| `herb-lovage` | rotation_group | `root_allium` | `non_rotating` | Lovage is Apiaceae. A perennial herb that stays in place. |
| `herb-fennel-leaf` | rotation_group | `root_allium` | `non_rotating` | Herb fennel is Apiaceae, not allium. |
| `herb-chervil` | rotation_group | `root_allium` | `non_rotating` | Chervil is Apiaceae, not allium. |
| `herb-parsley-curly` | rotation_group | `root_allium` | `non_rotating` | Parsley is Apiaceae, not allium. |
| `herb-parsley-flat` | rotation_group | `non_rotating` | Consistent, but differs from curly parsley | Inconsistency between flat and curly parsley rotation groups. |
| `celery` | rotation_group | `root_allium` | `non_rotating` or `umbelliferae` | Celery is Apiaceae, not allium. |
| `celeriac` | rotation_group | `root_allium` | `non_rotating` or `umbelliferae` | Celeriac is Apiaceae, not allium. |

### 5.3 Alyssum rotation group

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `alyssum` | rotation_group | `brassica` | `non_rotating` | Sweet alyssum (Lobularia maritima) is in Brassicaceae, so `brassica` is botanically correct but practically misleading -- it is grown as an ornamental companion plant, not rotated like food brassicas. |
| `alyssum-perennial` | rotation_group | `brassica` | `non_rotating` | Aurinia saxatilis is not even in Brassicaceae in modern taxonomy. Should be non_rotating. |

---

## 6. Days to Maturity

| Slug | Column | Current Value | Correct Value | Explanation |
|------|--------|---------------|---------------|-------------|
| `garlic` | maturity_basis | `from_transplant` | `from_planting` | Garlic is planted as cloves, not transplanted. The basis should be `from_planting`. |
| `potato` | maturity_basis | `from_transplant` | `from_planting` | Potatoes are planted as seed tubers/chits, not transplanted. Should be `from_planting`. |
| `onion` | maturity_basis | `from_transplant` | `from_sowing` or `from_planting` (for sets) | Depends on context. If from seed, it's from_sowing. If from sets (which is more common in UK), it's from_planting. "from_transplant" is misleading. |
| `asparagus` | days_to_maturity_min / max | `730` / `1095` | Correct concept but very unusual units | 730 days = 2 years, 1095 = 3 years. This is correct -- asparagus takes 2-3 years before first harvest from crowns. The values are technically right but the magnitude is very different from all other entries. |
| `lavender` | days_to_maturity_min / max | `365` / `540` | These represent time to established flowering from transplant | Unusual but defensible. |

---

## 7. Data Quality

### 7.1 Duplicate entries

| Slug A | Slug B | Name | Notes |
|--------|--------|------|-------|
| `herb-catmint-ornamental` | `catmint` | Catmint / Nepeta x faassenii | Same species, both category=herb. Different slug format and slightly different data. |
| `herb-anise-hyssop` | `anise-hyssop` | Anise hyssop / Agastache foeniculum | Exact same species, both herb category. |
| `herb-tansy` | `tansy` | Tansy / Tanacetum vulgare | Exact same species, both herb category. |
| `herb-wormwood` | `wormwood` | Wormwood / Artemisia absinthium | Exact same species, both herb category. |
| `herb-hyssop` | `hyssop` | Hyssop / Hyssopus officinalis | Exact same species, both herb category. |
| `herb-valerian` | `valerian` | Valerian / Valeriana officinalis | Exact same species, both herb category. Inconsistent poison data: herb-valerian has no poison flags, valerian has poison_p=1. |
| `herb-lemon-balm` | `lemon-balm` | Lemon balm / Melissa officinalis | Exact same species, both herb category. |
| `herb-sorrel-common` / `garden-sorrel` | `sorrel` | Garden sorrel / Rumex acetosa | Three entries for the same plant. |
| `sheep-sorrel` | `sheep-sorrel-2` | Sheep sorrel / Rumex acetosella | Two entries for the same plant. |
| `herb-comfrey` | `russian-comfrey` | Comfrey | These are different species (S. officinale vs S. x uplandicum) so not true duplicates, but worth noting. |
| `herb-fennel-leaf` | `fennel-perennial` | Fennel / Foeniculum vulgare | Same species, both herb category. |
| `herb-chervil` | `chervil` | Chervil / Anthriscus cerefolium | Same species, both herb category. |
| `herb-coriander-leaf` | `coriander` | Coriander / Coriandrum sativum | Same species, different categories (herb vs vegetable). May be intentional. |
| `herb-parsley-flat` | `parsley` | Parsley / Petroselinum crispum | Same genus, herb vs vegetable categories. |
| `herb-dill-leaf` | `dill` | Dill / Anethum graveolens | Same species, different categories. |
| `herb-chives-common` | `chive` | Chives / Allium schoenoprasum | Same species, different categories (herb vs vegetable). |
| `fruit-elder` | `fruit-elder-black-lace` | Elder / Sambucus nigra | Different cultivar (Black Lace is ornamental-edible), so not a true duplicate. |
| `fruit-black-walnut` | `walnut-black` | Black walnut / Juglans nigra | Same species, categories fruit-tree vs tree. |
| `fruit-walnut` | `walnut-english` | Walnut / Juglans regia | Same species, categories fruit-tree vs tree. |
| `fruit-hackberry` | `tree-hackberry-common` | Hackberry / Celtis occidentalis | Same species, different categories. |
| `fruit-honeyberry-treeform` | `tree-honeyberry-treeform` | Honeyberry / Lonicera caerulea | Same species, categories fruit-tree vs tree. |
| `fruit-sweet-chestnut` | `tree-sweet-chestnut` / `sweet-chestnut` | Sweet chestnut / Castanea sativa | Three entries for the same plant. |
| `fruit-serviceberry` | `tree-serviceberry-treeform` | Serviceberry / Amelanchier canadensis | Same species. |
| `honey-locust` | `tree-honey-locust` | Honey locust / Gleditsia triacanthos | Same species, different categories. |
| `tree-london-plane` | `plane-london` | London plane / Platanus x hispanica | Same species, both tree category. |
| `tree-mimosa` | `tree-acacia-dealbata` | Acacia dealbata | Same species, both tree category. |
| `tree-rowan-mountain-ash` | `fruit-mountain-ash` / `tree-mountain-ash-dwarf` | Rowan / Sorbus aucuparia | Multiple entries. |
| `linden-smallleaf` | `tree-lime-small-leaved` | Small-leaved lime / Tilia cordata | Same species, both tree category. |
| `broad-bean` | `fava-bean` | Broad/fava bean / Vicia faba | Same species, both vegetable category. |
| `pepper` | `pepper-sweet` / `pepper-capsicum-annuum` | Sweet pepper / Capsicum annuum | Multiple entries for the same plant. |
| `pepper-hot` | `hot-pepper-very-hot-types-capsicum-chinense` | Hot pepper / Capsicum chinense | Duplicate (empty shell). |
| `tomato` | `tomato-slicer-solanum-lycopersicum` | Tomato / Solanum lycopersicum | tomato-slicer appears to be an empty shell duplicate. |
| `tomato-plum` | `plum-roma-tomato-solanum-lycopersicum` | Plum tomato / Solanum lycopersicum | Empty shell duplicate. |
| `potato` | `potato-solanum-tuberosum` | Potato / Solanum tuberosum | Empty shell duplicate. |

### 7.2 Empty shell rows (no data beyond slug/name/category/scientific_name)

These rows have virtually no data filled in and appear to be auto-generated duplicates:

- `tomato-slicer-solanum-lycopersicum`
- `potato-solanum-tuberosum`
- `hot-pepper-very-hot-types-capsicum-chinense`
- `plum-roma-tomato-solanum-lycopersicum`
- `pepper-capsicum-annuum`

### 7.3 Inconsistent formatting

| Issue | Examples |
|-------|---------|
| sun_requirements values | Mixed formats: `full-sun`, `Full sun`, `full_sun`, `sun-or-partial`, `part-sun`, `partial-shade`, `partial_shade`, `Full sun to partial shade`. Should standardise to one format. |
| soil_type values | Mixed: `loam`, `loamy`, `well drained`, `well-drained`, `well_drained`, `rich loam`, `well drained loam`, `sandy loam`, `sandy-loam`, `moist loam`, `moist-loam`, `acid-loam`, `acid loam`. |
| frost_tolerance values | Mixed: `hardy`, `half_hardy`, `half-hardy`, `tender`, *(empty)*. Some use underscores, some do not. |
| poisonous flags | Mixed types: some use `0`/`1`, some use `true`/`false`, many are empty. Should standardise. |
| genus column | Only populated for some rows. Many are empty (all newer fruit entries, all herbs without herb- prefix, etc.). |
| Missing planting_months for fruit trees | Most fruit-tree entries use plant_out_months for dormant planting instead of planting_months. |

### 7.4 Inconsistent data between duplicates

| Slugs | Field | Values | Issue |
|-------|-------|--------|-------|
| `herb-valerian` / `valerian` | poisonous_to_pets | empty / `1` | Valerian should be flagged as potentially toxic to cats (causes excitement, not toxicity per se, but large doses can be harmful). Inconsistent between duplicates. |
| `herb-wormwood` / `wormwood` | poisonous_to_humans | `1` / empty | Inconsistent. Wormwood IS toxic (contains thujone). Both should be `1`. |
| `herb-sorrel-common` / `garden-sorrel` / `sorrel` | poisonous_to_pets | empty / `0` / `1` | Inconsistent. Sorrel contains oxalic acid, mildly toxic to pets in quantity. |
| `herb-comfrey` | poisonous_to_humans | `1` | Debatable. Comfrey contains pyrrolizidine alkaloids and is not recommended for internal use, but external use is traditional. Flagging as poisonous is on the safe side. |

---

## Summary

### Error counts by category

| Category | Count | Notes |
|----------|-------|-------|
| **1. Taxonomy / Scientific Names** | 7 | 3 wrong genus, 2 Perenual mismatches, 1 missing scientific_name, 1 spelling |
| **2. Growing Conditions** | ~20 | Wrong zones, wrong sun, wrong frost tolerance, wrong min_temp_c |
| **3. Calendar / Timing** | ~45+ | Wrong sow months, missing harvest for all herbs (~30), wrong pruning for Prunus (~7), missing planting months |
| **4. Plant Characteristics (Safety)** | ~45+ | ~15 wrong poisonous flags, ~25+ wrong edible_fruit/edible_leaf flags, several wrong categories |
| **5. Companion Planting / Rotation** | ~40+ | ~30+ missing rotation groups, ~10 incorrect rotation groups |
| **6. Days to Maturity** | 4 | Wrong maturity_basis values |
| **7. Data Quality** | ~35+ | ~25+ duplicate pairs, 5 empty shell rows, widespread format inconsistencies |

### Total estimated errors: ~196+

### Priority items (safety-critical)

1. **Sour cherry flagged as poisonous and inedible** -- users may avoid a perfectly safe fruit
2. **Parsnip flagged as poisonous** -- a common food crop
3. **Hellebore, iris, bleeding heart NOT flagged as poisonous** -- could lead to accidental ingestion
4. **Daylily NOT flagged as toxic to cats** -- this is a known feline killer
5. **Hosta NOT flagged as toxic to pets** -- common source of pet poisoning
6. **Multiple edible fruits (cherry, plum, walnut, hazelnut, chestnut, grape, kiwi, etc.) flagged as inedible** -- major data integrity issue
7. **Prunus species pruning in winter** -- silver leaf disease risk for plum, damson, cherry, apricot, nectarine, gage
8. **Orange row has apple (Malus) genus and Perenual data** -- completely wrong species linked
