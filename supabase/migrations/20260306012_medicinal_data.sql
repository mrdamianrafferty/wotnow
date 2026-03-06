-- Migration: Medicinal data for all 458 plant species
-- Sets medicinal_use (all), medicinal_method (medicinal plants), medicinal boolean (97 NULLs only)
BEGIN;

-- ============================================================
-- FRUIT (4 species)
-- ============================================================

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in vitamin C and anthocyanins; traditionally used to support immune function and reduce inflammation. Blackcurrant seed oil is associated with anti-inflammatory effects.',
  medicinal_method = 'Fresh or dried berries, juice, seed oil capsule'
WHERE slug = 'fruit-blackcurrant';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used as a mild diuretic and to support kidney function. Rich in vitamin C and organic acids; associated with mild astringent properties.',
  medicinal_method = 'Fresh fruit, juice, leaf infusion'
WHERE slug = 'fruit-currant';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used to support digestive health and as a mild laxative. Rich in vitamin C and organic acids; associated with mild diuretic and anti-inflammatory properties.',
  medicinal_method = 'Fresh fruit, juice, leaf infusion'
WHERE slug = 'fruit-gooseberry';

UPDATE plant_species SET
  medicinal_use = 'Leaf tea traditionally used as a mild diuretic and astringent. Fruits are rich in vitamin C and ellagic acid; associated with urinary tract support in folk medicine.',
  medicinal_method = 'Leaf infusion, fresh fruit'
WHERE slug = 'wild-strawberry';

-- ============================================================
-- FRUIT-TREE (50 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'No widely recognised medicinal use. Apples contain pectin and polyphenols associated with general digestive support, but clinical evidence for specific therapeutic use is insufficient.'
WHERE slug = 'fruit-apple';

UPDATE plant_species SET
  medicinal_use = 'Kernel oil traditionally used in Chinese medicine for cough and as an emollient. Fruit associated with digestive support; amygdalin in kernels is toxic in quantity — internal use of kernels is not recommended.',
  medicinal_method = 'Fruit consumed fresh; kernel oil (external only)'
WHERE slug = 'fruit-apricot';

UPDATE plant_species SET
  medicinal_use = 'Associated with cardiovascular support due to high anthocyanin and polyphenol content. Traditionally used in North American folk medicine for urinary tract health and as an antioxidant-rich tonic.',
  medicinal_method = 'Fresh or dried berries, juice, extract capsule'
WHERE slug = 'fruit-aronia';

UPDATE plant_species SET
  medicinal_use = 'Fruits rich in lycopene and flavonoids; traditionally used in Asian medicine to support liver function and as a nutritive tonic. Associated with antioxidant and anti-inflammatory properties.',
  medicinal_method = 'Fresh or dried fruit, fruit tea'
WHERE slug = 'fruit-autumn-olive';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Hull and bark traditionally used by Native Americans as an antimicrobial and for skin conditions. Juglone-containing extracts associated with antifungal properties; internal use of unripe hulls is not recommended due to toxicity.',
  medicinal_method = 'Leaf or hull tincture (external); nut consumed as food'
WHERE slug = 'fruit-black-walnut';

UPDATE plant_species SET
  medicinal_use = 'Bark and unripe fruit used in traditional South American medicine as an anthelmintic and to support digestive health. Seeds contain cytotoxic acetogenins — internal use requires caution.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'fruit-cherimoya';

UPDATE plant_species SET
  medicinal_use = 'No widely recognised medicinal use beyond general nutritional value. Sour cherries contain anthocyanins associated with anti-inflammatory properties in dietary contexts.'
WHERE slug = 'fruit-cherry-sour';

UPDATE plant_species SET
  medicinal_use = 'No widely recognised medicinal use beyond general nutritional value. Fruit stalks have been used in folk medicine as a mild diuretic infusion.'
WHERE slug = 'fruit-cherry-sweet';

UPDATE plant_species SET
  medicinal_use = 'Widely used in Traditional Chinese Medicine to support cardiovascular function, improve digestion, and reduce blood pressure. Associated with hawthorn-class cardiotonic activity supported by moderate clinical evidence.',
  medicinal_method = 'Dried fruit decoction, extract, jam'
WHERE slug = 'fruit-chinese-haw';

UPDATE plant_species SET
  medicinal_use = 'Bark and fruit used in traditional European and Middle Eastern medicine as an astringent for diarrhoea and fever. Fruit associated with antioxidant properties; bark decoction used for wounds.',
  medicinal_method = 'Bark decoction, fresh or dried fruit'
WHERE slug = 'fruit-cornelian-cherry';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use distinct from other plum varieties. Fruit consumed as food; prune preparations from related plums are associated with laxative effects.'
WHERE slug = 'fruit-damson';

UPDATE plant_species SET
  medicinal_use = 'Flowers and berries widely used in European folk medicine for immune support, cold and flu relief, and as a diuretic. Supported by moderate clinical evidence for reducing cold duration. Raw berries and all other parts contain cyanogenic glycosides and should not be consumed raw.',
  medicinal_method = 'Flower infusion, berry syrup or tincture (cooked/prepared only)'
WHERE slug = 'fruit-elder';

UPDATE plant_species SET
  medicinal_use = 'Same species as Elder (Sambucus nigra); flowers and cooked berries traditionally used for immune support and cold relief. Raw berries toxic — must be cooked before use.',
  medicinal_method = 'Flower infusion, cooked berry syrup'
WHERE slug = 'fruit-elder-black-lace';

UPDATE plant_species SET
  medicinal_use = 'Fruit used in South American folk medicine as a digestive aid and for urinary tract support. Associated with antimicrobial properties; evidence is limited to traditional use.',
  medicinal_method = 'Fresh fruit, fruit tea'
WHERE slug = 'fruit-feijoa';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Mediterranean and Middle Eastern medicine for digestive complaints, constipation, and sore throats. Latex from unripe fruit applied topically for warts in folk medicine.',
  medicinal_method = 'Dried fruit consumed as food/laxative; latex applied topically'
WHERE slug = 'fruit-fig';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use distinct from other Prunus plum varieties. Nutritionally comparable to other plums.'
WHERE slug = 'fruit-gage';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used by Indigenous North American peoples as a food and mild medicinal plant. Bark tea associated with anti-inflammatory use; evidence is limited to traditional and ethnobotanical records.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'fruit-hackberry';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Used in Traditional Chinese Medicine to support digestion and as a general tonic. Fruit extracts associated with antioxidant and anti-inflammatory properties; clinical evidence is limited.',
  medicinal_method = 'Fresh fruit, extract'
WHERE slug = 'fruit-hardy-kiwi';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent and anti-inflammatory. Catkin tea used for fever and urinary complaints; evidence is largely traditional.',
  medicinal_method = 'Bark or leaf decoction, catkin infusion'
WHERE slug = 'fruit-hazelnut';

UPDATE plant_species SET
  medicinal_use = 'Berry extracts associated with antioxidant properties and used in Russian folk medicine as a general tonic. Contains iridoids similar to other Lonicera species; evidence is limited.',
  medicinal_method = 'Fresh berries, extract'
WHERE slug = 'fruit-honeyberry-treeform';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. A hybrid of pear and rowan with no established traditional or clinical medicinal application.'
WHERE slug = 'fruit-hybrid-shipova';

UPDATE plant_species SET
  medicinal_use = 'Same species as common juniper; berries traditionally used as a diuretic, digestive stimulant, and urinary antiseptic. Associated with antimicrobial properties. Contraindicated in pregnancy and kidney disease.',
  medicinal_method = 'Dried berries as condiment or decoction; essential oil (external)'
WHERE slug = 'fruit-jostaberry-treeform';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Berries traditionally used as a diuretic, digestive stimulant, and urinary tract antiseptic. Associated with antimicrobial properties. Contraindicated in pregnancy and kidney disease; prolonged internal use not recommended.',
  medicinal_method = 'Dried berry infusion or decoction, essential oil (external only)'
WHERE slug = 'fruit-juniper-berry';

UPDATE plant_species SET
  medicinal_use = 'Lemon juice and peel widely used in traditional medicine for digestive support, vitamin C deficiency, and as an antimicrobial. Flavonoids in peel associated with anti-inflammatory properties.',
  medicinal_method = 'Fresh juice, peel infusion, essential oil (external)'
WHERE slug = 'fruit-lemon';

UPDATE plant_species SET
  medicinal_use = 'Fruit juice traditionally used for digestive and urinary support; associated with antimicrobial properties similar to lemon. Peel contains flavonoids with anti-inflammatory associations.',
  medicinal_method = 'Fresh juice, peel infusion'
WHERE slug = 'fruit-lime';

UPDATE plant_species SET
  medicinal_use = 'Leaf traditionally used in Chinese and Japanese medicine for coughs, sore throats, and digestive complaints. Associated with anti-inflammatory and expectorant properties; evidence is moderate from in vitro studies.',
  medicinal_method = 'Dried leaf infusion, leaf syrup'
WHERE slug = 'fruit-loquat';

UPDATE plant_species SET
  medicinal_use = 'Peel and fruit associated with flavonoid-rich antioxidant properties. Traditionally used in Chinese medicine for digestive support and as a mild expectorant. Peel oil used in aromatherapy.',
  medicinal_method = 'Fresh fruit, peel infusion, peel essential oil'
WHERE slug = 'fruit-mandarin';

UPDATE plant_species SET
  medicinal_use = 'Closely related to common hawthorn (Crataegus monogyna); berries traditionally used in the southern United States for cardiovascular support and digestive complaints. Evidence is largely traditional.',
  medicinal_method = 'Dried berry decoction, jelly'
WHERE slug = 'fruit-mayhaw';

UPDATE plant_species SET
  medicinal_use = 'Astringent fruit traditionally used in European folk medicine for digestive complaints, diarrhoea, and as a source of tannins. Associated with mild astringent and antioxidant properties.',
  medicinal_method = 'Bletted fruit consumed as food; decoction of dried fruit'
WHERE slug = 'fruit-medlar';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use distinct from other Prunus domestica cultivars. Nutritionally comparable to other plums.'
WHERE slug = 'fruit-mirabelle';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Berries traditionally used in European folk medicine to support urinary function and as a mild diuretic. Vitamin C-rich fruit associated with immune support; evidence is largely traditional.',
  medicinal_method = 'Dried berry decoction, berry jelly'
WHERE slug = 'fruit-mountain-ash';

UPDATE plant_species SET
  medicinal_use = 'Leaf and bark used in traditional medicine as an anthelmintic and for blood sugar management. Fruit associated with antioxidant properties; mulberry leaf extract studied for glycaemic effects with moderate evidence.',
  medicinal_method = 'Dried leaf infusion, fruit juice'
WHERE slug = 'fruit-mulberry-black';

UPDATE plant_species SET
  medicinal_use = 'Leaf widely used in Traditional Chinese Medicine for cough, fever, and blood sugar support. Leaf extract associated with antidiabetic properties supported by moderate clinical evidence.',
  medicinal_method = 'Dried leaf infusion, leaf extract capsule'
WHERE slug = 'fruit-mulberry-white';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond nutritional value. Closely related to peach; fruit contains amygdalin in kernels which is toxic.'
WHERE slug = 'fruit-nectarine';

UPDATE plant_species SET
  medicinal_use = 'Olive leaf and oil have well-recognised associations with cardiovascular health and anti-inflammatory effects. Olive leaf extract studied for blood pressure support with moderate clinical evidence. Olive oil is associated with Mediterranean diet health benefits.'
WHERE slug = 'fruit-olive';

UPDATE plant_species SET
  medicinal_use = 'No widely recognised specific medicinal use. Fruit is nutritionally rich; flavonoids and vitamin C associated with general immune and cardiovascular support in dietary context.'
WHERE slug = 'fruit-orange';

UPDATE plant_species SET
  medicinal_use = 'Bark and root traditionally used by Indigenous North American peoples for anthelmintic and antimicrobial purposes. Seed and bark contain cytotoxic compounds (acetogenins); internal use should be treated with caution.',
  medicinal_method = 'Bark decoction (traditional use only); fruit consumed as food'
WHERE slug = 'fruit-pawpaw';

UPDATE plant_species SET
  medicinal_use = 'No widely recognised medicinal use beyond nutritional value. Fruit contains amygdalin in kernels, which is toxic in quantity.'
WHERE slug = 'fruit-peach';

UPDATE plant_species SET
  medicinal_use = 'Fruit traditionally used in European folk medicine as a mild diuretic and for digestive complaints. Pectin-rich fruit associated with digestive support; evidence is largely traditional.',
  medicinal_method = 'Fresh fruit, fruit juice, poached fruit'
WHERE slug = 'fruit-pear';

UPDATE plant_species SET
  medicinal_use = 'Fruit used in Traditional Chinese and Japanese medicine for digestive support, cough relief, and as an astringent. Tannin-rich unripe fruit associated with antidiarrhoeal properties.',
  medicinal_method = 'Dried or fresh fruit, fruit extract'
WHERE slug = 'fruit-persimmon';

UPDATE plant_species SET
  medicinal_use = 'Fruit and bark have traditional use in European folk medicine as a mild laxative and for digestive support. Amygdalin in kernels is toxic — kernels should not be consumed.',
  medicinal_method = 'Dried fruit consumed as food/laxative'
WHERE slug = 'fruit-plum';

UPDATE plant_species SET
  medicinal_use = 'Widely used in traditional medicine across cultures for cardiovascular support, anti-inflammatory effects, and urinary tract health. Rind, juice, and seed extracts are all associated with medicinal properties supported by moderate clinical evidence.',
  medicinal_method = 'Fresh juice, rind decoction, seed extract'
WHERE slug = 'fruit-pomegranate';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Used by Aboriginal Australians as a food and medicinal plant; fruit associated with antioxidant and anti-inflammatory properties. Traditionally used for kidney health; evidence is largely ethnobotanical.',
  medicinal_method = 'Fresh or dried fruit'
WHERE slug = 'fruit-quandong';

UPDATE plant_species SET
  medicinal_use = 'Fruit mucilage and pectin traditionally used in European medicine as a demulcent for sore throats and digestive complaints. Seed decoction used as an expectorant and topical soothing agent.',
  medicinal_method = 'Fruit decoction, seed mucilage infusion'
WHERE slug = 'fruit-quince';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Berries and bark traditionally used by Indigenous North American peoples as a tonic, for digestive complaints, and eye inflammation. Evidence is largely ethnobotanical.',
  medicinal_method = 'Dried berry infusion, bark decoction'
WHERE slug = 'fruit-saskatoon';

UPDATE plant_species SET
  medicinal_use = 'Berries exceptionally rich in vitamin C and carotenoids; traditionally used in Siberian and Mongolian medicine as an immune tonic and wound-healing agent. Associated with anti-inflammatory and hepatoprotective properties; moderate clinical evidence.',
  medicinal_method = 'Berry juice, berry oil (external and internal), dried berries'
WHERE slug = 'fruit-sea-buckthorn';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and berries used in traditional North American medicine by Indigenous peoples for eye complaints and as a general tonic. Evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction, dried berry infusion'
WHERE slug = 'fruit-serviceberry';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent for diarrhoea and inflammatory conditions. Tannin-rich bark associated with wound-healing properties.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'fruit-sweet-chestnut';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Leaf, bark, and green hull traditionally used in European and Middle Eastern medicine as an astringent, antifungal, and for skin conditions. Juglone has documented antimicrobial properties.',
  medicinal_method = 'Leaf or hull decoction (external); nut consumed as food'
WHERE slug = 'fruit-walnut';


-- ============================================================
-- HERB (98 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'Traditionally used as a digestive tonic, for mild respiratory complaints, and as an expectorant. Associated with antimicrobial and antifungal properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, tincture'
WHERE slug = 'anise-hyssop';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rutin-rich plant associated with supporting blood vessel integrity and reducing inflammation. Traditionally used in folk medicine for circulatory support; rutin content is well-documented.',
  medicinal_method = 'Seed flour, herbal tea from leaves/flowers'
WHERE slug = 'buckwheat';

UPDATE plant_species SET
  medicinal_use = 'Root widely used in traditional European and Asian medicine as a liver tonic, diuretic, and for skin conditions including eczema and psoriasis. Associated with prebiotic (inulin) and mild anti-inflammatory properties.',
  medicinal_method = 'Root decoction, root tincture, dried root capsule'
WHERE slug = 'burdock';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used as a mild sedative, for digestive complaints, and to relieve cold symptoms. Associated with antispasmodic and mild diaphoretic properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf and flower infusion, tincture'
WHERE slug = 'catmint';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in European folk medicine as a digestive stimulant and mild diuretic. Associated with mild antimicrobial properties from volatile oils; evidence is limited to traditional use.',
  medicinal_method = 'Dried leaf infusion, fresh herb in food'
WHERE slug = 'chervil';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used as a mild antimicrobial and digestive herb. Associated with similar but milder properties to garlic; allicin content lower than garlic. Used in folk medicine for respiratory and digestive support.',
  medicinal_method = 'Fresh herb in food, infusion'
WHERE slug = 'chive';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Leaf has a long history of use in European and North American folk medicine for cough, bronchitis, and respiratory complaints. Contains pyrrolizidine alkaloids which are hepatotoxic — internal use is not recommended; external and very short-term use only.',
  medicinal_method = 'Dried leaf infusion (short-term only, external poultice)'
WHERE slug = 'coltsfoot';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Ayurvedic and Middle Eastern medicine for digestive complaints, bloating, and as an anti-inflammatory. Seed extract associated with hypoglycaemic properties; evidence is moderate.',
  medicinal_method = 'Dried seed infusion, seed tincture, fresh leaf in food'
WHERE slug = 'coriander';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with other mints; traditionally used as a mild digestive herb and for headaches. Associated with carminative and antispasmodic properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion'
WHERE slug = 'corsican-mint';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and North American folk medicine for respiratory complaints and as a mild expectorant. Isoflavone content associated with mild oestrogenic activity; use in hormone-sensitive conditions requires caution.',
  medicinal_method = 'Dried flower infusion, tincture'
WHERE slug = 'crimson-clover';

UPDATE plant_species SET
  medicinal_use = 'Seeds traditionally used in European and Asian medicine as a carminative for bloating, indigestion, and infantile colic. Associated with antimicrobial and mild antispasmodic properties.',
  medicinal_method = 'Dried seed infusion, seed chewing, tincture'
WHERE slug = 'dill';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Historically used in Mexican and Central American medicine as an anthelmintic and for digestive complaints. Contains ascaridole which is toxic in concentrated form — use with caution; internal use of concentrated extract not recommended.',
  medicinal_method = 'Fresh herb in small quantities as food flavouring (traditional culinary use only)'
WHERE slug = 'epazote';

UPDATE plant_species SET
  medicinal_use = 'Seeds and leaf traditionally used in European medicine for digestive complaints, bloating, and as a mild expectorant for coughs. Associated with oestrogenic properties from anethole.',
  medicinal_method = 'Seed or leaf infusion, tincture, seed chewing'
WHERE slug = 'fennel-perennial';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used for migraine prevention, particularly in European herbal medicine. Associated with anti-inflammatory and platelet-aggregation inhibitory properties; moderate clinical evidence for migraine prophylaxis.',
  medicinal_method = 'Dried leaf infusion, fresh leaf (eaten in small amounts), standardised extract capsule'
WHERE slug = 'feverfew';

UPDATE plant_species SET
  medicinal_use = 'Leaf traditionally used as a mild diuretic and for digestive complaints. High oxalic acid content limits large-scale consumption; associated with mild astringent properties.',
  medicinal_method = 'Fresh leaf in food, leaf infusion'
WHERE slug = 'garden-sorrel';

UPDATE plant_species SET
  medicinal_use = 'Root and seed used in European herbal medicine for digestive complaints, flatulence, and as an expectorant for bronchitis. Root used topically for wound healing; contraindicated in pregnancy and with photosensitising drugs.',
  medicinal_method = 'Root decoction, seed infusion, root tincture'
WHERE slug = 'herb-angelica';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used as a digestive tonic, for mild respiratory complaints, and as an expectorant. Associated with antimicrobial and antifungal properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, tincture'
WHERE slug = 'herb-anise-hyssop';

UPDATE plant_species SET
  medicinal_use = 'Shares the medicinal properties of sweet basil; used in traditional medicine for digestive support and as a mild anti-inflammatory. Eugenol content associated with mild analgesic and antimicrobial properties.',
  medicinal_method = 'Fresh or dried herb infusion, essential oil (external)'
WHERE slug = 'herb-basil-greek';

UPDATE plant_species SET
  medicinal_use = 'Used in traditional medicine across cultures for digestive support, mild anti-inflammatory effects, and as a mild antimicrobial. Eugenol content associated with mild analgesic properties.',
  medicinal_method = 'Fresh or dried herb infusion, essential oil (external)'
WHERE slug = 'herb-basil-sweet';

UPDATE plant_species SET
  medicinal_use = 'Used in Thai and Southeast Asian traditional medicine for digestive complaints and as an anti-inflammatory. Eugenol and estragole content associated with mild antimicrobial properties.',
  medicinal_method = 'Fresh herb in food, dried herb infusion'
WHERE slug = 'herb-basil-thai';

UPDATE plant_species SET
  medicinal_use = 'Leaf traditionally used in European medicine as a digestive stimulant, carminative, and mild expectorant. Associated with antimicrobial properties; lauric acid content has documented antimicrobial activity.',
  medicinal_method = 'Dried leaf infusion, leaf decoction as gargle'
WHERE slug = 'herb-bay-laurel';

UPDATE plant_species SET
  medicinal_use = 'Flower and leaf traditionally used in European folk medicine as a mild demulcent, for adrenal support, and to soothe respiratory inflammation. Seed oil (GLA-rich) associated with anti-inflammatory properties; pyrrolizidine alkaloids present — internal use with caution.',
  medicinal_method = 'Flower infusion, seed oil (external)'
WHERE slug = 'herb-borage';

UPDATE plant_species SET
  medicinal_use = 'Flower widely used in European herbal medicine for wound healing, skin inflammation, and antifungal effects. Associated with anti-inflammatory and vulnerary properties; supported by moderate clinical evidence for topical use.',
  medicinal_method = 'Dried flower infusion, topical cream or oil, tincture'
WHERE slug = 'herb-calendula';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used as a mild sedative, for digestive complaints, and to relieve cold symptoms. Associated with antispasmodic and mild diaphoretic properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf and flower infusion, tincture'
WHERE slug = 'herb-catmint-ornamental';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and North American herbal medicine as a mild sedative, for colic in infants, and to relieve cold symptoms and fever. Associated with nepetalactone-mediated mild sedative effects.',
  medicinal_method = 'Dried leaf infusion, tincture'
WHERE slug = 'herb-catnip';

UPDATE plant_species SET
  medicinal_use = 'Widely used in European herbal medicine for digestive complaints, mild anxiety, insomnia, and skin inflammation. Associated with apigenin-mediated anxiolytic and anti-inflammatory effects; moderate clinical evidence for digestive and mild sedative use.',
  medicinal_method = 'Dried flower infusion, topical cream, tincture'
WHERE slug = 'herb-chamomile-german';

UPDATE plant_species SET
  medicinal_use = 'Used similarly to German chamomile for digestive complaints, anxiety, and topical anti-inflammatory use. Roman chamomile is more commonly used in aromatherapy; evidence is largely traditional.',
  medicinal_method = 'Dried flower infusion, essential oil (aromatherapy, external)'
WHERE slug = 'herb-chamomile-roman';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a mild diuretic and digestive stimulant. Associated with mild antimicrobial properties from volatile oils; evidence is limited to traditional use.',
  medicinal_method = 'Dried leaf infusion, fresh herb in food'
WHERE slug = 'herb-chervil';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used as a mild antimicrobial and digestive herb. Associated with similar but milder properties to garlic; used in folk medicine for respiratory and digestive support.',
  medicinal_method = 'Fresh herb in food, infusion'
WHERE slug = 'herb-chives-common';

UPDATE plant_species SET
  medicinal_use = 'Leaf and root traditionally used in European herbal medicine for wound healing, bone and joint inflammation, and as a topical vulnerary. Contains allantoin, which promotes cell proliferation. Internal use is not recommended due to pyrrolizidine alkaloid content; external use only.',
  medicinal_method = 'Topical cream or poultice from fresh or dried leaf; root ointment (external only)'
WHERE slug = 'herb-comfrey';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Ayurvedic and Middle Eastern medicine for digestive complaints, bloating, and as an anti-inflammatory. Seed extract associated with hypoglycaemic properties; evidence is moderate.',
  medicinal_method = 'Dried seed infusion, fresh leaf in food'
WHERE slug = 'herb-coriander-leaf';

UPDATE plant_species SET
  medicinal_use = 'Seeds traditionally used as a carminative for bloating, indigestion, and infantile colic. Associated with antimicrobial and mild antispasmodic properties.',
  medicinal_method = 'Dried seed infusion, seed chewing'
WHERE slug = 'herb-dill-leaf';

UPDATE plant_species SET
  medicinal_use = 'Seed and leaf traditionally used in European medicine for digestive complaints, bloating, and as a mild expectorant. Associated with oestrogenic properties from anethole.',
  medicinal_method = 'Seed or leaf infusion, tincture'
WHERE slug = 'herb-fennel-leaf';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Widely used in Ayurvedic medicine for wound healing, cognitive support, and as an adaptogen. Associated with promoting collagen synthesis and neuroprotective effects; moderate clinical evidence for wound healing and cognitive function.',
  medicinal_method = 'Fresh leaf in food, dried leaf infusion, extract capsule'
WHERE slug = 'herb-gotu-kola';

UPDATE plant_species SET
  medicinal_use = 'One of the most important Ayurvedic herbs; used as an adaptogen for stress, immune support, respiratory complaints, and to support blood glucose regulation. Associated with a wide range of clinical applications; moderate to good clinical evidence for adaptogenic effects.',
  medicinal_method = 'Dried leaf infusion, tincture, extract capsule, fresh leaf in food'
WHERE slug = 'herb-holy-basil';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European herbal medicine for respiratory complaints, coughs, and sore throats. Associated with expectorant and antimicrobial properties; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, syrup, tincture'
WHERE slug = 'herb-hyssop';

UPDATE plant_species SET
  medicinal_use = 'Widely used in European and North American herbal medicine as a mild sedative, for anxiety, insomnia, and digestive complaints. Associated with GABA-modulating properties; moderate clinical evidence for anxiety and sleep support.',
  medicinal_method = 'Dried leaf infusion, tincture, essential oil (aromatherapy)'
WHERE slug = 'herb-lemon-balm';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in South American and European folk medicine as a digestive tonic, for anxiety, and mild sedation. Associated with anti-inflammatory and mild analgesic properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, tincture'
WHERE slug = 'herb-lemon-verbena';

UPDATE plant_species SET
  medicinal_use = 'Root and seed used in European herbal medicine as a diuretic, digestive stimulant, and expectorant. Associated with anti-inflammatory properties; evidence is largely traditional.',
  medicinal_method = 'Root decoction, seed infusion, tincture'
WHERE slug = 'herb-lovage';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European medicine for digestive complaints, as a mild antiseptic, and for cough. Shares properties with oregano; associated with antimicrobial and carminative effects.',
  medicinal_method = 'Dried herb infusion, tincture, essential oil (external)'
WHERE slug = 'herb-marjoram-sweet';

UPDATE plant_species SET
  medicinal_use = 'Root and leaf mucilage widely used in European herbal medicine as a demulcent for sore throats, dry coughs, and gastrointestinal irritation. Polysaccharide mucilage supports local soothing effects; traditional use well-supported.',
  medicinal_method = 'Root cold infusion, dried leaf infusion, root syrup'
WHERE slug = 'herb-marshmallow';

UPDATE plant_species SET
  medicinal_use = 'Seed widely used in European and North American herbal medicine for liver protection and to support liver function in toxic injury. Silymarin complex is supported by moderate clinical evidence for hepatoprotective effects.',
  medicinal_method = 'Standardised seed extract capsule, seed infusion'
WHERE slug = 'herb-milk-thistle';

UPDATE plant_species SET
  medicinal_use = 'One of the most studied medicinal herbs; traditionally used and clinically supported for digestive complaints, irritable bowel syndrome, nausea, and headache. Menthol associated with analgesic, antispasmodic, and antimicrobial effects.',
  medicinal_method = 'Dried leaf infusion, enteric-coated essential oil capsule, essential oil (external/inhalation)'
WHERE slug = 'herb-mint-peppermint';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used for digestive support, mild nausea, and oral hygiene. Associated with carminative and mild antimicrobial properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, essential oil (external, oral hygiene)'
WHERE slug = 'herb-mint-spearmint';

UPDATE plant_species SET
  medicinal_use = 'Widely used in traditional medicine and as a culinary herb with antimicrobial properties. Associated with thymol and carvacrol-mediated antimicrobial and anti-inflammatory effects; evidence is moderate for antimicrobial activity.',
  medicinal_method = 'Dried herb infusion, essential oil (external), tincture'
WHERE slug = 'herb-oregano';

UPDATE plant_species SET
  medicinal_use = 'Higher thymol and carvacrol content than common oregano; associated with stronger antimicrobial and anti-inflammatory properties. Used similarly to common oregano in traditional medicine.',
  medicinal_method = 'Dried herb infusion, essential oil (external)'
WHERE slug = 'herb-oregano-greek';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and Ayurvedic medicine as a diuretic, to support kidney function, and for digestive complaints. Rich in apiol and myristicin; large quantities may be toxic. Contraindicated in pregnancy.',
  medicinal_method = 'Dried leaf or root infusion (moderate quantities only)'
WHERE slug = 'herb-parsley-curly';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with curly parsley; traditionally used as a diuretic and digestive herb. Rich in flavonoids and volatile oils. Contraindicated in pregnancy in medicinal doses.',
  medicinal_method = 'Dried leaf or root infusion (moderate quantities only)'
WHERE slug = 'herb-parsley-flat';

UPDATE plant_species SET
  medicinal_use = 'Widely used in European and Ayurvedic medicine for memory support, digestive complaints, scalp health, and as a mild antimicrobial. Associated with rosmarinic acid and carnosic acid antioxidant effects; moderate clinical evidence.',
  medicinal_method = 'Dried herb infusion, tincture, essential oil (external/inhalation)'
WHERE slug = 'herb-rosemary';

UPDATE plant_species SET
  medicinal_use = 'Widely used in European herbal medicine for sore throats, menopausal symptoms, and digestive complaints. Associated with rosmarinic acid anti-inflammatory and oestrogenic effects; moderate clinical evidence for menopausal symptom relief.',
  medicinal_method = 'Dried leaf infusion, gargle, tincture'
WHERE slug = 'herb-sage-common';

UPDATE plant_species SET
  medicinal_use = 'Shares anti-inflammatory properties with common sage; traditionally used for digestive and mild throat complaints. Less studied than Salvia officinalis; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, tincture'
WHERE slug = 'herb-sage-pineapple';

UPDATE plant_species SET
  medicinal_use = 'Same species as common sage (Salvia officinalis); shares all recognised medicinal properties including use for sore throats, digestive complaints, and menopausal symptoms.',
  medicinal_method = 'Dried leaf infusion, gargle, tincture'
WHERE slug = 'herb-sage-purple';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a digestive herb, antiseptic, and mild expectorant. Associated with antimicrobial properties similar to thyme; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'herb-savoury-summer';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in European folk medicine as a digestive herb, antiseptic, and for respiratory complaints. Closely related to summer savoury; associated with antimicrobial properties.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'herb-savoury-winter';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in North American herbal medicine as a mild sedative and nervine for anxiety, insomnia, and nervous system support. Associated with GABA-modulating properties; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'herb-skullcap';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Leaf traditionally used as a mild diuretic and for digestive complaints. High oxalic acid content limits large-scale consumption; associated with mild astringent properties.',
  medicinal_method = 'Fresh leaf in food, leaf infusion'
WHERE slug = 'herb-sorrel-common';

UPDATE plant_species SET
  medicinal_use = 'One of the most widely studied herbal medicines; associated with mild to moderate depression management, anxiety, and menopausal symptoms. Supported by good clinical evidence for mild depression. Significant drug interactions — reduces efficacy of oral contraceptives, anticoagulants, antiretrovirals, and many other medications.',
  medicinal_method = 'Standardised extract capsule, dried herb infusion, tincture'
WHERE slug = 'herb-st-johns-wort';

UPDATE plant_species SET
  medicinal_use = 'Leaf extracts used as a natural zero-calorie sweetener; associated with mild antihypertensive properties in some studies. Evidence for therapeutic medicinal use beyond sweetening is limited.',
  medicinal_method = 'Dried leaf infusion, leaf extract powder'
WHERE slug = 'herb-stevia';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a mild diuretic, for liver support, and as a mild sedative. Coumarin content associated with blood-thinning properties; should not be used in large quantities.',
  medicinal_method = 'Dried herb infusion (small amounts only)'
WHERE slug = 'herb-sweet-woodruff';

UPDATE plant_species SET
  medicinal_use = 'Historically used in European folk medicine as an anthelmintic, insect repellent, and to stimulate digestion. Contains high thujone content which is toxic in concentrated form — internal use is not recommended. External use as insect repellent has traditional support.',
  medicinal_method = 'External repellent, dried herb (very small quantities only in traditional use)'
WHERE slug = 'herb-tansy';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in French and European herbal medicine as a digestive stimulant, mild sedative, and for menstrual irregularity. Associated with mild antispasmodic effects; contraindicated in pregnancy in medicinal doses.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'herb-tarragon-french';

UPDATE plant_species SET
  medicinal_use = 'One of the best-evidenced medicinal herbs; traditionally and clinically used for coughs, bronchitis, and upper respiratory infections. Thymol associated with strong antimicrobial and expectorant properties; good clinical evidence.',
  medicinal_method = 'Dried herb infusion, syrup, tincture, essential oil (inhalation/external)'
WHERE slug = 'herb-thyme-common';

UPDATE plant_species SET
  medicinal_use = 'Shares the antimicrobial and expectorant properties of common thyme; traditionally used for respiratory complaints and digestive support. Lemon-scented volatile oils associated with mild antimicrobial effects.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'herb-thyme-lemon';

UPDATE plant_species SET
  medicinal_use = 'Root widely used in European and North American herbal medicine as a mild sedative for insomnia and anxiety. Associated with GABA-modulating valerenic acid; moderate clinical evidence for sleep improvement.',
  medicinal_method = 'Root tincture, standardised extract capsule, root infusion'
WHERE slug = 'herb-valerian';

UPDATE plant_species SET
  medicinal_use = 'Historically used in European herbal medicine as a bitter digestive tonic, anthelmintic, and to stimulate appetite. Thujone content is toxic in concentrated doses — absinthe preparations are restricted. Topical use for wound healing has traditional support.',
  medicinal_method = 'Very dilute bitter tincture, dried herb infusion (small quantities only)'
WHERE slug = 'herb-wormwood';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in European herbal medicine for respiratory complaints, coughs, and as a digestive tonic. Shares properties with other Hyssopus officinalis preparations; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, syrup, tincture'
WHERE slug = 'hyssop';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a forage and cover crop grass with no established traditional or clinical medicinal application.'
WHERE slug = 'italian-ryegrass';

UPDATE plant_species SET
  medicinal_use = 'Root and herb traditionally used by Indigenous North American peoples and in 19th-century American herbal medicine for urinary complaints, kidney support, and as a diuretic. Evidence is largely ethnobotanical.',
  medicinal_method = 'Dried root or herb infusion, tincture'
WHERE slug = 'joe-pye-weed';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Flower traditionally used in European folk medicine as a wound-healing herb (vulnerary) and mild astringent. Associated with tannin-mediated astringent and anti-inflammatory properties; evidence is largely traditional.',
  medicinal_method = 'Dried flower infusion, topical poultice'
WHERE slug = 'kidney-vetch';

UPDATE plant_species SET
  medicinal_use = 'Widely used in European and North American herbal medicine as a mild sedative, for anxiety, insomnia, and digestive complaints. Associated with GABA-modulating rosmarinic acid and flavonoids; moderate clinical evidence.',
  medicinal_method = 'Dried leaf infusion, tincture, essential oil (aromatherapy)'
WHERE slug = 'lemon-balm';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. A cover crop and forage legume; seeds contain alkaloids that are toxic if improperly prepared and should not be consumed without specific preparation.'
WHERE slug = 'lupin-yellow';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in North American herbal medicine for fever, colds, and as an antiseptic mouthwash. Thymol and carvacrol-rich; associated with antimicrobial properties similar to oregano and thyme.',
  medicinal_method = 'Dried herb infusion, gargle, tincture'
WHERE slug = 'monarda';

UPDATE plant_species SET
  medicinal_use = 'Used by Indigenous North American peoples for colds, fever, and digestive complaints. Thymol-rich volatile oils associated with antimicrobial properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'monarda-wild';

UPDATE plant_species SET
  medicinal_use = 'Widely used in traditional European and Asian medicine as a digestive bitter, emmenagogue, and for anxiety and insomnia. Associated with mild sedative and anti-inflammatory properties. Contraindicated in pregnancy.',
  medicinal_method = 'Dried herb infusion, tincture (caution: not in pregnancy)'
WHERE slug = 'mugwort';

UPDATE plant_species SET
  medicinal_use = 'Leaf and flower widely used in European and North American herbal medicine for coughs, bronchitis, and sore throats. Associated with expectorant, demulcent, and anti-inflammatory properties; traditional use is well-supported.',
  medicinal_method = 'Dried leaf or flower infusion, syrup, tincture'
WHERE slug = 'mullein';

UPDATE plant_species SET
  medicinal_use = 'Oat straw (green oat herb) traditionally used in European herbal medicine for nervous system support, anxiety, and as a mild restorative. Associated with avenanthramide antioxidant and mild nervine properties.',
  medicinal_method = 'Oat straw infusion, tincture'
WHERE slug = 'oats-green-manure';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and Ayurvedic medicine as a diuretic, to support kidney function, and for digestive complaints. Rich in apiol and myristicin; large quantities may be toxic. Contraindicated in pregnancy in medicinal doses.',
  medicinal_method = 'Dried leaf or root infusion (moderate quantities only)'
WHERE slug = 'parsley';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European herbal medicine as an emmenagogue, for digestive complaints, and as an insect repellent. Contains pulegone which is hepatotoxic in high doses — internal medicinal use is not recommended. Highly toxic in concentrated essential oil form.',
  medicinal_method = 'External insect repellent only; internal use not recommended'
WHERE slug = 'pennyroyal';

UPDATE plant_species SET
  medicinal_use = 'Caution: all parts are toxic. Historically used in homeopathic preparations only. No safe traditional or clinical medicinal use for direct internal or external application.',
  medicinal_method = 'No safe medicinal preparation recommended'
WHERE slug = 'perennial-pea';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. Primarily used as a bee-attracting cover crop and green manure.'
WHERE slug = 'phacelia-covercrop';

UPDATE plant_species SET
  medicinal_use = 'Flower and herb traditionally used in European herbal medicine for menopausal symptoms, respiratory complaints, and skin conditions. Isoflavone content associated with mild oestrogenic activity; moderate evidence for menopausal symptom support.',
  medicinal_method = 'Dried flower infusion, standardised extract capsule, tincture'
WHERE slug = 'red-clover';

UPDATE plant_species SET
  medicinal_use = 'Historically used in European herbal medicine as an emmenagogue, abortifacient, and for digestive complaints. Toxic to skin and mucous membranes; highly phototoxic. Internal use is not recommended due to toxicity.',
  medicinal_method = 'External use only (with extreme caution); not recommended for self-medication'
WHERE slug = 'rue';

UPDATE plant_species SET
  medicinal_use = 'Shares properties with common comfrey (Symphytum officinale); used topically for wound healing and joint inflammation. Contains pyrrolizidine alkaloids — internal use is not recommended; external use only.',
  medicinal_method = 'Topical cream or poultice (external only)'
WHERE slug = 'russian-comfrey';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. A cover crop and forage cereal grass with no established traditional or clinical medicinal application.'
WHERE slug = 'rye-cereal';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used across many cultures for wound healing, sore throats, and skin inflammation. Associated with rosmarinic acid and antioxidant properties; evidence for wound healing and antiviral activity is moderate.',
  medicinal_method = 'Dried herb infusion, gargle, topical poultice, tincture'
WHERE slug = 'self-heal';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and North American folk medicine as a mild diuretic and for urinary tract complaints. Contains oxalic acid in notable quantities; associated with astringent and mild laxative properties.',
  medicinal_method = 'Dried herb infusion, fresh leaf in food'
WHERE slug = 'sheep-sorrel';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in European and North American folk medicine as a mild diuretic and for urinary tract complaints. Contains oxalic acid in notable quantities; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, fresh leaf in food'
WHERE slug = 'sheep-sorrel-2';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as an aromatic digestive herb and mild insect repellent. Associated with mild antimicrobial and bitter properties; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'southernwood';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in European and North American herbal medicine for venous insufficiency and bruising. Contains coumarin compounds — anticoagulant properties mean caution is needed; not suitable for use alongside blood-thinning medications.',
  medicinal_method = 'Dried herb infusion (small quantities only); standardised coumarin extract'
WHERE slug = 'sweet-clover';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with common thyme; traditionally used for mild respiratory complaints and digestive support. Associated with thymol-mediated antimicrobial effects.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'thyme-creeping';

UPDATE plant_species SET
  medicinal_use = 'Root widely used in European and North American herbal medicine as a mild sedative for insomnia and anxiety. Associated with valerenic acid GABA-modulating effects; moderate clinical evidence for sleep improvement.',
  medicinal_method = 'Root tincture, standardised extract capsule, root infusion'
WHERE slug = 'valerian';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in North American herbal medicine as a nervine for anxiety, depression, and nervous exhaustion. Associated with mild sedative and anti-inflammatory properties; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'verbena-blue';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine for respiratory complaints and as a mild diuretic. Associated with mild anti-inflammatory properties; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion'
WHERE slug = 'vetch-common';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and North American folk medicine for digestive complaints, coughs, and wound healing. Contains tannins and flavonoids; associated with mild astringent and anti-inflammatory properties.',
  medicinal_method = 'Dried flower and leaf infusion, tincture'
WHERE slug = 'white-clover';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with common thyme; traditionally used for mild respiratory complaints and digestive support. Associated with thymol-mediated antimicrobial effects.',
  medicinal_method = 'Dried herb infusion'
WHERE slug = 'woolly-thyme';

UPDATE plant_species SET
  medicinal_use = 'Historically used in European herbal medicine as a bitter digestive tonic, anthelmintic, and to stimulate appetite. Thujone content is toxic in concentrated doses. Topical use for wound healing and insect repellent has traditional support.',
  medicinal_method = 'Very dilute bitter tincture, dried herb infusion (small quantities only)'
WHERE slug = 'wormwood';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used as a laxative and to support liver and gallbladder function. Tannin-rich root associated with astringent properties for digestive complaints; evidence is largely traditional.',
  medicinal_method = 'Root decoction, tincture, dried root capsule'
WHERE slug = 'yellow-dock';

-- ============================================================
-- ORNAMENTAL (61 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'Leaf and whole herb traditionally used in European folk medicine as an astringent, for wound healing, and to reduce inflammation. Associated with tannin and iridoid glycoside content; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, topical poultice'
WHERE slug = 'ajuga-reptans';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; not associated with traditional or clinical medicinal applications.'
WHERE slug = 'alyssum';

UPDATE plant_species SET
  medicinal_use = 'Historically associated with mild astringent and diuretic properties in European folk medicine; evidence is very limited. No significant traditional medicinal use distinct from other Brassicaceae.',
  medicinal_method = 'Dried herb infusion (traditional use only)'
WHERE slug = 'alyssum-perennial';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used by Indigenous North American peoples for heart conditions and pleurisy. Cardiac glycosides are present; all parts are toxic — no safe self-medication. Topical root use documented for skin conditions.',
  medicinal_method = 'Root preparations (historical/traditional use only; toxic plant — not for self-medication)'
WHERE slug = 'asclepias';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; root extract has been explored in in vitro studies but has no established traditional or clinical medicinal application.'
WHERE slug = 'astilbe';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'black-eyed-susan';

UPDATE plant_species SET
  medicinal_use = 'All parts are toxic. Historically used in very small quantities in traditional medicine for pain relief and as an antispasmodic; not suitable for safe self-medication due to isoquinoline alkaloid toxicity.',
  medicinal_method = 'No safe preparation — toxic plant; historical use only'
WHERE slug = 'bleeding-heart';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'brunnera';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used by Indigenous North American peoples as a mild sedative and analgesic. Associated with isoquinoline alkaloid-mediated mild sedative properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Root tincture (traditional use only; use caution — alkaloid-containing)'
WHERE slug = 'californian-poppy';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond minor folk use of root as a mild demulcent gargle. No significant traditional or clinical medicinal application.',
  medicinal_method = NULL
WHERE slug = 'campanula';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental grass; no established traditional or clinical medicinal application.'
WHERE slug = 'chinese-silver-grass';

UPDATE plant_species SET
  medicinal_use = 'Flower and bark traditionally used in European folk medicine as a mild expectorant and diuretic. Salicylates in bark associated with anti-inflammatory properties; berries are toxic and must not be consumed.',
  medicinal_method = 'Dried flower infusion, bark decoction (berries toxic — do not use)'
WHERE slug = 'climbing-honeysuckle';

UPDATE plant_species SET
  medicinal_use = 'Rose hip (fruit) widely used for vitamin C supplementation and as a mild anti-inflammatory. Petals used in traditional medicine for sore throats and skin care. Evidence for rosehip extract in osteoarthritis is moderate.',
  medicinal_method = 'Dried rosehip infusion or syrup, petal infusion, rosehip extract capsule'
WHERE slug = 'climbing-rose-rambling';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine for digestive complaints and wound healing. All parts contain cyanogenic glycosides and are toxic if consumed in quantity; use with caution.',
  medicinal_method = 'Dried herb infusion (small quantities only; toxic if overused)'
WHERE slug = 'columbine';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; no established traditional or clinical medicinal application.'
WHERE slug = 'coreopsis';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; no established traditional or clinical medicinal application.'
WHERE slug = 'cosmos';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a mild diuretic and for wound healing. Associated with saponin and tannin content; evidence is very limited and largely traditional.',
  medicinal_method = 'Dried herb infusion, topical poultice'
WHERE slug = 'creeping-jenny';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental tuber; root extracts have been explored in research contexts but have no established traditional or clinical medicinal application.'
WHERE slug = 'dahlia';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond minor traditional use of flowers as a food. Primarily an ornamental perennial; no established clinical medicinal application.'
WHERE slug = 'daylily';

UPDATE plant_species SET
  medicinal_use = 'All parts are toxic. Historically used in traditional medicine as an analgesic and antispasmodic; not suitable for safe self-medication due to diterpenoid alkaloid toxicity.',
  medicinal_method = 'No safe preparation — toxic plant; historical use only'
WHERE slug = 'delphinium';

UPDATE plant_species SET
  medicinal_use = 'Root widely used in North American and European herbal medicine to stimulate immune function, particularly for colds and upper respiratory infections. Supported by moderate clinical evidence for reducing cold severity and duration.',
  medicinal_method = 'Root tincture, standardised extract capsule, dried root decoction'
WHERE slug = 'echinacea';

UPDATE plant_species SET
  medicinal_use = 'Toxic plant: all parts contain cardiac glycosides (digoxin, digitoxin) which are highly toxic. Pharmaceutical cardiac glycosides derived from foxglove are used clinically for heart failure and arrhythmia, but the plant itself is not for self-medication. Ingestion can be fatal.',
  medicinal_method = 'Pharmaceutical preparations only (prescribed cardiac glycosides); no safe self-medication'
WHERE slug = 'foxglove';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'gaillardia';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'gaura';

UPDATE plant_species SET
  medicinal_use = 'Leaf and root traditionally used in European folk medicine as an astringent for wounds, diarrhoea, and skin inflammation. Associated with tannin-mediated astringent properties; evidence is largely traditional.',
  medicinal_method = 'Dried herb or root infusion, topical poultice'
WHERE slug = 'geranium-hardy';

UPDATE plant_species SET
  medicinal_use = 'Root and flower head traditionally used in Eastern European folk medicine for diuretic and anti-inflammatory effects. Associated with alkaloid and flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Dried flower head infusion, root decoction'
WHERE slug = 'globe-thistle';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used by Indigenous North American peoples as an immune tonic and anti-inflammatory, sharing some properties with related Echinacea species. Evidence is largely ethnobotanical.',
  medicinal_method = 'Root decoction, tincture'
WHERE slug = 'heliopsis';

UPDATE plant_species SET
  medicinal_use = 'All parts are toxic. Historically used in very small amounts in traditional European medicine for heart complaints; not suitable for self-medication. Cardiac glycosides are present.',
  medicinal_method = 'No safe preparation — toxic plant; historical use only'
WHERE slug = 'helleborus';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'heuchera';

UPDATE plant_species SET
  medicinal_use = 'Flower and leaf traditionally used in European folk medicine as a demulcent for sore throats, dry coughs, and skin inflammation. Associated with mucilage-mediated soothing properties; evidence is largely traditional.',
  medicinal_method = 'Dried flower infusion, topical poultice, syrup'
WHERE slug = 'hollyhock';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental foliage plant; no established traditional or clinical medicinal application.'
WHERE slug = 'hosta';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Root and rhizome are toxic if consumed; no established traditional or clinical medicinal application beyond minor historical references.'
WHERE slug = 'iris';

UPDATE plant_species SET
  medicinal_use = 'Widely used in European and North American herbal medicine and aromatherapy for anxiety, insomnia, and skin conditions. Associated with linalool-mediated anxiolytic and mild analgesic effects; moderate clinical evidence for anxiety and sleep.',
  medicinal_method = 'Essential oil (aromatherapy, external), dried flower infusion, tincture'
WHERE slug = 'lavender';

UPDATE plant_species SET
  medicinal_use = 'Seeds contain quinolizidine alkaloids and are toxic; not for internal use. Traditionally the plant has been explored for alkaloid-based pharmacological activity, but no safe traditional self-medication use is established.',
  medicinal_method = 'No safe preparation for self-medication'
WHERE slug = 'lupin';

UPDATE plant_species SET
  medicinal_use = 'Flower and leaf traditionally used in Mexican and Central American medicine as an antifungal, antiparasitic, and for skin conditions. Thymol and carvacrol content associated with documented antimicrobial properties.',
  medicinal_method = 'Dried flower infusion, topical poultice, essential oil (external)'
WHERE slug = 'marigold';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental ground cover; no established traditional or clinical medicinal application.'
WHERE slug = 'mazus';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. A biomass and ornamental grass; no established traditional or clinical medicinal application.'
WHERE slug = 'miscanthus-giant';

UPDATE plant_species SET
  medicinal_use = 'Leaf and flower traditionally used in European and South American folk medicine as a diuretic, expectorant, and antimicrobial. Glucosinolate-rich; associated with documented antimicrobial properties for respiratory and urinary tract complaints.',
  medicinal_method = 'Fresh leaf or flower in food, dried herb infusion, tincture'
WHERE slug = 'nasturtium';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'penstemon';

UPDATE plant_species SET
  medicinal_use = 'Root used in Traditional Chinese Medicine for menstrual disorders, inflammatory conditions, and as a mild analgesic. Paeoniflorin content associated with anti-inflammatory and antispasmodic properties; moderate clinical evidence.',
  medicinal_method = 'Dried root decoction, standardised root extract'
WHERE slug = 'peony';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; no established traditional or clinical medicinal application.'
WHERE slug = 'petunia';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'phlox';

UPDATE plant_species SET
  medicinal_use = 'Corn poppy (Papaver rhoeas) petals traditionally used in European folk medicine for mild coughs and insomnia. Contains alkaloids in low concentrations; evidence for therapeutic use is largely traditional. Note: distinct from opium poppy (Papaver somniferum).',
  medicinal_method = 'Dried petal infusion, syrup'
WHERE slug = 'poppy';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond very minor folk use of flowers. Primarily an ornamental perennial; no established clinical medicinal application.'
WHERE slug = 'primrose';

UPDATE plant_species SET
  medicinal_use = 'Leaf traditionally used in European herbal medicine for respiratory complaints including coughs and bronchitis. Associated with mucilage and saponin-mediated expectorant properties; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, syrup'
WHERE slug = 'pulmonaria';

UPDATE plant_species SET
  medicinal_use = 'Rose hip (fruit) widely used for vitamin C supplementation and as a mild anti-inflammatory. Petals used in traditional medicine for sore throats and skin care. Evidence for rosehip extract in osteoarthritis is moderate.',
  medicinal_method = 'Dried rosehip infusion or syrup, petal infusion, rosehip extract capsule'
WHERE slug = 'rose';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used by Indigenous North American peoples as an immune stimulant with properties related to Echinacea. Associated with polyacetylene and flavonoid content; evidence is largely ethnobotanical.',
  medicinal_method = 'Root decoction, tincture'
WHERE slug = 'rudbeckia';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with common sage (Salvia officinalis); associated with anti-inflammatory and mild antimicrobial effects. Used in folk medicine for digestive support and sore throats; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, gargle'
WHERE slug = 'salvia';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual and perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'scabiosa';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental succulent perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'sedum';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental perennial; no established traditional or clinical medicinal application.'
WHERE slug = 'shasta-daisy';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; no established traditional or clinical medicinal application.'
WHERE slug = 'snapdragon';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a mild astringent and wound-healing herb. Associated with tannin content; evidence is very limited and largely traditional.',
  medicinal_method = 'Dried herb infusion, topical poultice'
WHERE slug = 'snow-in-summer';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; seeds contain high levels of linoleic acid and have nutritional associations but no established clinical medicinal application.'
WHERE slug = 'sunflower';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. A biomass-type sunflower; no established traditional or clinical medicinal application.'
WHERE slug = 'sunflower-biomass';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. All parts are mildly toxic; seed contains lathyrogens. Primarily an ornamental climber; not associated with traditional or clinical medicinal use.'
WHERE slug = 'sweet-pea';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used by Indigenous North American peoples for childbirth support and as an antiseptic. Associated with saponin and tannin content; plant populations are sensitive — ethical sourcing is important.',
  medicinal_method = 'Root decoction (traditional use only; conservation considerations apply)'
WHERE slug = 'trillium';

UPDATE plant_species SET
  medicinal_use = 'Herb traditionally used in South American folk medicine as a mild sedative and anti-inflammatory. Associated with verbenalin and hastatoside glycosides; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, tincture'
WHERE slug = 'verbena-bonariensis';

UPDATE plant_species SET
  medicinal_use = 'Herb traditionally used in European folk medicine as a mild diuretic, astringent, and for wound healing. Associated with iridoid glycoside content; evidence is largely traditional.',
  medicinal_method = 'Dried herb infusion, topical poultice'
WHERE slug = 'veronica';

UPDATE plant_species SET
  medicinal_use = 'Widely used across many traditional medicine systems for wound healing, fever reduction, and as a digestive bitter. Associated with achilline and flavonoid anti-inflammatory effects; moderate traditional and some clinical evidence.',
  medicinal_method = 'Dried herb infusion, tincture, topical poultice'
WHERE slug = 'yarrow';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental annual; no established traditional or clinical medicinal application.'
WHERE slug = 'zinnia';

-- ============================================================
-- SHRUB (11 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'Berry, bark, and flower used in European folk medicine as an astringent, for sore throats, and digestive complaints. Sloe berry associated with mild astringent and antioxidant properties.',
  medicinal_method = 'Sloe berry tincture, flower infusion, bark decoction'
WHERE slug = 'blackthorn';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental shrub; bark and leaf have no established traditional or clinical medicinal application.'
WHERE slug = 'dogwood-blood-red';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental shrub; no established traditional or clinical medicinal application.'
WHERE slug = 'dogwood-red-stem';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a hedging shrub; no established traditional or clinical medicinal application.'
WHERE slug = 'escallonia-hedge';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Flower traditionally used in European and Irish folk medicine as an expectorant and for skin conditions. Associated with mild astringent and anti-inflammatory properties; evidence is largely traditional.',
  medicinal_method = 'Dried flower infusion'
WHERE slug = 'gorse-hedge';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. Primarily a hedging shrub native to New Zealand; no established traditional or clinical medicinal application in European or other mainstream herbal systems.'
WHERE slug = 'griselinia-hedge';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent for sore throats and diarrhoea. Catkin infusion associated with mild diuretic and anti-inflammatory properties.',
  medicinal_method = 'Bark or leaf decoction, catkin infusion'
WHERE slug = 'hazel-hedge';

UPDATE plant_species SET
  medicinal_use = 'Root extract used in traditional Chinese and North American medicine for immune support and as an adaptogen. Associated with flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Root decoction, tincture'
WHERE slug = 'indigo-bush';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond very minor folk use. Berries are toxic; no established traditional or clinical medicinal application.'
WHERE slug = 'privet-common';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Berries are toxic; no established traditional or clinical medicinal application.'
WHERE slug = 'privet-oval-leaf';

UPDATE plant_species SET
  medicinal_use = 'Rose hip (fruit) traditionally used for vitamin C supplementation and immune support. Petals used for mild astringent and skin-soothing properties; evidence for rosehip in osteoarthritis is moderate.',
  medicinal_method = 'Dried rosehip infusion or syrup, petal infusion'
WHERE slug = 'rosa-rugosa-hedge';

-- ============================================================
-- TREE (120 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'Bark exudate (manna) traditionally used in Mediterranean medicine as a gentle laxative and expectorant. Mannitol-rich sap associated with mild laxative properties; evidence is moderate.',
  medicinal_method = 'Dried bark exudate (manna) dissolved in water'
WHERE slug = 'ash-manna';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a hedging tree; no established traditional or clinical medicinal application distinct from common beech.'
WHERE slug = 'beech-hedge-copper';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a hedging tree; bark and leaf have minor folk uses but no established clinical medicinal application.'
WHERE slug = 'beech-hedge-green';

UPDATE plant_species SET
  medicinal_use = 'Bark, leaf, and flower traditionally used in European folk medicine as an astringent, diuretic, and anti-inflammatory. Associated with mucilage and tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark or leaf decoction, flower infusion'
WHERE slug = 'elm-english';

UPDATE plant_species SET
  medicinal_use = 'Leaf extract widely used in European and Asian medicine for cognitive support, circulation, and tinnitus. Supported by good clinical evidence for cognitive function in older adults and circulation disorders. Caution with blood-thinning medications.',
  medicinal_method = 'Standardised leaf extract capsule, dried leaf infusion'
WHERE slug = 'ginkgo-biloba';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Pod and bark have minor traditional uses in North American folk medicine, but no established clinical medicinal application.'
WHERE slug = 'honey-locust';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as a mild astringent and for digestive complaints. Associated with tannin content; evidence is very limited.',
  medicinal_method = 'Bark decoction'
WHERE slug = 'hornbeam-hedge';

UPDATE plant_species SET
  medicinal_use = 'Flower widely used in European herbal medicine as a mild sedative, for anxiety, and for cardiovascular support. Associated with flavonoid and volatile oil content; moderate clinical evidence for mild sedative effects.',
  medicinal_method = 'Dried flower infusion, tincture'
WHERE slug = 'linden-largeleaf';

UPDATE plant_species SET
  medicinal_use = 'Flower widely used in European herbal medicine as a mild sedative, for anxiety, colds, and cardiovascular support. Associated with flavonoid and farnesol content; moderate clinical evidence for mild sedative and cardioprotective effects.',
  medicinal_method = 'Dried flower infusion, tincture'
WHERE slug = 'linden-smallleaf';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental hybrid maple; no established traditional or clinical medicinal application.'
WHERE slug = 'maple-freeman';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Sap used traditionally as maple syrup; no significant clinical or traditional medicinal application beyond nutritional use.'
WHERE slug = 'maple-sugar';

UPDATE plant_species SET
  medicinal_use = 'Leaf, bark, and shell traditionally used by Indigenous North American peoples for anti-inflammatory and digestive purposes. Associated with tannin and phenolic content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'pecan';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and street tree; no established traditional or clinical medicinal application.'
WHERE slug = 'plane-london';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Bark and leaf have minor folk medicine associations with anti-inflammatory properties, but no established clinical medicinal application.'
WHERE slug = 'poplar-hybrid';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent for diarrhoea and inflammatory conditions. Tannin-rich bark associated with wound-healing and astringent properties.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'sweet-chestnut';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used by Aboriginal Australians for wound healing and skin conditions. Associated with flavonoid content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-acacia-baileyana';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and timber tree; no established traditional or clinical medicinal application in mainstream herbal systems.'
WHERE slug = 'tree-acacia-dealbata';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf used by Aboriginal Australians for wound healing and skin conditions. Associated with flavonoid and tannin content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-acacia-longifolia';

UPDATE plant_species SET
  medicinal_use = 'Bark and flower used in Traditional Chinese Medicine for liver depression, insomnia, and anxiety. Associated with flavonoid content; moderate clinical evidence for anxiolytic effects.',
  medicinal_method = 'Dried flower infusion, bark decoction, standardised extract'
WHERE slug = 'tree-albizia-julibrissin';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and cone traditionally used in European folk medicine as an astringent and anti-inflammatory. Associated with tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark or cone decoction'
WHERE slug = 'tree-alder-black';

UPDATE plant_species SET
  medicinal_use = 'Bark and cone traditionally used in European folk medicine as an astringent, for sore throats, and as a mild anti-inflammatory. Associated with tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction, cone infusion'
WHERE slug = 'tree-alder-common';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used in European folk medicine as an astringent and for skin inflammation. Associated with tannin and flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction'
WHERE slug = 'tree-alder-green';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used in European folk medicine as a mild astringent and for fevers. Associated with tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction'
WHERE slug = 'tree-alder-grey';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf used by Indigenous North American peoples for skin conditions and as an anti-inflammatory. Associated with tannin and phenolic content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-alder-red';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used by Indigenous North American peoples as a mild laxative and for digestive complaints. Associated with tannin and phenolic content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-aldershade-american';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-amber-maple';

UPDATE plant_species SET
  medicinal_use = 'Leaf, bark, and twig traditionally used by Indigenous North American peoples and in North American herbal medicine for respiratory complaints and as a diuretic. Associated with thujone-containing volatile oils; caution in pregnancy.',
  medicinal_method = 'Leaf or twig infusion, essential oil (inhalation; caution in pregnancy)'
WHERE slug = 'tree-arborvitae-thuja';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used in European folk medicine as a mild laxative and for digestive complaints. Associated with secoiridoid and coumarin content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction'
WHERE slug = 'tree-ash-european';

UPDATE plant_species SET
  medicinal_use = 'Bark contains salicylates (similar to aspirin); traditionally used in European folk medicine for fever, pain relief, and as an anti-inflammatory. Associated with salicin content; evidence is moderate.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'tree-aspen';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and timber tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-beech';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. Primarily a timber tree; no established traditional or clinical medicinal application in mainstream herbal systems.'
WHERE slug = 'tree-black-acacia';

UPDATE plant_species SET
  medicinal_use = 'Bark and flower traditionally used in European and North American folk medicine for respiratory complaints and as a mild antispasmodic. Contains toxic lectins (robinin) — bark and seeds are toxic; only flower infusion is considered relatively safe.',
  medicinal_method = 'Dried flower infusion only (bark and seeds toxic)'
WHERE slug = 'tree-black-locust';

UPDATE plant_species SET
  medicinal_use = 'Resin and bark traditionally used by Indigenous North American peoples for respiratory complaints and wound healing. Associated with antimicrobial and expectorant properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark or resin decoction, inhalation of steam'
WHERE slug = 'tree-black-spruce';

UPDATE plant_species SET
  medicinal_use = 'Bark contains salicylates; traditionally used in North American folk medicine for fever, pain relief, and anti-inflammatory effects. Associated with salicin content similar to willow bark.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'tree-black-willow';

UPDATE plant_species SET
  medicinal_use = 'Resin and bark traditionally used by Indigenous North American peoples for wound healing and respiratory complaints. Associated with antimicrobial and anti-inflammatory properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Resin applied topically, bark decoction'
WHERE slug = 'tree-blue-spruce';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in traditional Chinese and Mongolian medicine for digestive complaints and as a diuretic. Associated with flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'tree-caragana-arborescens';

UPDATE plant_species SET
  medicinal_use = 'Bark, wood, and essential oil traditionally used in North African and Middle Eastern medicine for respiratory complaints and as an antiseptic. Associated with cedrene and atlantone content; evidence is largely traditional.',
  medicinal_method = 'Essential oil (inhalation, external), wood decoction'
WHERE slug = 'tree-cedar-atlas';

UPDATE plant_species SET
  medicinal_use = 'Bark, wood, and essential oil traditionally used in Middle Eastern medicine for respiratory complaints, skin conditions, and as an antiseptic. Related to atlas cedar in traditional uses; evidence is largely traditional.',
  medicinal_method = 'Essential oil (inhalation, external), wood decoction'
WHERE slug = 'tree-cedar-lebanon';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and timber tree; no established traditional or clinical medicinal application distinct from common beech.'
WHERE slug = 'tree-copper-beech';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a timber and plantation tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-corsican-pine';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond nutritional value of fruit. Crab apple fruit has minor folk medicine associations with digestive support, but no established clinical medicinal application.'
WHERE slug = 'tree-crabapple-ornamental';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a timber tree; resin has minor traditional uses but no established clinical medicinal application.'
WHERE slug = 'tree-douglas-fir';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine for diuresis, skin conditions, and as an anti-inflammatory. Associated with betulin and betulinic acid content; evidence is moderate for anti-inflammatory activity.',
  medicinal_method = 'Bark or leaf decoction, leaf infusion, bark tincture'
WHERE slug = 'tree-downy-birch';

UPDATE plant_species SET
  medicinal_use = 'Fruit and leaf associated with antioxidant and nutritive properties; used in traditional Asian and European folk medicine as a general tonic. Related to sea buckthorn in uses; evidence is largely traditional.',
  medicinal_method = 'Dried fruit infusion, leaf tea'
WHERE slug = 'tree-eleagnus-ebbingei';

UPDATE plant_species SET
  medicinal_use = 'Fruit and leaf used in traditional North American Indigenous medicine as a nutritive tonic and for wound healing. Associated with flavonoid and lycopene content; evidence is largely ethnobotanical.',
  medicinal_method = 'Dried fruit infusion, leaf tea'
WHERE slug = 'tree-eleagnus-silverberry';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a fast-growing shade tree; bark and leaf have no established traditional or clinical medicinal application.'
WHERE slug = 'tree-elm-siberian';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent, emollient, and for skin inflammation. Associated with tannin and mucilage content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'tree-elm-wych';

UPDATE plant_species SET
  medicinal_use = 'Leaf essential oil widely used in European and Australian herbal medicine for respiratory complaints, coughs, and as an antiseptic. Cineole content associated with expectorant and antimicrobial effects; moderate clinical evidence.',
  medicinal_method = 'Essential oil (inhalation, chest rub), leaf infusion (steam inhalation)'
WHERE slug = 'tree-eucalyptus-gunnii';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Shares essential oil properties with other eucalyptus species; associated with respiratory and antiseptic uses. Evidence for this specific species in medicinal contexts is limited to traditional ethnobotanical records.',
  medicinal_method = 'Essential oil (inhalation only)'
WHERE slug = 'tree-eucalyptus-niphophila';

UPDATE plant_species SET
  medicinal_use = 'Resin (Venice turpentine) and bark traditionally used in European herbal medicine for respiratory complaints, wound healing, and as an antiseptic. Associated with bornyl acetate and limonene content; evidence is largely traditional.',
  medicinal_method = 'Resin ointment (external), bark decoction, resin steam inhalation'
WHERE slug = 'tree-european-fir';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and hedging maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-field-maple';

UPDATE plant_species SET
  medicinal_use = 'Caution: all parts are highly toxic (cytisine alkaloids). No safe traditional or clinical medicinal self-medication use. Pharmaceutical research has explored cytisine for smoking cessation, but this is not a self-medication application.',
  medicinal_method = 'No safe preparation — toxic plant'
WHERE slug = 'tree-golden-chain';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-golden-rain';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and street tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-hackberry-common';

UPDATE plant_species SET
  medicinal_use = 'Berry, leaf, and bark widely used in European herbal medicine for cardiovascular support, hypertension, and digestive complaints. Associated with flavonoid and oligomeric proanthocyanidin content; moderate to good clinical evidence for cardiovascular support.',
  medicinal_method = 'Dried berry or leaf infusion, standardised extract capsule, tincture'
WHERE slug = 'tree-hawthorn-common';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with common hawthorn (Crataegus monogyna); associated with cardiovascular support and digestive use. Used interchangeably with Crataegus monogyna in European herbal medicine.',
  medicinal_method = 'Dried berry or leaf infusion, standardised extract capsule, tincture'
WHERE slug = 'tree-hawthorn-crimson';

UPDATE plant_species SET
  medicinal_use = 'Same species as crimson hawthorn (Crataegus laevigata); associated with cardiovascular support. Used interchangeably with Crataegus monogyna in European herbal medicine.',
  medicinal_method = 'Dried berry or leaf infusion, standardised extract capsule, tincture'
WHERE slug = 'tree-hawthorn-midland';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent and mild anti-inflammatory. Catkins and bark associated with mild diuretic properties; evidence is largely traditional.',
  medicinal_method = 'Bark or leaf decoction, catkin infusion'
WHERE slug = 'tree-hazel-harry-lauder';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent and mild anti-inflammatory. Catkins and bark associated with mild diuretic properties; evidence is largely traditional.',
  medicinal_method = 'Bark or leaf decoction, catkin infusion'
WHERE slug = 'tree-hazel-treeform';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent, diuretic, and mild febrifuge. Associated with ilex alkaloid (theobromine-like) and tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark or leaf decoction'
WHERE slug = 'tree-holly';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Pod and bark have minor traditional uses in North American folk medicine for digestive complaints and as a mild antimicrobial. Evidence is largely ethnobotanical; no established clinical application.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-honey-locust';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Berry extracts associated with antioxidant properties; same species as honeyberry used in fruit contexts. Used in Russian folk medicine as a general tonic; evidence is limited.',
  medicinal_method = 'Fresh berries, extract'
WHERE slug = 'tree-honeyberry-treeform';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a hedging and timber tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-hornbeam';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used in Japanese and Korean medicine as an astringent and anti-inflammatory. Associated with tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-japanese-maple';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and street tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-japanese-zelkova';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond nutritional value of fruit. Berries similar to Amelanchier canadensis (serviceberry); no established clinical medicinal application.'
WHERE slug = 'tree-juneberry';

UPDATE plant_species SET
  medicinal_use = 'Berry traditionally used in European and North American herbal medicine as a diuretic, digestive stimulant, and urinary antiseptic. Associated with volatile oil (terpinen-4-ol) content; evidence is moderate. Contraindicated in pregnancy and kidney disease.',
  medicinal_method = 'Dried berry decoction, essential oil (external; not in pregnancy)'
WHERE slug = 'tree-juniper-common';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental tree; bark extract has been investigated in research contexts but has no established traditional or clinical medicinal application.'
WHERE slug = 'tree-katsura';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a timber tree; resin has minor traditional uses as a topical antiseptic but no established clinical medicinal application.'
WHERE slug = 'tree-larch-european';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and hedging conifer; no established traditional or clinical medicinal application. Volatile oils are aromatic but clinical use is not documented.',
  medicinal_method = NULL
WHERE slug = 'tree-lawson-cypress';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental flowering shrub-tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-lilac-treeform';

UPDATE plant_species SET
  medicinal_use = 'Flower widely used in European herbal medicine as a mild sedative, for anxiety, colds, and cardiovascular support. Associated with flavonoid content; moderate clinical evidence for mild sedative and cardioprotective effects.',
  medicinal_method = 'Dried flower infusion, tincture'
WHERE slug = 'tree-lime-small-leaved';

UPDATE plant_species SET
  medicinal_use = 'Bark and resin traditionally used by Indigenous North American peoples for wound healing and respiratory complaints. Associated with antimicrobial and expectorant properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction, resin ointment (external)'
WHERE slug = 'tree-lodgepole-pine';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and street tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-london-plane';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental flowering tree; bark extracts have been investigated but have no established traditional or clinical medicinal application.'
WHERE slug = 'tree-magnolia-grandiflora';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental flowering tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-magnolia-soulangea';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental flowering tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-magnolia-stellata';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and pod used in traditional Native American and Mexican medicine for digestive complaints, wound healing, and as a nutritive food. Associated with tannin and phenolic content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction, pod flour (traditional use only)'
WHERE slug = 'tree-mesquite';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use distinct from Acacia dealbata. Primarily an ornamental and invasive tree; no established traditional or clinical medicinal application in mainstream herbal systems.'
WHERE slug = 'tree-mimosa';

UPDATE plant_species SET
  medicinal_use = 'Bark and resin traditionally used by Indigenous North American peoples for respiratory complaints and wound healing. Associated with antimicrobial and expectorant properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction, resin ointment (external)'
WHERE slug = 'tree-monterey-pine';

UPDATE plant_species SET
  medicinal_use = 'Berry traditionally used in European folk medicine as a mild diuretic and for urinary support. Vitamin C-rich fruit; evidence is largely traditional.',
  medicinal_method = 'Dried berry decoction, berry jelly'
WHERE slug = 'tree-mountain-ash-dwarf';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and street maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-norway-maple';

UPDATE plant_species SET
  medicinal_use = 'Resin and young shoot traditionally used in European folk medicine as an expectorant and antiseptic for respiratory complaints. Associated with volatile oil and resin content; evidence is largely traditional.',
  medicinal_method = 'Resin steam inhalation, young shoot infusion'
WHERE slug = 'tree-norway-spruce';

UPDATE plant_species SET
  medicinal_use = 'Bark widely used in traditional medicine as an astringent for diarrhoea, sore throats, and skin inflammation. Tannin-rich bark associated with documented astringent properties; evidence is moderate.',
  medicinal_method = 'Bark decoction, bark gargle, bark tincture'
WHERE slug = 'tree-oak-burr';

UPDATE plant_species SET
  medicinal_use = 'Bark widely used in European traditional medicine as an astringent for diarrhoea, sore throats, and skin inflammation. Tannin-rich bark associated with documented astringent and anti-inflammatory properties; moderate evidence.',
  medicinal_method = 'Bark decoction, bark gargle, bark tincture'
WHERE slug = 'tree-oak-english';

UPDATE plant_species SET
  medicinal_use = 'Bark associated with astringent properties similar to English oak; traditionally used in North American folk medicine for diarrhoea and skin inflammation. Tannin content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'tree-oak-red';

UPDATE plant_species SET
  medicinal_use = 'Flower and bark used in Traditional Chinese Medicine for cooling the blood, reducing fever, and treating haemorrhoids. Associated with rutin content; moderate clinical evidence for venous insufficiency support.',
  medicinal_method = 'Dried flower infusion, standardised rutin extract'
WHERE slug = 'tree-pagoda-tree';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-paperbark-maple';

UPDATE plant_species SET
  medicinal_use = 'Bark and resin traditionally used by Indigenous North American peoples for wound healing and respiratory complaints. Associated with antimicrobial and expectorant properties; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction, resin ointment (external)'
WHERE slug = 'tree-ponderosa-pine';

UPDATE plant_species SET
  medicinal_use = 'Bark contains salicylates; traditionally used in European folk medicine for fever, pain relief, and digestive complaints. Associated with salicin content; evidence is moderate.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'tree-poplar-lombardy';

UPDATE plant_species SET
  medicinal_use = 'Bark contains salicylates; traditionally used in European folk medicine for fever, pain relief, and as an anti-inflammatory. Associated with salicin and populin content; evidence is moderate.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'tree-poplar-white';

UPDATE plant_species SET
  medicinal_use = 'Bark traditionally used by Indigenous North American peoples for digestive and urinary complaints. Associated with tannin and anthocyanin content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-red-maple';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental flowering tree; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-redbud-eastern';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a timber and ornamental tree; bark has minor traditional uses in Indigenous Californian medicine but no established clinical medicinal application.'
WHERE slug = 'tree-redwood-giant';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Berry used in European folk medicine as a mild diuretic and for urinary support. Vitamin C-rich fruit; evidence for medicinal use is largely traditional.',
  medicinal_method = 'Dried berry decoction, berry jelly'
WHERE slug = 'tree-rowan-mountain-ash';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use in traditional European or clinical contexts. Pine needle tea has minor folk associations but no established clinical medicinal application.'
WHERE slug = 'tree-scots-pine';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental deciduous conifer; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-sequoia-dawn';

UPDATE plant_species SET
  medicinal_use = 'Fruit traditionally used in European folk medicine as a nutritive tonic and mild laxative. Related to rowan and serviceberry in folk uses; evidence is largely traditional.',
  medicinal_method = 'Dried fruit decoction, fruit jam'
WHERE slug = 'tree-service-tree';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond nutritional value of berries. Primarily an ornamental tree; no established clinical medicinal application.'
WHERE slug = 'tree-serviceberry-treeform';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and root traditionally used by Aboriginal Australians for skin conditions and wound healing. Associated with tannin and phenolic content; evidence is largely ethnobotanical.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tree-she-oak';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Same species as Albizia julibrissin; bark and flower used in Traditional Chinese Medicine for liver depression, insomnia, and anxiety. Associated with flavonoid content; moderate clinical evidence for anxiolytic effects.',
  medicinal_method = 'Dried flower infusion, bark decoction, standardised extract'
WHERE slug = 'tree-silk-tree';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf widely used in European herbal medicine as an anti-inflammatory, analgesic (salicin content), and for fever. Moderate clinical evidence for salicin-mediated anti-inflammatory effects, comparable to aspirin; caution with salicylate sensitivity.',
  medicinal_method = 'Bark decoction, standardised bark extract capsule'
WHERE slug = 'tree-silver-birch';

UPDATE plant_species SET
  medicinal_use = 'Flower traditionally used in European folk medicine as a mild sedative and for cardiovascular support, similar to small-leaved lime. Associated with flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Dried flower infusion, tincture'
WHERE slug = 'tree-silver-linden';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental and street maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-silver-maple';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental tree; bark extracts have been investigated in vitro but have no established traditional or clinical medicinal application.'
WHERE slug = 'tree-smoke-tree';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use beyond nutritional value of berries. Primarily an ornamental hybrid tree; no established clinical medicinal application.'
WHERE slug = 'tree-snowy-mespilus';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in European folk medicine as an astringent and anti-inflammatory. Tannin-rich bark associated with wound-healing and digestive astringent properties.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'tree-sweet-chestnut';

UPDATE plant_species SET
  medicinal_use = 'Resin (storax/styrax) traditionally used in traditional medicine for respiratory complaints and wound healing. Associated with cinnamic acid derivatives; evidence is largely traditional.',
  medicinal_method = 'Resin ointment (external), steam inhalation'
WHERE slug = 'tree-sweetgum';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a timber and ornamental maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-sycamore';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'No recognised medicinal use. Primarily an ornamental maple; no established traditional or clinical medicinal application.'
WHERE slug = 'tree-sycamore-japanese';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used in traditional medicine for skin conditions, respiratory complaints, and as an astringent. Associated with tannin and flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction, leaf infusion'
WHERE slug = 'tree-tamarisk';

UPDATE plant_species SET
  medicinal = false,
  medicinal_use = 'Caution: seeds are highly toxic (cytisine-like alkaloids). No recognised safe medicinal use; not suitable for self-medication.'
WHERE slug = 'tree-texas-mountain-laurel';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a timber and ornamental tree; bark has minor folk associations but no established clinical medicinal application.'
WHERE slug = 'tree-tulip-poplar';

UPDATE plant_species SET
  medicinal_use = 'Bark contains salicylates; traditionally used in European folk medicine for fever, pain, and inflammatory conditions. Associated with salicin content similar to white willow; evidence is moderate.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'tree-weeping-willow';

UPDATE plant_species SET
  medicinal_use = 'Leaf and bark traditionally used by Indigenous North American peoples for respiratory complaints and as an antiseptic. Associated with thujone-containing volatile oils; caution in pregnancy.',
  medicinal_method = 'Leaf or bark infusion, essential oil (inhalation; caution in pregnancy)'
WHERE slug = 'tree-western-redcedar';

UPDATE plant_species SET
  medicinal_use = 'Highly toxic plant: all parts contain taxine alkaloids which can cause fatal cardiac arrest. Pharmaceutical taxol (paclitaxel) derived from yew is used in cancer chemotherapy, but the plant is not for self-medication under any circumstances.',
  medicinal_method = 'No safe self-medication — all parts are toxic; pharmaceutical use only (prescribed)'
WHERE slug = 'tree-yew-english';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bark and leaf traditionally used in North American folk medicine as an anti-inflammatory and for digestive complaints. Associated with liriodendrin and alkaloid content; evidence is largely traditional.',
  medicinal_method = 'Bark decoction (traditional use only)'
WHERE slug = 'tulip-tree';

UPDATE plant_species SET
  medicinal_use = 'Bark and leaf traditionally used by Indigenous North American peoples as an antimicrobial and for skin conditions. Juglone-containing extracts associated with antifungal properties.',
  medicinal_method = 'Bark or leaf tincture (external); nut consumed as food'
WHERE slug = 'walnut-black';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Leaf, bark, and green hull traditionally used in European and Middle Eastern medicine as an astringent, antifungal, and for skin conditions. Juglone has documented antimicrobial properties.',
  medicinal_method = 'Leaf or hull decoction (external); nut consumed as food'
WHERE slug = 'walnut-english';

UPDATE plant_species SET
  medicinal_use = 'Bark contains salicylates; traditionally used in European folk medicine for fever, pain relief, and inflammatory conditions. Similar in use to other Salix species.',
  medicinal_method = 'Bark decoction, bark tincture'
WHERE slug = 'willow-coppice';

-- ============================================================
-- VEGETABLE (107 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'Leaf traditionally used in South Asian and African medicine for digestive complaints and wound healing. Rich in iron, calcium, and vitamins; associated with antioxidant properties.',
  medicinal_method = 'Dried leaf infusion, fresh leaf in food'
WHERE slug = 'amaranth-leaves';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Leaf and flower head traditionally used in European and North African medicine for liver and digestive support. Associated with cynarin content, which has documented choleretic (bile-stimulating) properties.',
  medicinal_method = 'Fresh or dried leaf infusion, standardised extract'
WHERE slug = 'artichoke-globe';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a diuretic and for urinary tract support. Rich in asparagine (diuretic compound) and glutathione; associated with hepatoprotective properties.',
  medicinal_method = 'Fresh or cooked asparagus, decoction of shoots'
WHERE slug = 'asparagus';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in South Asian medicine for digestive support and as a mild anti-inflammatory. Associated with chlorogenic acid antioxidant properties; evidence is largely traditional.',
  medicinal_method = 'Fresh or cooked vegetable in food'
WHERE slug = 'aubergine';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in South American folk medicine for digestive support and blood sugar regulation. Rich in fibre (pectin) associated with glycaemic management; evidence is moderate.',
  medicinal_method = 'Cooked bean in food, bean pod decoction'
WHERE slug = 'bean';

UPDATE plant_species SET
  medicinal_use = 'Root widely associated with cardiovascular support due to high nitrate content, which has documented blood-pressure-lowering effects. Betalain pigments associated with anti-inflammatory and antioxidant properties; moderate clinical evidence for blood pressure effects.',
  medicinal_method = 'Fresh juice, cooked root in food'
WHERE slug = 'beetroot';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Root traditionally used in European folk medicine as a digestive bitter and mild diuretic. Inulin-rich root associated with prebiotic digestive support; evidence is largely traditional.',
  medicinal_method = 'Root decoction, fresh root in food'
WHERE slug = 'black-salsify';

UPDATE plant_species SET
  medicinal_use = 'Seed and pod traditionally used in European and Middle Eastern folk medicine for digestive support, diuresis, and as a mild anti-inflammatory. Rich in protein and fibre; associated with glycaemic management.',
  medicinal_method = 'Cooked bean in food, seed decoction'
WHERE slug = 'broad-bean';

UPDATE plant_species SET
  medicinal_use = 'Associated with cancer-preventive sulforaphane compound, antioxidant properties, and anti-inflammatory effects. Rich in vitamin C and glucosinolates; dietary associations with reduced risk of chronic disease in epidemiological studies.',
  medicinal_method = 'Cooked or steamed vegetable in food'
WHERE slug = 'broccoli';

UPDATE plant_species SET
  medicinal_use = 'Rich in glucosinolates and antioxidants; associated with similar anti-inflammatory and cancer-preventive dietary associations as broccoli. Traditionally consumed in European diet as a nutritive food.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'brussels-sprout';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Same as burdock (Arctium lappa); root widely used in traditional European and Asian medicine as a liver tonic, diuretic, and for skin conditions. Rich in inulin and associated with prebiotic digestive support.',
  medicinal_method = 'Root decoction, root tincture, root in food (gobo)'
WHERE slug = 'burdock-root';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine for wound healing and digestive complaints. Rich in glutamine; associated with gut-healing properties. Raw cabbage juice traditionally used for peptic ulcers.',
  medicinal_method = 'Fresh juice, raw or cooked leaf in food'
WHERE slug = 'cabbage';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates and antioxidants; traditionally used in European folk medicine for wound healing and digestive support. Associated with anti-inflammatory properties; evidence is largely dietary and traditional.',
  medicinal_method = 'Fresh juice, cooked leaf in food'
WHERE slug = 'cabbage-green';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in anthocyanins; associated with antioxidant and anti-inflammatory properties. Traditionally used in European folk medicine for respiratory complaints and digestive support.',
  medicinal_method = 'Cooked vegetable in food, fresh juice'
WHERE slug = 'cabbage-red';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates and vitamins; associated with antioxidant and anti-inflammatory properties similar to other brassica cabbages. No recognised medicinal use distinct from green cabbage.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'cabbage-savoy';

UPDATE plant_species SET
  medicinal_use = 'Leaf and root traditionally used in Mediterranean and Middle Eastern medicine for liver and digestive support. Associated with cynarin content, which has documented choleretic properties; similar to globe artichoke.',
  medicinal_method = 'Leaf infusion, standardised extract'
WHERE slug = 'cardoon';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and Ayurvedic medicine to improve night vision and as a general tonic. Beta-carotene-rich root associated with antioxidant and immune-supportive properties; evidence for night vision is moderate.',
  medicinal_method = 'Fresh juice, cooked root in food'
WHERE slug = 'carrot';

UPDATE plant_species SET
  medicinal_use = 'Leaf and root traditionally used in African and South American folk medicine for wound healing and skin conditions. Caution: raw cassava contains cyanogenic glycosides — must be properly processed before consumption.',
  medicinal_method = 'Properly cooked root as food only; leaf decoction (traditional use only, after processing)'
WHERE slug = 'cassava';

UPDATE plant_species SET
  medicinal_use = 'Rich in glucosinolates and antioxidants; associated with similar cancer-preventive dietary associations as broccoli. Traditionally consumed as a nutritive food; evidence is largely dietary.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'cauliflower';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used in European folk medicine as a diuretic and for urinary and digestive complaints. Rich in apiol and phthalides associated with diuretic and antispasmodic properties.',
  medicinal_method = 'Fresh juice, cooked root in food'
WHERE slug = 'celeriac';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a diuretic, for urinary tract support, and digestive complaints. Contains phthalides associated with mild sedative and antispasmodic properties.',
  medicinal_method = 'Fresh juice, seed infusion, cooked vegetable in food'
WHERE slug = 'celery';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in Mesoamerican and Asian medicine for digestive support and as a mild diuretic. Associated with anti-inflammatory and antihypertensive properties; evidence is largely traditional.',
  medicinal_method = 'Cooked vegetable in food, leaf tea (traditional use only)'
WHERE slug = 'chayote';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Middle Eastern and Indian medicine for digestive support and to lower blood sugar. Rich in fibre and associated with glycaemic management; moderate evidence for hypoglycaemic effects.',
  medicinal_method = 'Cooked bean in food, sprouted seed in food'
WHERE slug = 'chickpea';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in East Asian medicine for digestive support and as a mild anti-inflammatory. Rich in glucosinolates; associated with antioxidant properties similar to other brassica vegetables.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'chinese-cabbage';

UPDATE plant_species SET
  medicinal_use = 'Seed oil rich in zinc and beta-sitosterol; traditionally used in Eastern European folk medicine for prostate complaints and as an anthelmintic. Seed associated with anti-inflammatory properties; moderate evidence.',
  medicinal_method = 'Cooked vegetable in food, seed oil'
WHERE slug = 'courgette';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in fibre and protein; traditionally consumed as a nutritive legume. Associated with digestive support and glycaemic management in dietary contexts; evidence is largely dietary.',
  medicinal_method = 'Cooked bean in food'
WHERE slug = 'cowpea-blackeye';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in Ayurvedic medicine for cooling the body and as a mild diuretic. Rich in silica and associated with diuretic and skin-supportive properties; evidence is largely traditional.',
  medicinal_method = 'Fresh juice, cooked vegetable in food'
WHERE slug = 'cucumber';

UPDATE plant_species SET
  medicinal_use = 'Shares medicinal properties with salad cucumber; traditionally used as a mild diuretic and for skin complaints. Pickling cucumbers have the same traditional uses as common cucumber.',
  medicinal_method = 'Fresh juice, cooked vegetable in food'
WHERE slug = 'cucumber-pickling';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Japanese and Chinese medicine as a digestive tonic and to support liver function. Rich in glucosinolates and isothiocyanates associated with antimicrobial and anti-inflammatory properties.',
  medicinal_method = 'Fresh grated root in food, fresh juice'
WHERE slug = 'daikon-radish';

UPDATE plant_species SET
  medicinal_use = 'Shares the antimicrobial and cardiovascular properties of garlic (Allium sativum), but in milder form. Traditionally used in Mediterranean folk medicine for digestive and immune support.',
  medicinal_method = 'Fresh bulb in food, tincture'
WHERE slug = 'elephant-garlic';

UPDATE plant_species SET
  medicinal_use = 'Bitter leaf traditionally used in European folk medicine as a liver tonic, digestive bitter, and mild laxative. Inulin-rich root associated with prebiotic digestive support.',
  medicinal_method = 'Fresh or dried leaf in food, root decoction'
WHERE slug = 'endive';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Shares the digestive and liver-supportive properties of endive and chicory; traditionally used as a bitter digestive herb. Rich in inulin; associated with prebiotic digestive support.',
  medicinal_method = 'Fresh leaf in food, root decoction'
WHERE slug = 'escarole';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Seed traditionally used in Ayurvedic medicine for blood sugar regulation, digestive support, and lactation promotion. Fibre-rich seed associated with hypoglycaemic and anti-inflammatory properties; moderate evidence.',
  medicinal_method = 'Cooked bean in food, fresh leaf in food, dried seed infusion'
WHERE slug = 'fava-bean';

UPDATE plant_species SET
  medicinal_use = 'Seed and bulb traditionally used in European and Mediterranean medicine for digestive complaints, bloating, and as a mild expectorant. Associated with oestrogenic properties from anethole.',
  medicinal_method = 'Fresh or cooked bulb in food, seed infusion'
WHERE slug = 'fennel-bulb';

UPDATE plant_species SET
  medicinal_use = 'Seed widely used in Ayurvedic and Middle Eastern medicine for blood sugar regulation, lactation promotion, and digestive support. Rich in fibre and saponins; moderate clinical evidence for hypoglycaemic effects.',
  medicinal_method = 'Dried seed infusion, seed in food, standardised extract'
WHERE slug = 'fenugreek-greens';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Shares the digestive and anti-inflammatory properties of common bean; traditionally consumed as a nutritive legume with glycaemic management associations. Evidence is largely dietary.',
  medicinal_method = 'Cooked bean in food'
WHERE slug = 'french-bean';

UPDATE plant_species SET
  medicinal_use = 'One of the most studied food medicines; widely used across traditional medicine systems for cardiovascular support, antimicrobial effects, and immune stimulation. Allicin associated with documented antimicrobial and cardiovascular effects; good clinical evidence.',
  medicinal_method = 'Raw fresh clove in food, dried extract capsule, tincture'
WHERE slug = 'garlic';

UPDATE plant_species SET
  medicinal_use = 'Shares antimicrobial and cardiovascular properties of garlic; traditionally used in East Asian medicine for digestive and immune support. Allicin content lower than common garlic.',
  medicinal_method = 'Fresh herb in food, tincture'
WHERE slug = 'garlic-chive';

UPDATE plant_species SET
  medicinal_use = 'Rhizome widely used in traditional medicine worldwide for nausea, digestive complaints, and anti-inflammatory effects. Gingerol content associated with documented antiemetic and anti-inflammatory properties; good clinical evidence for nausea.',
  medicinal_method = 'Fresh or dried rhizome in food, rhizome infusion, standardised extract capsule'
WHERE slug = 'ginger';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Central and South American folk medicine for respiratory complaints and as a nutritive tonic. Associated with physalin content; evidence is largely traditional.',
  medicinal_method = 'Fresh fruit in food'
WHERE slug = 'ground-cherry';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used in European folk medicine as a sinus decongestant, expectorant, and urinary antiseptic. Isothiocyanate content associated with documented antimicrobial properties; moderate evidence.',
  medicinal_method = 'Freshly grated root in food, root tincture'
WHERE slug = 'horseradish';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used in European and North American folk medicine as a prebiotic and for digestive complaints. Inulin-rich root associated with prebiotic digestive support and blood sugar management; evidence is moderate.',
  medicinal_method = 'Cooked root in food'
WHERE slug = 'jerusalem-artichoke';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Central American folk medicine for digestive complaints and as a mild diuretic. Rich in fibre; associated with blood sugar management; evidence is largely traditional.',
  medicinal_method = 'Fresh root in food'
WHERE slug = 'jicama';

UPDATE plant_species SET
  medicinal_use = 'Rich in sulforaphane, vitamins, and antioxidants; associated with anti-inflammatory and cancer-preventive dietary properties similar to other kale varieties. Traditionally consumed as a nutritive food.',
  medicinal_method = 'Fresh or cooked leaf in food, fresh juice'
WHERE slug = 'kale-curly';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates and vitamins; associated with anti-inflammatory and antioxidant dietary properties similar to curly kale. No recognised medicinal use distinct from other kale varieties.',
  medicinal_method = 'Fresh or cooked leaf in food'
WHERE slug = 'kale-lacinato';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a nutritive vegetable; associated with glucosinolate content but no established clinical medicinal application.'
WHERE slug = 'kohlrabi';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a mild diuretic and for digestive complaints. Contains alliin (milder than garlic) and is associated with mild antimicrobial and anti-inflammatory properties.',
  medicinal_method = 'Fresh cooked vegetable in food, leaf decoction'
WHERE slug = 'leek';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine as a mild sedative and digestive bitter. Wild lettuce latex associated with mild sedative properties; cultivated lettuce has minimal medicinal use.',
  medicinal_method = 'Fresh leaf in food'
WHERE slug = 'lettuce';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use distinct from other cultivated lettuces. Primarily a nutritive vegetable; evidence for therapeutic use is insufficient.'
WHERE slug = 'lettuce-butterhead';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'No recognised medicinal use distinct from other cultivated lettuces. Primarily a nutritive vegetable; evidence for therapeutic use is insufficient.'
WHERE slug = 'lettuce-iceberg';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'No recognised medicinal use distinct from other cultivated lettuces. Primarily a nutritive vegetable; evidence for therapeutic use is insufficient.'
WHERE slug = 'lettuce-looseleaf';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and Middle Eastern medicine as a mild digestive and diuretic. Rich in vitamins and minerals; associated with mild anti-inflammatory properties.',
  medicinal_method = 'Fresh leaf in food'
WHERE slug = 'lettuce-romaine';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally consumed as a nutritive legume; rich in fibre and protein associated with glycaemic management. No recognised medicinal use distinct from other Phaseolus beans.',
  medicinal_method = 'Cooked bean in food'
WHERE slug = 'lima-bean';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Ayurvedic and African folk medicine as an anti-inflammatory, demulcent, and laxative. Mucilaginous leaf associated with topical soothing and digestive demulcent properties.',
  medicinal_method = 'Cooked leaf in food, leaf poultice (external)'
WHERE slug = 'malabar-spinach';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in Middle Eastern and Asian folk medicine for digestive complaints and as a mild diuretic. Rich in beta-carotene and vitamin C; associated with antioxidant properties.',
  medicinal_method = 'Fresh fruit in food, seed infusion'
WHERE slug = 'melon-cantaloupe';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates; associated with antioxidant and mild anti-inflammatory dietary properties similar to other Asian brassica greens. No recognised medicinal use distinct from other brassicas.',
  medicinal_method = 'Fresh or cooked leaf in food'
WHERE slug = 'mizuna';

UPDATE plant_species SET
  medicinal_use = 'Shares antimicrobial and cardiovascular properties of common onion. Traditionally used in folk medicine for digestive and immune support; alliin content associated with mild antimicrobial effects.',
  medicinal_method = 'Fresh or cooked bulb in food'
WHERE slug = 'multiplier-onion';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Asian and European folk medicine as an expectorant, diuretic, and anti-inflammatory. Rich in glucosinolates; associated with antimicrobial properties similar to horseradish.',
  medicinal_method = 'Fresh leaf in food, seed infusion'
WHERE slug = 'mustard-greens';

UPDATE plant_species SET
  medicinal_use = 'Seed, root, and leaf traditionally used in West African and South Asian medicine as a diuretic, anti-inflammatory, and digestive tonic. Mucilaginous fruit associated with demulcent properties for digestive complaints.',
  medicinal_method = 'Cooked fruit in food, seed infusion, leaf decoction'
WHERE slug = 'okra';

UPDATE plant_species SET
  medicinal_use = 'Widely used in traditional medicine for antimicrobial, cardiovascular, and digestive support. Alliin content associated with documented antimicrobial and anti-inflammatory effects; good clinical evidence similar to garlic.',
  medicinal_method = 'Fresh or cooked onion in food, raw onion juice'
WHERE slug = 'onion';

UPDATE plant_species SET
  medicinal_use = 'Same species as common onion; shares all recognised medicinal properties. Traditionally used for antimicrobial, cardiovascular, and digestive support.',
  medicinal_method = 'Fresh or cooked bulb in food, raw juice'
WHERE slug = 'onion-bulb';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates; associated with antioxidant and mild anti-inflammatory dietary properties similar to other brassica greens. No recognised medicinal use distinct from other brassicas.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'pak-choi';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used in European folk medicine as a digestive tonic and mild anti-inflammatory. Associated with falcarinol content; evidence for anti-inflammatory activity is limited.',
  medicinal_method = 'Cooked root in food'
WHERE slug = 'parsnip';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally consumed as a nutritive legume; rich in fibre and protein associated with digestive health and glycaemic management. No recognised medicinal use distinct from garden peas.',
  medicinal_method = 'Cooked peas in food'
WHERE slug = 'pea';

UPDATE plant_species SET
  medicinal_use = 'Traditionally consumed as a nutritive legume; associated with digestive health and glycaemic management due to fibre content. No recognised medicinal use distinct from other pea varieties.',
  medicinal_method = 'Cooked peas in food'
WHERE slug = 'peas-garden';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally consumed as a nutritive legume; shares the fibre-related digestive associations of garden peas. No recognised medicinal use distinct from other pea varieties.',
  medicinal_method = 'Cooked peas in food'
WHERE slug = 'peas-snap';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally consumed as a nutritive legume; shares the fibre-related digestive associations of garden peas. No recognised medicinal use distinct from other pea varieties.',
  medicinal_method = 'Cooked peas in food'
WHERE slug = 'peas-snow';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in vitamin C and antioxidants; associated with anti-inflammatory properties in dietary contexts. No recognised medicinal use distinct from hot pepper varieties.',
  medicinal_method = 'Fresh or cooked vegetable in food'
WHERE slug = 'pepper';

UPDATE plant_species SET
  medicinal_use = 'Capsaicin widely used in topical preparations for pain relief, particularly musculoskeletal and neuropathic pain. Associated with analgesic effects via TRPV1 receptor modulation; good clinical evidence for topical capsaicin use.',
  medicinal_method = 'Topical capsaicin cream, fresh or dried chilli in food'
WHERE slug = 'pepper-chilli';

UPDATE plant_species SET
  medicinal_use = 'Contains higher capsaicin concentration than common chilli; associated with stronger analgesic and anti-inflammatory effects. Used in topical preparations for pain management; evidence is moderate.',
  medicinal_method = 'Topical capsaicin cream, fresh pepper in food'
WHERE slug = 'pepper-hot';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in vitamin C and antioxidants; associated with anti-inflammatory properties in dietary contexts. No recognised medicinal use distinct from other sweet pepper varieties.',
  medicinal_method = 'Fresh or cooked vegetable in food'
WHERE slug = 'pepper-sweet';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European folk medicine for wound healing and digestive complaints. Raw potato poultice associated with soothing burns and inflammation; solanine in green parts is toxic.',
  medicinal_method = 'Raw potato poultice (external), cooked potato in food'
WHERE slug = 'potato';

UPDATE plant_species SET
  medicinal_use = 'Seed oil rich in zinc, beta-sitosterol, and essential fatty acids; traditionally used in Eastern European folk medicine for prostate and urinary complaints. Associated with anti-inflammatory properties; moderate evidence.',
  medicinal_method = 'Seed oil, roasted seeds in food'
WHERE slug = 'pumpkin';

UPDATE plant_species SET
  medicinal_use = 'Rich in omega-3 fatty acids and minerals; traditionally used in European and Middle Eastern folk medicine as a nutritive tonic and mild anti-inflammatory. Associated with antioxidant and prebiotic properties.',
  medicinal_method = 'Fresh leaf in food, leaf infusion'
WHERE slug = 'purslane';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Bitter leaf traditionally used in European folk medicine as a liver and digestive tonic. Inulin-rich root associated with prebiotic digestive support; shares properties with chicory.',
  medicinal_method = 'Fresh leaf in food, root decoction'
WHERE slug = 'radicchio';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and Asian folk medicine as a digestive stimulant and mild diuretic. Rich in glucosinolates and isothiocyanates associated with mild antimicrobial and digestive properties.',
  medicinal_method = 'Fresh raw root in food, root juice'
WHERE slug = 'radish';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Chinese and Japanese medicine as a digestive tonic and mild antimicrobial. Associated with alliin content and mild cardiovascular properties; evidence is largely traditional.',
  medicinal_method = 'Fresh bulb in food, pickle'
WHERE slug = 'rakkyo';

UPDATE plant_species SET
  medicinal_use = 'Root used in traditional Chinese medicine as a powerful laxative and anthraquinone-based liver tonic. Anthraquinone glycosides are associated with potent laxative effects; contraindicated in pregnancy and for children.',
  medicinal_method = 'Dried root decoction, standardised extract (laxative use only; not in pregnancy)'
WHERE slug = 'rhubarb';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in European and Middle Eastern folk medicine as a diuretic, digestive stimulant, and mild antimicrobial. Glucosinolate-rich; associated with documented antimicrobial properties for urinary tract complaints.',
  medicinal_method = 'Fresh leaf in food, leaf infusion'
WHERE slug = 'rocket';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates; associated with antioxidant and anti-inflammatory dietary properties similar to broccoli. No recognised medicinal use distinct from other brassica varieties.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'romanesco';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in South American folk medicine for digestive complaints and as a mild diuretic. Rich in fibre and protein; associated with glycaemic management; evidence is largely traditional.',
  medicinal_method = 'Cooked bean in food'
WHERE slug = 'runner-bean';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Root traditionally used in European folk medicine as a digestive bitter and mild diuretic. Inulin-rich root associated with prebiotic digestive support; evidence is largely traditional.',
  medicinal_method = 'Fresh root in food, root decoction'
WHERE slug = 'salsify';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Shares the nutritive and mild digestive properties of runner bean; traditionally consumed as a food legume. No recognised medicinal use distinct from runner bean.',
  medicinal_method = 'Cooked bean in food'
WHERE slug = 'scarlet-runner-bean';

UPDATE plant_species SET
  medicinal_use = 'Shares antimicrobial and cardiovascular properties of common onion; used in French and Asian cuisine as a flavouring with mild medicinal associations. Alliin content associated with mild antimicrobial effects.',
  medicinal_method = 'Fresh or cooked bulb in food'
WHERE slug = 'shallot';

UPDATE plant_species SET
  medicinal_use = 'Leaf traditionally used as a mild diuretic and for digestive complaints. High oxalic acid content limits large-scale medicinal use; associated with mild astringent properties.',
  medicinal_method = 'Fresh leaf in food, leaf infusion'
WHERE slug = 'sorrel';

UPDATE plant_species SET
  medicinal_use = 'Isoflavone-rich bean widely associated with menopausal symptom support and cardiovascular health. Phytoestrogen content associated with oestrogenic effects; moderate clinical evidence for cardiovascular and menopausal support.',
  medicinal_method = 'Cooked beans in food, standardised isoflavone extract'
WHERE slug = 'soybean-edamame';

UPDATE plant_species SET
  medicinal_use = 'Rich in iron, folate, and vitamins; traditionally used as a nutritive tonic and mild laxative. Associated with antioxidant properties; evidence for specific therapeutic use beyond nutrition is limited.',
  medicinal_method = 'Fresh or cooked leaf in food, fresh juice'
WHERE slug = 'spinach';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in East Asian and European folk medicine as a mild antimicrobial and digestive herb. Shares mild allicin-related properties with other Allium species.',
  medicinal_method = 'Fresh herb in food'
WHERE slug = 'spring-onion';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates; associated with antioxidant and anti-inflammatory dietary properties similar to broccoli. No recognised medicinal use distinct from other sprouting brassica varieties.',
  medicinal_method = 'Cooked vegetable in food'
WHERE slug = 'sprouting-broccoli';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Seed oil rich in zinc and beta-sitosterol; associated with anti-inflammatory and prostate-supportive properties similar to other Cucurbita pepo varieties. Evidence is largely traditional.',
  medicinal_method = 'Cooked vegetable in food, seed oil'
WHERE slug = 'squash-pattypan';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'No recognised medicinal use distinct from other summer squash varieties. Primarily a nutritive vegetable.',
  medicinal_method = NULL
WHERE slug = 'squash-spaghetti';

UPDATE plant_species SET
  medicinal_use = 'Seed oil rich in zinc, beta-sitosterol, and essential fatty acids; traditionally used for prostate and urinary complaints. Associated with anti-inflammatory properties; evidence is moderate.',
  medicinal_method = 'Cooked vegetable in food, seed oil'
WHERE slug = 'squash-winter';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'No recognised medicinal use distinct from other summer squash varieties. Primarily a nutritive vegetable.',
  medicinal_method = NULL
WHERE slug = 'squash-yellow';

UPDATE plant_species SET
  medicinal_use = 'No recognised medicinal use. Primarily a nutritive root vegetable; associated with glucosinolate content but no established clinical medicinal application.'
WHERE slug = 'swede-rutabaga';

UPDATE plant_species SET
  medicinal_use = 'Traditionally used in Central and South American folk medicine as an antioxidant tonic and for blood sugar management. Beta-carotene and anthocyanin-rich; associated with antioxidant and anti-inflammatory properties.',
  medicinal_method = 'Cooked root in food, fresh juice'
WHERE slug = 'sweet-potato';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Corn silk (Zea mays stigma) traditionally used in European and North American folk medicine as a diuretic and for urinary tract complaints. Associated with mild diuretic flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Corn silk infusion, cooked corn in food'
WHERE slug = 'sweetcorn';

UPDATE plant_species SET
  medicinal_use = 'Rich in betalain pigments and minerals; associated with antioxidant and anti-inflammatory properties. Traditionally consumed as a nutritive food; evidence for specific medicinal use is limited.',
  medicinal_method = 'Fresh or cooked leaf in food, fresh juice'
WHERE slug = 'swiss-chard';

UPDATE plant_species SET
  medicinal_use = 'Corm and leaf traditionally used in Asian and Pacific folk medicine for wound healing, digestive complaints, and skin conditions. Calcium oxalate crystals in raw taro are irritant — must be properly cooked.',
  medicinal_method = 'Properly cooked corm in food (raw taro is irritant)'
WHERE slug = 'taro';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Rich in glucosinolates; associated with antioxidant and mild anti-inflammatory dietary properties similar to other Asian brassica greens. No recognised medicinal use distinct from other brassicas.',
  medicinal_method = 'Fresh or cooked leaf in food'
WHERE slug = 'tatsoi';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Traditionally used in Mexican folk medicine for digestive complaints and as a mild diuretic. Contains physalin compounds; associated with anti-inflammatory properties; evidence is largely traditional.',
  medicinal_method = 'Fresh fruit in food'
WHERE slug = 'tomatillo';

UPDATE plant_species SET
  medicinal_use = 'Widely associated with lycopene-mediated antioxidant and anti-inflammatory properties. Epidemiological associations with reduced prostate cancer risk; lycopene bioavailability increases with cooking.',
  medicinal_method = 'Cooked or raw fruit in food, fresh juice'
WHERE slug = 'tomato';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Shares the lycopene and antioxidant properties of common tomato. Associated with cardiovascular and anti-inflammatory dietary properties in dietary contexts.',
  medicinal_method = 'Fresh or cooked fruit in food'
WHERE slug = 'tomato-cherry';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Shares the lycopene and antioxidant properties of common tomato. Associated with cardiovascular and anti-inflammatory dietary properties in dietary contexts.',
  medicinal_method = 'Fresh or cooked fruit in food'
WHERE slug = 'tomato-plum';

UPDATE plant_species SET
  medicinal_use = 'Root traditionally used in European folk medicine as a mild diuretic and digestive stimulant. Rich in glucosinolates; associated with mild antimicrobial and digestive properties.',
  medicinal_method = 'Fresh raw root in food, root juice'
WHERE slug = 'turnip';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Leaf traditionally used in European folk medicine as a diuretic and for respiratory complaints. Rich in glucosinolates and isothiocyanates associated with documented antimicrobial properties; used for urinary tract support.',
  medicinal_method = 'Fresh leaf in food, fresh juice'
WHERE slug = 'watercress';

UPDATE plant_species SET
  medicinal_use = 'Fruit and seed traditionally used in Ayurvedic and Chinese medicine as a diuretic and for urinary complaints. Rich in lycopene and citrulline associated with cardiovascular and anti-inflammatory properties.',
  medicinal_method = 'Fresh fruit in food, seed decoction'
WHERE slug = 'watermelon';

UPDATE plant_species SET
  medicinal = true,
  medicinal_use = 'Root traditionally used in South American folk medicine for blood sugar management and digestive support. Inulin-rich root associated with prebiotic digestive properties; moderate evidence for glycaemic management.',
  medicinal_method = 'Fresh root in food, root extract'
WHERE slug = 'yacon';

-- ============================================================
-- VINE (7 species)
-- ============================================================

UPDATE plant_species SET
  medicinal_use = 'Stem and fruit traditionally used in Chinese medicine for urinary complaints, anti-inflammatory effects, and as a mild analgesic. Associated with akebia saponin content; evidence is largely traditional.',
  medicinal_method = 'Stem decoction, dried fruit infusion'
WHERE slug = 'akebia';

UPDATE plant_species SET
  medicinal_use = 'Leaf, fruit, and seed have multiple traditional medicinal associations including cardiovascular support (resveratrol), antioxidant effects, and mild astringent properties. Grape seed extract associated with venous insufficiency support; moderate clinical evidence.',
  medicinal_method = 'Grape seed extract capsule, dried fruit, leaf infusion'
WHERE slug = 'grape-vine';

UPDATE plant_species SET
  medicinal_use = 'Strobilus (female cone) widely used in European and North American herbal medicine as a mild sedative and for anxiety, insomnia, and digestive complaints. Associated with methylbutenol and flavonoid sedative effects; moderate clinical evidence.',
  medicinal_method = 'Dried strobilus infusion, tincture, extract capsule'
WHERE slug = 'hop-common';

UPDATE plant_species SET
  medicinal_use = 'Fruit and leaf used in Traditional Chinese Medicine for digestive support and as a nutritive tonic. Associated with actinidin enzyme and vitamin C content; evidence is largely traditional and dietary.',
  medicinal_method = 'Fresh fruit in food, leaf infusion'
WHERE slug = 'kiwi-common';

UPDATE plant_species SET
  medicinal_use = 'Fruit and leaf used in East Asian traditional medicine for digestive support and as a nutritive tonic. Associated with high vitamin C and antioxidant content; evidence is largely traditional.',
  medicinal_method = 'Fresh fruit in food, leaf infusion'
WHERE slug = 'kiwi-hardy';

UPDATE plant_species SET
  medicinal_use = 'Leaf widely used in European and South American herbal medicine as a mild sedative, for anxiety, and insomnia. Associated with flavonoid (chrysin) and gamma-aminobutyric acid-modulating effects; moderate clinical evidence for anxiety and sleep.',
  medicinal_method = 'Dried leaf infusion, tincture, standardised extract capsule'
WHERE slug = 'passionflower';

UPDATE plant_species SET
  medicinal_use = 'Berry widely used in Traditional Chinese Medicine as an adaptogen for liver protection, immune support, and to combat fatigue. Schisandrin content associated with hepatoprotective effects; moderate to good clinical evidence.',
  medicinal_method = 'Dried berry infusion, standardised extract capsule, tincture'
WHERE slug = 'schisandra';


UPDATE plant_species SET
  medicinal_use = 'Leaf and bark used in South American and Caribbean folk medicine for digestive complaints, skin conditions, and as a mild astringent. Associated with tannin and flavonoid content; evidence is largely traditional.',
  medicinal_method = 'Dried leaf infusion, bark decoction'
WHERE slug = 'fruit-guava-strawberry';

UPDATE plant_species SET
  medicinal_use = 'Historically used in European folk medicine as an anthelmintic, insect repellent, and to stimulate digestion. Contains high thujone content which is toxic in concentrated form -- internal use is not recommended. External use as insect repellent has traditional support.',
  medicinal_method = 'External repellent, dried herb (very small quantities only in traditional use)'
WHERE slug = 'tansy';

COMMIT;
