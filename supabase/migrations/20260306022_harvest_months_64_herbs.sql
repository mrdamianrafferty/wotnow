BEGIN;

-- ============================================================
-- Harvest months for 64 herb/plant species
-- UK / Ireland temperate maritime climate
-- 1 = January ... 12 = December
-- ============================================================

-- LEAF HERBS — harvested during active growing season
-- --------------------------------------------------------

-- Anise hyssop: leaves mid-summer through autumn; flowers July–Sept
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'anise-hyssop';

-- Herb anise hyssop (duplicate entry with herb- prefix)
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'herb-anise-hyssop';

-- Catmint (ornamental): leaves spring through autumn
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'catmint';

-- Herb catmint (ornamental form)
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'herb-catmint-ornamental';

-- Catnip: leaves spring through early autumn
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'herb-catnip';

-- Chervil: cool-season leaf herb; best spring and autumn (bolts in summer heat)
UPDATE plant_species SET harvest_months = ARRAY[3,4,5,9,10,11]::integer[]
WHERE slug = 'chervil';

-- Corsican mint: tiny-leaved ground cover; leaves all season
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9,10]::integer[]
WHERE slug = 'corsican-mint';

-- Epazote: warm-season leaf herb; summer through early autumn in UK
UPDATE plant_species SET harvest_months = ARRAY[7,8,9]::integer[]
WHERE slug = 'epazote';

-- Fennel (perennial): leaves from spring; seeds late summer/autumn
UPDATE plant_species SET harvest_months = ARRAY[4,5,6,7,8,9]::integer[]
WHERE slug = 'fennel-perennial';

-- Garden sorrel: leaves early spring through autumn (cut-and-come-again)
UPDATE plant_species SET harvest_months = ARRAY[3,4,5,6,7,8,9,10]::integer[]
WHERE slug = 'garden-sorrel';

-- Sheep sorrel: leaves spring through early autumn
UPDATE plant_species SET harvest_months = ARRAY[4,5,6,7,8,9]::integer[]
WHERE slug = 'sheep-sorrel';

-- Sheep sorrel (duplicate slug variant)
UPDATE plant_species SET harvest_months = ARRAY[4,5,6,7,8,9]::integer[]
WHERE slug = 'sheep-sorrel-2';

-- Gotu kola: tropical herb; UK growing season only (greenhouse/polytunnel)
UPDATE plant_species SET harvest_months = ARRAY[7,8,9]::integer[]
WHERE slug = 'herb-gotu-kola';

-- Hyssop: leaves and flowering tops; summer
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'hyssop';

-- Herb hyssop (duplicate with herb- prefix)
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'herb-hyssop';

-- Lemon balm: leaves spring through autumn (cut-and-come-again)
UPDATE plant_species SET harvest_months = ARRAY[4,5,6,7,8,9,10]::integer[]
WHERE slug = 'lemon-balm';

-- Lemon verbena: leaves summer through early autumn (frost-tender in UK)
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'herb-lemon-verbena';

-- Monarda (bergamot / bee balm): leaves and flower heads; summer
UPDATE plant_species SET harvest_months = ARRAY[6,7,8]::integer[]
WHERE slug = 'monarda';

-- Monarda wild: same as above
UPDATE plant_species SET harvest_months = ARRAY[6,7,8]::integer[]
WHERE slug = 'monarda-wild';

-- Mugwort: leaves spring through summer before flowering
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8]::integer[]
WHERE slug = 'mugwort';

-- Oregano (Greek): leaves from early summer; peak before/during flowering
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'herb-oregano-greek';

-- Pennyroyal: leaves summer through early autumn
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'pennyroyal';

-- Rue: leaves spring through summer (harvest before full flower)
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8]::integer[]
WHERE slug = 'rue';

-- Self-heal (Prunella vulgaris): aerial parts when in flower; summer
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'self-heal';

-- Southernwood: leaves summer through early autumn
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'southernwood';

-- Stevia: leaves summer through early autumn (frost-tender)
UPDATE plant_species SET harvest_months = ARRAY[7,8,9]::integer[]
WHERE slug = 'herb-stevia';

-- Sweet woodruff: leaves and stems spring; harvest before or just at flowering
UPDATE plant_species SET harvest_months = ARRAY[4,5,6]::integer[]
WHERE slug = 'herb-sweet-woodruff';

-- Thyme (creeping): leaves spring through autumn
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'thyme-creeping';

-- Thyme (lemon): leaves spring through autumn
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'herb-thyme-lemon';

-- Woolly thyme: leaves spring through autumn
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'woolly-thyme';

-- Wormwood: leaves and shoots; late spring through summer
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8]::integer[]
WHERE slug = 'wormwood';

-- Herb wormwood (duplicate with herb- prefix)
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8]::integer[]
WHERE slug = 'herb-wormwood';

-- Verbena blue (Verbena hastata): aerial parts when flowering; summer
UPDATE plant_species SET harvest_months = ARRAY[7,8,9]::integer[]
WHERE slug = 'verbena-blue';

-- ============================================================
-- FLOWER / FLOWERING-TOP HERBS
-- ============================================================

-- Coltsfoot: flowers very early spring before leaves emerge
UPDATE plant_species SET harvest_months = ARRAY[2,3]::integer[]
WHERE slug = 'coltsfoot';

-- Feverfew: flowers harvested in bloom; leaves available earlier
UPDATE plant_species SET harvest_months = ARRAY[6,7,8]::integer[]
WHERE slug = 'feverfew';

-- Joe Pye Weed: flowers late summer through early autumn
UPDATE plant_species SET harvest_months = ARRAY[8,9]::integer[]
WHERE slug = 'joe-pye-weed';

-- Milk thistle: seeds harvested after flowering; flowers June–Sept, seeds Aug–Oct
UPDATE plant_species SET harvest_months = ARRAY[8,9,10]::integer[]
WHERE slug = 'herb-milk-thistle';

-- Sage (pineapple): leaves all season; flowers late summer
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'herb-sage-pineapple';

-- Skullcap: aerial parts when in flower; summer
UPDATE plant_species SET harvest_months = ARRAY[6,7,8]::integer[]
WHERE slug = 'herb-skullcap';

-- St John's Wort: flowers and buds at peak flowering
UPDATE plant_species SET harvest_months = ARRAY[6,7,8]::integer[]
WHERE slug = 'herb-st-johns-wort';

-- Tansy: leaves and flowers; summer
UPDATE plant_species SET harvest_months = ARRAY[7,8,9]::integer[]
WHERE slug = 'tansy';

-- Herb tansy (duplicate with herb- prefix)
UPDATE plant_species SET harvest_months = ARRAY[7,8,9]::integer[]
WHERE slug = 'herb-tansy';

-- ============================================================
-- ROOT HERBS — harvested in autumn or early spring
-- ============================================================

-- Angelica: roots harvested in autumn of first year; leaves in spring/summer
UPDATE plant_species SET harvest_months = ARRAY[9,10,11]::integer[]
WHERE slug = 'herb-angelica';

-- Burdock: roots harvested in autumn of first year
UPDATE plant_species SET harvest_months = ARRAY[9,10,11]::integer[]
WHERE slug = 'burdock';

-- Comfrey (cut-and-come-again; leaves and root):
-- Leaves: multiple cuts spring–autumn; roots: autumn
UPDATE plant_species SET harvest_months = ARRAY[4,5,6,7,8,9,10]::integer[]
WHERE slug = 'herb-comfrey';

-- Russian comfrey: same as comfrey — prolific cut-and-come-again
UPDATE plant_species SET harvest_months = ARRAY[4,5,6,7,8,9,10]::integer[]
WHERE slug = 'russian-comfrey';

-- Marshmallow: roots harvested autumn of second year; leaves in summer
UPDATE plant_species SET harvest_months = ARRAY[9,10,11]::integer[]
WHERE slug = 'herb-marshmallow';

-- Valerian: roots harvested autumn of second year
UPDATE plant_species SET harvest_months = ARRAY[9,10,11]::integer[]
WHERE slug = 'valerian';

-- Herb valerian (duplicate with herb- prefix)
UPDATE plant_species SET harvest_months = ARRAY[9,10,11]::integer[]
WHERE slug = 'herb-valerian';

-- Yellow dock: roots harvested autumn
UPDATE plant_species SET harvest_months = ARRAY[9,10,11]::integer[]
WHERE slug = 'yellow-dock';

-- Mullein: leaves (first year rosette) spring through summer; flowers second year July–Sept
UPDATE plant_species SET harvest_months = ARRAY[6,7,8,9]::integer[]
WHERE slug = 'mullein';

-- ============================================================
-- MIXED-USE / SEED HERBS
-- ============================================================

-- Anise (buckwheat family): seeds harvested late summer
-- Buckwheat: seeds (grain) harvested late summer/early autumn
UPDATE plant_species SET harvest_months = ARRAY[8,9]::integer[]
WHERE slug = 'buckwheat';

-- ============================================================
-- GREEN MANURES — cut/incorporated before or just at flowering
-- Months indicate when crop is typically turned in
-- ============================================================

-- Crimson clover: sown autumn or spring; cut April–June before full flower
UPDATE plant_species SET harvest_months = ARRAY[4,5,6]::integer[]
WHERE slug = 'crimson-clover';

-- Italian ryegrass: overwintered; cut and incorporated spring
UPDATE plant_species SET harvest_months = ARRAY[3,4,5]::integer[]
WHERE slug = 'italian-ryegrass';

-- Kidney vetch: summer sown; cut midsummer
UPDATE plant_species SET harvest_months = ARRAY[6,7,8]::integer[]
WHERE slug = 'kidney-vetch';

-- Lupin (yellow): spring sown; incorporated before pods set, early summer
UPDATE plant_species SET harvest_months = ARRAY[6,7]::integer[]
WHERE slug = 'lupin-yellow';

-- Oats (green manure): spring or autumn sown; incorporated spring before heading
UPDATE plant_species SET harvest_months = ARRAY[4,5]::integer[]
WHERE slug = 'oats-green-manure';

-- Perennial pea: cut periodically through growing season
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'perennial-pea';

-- Phacelia: fast-growing; incorporated just before or at first flower, late spring–summer
UPDATE plant_species SET harvest_months = ARRAY[5,6,7]::integer[]
WHERE slug = 'phacelia-covercrop';

-- Red clover: incorporated late spring or cut multiple times through season
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'red-clover';

-- Rye (cereal): overwintered; incorporated spring before stem extension
UPDATE plant_species SET harvest_months = ARRAY[3,4,5]::integer[]
WHERE slug = 'rye-cereal';

-- Sweet clover: incorporated in second year spring before it flowers, or end of first year
UPDATE plant_species SET harvest_months = ARRAY[5,6,7]::integer[]
WHERE slug = 'sweet-clover';

-- Vetch (common): overwintered; incorporated spring when just flowering
UPDATE plant_species SET harvest_months = ARRAY[4,5,6]::integer[]
WHERE slug = 'vetch-common';

-- White clover: cut periodically through season as living mulch/green manure
UPDATE plant_species SET harvest_months = ARRAY[5,6,7,8,9]::integer[]
WHERE slug = 'white-clover';

COMMIT;
