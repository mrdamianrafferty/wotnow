-- =============================================================================
-- Migration: 20260306004_populate_days_to_maturity
-- Purpose:   Populate days_to_maturity_min, days_to_maturity_max, maturity_basis,
--            and maturity_notes for allotment/garden plant species.
-- Source:    RHS guidelines, Garden Organic, and established UK horticultural
--            practice. All figures are calibrated for UK growing conditions.
--
-- Methodology notes:
--   - 'from_sowing' is used where seeds are typically direct-sown or where the
--     RHS quotes maturity from seed (e.g., radish, carrot, beetroot, peas).
--   - 'from_transplant' is used where plants are almost always started under
--     glass and transplanted (e.g., tomato, aubergine, pepper, leek, celery).
--   - For crops where both approaches are common (e.g., lettuce, brassicas),
--     the dominant UK practice determines the basis; the notes field clarifies.
--   - Perennial crops that require multi-year establishment (asparagus, rhubarb,
--     all top and soft fruit, woody herbs) use high values (365+) to prevent
--     the app showing a misleading short countdown.
--   - Ranges reflect earliest early-variety to latest maincrop variety in UK
--     conditions; a specific variety will sit towards one end of the range.
--   - Courgette/cucumber/squash days are from transplanting of module-raised
--     plants, which is standard UK practice under glass or outdoors post-frost.
-- =============================================================================

-- -------------------------
-- VEGETABLES
-- -------------------------

-- Tomato (Solanum lycopersicum)
-- RHS: 60-85 days from transplant outdoors; indoor/greenhouse crop 55-75 days.
-- Transplanted as young plants after last frost (~mid-May outdoors).
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 85,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Cherry types ripen earliest (~60 days); beefsteak types need up to 85 days. Outdoor UK harvest typically August–October.'
WHERE slug = 'tomato';

-- Potato (Solanum tuberosum)
-- RHS: earlies 60-70 days from planting tubers; second earlies 70-90 days;
-- maincrops 90-120 days. Basis is from planting (equivalent to transplant/sett).
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 120,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'First earlies 60-70 days; second earlies 70-90 days; maincrops 90-120 days from planting chitted seed potatoes.'
WHERE slug = 'potato';

-- Carrot (Daucus carota)
-- RHS: 12-16 weeks (84-112 days) from sowing; earlies can be 70-80 days.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 112,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Early varieties (e.g., Amsterdam Forcing) ready in 70-80 days; maincrops 100-112 days. Harvest baby carrots from 60 days.'
WHERE slug = 'carrot';

-- Beetroot (Beta vulgaris subsp. vulgaris)
-- RHS: 8-12 weeks (56-84 days) from sowing for baby beets; 90-100 days for
-- full-size roots.
UPDATE public.plant_species
SET
  days_to_maturity_min = 56,
  days_to_maturity_max = 100,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Baby beets harvested from 56 days; full-size roots 80-100 days. Bolt-resistant varieties essential for early spring sowings.'
WHERE slug = 'beetroot';

-- Lettuce (Lactuca sativa)
-- RHS: loose-leaf 45-60 days; hearting types 60-80 days from sowing.
-- Direct sowing is most common UK practice.
UPDATE public.plant_species
SET
  days_to_maturity_min = 45,
  days_to_maturity_max = 80,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Loose-leaf and cut-and-come-again types ready in 45-60 days; hearting varieties (butterhead, cos) take 60-80 days.'
WHERE slug = 'lettuce';

-- Onion (Allium cepa)
-- RHS: from sets, 20-24 weeks (140-168 days) from planting; from seed 24-30 weeks.
-- Sets are standard UK practice; basis is from_transplant (sets = transplant equivalent).
UPDATE public.plant_species
SET
  days_to_maturity_min = 140,
  days_to_maturity_max = 168,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'From sets planted March-April; bulbs ready July-August when foliage topples. Seed-raised onions add 4-6 weeks.'
WHERE slug = 'onion';

-- Garlic (Allium sativum)
-- RHS: autumn-planted garlic 36-40 weeks (252-280 days) from planting to harvest
-- the following summer. Spring-planted is shorter but yields less well.
UPDATE public.plant_species
SET
  days_to_maturity_min = 210,
  days_to_maturity_max = 280,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Autumn-planted cloves (October-November) harvested June-July: approximately 36-40 weeks. Spring-planted garlic is ready in 210-240 days but produces smaller bulbs.'
WHERE slug = 'garlic';

-- Pea (Pisum sativum)
-- RHS: 60-70 days for earlies; 70-80 days for maincrop; from direct sowing.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 80,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'First early varieties (e.g., Feltham First) ready in 60-65 days; maincrop types (e.g., Alderman) take 70-80 days from sowing.'
WHERE slug = 'pea';

-- Dwarf French bean / bean (Phaseolus vulgaris)
-- RHS: 50-60 days from sowing outdoors after last frost.
UPDATE public.plant_species
SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 65,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Direct-sow outdoors from mid-May after frosts pass. Pods ready to pick in 50-65 days. Pick regularly to prolong cropping.'
WHERE slug = 'bean';

-- Broad bean (Vicia faba)
-- RHS: autumn-sown overwintered plants ready May-June; spring-sown ready
-- June-July. Approximately 90-120 days from spring sowing; 200-240 days
-- from autumn sowing. Using spring-sow basis as primary.
UPDATE public.plant_species
SET
  days_to_maturity_min = 90,
  days_to_maturity_max = 120,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Spring sowings (February-April) ready in 90-120 days. Autumn sowings overwinter and crop earlier the following summer; those are harvested approximately 200 days after sowing.'
WHERE slug = 'broad-bean';

-- Runner bean (Phaseolus coccineus)
-- RHS: 60-70 days from sowing/planting outdoors; harvest continues for weeks
-- if picked regularly.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 75,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Sow outdoors from late May after frosts; pods ready from August onwards in 60-75 days. Pick every 2-3 days to maintain yield.'
WHERE slug = 'runner-bean';

-- Courgette (Cucurbita pepo)
-- RHS: 45-65 days from transplanting module-raised plants outdoors.
UPDATE public.plant_species
SET
  days_to_maturity_min = 45,
  days_to_maturity_max = 65,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Raised under glass from late April, transplanted outdoors late May after frosts. First courgettes ready 45-65 days after transplanting. Harvest at 15-20 cm for best flavour.'
WHERE slug = 'courgette';

-- Cucumber (Cucumis sativus)
-- RHS: 50-70 days from transplant. Greenhouse types are faster than outdoor/ridge types.
UPDATE public.plant_species
SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 70,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Greenhouse varieties ready in 50-60 days from transplanting; outdoor ridge cucumbers take 60-70 days. Harvest frequently to maintain production.'
WHERE slug = 'cucumber';

-- Pumpkin (Cucurbita maxima / C. pepo)
-- RHS: 90-110 days from transplanting outdoors. Needs full growing season.
UPDATE public.plant_species
SET
  days_to_maturity_min = 90,
  days_to_maturity_max = 120,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Sow under glass in late April; transplant late May. Large-fruited varieties need 100-120 days to mature; smaller types 90-100 days. Harvest before first frosts.'
WHERE slug = 'pumpkin';

-- Squash (Cucurbita pepo / C. maxima)
-- RHS: summer squash 50-60 days; winter squash 90-110 days from transplant.
UPDATE public.plant_species
SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 110,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Summer squash (patty-pan, etc.) ready in 50-60 days; winter storage squash (butternut, Crown Prince) needs 90-110 days from transplant.'
WHERE slug = 'squash';

-- Sweetcorn (Zea mays)
-- RHS: 70-90 days from transplanting module-raised plants or from direct sowing
-- under fleece. Module-raising is standard UK practice.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Raise under glass from late April; plant out in blocks (for pollination) from late May. Cobs ready July-September, 70-90 days after transplanting. Test by pressing a kernel; milky sap = ripe.'
WHERE slug = 'sweetcorn';

-- Cabbage (Brassica oleracea Capitata Group)
-- RHS: spring cabbages 130-150 days from summer sowing; summer cabbages 80-100
-- days from transplant; winter cabbages 120-180 days from transplant.
-- Using transplant basis (brassicas are always module-raised in UK practice).
UPDATE public.plant_species
SET
  days_to_maturity_min = 80,
  days_to_maturity_max = 180,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Summer/autumn cabbages: 80-100 days from transplanting. Spring cabbages: sown July-August, transplanted September, harvested following April-May (180+ days). Winter varieties: 120-180 days from transplant.'
WHERE slug = 'cabbage';

-- Broccoli (Brassica oleracea Italica Group) - calabrese and sprouting
-- RHS: calabrese 70-90 days from transplant; purple sprouting broccoli 150-250
-- days from transplant (overwintered).
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 250,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Calabrese (green-headed broccoli) ready in 70-90 days from transplant in summer. Purple sprouting broccoli is overwintered; planted July-August, it spears February-April (150-250 days).'
WHERE slug = 'broccoli';

-- Cauliflower (Brassica oleracea Botrytis Group)
-- RHS: summer varieties 70-90 days from transplant; autumn/winter varieties
-- 120-200 days from transplant.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 200,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Summer cauliflower: 70-90 days from transplant. Autumn/winter varieties: 120-200 days. Blanch white curds by tying outer leaves over the head once visible.'
WHERE slug = 'cauliflower';

-- Kale (Brassica oleracea Acephala Group)
-- RHS: 60-90 days from transplant; leaves can be harvested progressively from
-- outside inwards throughout autumn and winter.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'First leaves harvestable 60-90 days after transplanting. Curly kale and Cavolo Nero both suitable; harvest outer leaves only to keep plant productive through winter.'
WHERE slug = 'kale';

-- Brussels sprout (Brassica oleracea Gemmifera Group)
-- RHS: long season crop — sow February-March, transplant April-May,
-- harvest October-February. Approximately 180-250 days from transplant.
UPDATE public.plant_species
SET
  days_to_maturity_min = 180,
  days_to_maturity_max = 250,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Transplanted April-May; buttons ready from October, peak November-January. Full season 180-250 days from transplant. Frost improves flavour. Harvest from the base of the stem upwards.'
WHERE slug = 'brussels-sprout';

-- Spinach (Spinacia oleracea)
-- RHS: 40-60 days from direct sowing. Quick-maturing salad/cooking crop.
UPDATE public.plant_species
SET
  days_to_maturity_min = 40,
  days_to_maturity_max = 60,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Baby leaf ready in 40 days; full leaf spinach in 50-60 days. Bolts rapidly in heat; sow little and often March-May and August-September for a continuous supply.'
WHERE slug = 'spinach';

-- Chard (Beta vulgaris subsp. cicla)
-- RHS: 50-60 days from direct sowing. Pick-and-come-again over a long season.
UPDATE public.plant_species
SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 70,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'First stems harvestable 50-70 days after sowing. Pick outer stems to encourage regrowth. Will overwinter in most UK regions for spring harvests.'
WHERE slug = 'chard';

-- Radish (Raphanus sativus)
-- RHS: fastest UK vegetable — summer varieties ready in 20-30 days; winter/
-- mooli types take 60-70 days. Direct-sown.
UPDATE public.plant_species
SET
  days_to_maturity_min = 20,
  days_to_maturity_max = 70,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Summer radishes (e.g., French Breakfast, Cherry Belle) ready in 20-30 days. Winter/mooli varieties take 60-70 days. Harvest promptly as summer types go pithy quickly.'
WHERE slug = 'radish';

-- Turnip (Brassica rapa subsp. rapa)
-- RHS: baby turnips 35-40 days; maincrop 60-80 days from direct sowing.
UPDATE public.plant_species
SET
  days_to_maturity_min = 35,
  days_to_maturity_max = 80,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Baby turnips ready in 35-40 days; golf-ball size is ideal. Maincrop turnips for storage need 60-80 days. Sow March-July for succession.'
WHERE slug = 'turnip';

-- Parsnip (Pastinaca sativa)
-- RHS: slow to mature — 120-160 days from sowing (February-April) to harvest
-- from September onwards. Frost sweetens the roots.
UPDATE public.plant_species
SET
  days_to_maturity_min = 120,
  days_to_maturity_max = 160,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Slow to establish; sow thinly February-April. Roots are ready from September onwards, 120-160 days after sowing. Flavour improves markedly after first frosts. Can be left in ground all winter.'
WHERE slug = 'parsnip';

-- Leek (Allium porrum)
-- RHS: sown January-March under glass, transplanted June; harvest September-
-- March. Approximately 120-180 days from transplanting.
UPDATE public.plant_species
SET
  days_to_maturity_min = 120,
  days_to_maturity_max = 180,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Sow January-March under glass; transplant into trenches June when pencil-thick. Early varieties (e.g., King Richard) ready September-October; late varieties (e.g., Musselburgh) October-March.'
WHERE slug = 'leek';

-- Celery (Apium graveolens var. dulce)
-- RHS: self-blanching celery 100-120 days from transplanting; trench celery
-- 120-150 days.
UPDATE public.plant_species
SET
  days_to_maturity_min = 100,
  days_to_maturity_max = 150,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Raise under glass from February; transplant June. Self-blanching varieties (planted in blocks) ready August-September (100-120 days). Trench celery takes 120-150 days and requires earthing up.'
WHERE slug = 'celery';

-- Aubergine (Solanum melongena)
-- RHS: 70-90 days from transplanting into greenhouse or sheltered outdoor spot.
-- Long growing season; needs warm conditions throughout.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Sow under heat January-March; transplant into greenhouse or very sheltered outdoor position in late May. Fruits ready August-September, 70-90 days from transplanting. Best in unheated greenhouse in most UK regions.'
WHERE slug = 'aubergine';

-- Sweet pepper (Capsicum annuum)
-- RHS: 70-90 days from transplanting; ripening from green to red/yellow/orange
-- adds a further 2-3 weeks.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 95,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Sow February-March under heat; transplant to greenhouse or sheltered spot late May. Green peppers harvestable in 70 days; allow a further 2-3 weeks for full colour ripening. Best cropped under glass in UK.'
WHERE slug = 'pepper';

-- Chilli (Capsicum annuum / C. chinense)
-- RHS: 70-100 days from transplanting to first ripe fruits; long-season types
-- (habanero, scotch bonnet) up to 120 days.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 120,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Sow January-February under heat for long season. Mild varieties (e.g., Anaheim) ready in 70-80 days; medium-hot in 80-100 days; super-hot varieties (habanero, Carolina Reaper) may need 100-120 days. Greenhouse essential in UK.'
WHERE slug = 'chilli';

-- Spring onion / salad onion (Allium cepa)
-- RHS: 60-70 days from direct sowing. Sow successionally every 3 weeks.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 70,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Direct sow March-August; ready to pull in 60-70 days. White Lisbon is the standard UK variety. Sow successionally every 3 weeks for continuous harvest.'
WHERE slug = 'spring-onion';

-- Swede (Brassica napus subsp. rapifera)
-- RHS: 120-150 days from direct sowing (May-June) to harvest from October.
UPDATE public.plant_species
SET
  days_to_maturity_min = 120,
  days_to_maturity_max = 150,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Sow direct May-June; roots ready from October, 120-150 days after sowing. Hardy through winter. Lift as needed or store in sand.'
WHERE slug = 'swede';

-- French bean (same as bean for slug purposes but listed separately)
-- RHS: 50-65 days from outdoor sowing after last frost.
UPDATE public.plant_species
SET
  days_to_maturity_min = 50,
  days_to_maturity_max = 65,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Direct sow outdoors from mid-May after frosts. Climbing French beans take slightly longer (55-65 days) than dwarf types (50-60 days). Pick young for best flavour.'
WHERE slug = 'french-bean';

-- Rocket (Eruca vesicaria subsp. sativa)
-- RHS: 25-40 days from sowing for salad leaves. Very fast-growing.
UPDATE public.plant_species
SET
  days_to_maturity_min = 25,
  days_to_maturity_max = 40,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Baby leaves ready in 25 days; full-size salad leaves in 40 days. Wild rocket (Diplotaxis tenuifolia) is slower but more peppery. Cut and come again; sow successionally to avoid bolting.'
WHERE slug = 'rocket';

-- Watercress (Nasturtium officinale)
-- RHS: 40-60 days from sowing or rooted cuttings to first harvest.
UPDATE public.plant_species
SET
  days_to_maturity_min = 40,
  days_to_maturity_max = 60,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Ready to harvest in 40-60 days from sowing. Requires consistently moist soil or standing water. Cut shoots regularly to prevent bolting. Can be grown in containers stood in trays of water.'
WHERE slug = 'watercress';

-- Asparagus (Asparagus officinalis)
-- RHS: perennial — crowns take 2-3 years to establish before cropping begins.
-- Year 1: no harvest. Year 2: limited harvest. Year 3+: full cropping.
-- Using 730 days (2 years) as minimum establishment period.
UPDATE public.plant_species
SET
  days_to_maturity_min = 730,
  days_to_maturity_max = 1095,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Perennial crop. Plant 1-year-old crowns in spring; do NOT harvest in year 1 (allow full fern growth). Harvest lightly in year 2 for 2-3 weeks; full 6-8 week harvest from year 3 onwards. Bed productive for 20+ years.'
WHERE slug = 'asparagus';

-- Rhubarb (Rheum x hybridum)
-- RHS: plant crowns or divisions autumn/spring; do not harvest year 1;
-- light harvest year 2; full harvest year 3+.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 730,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Perennial. Plant divisions autumn or early spring. Year 1: no harvest — allow establishment. Year 2: pull 1-2 stems only. Full harvest from year 3 (April-June, stopping in mid-June). Forcing possible year 3+.'
WHERE slug = 'rhubarb';

-- -------------------------
-- HERBS
-- -------------------------

-- Basil (Ocimum basilicum)
-- RHS: 60-75 days from sowing to first harvest. Tender annual.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 75,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Tender annual; sow under glass from April. First leaves harvestable 60-75 days after sowing. Pinch out flower buds to prolong leaf production. Outdoors in UK only June-September.'
WHERE slug = 'basil';

-- Parsley (Petroselinum crispum)
-- RHS: famously slow to germinate; 70-90 days from sowing to usable harvest.
-- Biennial treated as annual in UK gardens.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Notoriously slow germinater (3-6 weeks); first harvest in 70-90 days. Sow March-July. Flat-leaf parsley is slightly faster and more flavoursome than curly. Soak seeds overnight to improve germination.'
WHERE slug = 'parsley';

-- Coriander (Coriandrum sativum)
-- RHS: 40-60 days from sowing to first leaf harvest; bolts rapidly so succession
-- sow every 3 weeks.
UPDATE public.plant_species
SET
  days_to_maturity_min = 40,
  days_to_maturity_max = 60,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Fast-growing but bolt-prone; first harvest in 40-60 days. Use slow-bolt varieties (e.g., Leisure). Sow direct in situ — dislikes root disturbance. Sow every 3 weeks for continuous supply.'
WHERE slug = 'coriander';

-- Mint (Mentha spp.)
-- RHS: perennial — harvest from established plants within the same season;
-- new plants from divisions or rooted cuttings harvestable in 60-90 days.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy perennial; new plants from rooted cuttings or divisions ready to harvest lightly in 60-90 days. Grow in containers to restrict its invasive root system. Harvest shoots regularly to maintain bushiness.'
WHERE slug = 'mint';

-- Rosemary (Salvia rosmarinus, formerly Rosmarinus officinalis)
-- RHS: woody perennial shrub. Cuttings or young plants productive within 1-2
-- years; seed-raised is much slower. Use 365-730 days to reflect establishment.
UPDATE public.plant_species
SET
  days_to_maturity_min = 180,
  days_to_maturity_max = 365,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy evergreen shrub; light trimming can begin 6 months after transplanting, though plants establish better if left to grow for a full year first. Reach productive size in 2 years. Very long-lived once established.'
WHERE slug = 'rosemary';

-- Thyme (Thymus vulgaris)
-- RHS: low-growing perennial shrub; cuttings or young plants harvestable lightly
-- within 3-6 months of planting; productive establishment in 6-12 months.
UPDATE public.plant_species
SET
  days_to_maturity_min = 90,
  days_to_maturity_max = 180,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy dwarf shrub; light harvest possible from 90 days after transplanting. Plants reach full productivity at 6-12 months. Replace every 3-4 years as plants become woody. Propagate by cuttings easily.'
WHERE slug = 'thyme';

-- Sage (Salvia officinalis)
-- RHS: hardy evergreen sub-shrub; cuttings/young plants usable within
-- 4-6 months of planting; productive from 6-12 months.
UPDATE public.plant_species
SET
  days_to_maturity_min = 120,
  days_to_maturity_max = 180,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy sub-shrub; light harvest from 4 months after transplanting. Full productive size in 6-12 months. Replace every 4-5 years as stems become woody. Harvest before flowering for best flavour.'
WHERE slug = 'sage';

-- Chives (Allium schoenoprasum)
-- RHS: from seed 70-90 days; from divisions much faster — harvestable in 30-45 days.
-- Using seed-based timing as primary.
UPDATE public.plant_species
SET
  days_to_maturity_min = 70,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Perennial; from seed, harvestable in 70-90 days. Divide established clumps every 3 years. Cut leaves 5 cm above soil; regrows quickly. Allow to flower (edible, pollinator-friendly) once per season.'
WHERE slug = 'chives';

-- Dill (Anethum graveolens)
-- RHS: 40-60 days from sowing to first leaf harvest; feathery seedlings
-- from 30 days. Annual; dislikes root disturbance.
UPDATE public.plant_species
SET
  days_to_maturity_min = 40,
  days_to_maturity_max = 60,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Fast-growing annual; feathery leaves harvestable from 40 days. Sow direct in situ — bolt-prone if root-disturbed at transplanting. Sow successionally April-July. Allow some plants to set seed for self-seeding next year.'
WHERE slug = 'dill';

-- Oregano (Origanum vulgare)
-- RHS: hardy perennial; from cuttings/divisions productive in 60-90 days;
-- from seed slightly slower (90-120 days).
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 120,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy perennial; harvestable from 60-90 days after transplanting. Flavour is most intense just before flowering in summer. Cut back after flowering to encourage fresh growth. Greek oregano is more aromatic than common marjoram.'
WHERE slug = 'oregano';

-- Lavender (Lavandula angustifolia)
-- RHS: ornamental/culinary shrub — young plants usable after 1 full growing
-- season; productive harvest from year 2.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 540,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy evergreen shrub grown mainly for flower spikes and fragrance. Young plants flower lightly in year 1 but are best left to establish; substantial harvest of flower spikes from year 2. Trim after flowering to maintain compact shape.'
WHERE slug = 'lavender';

-- Bay (Laurus nobilis)
-- RHS: large evergreen shrub/tree; leaves harvestable year-round once established
-- but plants need 1-2 years to put on sufficient growth.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 730,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Hardy evergreen tree/shrub; individual leaves can be picked from planting, but significant harvest requires 1-2 years of establishment. Slow-growing; eventual height 8 m+ if unpruned. Excellent in containers clipped as standards or pyramids.'
WHERE slug = 'bay';

-- Fennel (Foeniculum vulgare)
-- RHS: perennial herb — leaf harvest from 60-90 days; Florence fennel (bulb)
-- is treated separately but shares this slug in many datasets.
-- Using leaf fennel perennial timing here.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_sowing',
  maturity_notes       = 'Hardy perennial herb (bronze or green fennel); feathery leaves harvestable from 60-90 days after sowing. Self-seeds freely — deadhead to control spread. Florence fennel (bulb type) is an annual and requires 90-110 days to form a bulb from transplant.'
WHERE slug = 'fennel';

-- Lemon balm (Melissa officinalis)
-- RHS: vigorous hardy perennial; established plants harvestable within 60-90
-- days of planting from rooted cuttings/divisions.
UPDATE public.plant_species
SET
  days_to_maturity_min = 60,
  days_to_maturity_max = 90,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Vigorous hardy perennial; harvestable in 60-90 days after transplanting. Spreads freely — grow in containers or divide annually. Harvest before flowering for best lemony flavour. Makes excellent tea and companion plant for pollinators.'
WHERE slug = 'lemon-balm';

-- Tarragon (Artemisia dracunculus)
-- RHS: French tarragon (true culinary variety) is sterile and propagated by
-- division/cuttings; productive harvest from 90-120 days after transplanting.
UPDATE public.plant_species
SET
  days_to_maturity_min = 90,
  days_to_maturity_max = 120,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Use French tarragon (A. dracunculus var. sativa) not Russian — the latter is inferior in flavour. French tarragon cannot be grown from seed; propagate by division in spring. Harvestable in 90-120 days. Dies back in winter; mulch the crown.'
WHERE slug = 'tarragon';

-- -------------------------
-- FRUIT
-- -------------------------

-- Strawberry (Fragaria x ananassa)
-- RHS: runners planted in summer fruit the following June (approximately 240-300
-- days); bare-root runners planted spring fruit in 90-120 days the same year
-- if remontant. Established beds fruit annually. Using transplant basis.
UPDATE public.plant_species
SET
  days_to_maturity_min = 90,
  days_to_maturity_max = 365,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Plant summer runners (July-August) for main crop the following June (300+ days). Plant bare-root in spring for same-year fruiting from perpetual/remontant varieties (90-120 days). Beds productive for 3-4 years; replace with virus-free runners annually thereafter.'
WHERE slug = 'strawberry';

-- Raspberry (Rubus idaeus)
-- RHS: summer-fruiting canes planted autumn/early spring crop the following
-- July-August (8-12 months); autumn-fruiting canes (primocanes) planted spring
-- crop September-October the same year (approximately 180-210 days).
UPDATE public.plant_species
SET
  days_to_maturity_min = 180,
  days_to_maturity_max = 540,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Autumn-fruiting varieties (e.g., Autumn Bliss) crop in year 1, approximately 180-210 days from spring planting. Summer-fruiting varieties (e.g., Glen Ample) produce on second-year canes; first proper crop 12-18 months after planting.'
WHERE slug = 'raspberry';

-- Blackberry (Rubus fruticosus)
-- RHS: vigorous perennial; canes planted autumn/spring will fruit the following
-- summer. First significant crop approximately 12-18 months after planting.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 540,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Plant bare-root canes in winter or container plants spring-autumn. First fruiting August-October approximately 12-18 months after planting. Very vigorous — train onto wires and prune out fruited canes each autumn.'
WHERE slug = 'blackberry';

-- Blueberry (Vaccinium corymbosum)
-- RHS: requires acid soil (pH 4.0-5.5); plants take 2-3 years to crop well.
-- Modest harvest possible in year 2; full crop from year 3-4.
UPDATE public.plant_species
SET
  days_to_maturity_min = 730,
  days_to_maturity_max = 1095,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Requires acid soil pH 4.0-5.5 (ericaceous compost/rainwater irrigation essential). Year 1: no harvest. Year 2: small harvest. Full crop from year 3. Buy 2 different varieties for cross-pollination. Productive for 20+ years.'
WHERE slug = 'blueberry';

-- Gooseberry (Ribes uva-crispa)
-- RHS: bare-root bushes planted winter; first decent crop year 2 after planting.
-- Lightly cropping year 1 possible from established plants.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 730,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Plant bare-root November-March; small year 1 harvest possible. Productive crops from year 2-3. Pick unripe (green) for cooking from June; ripe dessert gooseberries ready July. Productive for 15+ years.'
WHERE slug = 'gooseberry';

-- Blackcurrant (Ribes nigrum)
-- RHS: plant bare-root November-March; cut back hard after planting to 2 buds
-- above ground. Very light harvest year 1; full crop from year 2.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 540,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Plant bare-root and cut all stems to 2 buds above ground to encourage a strong multi-stemmed base. First small crop in year 2 (July-August). Full crop from year 3. Fruits on young wood — prune out a third of the oldest stems each year.'
WHERE slug = 'blackcurrant';

-- Redcurrant (Ribes rubrum)
-- RHS: similar to blackcurrant but fruits on old wood (spurs); lighter pruning.
-- First crop year 2; full crop year 3. Harvest June-July.
UPDATE public.plant_species
SET
  days_to_maturity_min = 365,
  days_to_maturity_max = 540,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Plant bare-root November-March; unlike blackcurrant, do NOT cut back hard — fruits on spurs on old wood. Small crop possible in year 2; full crop year 3. Harvest July when strings of berries are fully coloured. Also train as cordons against a fence.'
WHERE slug = 'redcurrant';

-- Apple (Malus domestica)
-- RHS: grafted trees on dwarfing rootstock (M27, M9) may bear small crops in
-- year 2-3; semi-dwarfing (M26, MM106) in year 3-4; standard rootstocks 5-7 years.
-- Using M26/MM106 (most common garden choice) as reference.
UPDATE public.plant_species
SET
  days_to_maturity_min = 1095,
  days_to_maturity_max = 1825,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Grafted trees on semi-dwarfing rootstock (M26/MM106) begin cropping in years 3-5 (1095-1825 days). Dwarfing M9 rootstock may crop from year 2. Always plant 2 trees for cross-pollination (or check a neighbour has a compatible variety). Full yield by year 6-10.'
WHERE slug = 'apple';

-- Pear (Pyrus communis)
-- RHS: slower to come into bearing than apple — grafted trees typically 3-5
-- years on Quince A rootstock (most common); may take longer.
UPDATE public.plant_species
SET
  days_to_maturity_min = 1095,
  days_to_maturity_max = 1825,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Grafted on Quince A (semi-dwarfing) rootstock; first fruits typically years 3-5. Quince C (more dwarfing) may crop from year 2-3. Pears need a warm sheltered spot; train as espaliers against a south-facing wall for best crops in UK.'
WHERE slug = 'pear';

-- Plum (Prunus domestica)
-- RHS: grafted trees on Pixy (dwarfing) or St Julien A (semi-vigorous) rootstock;
-- first fruits in years 3-5; full crop years 5-8.
UPDATE public.plant_species
SET
  days_to_maturity_min = 1095,
  days_to_maturity_max = 1825,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Grafted on St Julien A or Pixy rootstock; first fruits years 3-5. Includes damsons, gages, and mirabelles. Biennial bearing common — thin fruitlets to 5-8 cm apart to discourage. Harvest July-September depending on variety.'
WHERE slug = 'plum';

-- Cherry (Prunus avium / P. cerasus)
-- RHS: grafted on Gisela 5 (dwarfing) rootstock; first fruits years 3-5.
-- Acid/morello cherries slightly earlier than sweet cherries.
UPDATE public.plant_species
SET
  days_to_maturity_min = 1095,
  days_to_maturity_max = 1825,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Grafted on Gisela 5 (dwarfing) rootstock; sweet cherries fruit years 3-5. Morello (acid) cherries crop earlier and do well on north-facing walls. Most modern sweet cherries are self-fertile; older varieties need pollinators. Harvest June-August.'
WHERE slug = 'cherry';

-- Fig (Ficus carica)
-- RHS: container-grown figs may fruit in years 2-3 (root restriction required);
-- open ground figs take 3-5 years and often grow too vigorously without a
-- lined planting pit.
UPDATE public.plant_species
SET
  days_to_maturity_min = 730,
  days_to_maturity_max = 1825,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'In UK conditions, figs require root restriction to fruit reliably (plant in lined pit 60 cm cubed, or large container). Container figs may ripen first crop in year 2-3; open-ground figs take 3-5 years. Harvest August-September when fruits hang soft and a drop of nectar appears at the eye.'
WHERE slug = 'fig';

-- Grape (Vitis vinifera)
-- RHS: vines planted in their first year should have all grapes removed to
-- encourage stem growth; first harvest in year 3; full crop year 4-5.
UPDATE public.plant_species
SET
  days_to_maturity_min = 730,
  days_to_maturity_max = 1460,
  maturity_basis       = 'from_transplant',
  maturity_notes       = 'Year 1-2: remove all flower trusses to build a strong rod structure. First crop in year 3 (limited); full crop from year 4-5. In UK, dessert grapes require a greenhouse or very warm south-facing wall. Outdoor varieties (e.g., Boskoop Glory, Muscat Bleu) best for wine/eating outdoors.'
WHERE slug = 'grape';
