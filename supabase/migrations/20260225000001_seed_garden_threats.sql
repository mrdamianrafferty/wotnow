-- Migration: Seed garden_threat table with 50+ common garden threats
-- Idempotent: uses ON CONFLICT (slug) DO NOTHING

INSERT INTO garden_threat (slug, threat_type, common_name_en, scientific_name, description, recognition, severity_default, contagious, regions_applicable, notes, card_json)
VALUES

-- ============================================================
-- PESTS (20)
-- ============================================================

(
  'aphids',
  'pest',
  'Aphids',
  'Aphidoidea spp.',
  'Small sap-sucking insects that colonise soft new growth, flower buds, and the undersides of leaves. They reproduce rapidly in warm weather and excrete sticky honeydew that attracts sooty mould. Heavy infestations weaken plants and can transmit viral diseases.',
  'Clusters of tiny soft-bodied insects (green, black, pink, or white) on shoot tips and leaf undersides, often accompanied by sticky honeydew and distorted new growth.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'One of the most common garden pests worldwide.',
  '{
    "recognition_bullets": [
      "Clusters of small soft-bodied insects on new growth and leaf undersides",
      "Sticky honeydew residue on leaves and surfaces below",
      "Curled, distorted, or yellowing young leaves",
      "Presence of sooty mould (black coating) on honeydew deposits",
      "Ants farming aphid colonies up and down stems"
    ],
    "prevention_bullets": [
      "Encourage natural predators such as ladybirds, lacewings, and hoverflies",
      "Avoid excessive nitrogen fertilisation which produces lush soft growth",
      "Companion plant with marigolds, nasturtiums, or alliums",
      "Inspect new plants before introducing them to the garden"
    ],
    "treatment_pesticide_free": [
      "Blast colonies off with a strong jet of water",
      "Squash small colonies by hand between finger and thumb",
      "Apply dilute soft soap or washing-up liquid spray",
      "Introduce biological controls such as Aphidius colemani parasitic wasps"
    ],
    "where_on_plant": ["shoot tips", "leaf undersides", "flower buds", "stems"],
    "confirmation_tips": [
      "Check whether the insects are soft-bodied and largely immobile",
      "Look for cast white skins (exuviae) on leaves below colonies"
    ],
    "when_to_escalate_bullets": [
      "Severe distortion of new growth across multiple plants",
      "Sooty mould covering significant leaf area reducing photosynthesis",
      "Virus symptoms (mottling, streaking) appearing on affected plants"
    ]
  }'::jsonb
),

(
  'slugs-snails',
  'pest',
  'Slugs & Snails',
  'Gastropoda spp.',
  'Molluscs that feed on a wide range of garden plants, particularly seedlings, soft herbaceous foliage, and ripening fruit near the ground. They are most active at night and in damp conditions. Damage can be devastating to young transplants.',
  'Irregular holes chewed in leaves and stems, with characteristic silvery slime trails visible on foliage and surrounding surfaces.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Particularly damaging in wet seasons and on heavy soils.',
  '{
    "recognition_bullets": [
      "Irregular ragged holes in leaves, especially lower foliage",
      "Silvery slime trails on leaves, soil, and hard surfaces",
      "Seedlings eaten down to ground level overnight",
      "Damage concentrated on hostas, lettuce, dahlias, and delphiniums",
      "Most damage occurs overnight or during wet weather"
    ],
    "prevention_bullets": [
      "Clear plant debris and hiding places around beds",
      "Water in the morning rather than evening to reduce overnight moisture",
      "Use copper tape barriers around pots and raised beds",
      "Encourage natural predators: hedgehogs, frogs, thrushes, and ground beetles"
    ],
    "treatment_pesticide_free": [
      "Hand-pick slugs and snails after dark using a torch",
      "Set beer traps sunk level with the soil surface",
      "Apply nematode biological control (Phasmarhabditis hermaphrodita) to soil",
      "Surround vulnerable plants with sharp grit, wool pellets, or crushed eggshells"
    ],
    "where_on_plant": ["leaves", "stems at ground level", "seedlings", "fruit touching soil"],
    "confirmation_tips": [
      "Go out after dark with a torch to find culprits",
      "Look for slime trails leading to and from damaged plants"
    ],
    "when_to_escalate_bullets": [
      "Entire rows of seedlings destroyed overnight",
      "Persistent damage despite barriers and trapping"
    ]
  }'::jsonb
),

(
  'spider-mites',
  'pest',
  'Spider Mites',
  'Tetranychus urticae',
  'Tiny sap-sucking arachnids that thrive in hot, dry conditions, particularly under glass. They cause stippled, bronzed foliage and in severe infestations produce fine webbing over leaves and shoot tips. Plants can be seriously weakened.',
  'Fine pale stippling on upper leaf surfaces giving a bronzed appearance, with tiny mites and fine silk webbing visible on leaf undersides under magnification.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Especially problematic in greenhouses and polytunnels.',
  '{
    "recognition_bullets": [
      "Fine pale yellow-white stippling on upper leaf surfaces",
      "Leaves becoming bronzed or silvered in severe cases",
      "Very fine silk webbing on leaf undersides and between leaves",
      "Tiny mites (less than 1mm) visible with a hand lens on leaf undersides",
      "Plants appear dull and lack vigour"
    ],
    "prevention_bullets": [
      "Maintain good humidity levels; mist plants regularly in greenhouses",
      "Avoid overcrowding plants which creates hot, still microclimates",
      "Inspect new plants carefully before introducing to the growing space"
    ],
    "treatment_pesticide_free": [
      "Increase humidity by misting and damping down greenhouse floors",
      "Introduce the predatory mite Phytoseiulus persimilis as biological control",
      "Spray with plant oil or soft soap-based preparation",
      "Remove and destroy heavily infested leaves"
    ],
    "where_on_plant": ["leaf undersides", "between leaves and stems", "shoot tips"],
    "confirmation_tips": [
      "Hold a sheet of white paper under a leaf and tap; look for tiny moving dots",
      "Use a hand lens (10x) to see mites and their round eggs on leaf undersides"
    ],
    "when_to_escalate_bullets": [
      "Extensive webbing covering multiple shoots",
      "Widespread leaf drop and plant decline"
    ]
  }'::jsonb
),

(
  'whitefly',
  'pest',
  'Whitefly',
  'Trialeurodes vaporariorum / Bemisia tabaci',
  'Small white-winged sap-sucking insects that cluster on leaf undersides, particularly in greenhouses. They fly up in a characteristic cloud when disturbed. Adults and scale-like nymphs excrete honeydew, promoting sooty mould growth.',
  'Tiny white moth-like insects that fly up in clouds when foliage is disturbed, with scale-like nymphs visible on leaf undersides alongside sticky honeydew.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Glasshouse whitefly is the most common species in the UK.',
  '{
    "recognition_bullets": [
      "Clouds of tiny white-winged insects fly up when plants are disturbed",
      "Flat, oval, pale green scale-like nymphs on leaf undersides",
      "Sticky honeydew deposits on lower leaves",
      "Sooty mould developing on honeydew",
      "Yellowing and wilting of heavily infested leaves"
    ],
    "prevention_bullets": [
      "Use yellow sticky traps to monitor and reduce numbers",
      "Inspect bought plants for nymphs before bringing into the greenhouse",
      "Maintain good ventilation to discourage population build-up"
    ],
    "treatment_pesticide_free": [
      "Hang yellow sticky traps throughout the greenhouse at canopy height",
      "Introduce the parasitic wasp Encarsia formosa as biological control",
      "Spray with soft soap or horticultural oil, targeting leaf undersides",
      "Vacuum adults from plants in the early morning when they are sluggish"
    ],
    "where_on_plant": ["leaf undersides", "shoot tips", "around flowers"],
    "confirmation_tips": [
      "Gently shake the plant and watch for white clouds rising",
      "Check leaf undersides for flat oval nymphs with a hand lens"
    ],
    "when_to_escalate_bullets": [
      "Heavy sooty mould reducing photosynthesis across the crop",
      "Plants becoming stunted and yellow despite feeding"
    ]
  }'::jsonb
),

(
  'thrips',
  'pest',
  'Thrips',
  'Thysanoptera spp.',
  'Minute slender insects that rasp at plant tissue and suck the sap, causing silvery streaks and flecking on leaves and flowers. Some species transmit plant viruses. They are particularly damaging to onions, leeks, peas, and ornamental flowers.',
  'Silvery-white streaks or flecking on leaves and petals, sometimes with tiny black specks of frass; minute slender insects visible with a hand lens.',
  2,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Western flower thrips can transmit tomato spotted wilt virus.',
  '{
    "recognition_bullets": [
      "Silvery-white streaks and patches on leaves",
      "Distorted or discoloured flower petals with brown edges",
      "Tiny black frass specks on damaged tissue",
      "Minute elongated insects (1-2mm) visible with magnification",
      "Leaves may curl or become papery in severe infestations"
    ],
    "prevention_bullets": [
      "Use blue sticky traps to monitor thrips populations",
      "Remove weeds which can harbour thrips",
      "Maintain good humidity as thrips prefer dry conditions"
    ],
    "treatment_pesticide_free": [
      "Introduce predatory mites (Amblyseius cucumeris) for biological control",
      "Spray with soft soap solution, ensuring thorough coverage",
      "Remove and destroy heavily damaged flowers and foliage",
      "Hose plants down regularly to dislodge thrips"
    ],
    "where_on_plant": ["leaves", "flowers", "developing buds", "leaf sheaths"],
    "confirmation_tips": [
      "Tap flowers over white paper and look for tiny elongated insects",
      "Use a hand lens to examine silvery patches for thrips and their larvae"
    ],
    "when_to_escalate_bullets": [
      "Virus symptoms appearing (ring spots, mottling) suggesting TSWV transmission",
      "Entire flower crops unmarketable due to petal damage"
    ]
  }'::jsonb
),

(
  'scale-insects',
  'pest',
  'Scale Insects',
  'Coccoidea spp.',
  'Sap-sucking insects that attach themselves to stems, leaves, and branches, hiding beneath a protective waxy or shell-like covering. They weaken plants over time and produce honeydew. Commonly found on ornamental shrubs, citrus, and houseplants.',
  'Small immobile brown, white, or waxy bumps firmly attached to stems and leaf undersides, often accompanied by sticky honeydew and sooty mould.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Multiple species; soft scale and hard/armoured scale require different approaches.',
  '{
    "recognition_bullets": [
      "Small raised bumps (2-5mm) on stems, branches, and leaf undersides",
      "Brown, white, or waxy coverings that do not move when touched",
      "Sticky honeydew on leaves below infestations",
      "Sooty mould developing on honeydew deposits",
      "Yellowing leaves and general lack of vigour"
    ],
    "prevention_bullets": [
      "Inspect new plants thoroughly before purchase",
      "Prune out badly infested stems to reduce populations",
      "Encourage natural predators such as parasitic wasps and ladybirds"
    ],
    "treatment_pesticide_free": [
      "Scrub scale off stems and branches with a soft toothbrush dipped in soapy water",
      "Apply horticultural oil or winter tree wash to smother scales",
      "Dab individual scales with methylated spirits on a cotton bud",
      "Introduce biological controls (e.g. Metaphycus helvolus for soft scale)"
    ],
    "where_on_plant": ["stems", "branches", "leaf midribs", "leaf undersides"],
    "confirmation_tips": [
      "Try to lift a bump with a fingernail; scale insects prise off leaving a mark",
      "Check for crawlers (tiny mobile juvenile stage) in early summer"
    ],
    "when_to_escalate_bullets": [
      "Stems encrusted with overlapping scale, causing dieback",
      "Persistent heavy infestations despite repeated treatment"
    ]
  }'::jsonb
),

(
  'mealybugs',
  'pest',
  'Mealybugs',
  'Pseudococcidae spp.',
  'Soft-bodied sap-sucking insects covered in a white waxy coating, commonly found in leaf axils, on stems, and at the base of plants. They produce honeydew and are particularly troublesome on houseplants, greenhouse crops, and tender perennials.',
  'White cottony or waxy clusters in leaf axils, at stem junctions, and on leaf undersides, with sticky honeydew present.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Root mealybugs are a separate group that infest root systems.',
  '{
    "recognition_bullets": [
      "White cottony waxy masses in leaf axils and stem junctions",
      "Oval soft-bodied insects (3-4mm) covered in white mealy wax",
      "Sticky honeydew on leaves and surrounding surfaces",
      "White waxy egg masses at the base of plants or in crevices",
      "Yellowing leaves and stunted growth on infested plants"
    ],
    "prevention_bullets": [
      "Quarantine new houseplants for two weeks before mixing with existing collection",
      "Inspect leaf axils and stem bases regularly",
      "Avoid over-watering and over-feeding which promotes soft lush growth"
    ],
    "treatment_pesticide_free": [
      "Dab individual mealybugs with a cotton bud soaked in methylated spirits",
      "Spray with soft soap or neem oil solution, repeating weekly",
      "Introduce the ladybird Cryptolaemus montrouzieri as biological control",
      "Wipe visible colonies off with damp cotton wool"
    ],
    "where_on_plant": ["leaf axils", "stem junctions", "roots", "under bark"],
    "confirmation_tips": [
      "The white waxy coating distinguishes mealybugs from woolly aphids",
      "Check roots at repotting for root mealybugs (white waxy patches on roots)"
    ],
    "when_to_escalate_bullets": [
      "Persistent infestations spreading across a plant collection",
      "Root mealybugs causing widespread decline"
    ]
  }'::jsonb
),

(
  'vine-weevil',
  'pest',
  'Vine Weevil',
  'Otiorhynchus sulcatus',
  'A highly destructive beetle whose larvae feed on plant roots, causing sudden wilting and death, while adults eat characteristic notches from leaf margins. Container-grown plants are especially vulnerable. The larvae are the primary cause of damage.',
  'C-shaped creamy-white grubs with brown heads found in compost around roots, or distinctive semi-circular notches eaten from leaf edges by the matt-black adult beetles.',
  5,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Adults are nocturnal; go out after dark to find them.',
  '{
    "recognition_bullets": [
      "Irregular notches eaten from leaf margins by adult beetles",
      "Sudden wilting or collapse of container plants",
      "Plump creamy-white C-shaped grubs (up to 10mm) in compost around roots",
      "Matt black beetles (8-10mm) with elbowed antennae found at night",
      "Root system eaten away when pot-bound plant is tipped out"
    ],
    "prevention_bullets": [
      "Apply biological nematode control (Steinernema kraussei) to compost in autumn",
      "Use vine weevil-resistant compost containing imidacloprid (where permitted)",
      "Stand containers on benches or pot feet to make access harder",
      "Check the compost of newly purchased plants for larvae"
    ],
    "treatment_pesticide_free": [
      "Apply parasitic nematodes (Steinernema kraussei) to compost as a drench in late summer/autumn",
      "Hand-pick adults at night using a torch",
      "Shake plants over a sheet or newspaper to dislodge hiding adults",
      "Repot affected plants, removing and destroying all visible grubs"
    ],
    "where_on_plant": ["roots (larvae)", "leaf margins (adults)", "crown (larvae)"],
    "confirmation_tips": [
      "Tip a wilting container plant out to check for white grubs",
      "Go out after dark to spot adult beetles on foliage"
    ],
    "when_to_escalate_bullets": [
      "Multiple plants collapsing in containers",
      "Heavy grub infestations in beds near the crowns of perennials"
    ]
  }'::jsonb
),

(
  'brassica-caterpillars',
  'pest',
  'Brassica Caterpillars',
  'Pieris brassicae / Pieris rapae / Mamestra brassicae',
  'The larvae of cabbage white butterflies and cabbage moth that can rapidly defoliate brassica crops including cabbages, broccoli, kale, and Brussels sprouts. Large white caterpillars are conspicuous yellow-green with black markings; small white caterpillars are better camouflaged.',
  'Green or yellow-green caterpillars feeding on brassica leaves, leaving large irregular holes and copious dark green frass pellets.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Prevention with netting is far more effective than treatment.',
  '{
    "recognition_bullets": [
      "Large irregular holes in brassica leaves",
      "Yellow-green caterpillars with black markings (large white) on outer leaves",
      "Pale green well-camouflaged caterpillars (small white) boring into hearts",
      "Clusters of yellow eggs on leaf undersides (large white)",
      "Dark green frass pellets scattered on leaves and in leaf hearts"
    ],
    "prevention_bullets": [
      "Cover brassica crops with fine mesh netting (e.g. Enviromesh) immediately after planting",
      "Inspect leaf undersides weekly and squash egg batches",
      "Companion plant with strongly scented herbs such as rosemary and thyme"
    ],
    "treatment_pesticide_free": [
      "Hand-pick caterpillars and eggs regularly",
      "Apply Bacillus thuringiensis (Bt) spray which targets only caterpillars",
      "Encourage natural predators: birds, parasitic wasps (Cotesia glomerata)",
      "Use decoy white butterfly models to deter egg-laying (territorial behaviour)"
    ],
    "where_on_plant": ["outer leaves", "leaf undersides (eggs)", "plant hearts"],
    "confirmation_tips": [
      "Check leaf undersides for clusters of yellow bullet-shaped eggs",
      "Part the leaves of hearting brassicas to find hidden caterpillars and frass"
    ],
    "when_to_escalate_bullets": [
      "Plants stripped to midribs before heading up",
      "Multiple generations overwhelming hand-picking efforts"
    ]
  }'::jsonb
),

(
  'cutworms',
  'pest',
  'Cutworms',
  'Agrotis spp. / Noctua pronuba',
  'Soil-dwelling caterpillars that feed at or just below soil level, severing the stems of seedlings and young transplants at the base. They feed at night and curl into a C-shape when disturbed. Particularly damaging to lettuce, brassicas, and root vegetables.',
  'Seedlings and young plants found toppled at soil level with stems cleanly severed; plump grey-brown caterpillars found curled in the soil nearby.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'The larvae of various noctuid moths.',
  '{
    "recognition_bullets": [
      "Seedlings severed at ground level, often toppled over",
      "Plump smooth grey-brown caterpillars (up to 40mm) in the top few centimetres of soil",
      "Caterpillars curl into a tight C-shape when exposed",
      "Damage typically appears overnight",
      "Wilting of larger plants due to root feeding below soil"
    ],
    "prevention_bullets": [
      "Cultivate soil thoroughly before planting to expose larvae to predators and weather",
      "Keep beds weed-free as egg-laying moths prefer weedy ground",
      "Use cardboard or plastic collars around transplant stems at soil level"
    ],
    "treatment_pesticide_free": [
      "Search soil around damaged plants at night with a torch and hand-pick larvae",
      "Apply entomopathogenic nematodes (Steinernema carpocapsae) to moist soil",
      "Place collars made from toilet roll tubes around vulnerable transplants",
      "Encourage ground beetles and other soil predators by maintaining rough habitat nearby"
    ],
    "where_on_plant": ["stem at soil level", "roots", "lower leaves touching soil"],
    "confirmation_tips": [
      "Dig gently around the base of a severed plant to find the culprit",
      "Check at night when cutworms emerge to feed"
    ],
    "when_to_escalate_bullets": [
      "Repeated loss of transplants across a bed",
      "Large-scale root crop damage discovered at harvest"
    ]
  }'::jsonb
),

(
  'fungus-gnats',
  'pest',
  'Fungus Gnats',
  'Sciaridae spp.',
  'Small dark flies whose larvae live in moist compost, feeding on organic matter and plant roots. Adults are a nuisance but harmless; however, larval feeding can damage seedlings and cuttings. Predominantly a problem in greenhouses, houseplants, and propagation areas.',
  'Tiny dark flies (3-4mm) hovering around compost surfaces; translucent larvae with black head capsules visible in the top layer of moist compost.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Over-watering is the primary cause of infestations.',
  '{
    "recognition_bullets": [
      "Small dark flies hovering around and running across compost surfaces",
      "Tiny translucent larvae (5-6mm) with shiny black heads in compost",
      "Yellow sticky traps catching numerous small dark flies",
      "Seedlings and cuttings failing to thrive or collapsing",
      "Most prevalent in consistently moist compost"
    ],
    "prevention_bullets": [
      "Allow compost surface to dry between waterings",
      "Top-dress pots with a layer of grit or sand to deter egg-laying",
      "Use sterile, well-drained compost for propagation"
    ],
    "treatment_pesticide_free": [
      "Allow compost to dry out more between waterings",
      "Apply yellow sticky traps at compost level to catch adults",
      "Drench compost with Steinernema feltiae nematodes",
      "Cover compost surface with fine horticultural grit to prevent egg-laying"
    ],
    "where_on_plant": ["compost surface", "root zone", "seedling stems at soil level"],
    "confirmation_tips": [
      "Place a slice of raw potato on the compost; larvae will congregate on it",
      "Check yellow sticky traps for small dark flies with long legs and antennae"
    ],
    "when_to_escalate_bullets": [
      "Seedlings or cuttings dying off in propagation trays",
      "Persistent infestations despite drying out compost"
    ]
  }'::jsonb
),

(
  'leaf-miners',
  'pest',
  'Leaf Miners',
  'Various spp. (Liriomyza, Phytomyza, Chromatomyia)',
  'The larvae of various flies, moths, and beetles that tunnel between the upper and lower surfaces of leaves, creating distinctive pale winding trails or blotches. Mostly a cosmetic issue on ornamentals but can reduce vigour on edible crops such as beet, chard, and celery.',
  'Pale winding or serpentine trails within leaves, sometimes expanding into pale blotch mines; a tiny larva may be visible at the end of the trail.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Different species affect different host plants.',
  '{
    "recognition_bullets": [
      "Pale winding serpentine trails visible within the leaf",
      "Larger pale blotch-shaped mines on some host plants",
      "Tiny maggot or caterpillar visible at the advancing end of the mine",
      "Black or brown frass lines visible within the mine trail",
      "Affected leaves may turn brown and drop prematurely"
    ],
    "prevention_bullets": [
      "Cover susceptible crops with fine mesh to exclude egg-laying adults",
      "Remove and destroy affected leaves promptly to break the life cycle",
      "Encourage parasitic wasps which naturally control leaf miner populations"
    ],
    "treatment_pesticide_free": [
      "Pick off and destroy mined leaves before larvae pupate",
      "Squash the larva within the leaf by pinching the end of the mine trail",
      "Use fine insect mesh to prevent adult flies reaching crops",
      "Encourage parasitoid wasps such as Diglyphus and Dacnusa species"
    ],
    "where_on_plant": ["within leaves (between upper and lower epidermis)"],
    "confirmation_tips": [
      "Hold a mined leaf up to the light to see the larva inside",
      "The mine trail pattern can help identify the species"
    ],
    "when_to_escalate_bullets": [
      "Majority of leaves mined on edible crops reducing yield",
      "Allium leaf miner infestations in leeks and onions causing rot"
    ]
  }'::jsonb
),

(
  'carrot-fly',
  'pest',
  'Carrot Fly',
  'Psila rosae',
  'A low-flying pest whose larvae tunnel into the roots of carrots, parsnips, parsley, and celery, causing rusty-brown tunnels and secondary rots. The fly is attracted by the scent of crushed carrot foliage. Two to three generations occur per year in the UK.',
  'Rusty-brown tunnels in carrot and parsnip roots; affected foliage may turn reddish then yellow and wilt. Creamy-white maggots (8mm) may be visible in the root tunnels.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'The fly is low-flying, rarely above 60cm, making barriers very effective.',
  '{
    "recognition_bullets": [
      "Rusty-brown tunnels visible on the surface and within carrot roots",
      "Foliage turning reddish-bronze then yellow, especially in late summer",
      "Small creamy-white maggots in root tunnels",
      "Secondary soft rots entering through feeding damage",
      "Plants may wilt and become stunted"
    ],
    "prevention_bullets": [
      "Surround beds with a 60cm-high barrier of fleece or fine mesh",
      "Cover entire beds with insect-proof mesh from sowing to harvest",
      "Sow thinly to reduce the need for thinning (which releases attractant scent)",
      "Choose partially resistant varieties such as Flyaway or Resistafly"
    ],
    "treatment_pesticide_free": [
      "Install vertical barriers at least 60cm high around carrot beds",
      "Thin carrots in the evening when the fly is less active",
      "Interplant with onions or spring onions to mask the scent",
      "Delay sowing until June to avoid the first generation"
    ],
    "where_on_plant": ["roots (tunnels)", "foliage (yellowing)"],
    "confirmation_tips": [
      "Pull a suspect carrot and look for rusty tunnels on the root surface",
      "Reddish-bronze foliage colour is an early warning sign"
    ],
    "when_to_escalate_bullets": [
      "Entire rows of carrots rendered inedible by tunnelling",
      "Secondary rots making stored roots unusable"
    ]
  }'::jsonb
),

(
  'cabbage-root-fly',
  'pest',
  'Cabbage Root Fly',
  'Delia radicum',
  'The larvae of this fly feed on the roots of brassicas, causing wilting, poor growth, and often plant death in young transplants. The adult fly lays eggs at the base of brassica stems. Three generations per year are possible in mild areas.',
  'Young brassica transplants wilting and collapsing despite adequate watering; small white maggots visible on roots when pulled up, with roots largely eaten away.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Brassica collars are a simple and effective prevention.',
  '{
    "recognition_bullets": [
      "Young brassicas wilting and looking blue-green or purplish",
      "Plants easily pulled from the soil due to root damage",
      "Small white maggots (8mm) clustered on remaining roots",
      "Stunted growth and failure to establish after transplanting",
      "Damage worst in the first generation (May-June)"
    ],
    "prevention_bullets": [
      "Fit brassica collars (15cm diameter discs) snugly around stems at planting",
      "Cover newly planted brassicas with fine insect mesh immediately",
      "Firm soil well around transplant stems to reduce egg-laying sites"
    ],
    "treatment_pesticide_free": [
      "Place 15cm brassica collars (carpet underlay, card, or commercial discs) flat around each stem",
      "Cover beds with insect-proof mesh from planting",
      "Apply entomopathogenic nematodes to the root zone",
      "Earth up stems of established brassicas to encourage adventitious rooting"
    ],
    "where_on_plant": ["roots", "stem base at soil level"],
    "confirmation_tips": [
      "Gently pull a wilting plant; if it comes away easily with few roots, cabbage root fly is likely",
      "Examine remaining roots for small white maggots"
    ],
    "when_to_escalate_bullets": [
      "Widespread losses of transplants across brassica beds",
      "Repeated failures despite collar use (check collars are fitted snugly)"
    ]
  }'::jsonb
),

(
  'flea-beetle',
  'pest',
  'Flea Beetle',
  'Phyllotreta spp. / Psylliodes spp.',
  'Tiny shiny beetles (2-3mm) that jump when disturbed and chew small round holes (shot-holes) in the leaves of brassicas, radishes, rocket, and turnips. Seedlings are most vulnerable and can be killed if attacks are severe. Adults are most active in warm dry weather.',
  'Numerous tiny round holes (shot-holes) peppering the leaves of brassica seedlings; tiny shiny black or striped beetles that leap away when approached.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Seedlings are most vulnerable; once plants are growing strongly they usually outgrow the damage.',
  '{
    "recognition_bullets": [
      "Numerous small round shot-holes peppering leaves",
      "Tiny (2-3mm) shiny black or striped beetles on leaves",
      "Beetles jump vigorously when disturbed",
      "Seedlings and young transplants worst affected",
      "Damage most severe in dry sunny spells"
    ],
    "prevention_bullets": [
      "Cover seedbeds with fleece or fine mesh immediately after sowing",
      "Keep seedlings well watered to promote rapid growth through the vulnerable stage",
      "Sow into moist soil and keep irrigated to discourage beetles"
    ],
    "treatment_pesticide_free": [
      "Cover crops with insect-proof mesh or horticultural fleece",
      "Water seedlings regularly to help them grow through the vulnerable stage",
      "Coat yellow sticky traps with grease and pass over plants to catch jumping beetles",
      "Sow a sacrificial crop of radish nearby to lure beetles away"
    ],
    "where_on_plant": ["leaves (especially cotyledons and first true leaves)"],
    "confirmation_tips": [
      "Run your hand over seedling leaves; beetles will jump away conspicuously",
      "Tiny round holes (not irregular) distinguish flea beetle from slug damage"
    ],
    "when_to_escalate_bullets": [
      "Seedlings killed or severely set back before establishing",
      "Large-scale damage to direct-sown brassica crops"
    ]
  }'::jsonb
),

(
  'codling-moth',
  'pest',
  'Codling Moth',
  'Cydia pomonella',
  'A major pest of apples and pears whose caterpillars tunnel into the fruit, feeding around the core and leaving frass-filled tunnels. Affected fruit often drops prematurely. One generation per year in the UK, with caterpillars entering fruit from late June to August.',
  'A small hole in the side or eye of the apple with crumbly brown frass at the entrance; cutting the fruit open reveals a pinkish-white caterpillar and a tunnel leading to the core.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Pheromone traps are used for monitoring flight periods.',
  '{
    "recognition_bullets": [
      "Small entry hole in apple or pear with brown frass at the entrance",
      "Pinkish-white caterpillar (up to 15mm) found inside fruit near the core",
      "Frass-filled tunnels through the fruit flesh",
      "Premature fruit drop in mid to late summer",
      "Exit holes visible on some fruit at harvest"
    ],
    "prevention_bullets": [
      "Hang codling moth pheromone traps in trees from mid-May to monitor flight",
      "Apply corrugated cardboard bands around trunks in July for larvae to pupate in, then remove and destroy in winter",
      "Pick up and destroy fallen fruit promptly"
    ],
    "treatment_pesticide_free": [
      "Use pheromone traps to time intervention (spray 2-3 weeks after first moths caught)",
      "Apply biological control nematodes (Steinernema carpocapsae) as a trunk and soil spray in autumn",
      "Wrap corrugated cardboard bands around trunks, remove and burn in winter",
      "Pick up all windfall apples promptly and destroy (do not compost)"
    ],
    "where_on_plant": ["within fruit", "around core of apples and pears"],
    "confirmation_tips": [
      "Cut open suspect fruit to find the caterpillar and its frass-filled tunnel",
      "Check pheromone trap catches to confirm codling moth activity"
    ],
    "when_to_escalate_bullets": [
      "More than 10% of crop affected at harvest",
      "Persistent high trap catches over multiple weeks"
    ]
  }'::jsonb
),

(
  'sawfly',
  'pest',
  'Sawfly',
  'Various spp. (Arge, Nematus, Caliroa)',
  'Larvae of sawflies resemble caterpillars but have more pairs of prolegs and can rapidly defoliate roses, gooseberries, Solomon''s seal, and many other plants. Different species target different hosts. Damage can be severe and rapid, stripping plants to bare stems.',
  'Caterpillar-like larvae, often pale green or with black spots, feeding in groups on leaf edges and rapidly skeletonising or defoliating plants.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Different species: gooseberry sawfly, rose slug sawfly, Solomon''s seal sawfly, etc.',
  '{
    "recognition_bullets": [
      "Caterpillar-like larvae feeding in groups on leaf margins",
      "Rapid defoliation, sometimes leaving only the midrib",
      "Larvae often pale green with black heads or black spots",
      "Rose slug sawfly creates windowpane-like skeletonised patches",
      "Gooseberry sawfly can strip an entire bush in days"
    ],
    "prevention_bullets": [
      "Inspect susceptible plants regularly from spring onwards",
      "Cultivate soil beneath host plants in winter to expose overwintering pupae",
      "Encourage predatory birds and wasps"
    ],
    "treatment_pesticide_free": [
      "Hand-pick larvae as soon as they are spotted",
      "Shake gooseberry bushes to dislodge larvae onto a sheet below",
      "Spray with soft soap or neem oil if numbers are high",
      "Cultivate soil around plants in winter to expose pupae to frost and birds"
    ],
    "where_on_plant": ["leaves", "leaf margins", "leaf surfaces (skeletonising)"],
    "confirmation_tips": [
      "Count the prolegs: sawfly larvae have 6+ pairs versus caterpillars with 5 or fewer",
      "Sawfly larvae often adopt an S-shaped posture when disturbed"
    ],
    "when_to_escalate_bullets": [
      "Complete defoliation of gooseberry or currant bushes mid-season",
      "Repeated annual defoliation weakening the plant"
    ]
  }'::jsonb
),

(
  'earwigs',
  'pest',
  'Earwigs',
  'Forficula auricularia',
  'Nocturnal insects that feed on flower petals, soft fruit, and tender foliage, creating ragged holes. They are particularly fond of dahlia, chrysanthemum, and clematis flowers. However, earwigs also eat aphids and other small pests, so they have a beneficial role too.',
  'Ragged holes in flower petals, particularly dahlias and chrysanthemums; characteristic pincers (cerci) at the rear end of the insect identify earwigs found hiding in blooms.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'They are partly beneficial as they eat aphids and small insects.',
  '{
    "recognition_bullets": [
      "Ragged irregular holes in flower petals, especially dahlias",
      "Damage appears overnight as earwigs are nocturnal",
      "Distinctive reddish-brown insects (15-20mm) with rear pincers",
      "Found hiding in tight spaces: flower heads, crevices, under pots",
      "Soft fruit (strawberries, stone fruit) nibbled near the ground"
    ],
    "prevention_bullets": [
      "Remove debris and hiding places near prize blooms",
      "Smear petroleum jelly on dahlia stakes to prevent climbing",
      "Accept minor damage as earwigs also consume aphids and pests"
    ],
    "treatment_pesticide_free": [
      "Set traps using upturned flower pots stuffed with straw on canes among plants",
      "Empty traps each morning into a distant part of the garden",
      "Shake flower heads over a container to dislodge earwigs before picking for display",
      "Apply sticky barriers to dahlia stakes"
    ],
    "where_on_plant": ["flower petals", "flower centres", "soft fruit", "tender leaves"],
    "confirmation_tips": [
      "Check inside dahlia blooms during the day for hiding earwigs",
      "Set straw-stuffed pot traps to confirm their presence"
    ],
    "when_to_escalate_bullets": [
      "Show blooms consistently damaged beyond acceptable levels",
      "Soft fruit crops significantly affected"
    ]
  }'::jsonb
),

(
  'red-lily-beetle',
  'pest',
  'Red Lily Beetle',
  'Lilioceris lilii',
  'A bright scarlet beetle (6-8mm) that feeds on lilies and fritillaries, with both adults and larvae capable of completely defoliating plants. Larvae are particularly unappealing, covering themselves in their own excrement as camouflage. Increasingly widespread across the UK.',
  'Bright red beetles on lily and fritillary foliage; larvae covered in dark sticky excrement on leaf undersides; leaves and flowers chewed and skeletonised.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Adults squeak when handled. Check plants from March onwards.',
  '{
    "recognition_bullets": [
      "Bright scarlet beetles (6-8mm) conspicuous on lily foliage",
      "Larvae hidden beneath a coating of dark wet excrement on leaf undersides",
      "Leaves, buds, and seed pods eaten; plants can be stripped bare",
      "Orange-red eggs in neat lines on leaf undersides",
      "Adult beetles drop to the ground (dark underside up) when disturbed"
    ],
    "prevention_bullets": [
      "Inspect lily foliage from March onwards and act early",
      "Remove mulch from around lily bases in spring to spot overwintered adults",
      "Grow lilies in pots which are easier to inspect and protect"
    ],
    "treatment_pesticide_free": [
      "Hand-pick adults and larvae regularly (check daily in season)",
      "Hold a container beneath plants to catch adults that drop when disturbed",
      "Remove egg lines from leaf undersides by wiping off",
      "Inspect lily foliage from early spring before populations build"
    ],
    "where_on_plant": ["leaves", "flower buds", "seed pods", "stems"],
    "confirmation_tips": [
      "Bright red colour makes adults unmistakable on green foliage",
      "Larvae resemble bird droppings; look closely to spot them"
    ],
    "when_to_escalate_bullets": [
      "Entire lily collection defoliated and unable to flower",
      "Large breeding population established over multiple years"
    ]
  }'::jsonb
),

(
  'rosemary-beetle',
  'pest',
  'Rosemary Beetle',
  'Chrysolina americana',
  'An attractive metallic green and purple striped beetle that feeds on rosemary, lavender, sage, thyme, and other aromatic herbs. Both adults and larvae graze the foliage and flowers. Increasingly common in the UK since its arrival around 2000.',
  'Distinctive metallic green and purple striped beetles (6-7mm) on rosemary, lavender, and sage; larvae are greyish-white grubs feeding on foliage.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Despite being from southern Europe, it is now established across much of the UK.',
  '{
    "recognition_bullets": [
      "Small (6-7mm) beetles with metallic green and purple stripes",
      "Found on rosemary, lavender, sage, and thyme",
      "Grey-white larvae on foliage and flowers",
      "Stripped or thinned foliage, particularly shoot tips",
      "Adults most visible in autumn and spring"
    ],
    "prevention_bullets": [
      "Inspect herbs regularly from late summer onwards",
      "Shake plants over newspaper to check for beetles and larvae",
      "Plant a wider range of herbs to spread the impact"
    ],
    "treatment_pesticide_free": [
      "Hand-pick adults and larvae by shaking stems over a container",
      "Pick off during cool mornings when beetles are sluggish",
      "Prune affected shoots after harvest to remove larvae",
      "Accept low levels of damage on vigorous established plants"
    ],
    "where_on_plant": ["shoot tips", "flowers", "young foliage"],
    "confirmation_tips": [
      "The metallic stripes make this beetle unmistakable",
      "Shake a stem; beetles will often drop into a waiting hand or container"
    ],
    "when_to_escalate_bullets": [
      "Severe defoliation of young or newly planted herbs",
      "Large populations stripping flowering lavender"
    ]
  }'::jsonb
),

-- ============================================================
-- FUNGAL (13)
-- ============================================================

(
  'powdery-mildew',
  'fungal',
  'Powdery Mildew',
  'Erysiphales spp.',
  'A very common fungal disease characterised by a white powdery coating on leaf surfaces, stems, and sometimes flowers. It thrives in warm, dry conditions with cool nights and poor air circulation. Many different species affect different host plants.',
  'White or grey powdery patches on upper leaf surfaces, stems, and buds, sometimes causing leaf curling and premature leaf drop.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Unlike most fungal diseases, powdery mildew does not require wet leaves to infect.',
  '{
    "recognition_bullets": [
      "White or greyish powdery coating on leaf surfaces",
      "Usually starts on upper leaf surfaces and young growth",
      "Affected leaves may yellow, curl, or become distorted",
      "Severe cases can affect stems, buds, and flowers",
      "Most prevalent in warm dry weather with cool nights"
    ],
    "prevention_bullets": [
      "Ensure good air circulation by appropriate spacing and pruning",
      "Water at the base of plants rather than overhead",
      "Choose resistant varieties where available",
      "Mulch to maintain consistent soil moisture"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy severely affected leaves",
      "Spray with a milk solution (1 part milk to 9 parts water) in sunshine",
      "Apply a bicarbonate of soda spray (1 tsp per litre with a drop of washing-up liquid)",
      "Improve air circulation by thinning overcrowded growth"
    ],
    "where_on_plant": ["upper leaf surfaces", "stems", "buds", "flowers"],
    "confirmation_tips": [
      "Rub the white coating; powdery mildew wipes off easily unlike downy mildew",
      "Check that the coating is on the UPPER leaf surface (downy mildew is mainly underneath)"
    ],
    "when_to_escalate_bullets": [
      "Widespread infection causing significant defoliation",
      "Courgette, squash, or grape crops losing productivity"
    ]
  }'::jsonb
),

(
  'downy-mildew',
  'fungal',
  'Downy Mildew',
  'Peronosporaceae spp.',
  'A group of oomycete diseases (often grouped with fungal for practical purposes) causing angular yellow patches on upper leaf surfaces with corresponding greyish-purple fuzzy growth underneath. Thrives in cool, damp conditions. Particularly damaging to onions, lettuce, brassicas, and grapes.',
  'Angular yellow or brown patches on upper leaf surfaces bounded by veins, with greyish-purple furry fungal growth on corresponding leaf undersides in humid conditions.',
  4,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Technically oomycete rather than true fungal, but commonly grouped with fungal diseases.',
  '{
    "recognition_bullets": [
      "Angular yellow or pale patches on upper leaf surfaces, often bounded by veins",
      "Greyish or purplish fuzzy growth on leaf undersides in damp conditions",
      "Patches may turn brown and necrotic as they age",
      "Onion downy mildew causes grey felty growth and leaf collapse",
      "Thrives in cool damp weather and overcrowded conditions"
    ],
    "prevention_bullets": [
      "Space plants generously for good air flow",
      "Avoid overhead watering, especially in the evening",
      "Remove crop debris promptly after harvest",
      "Choose resistant cultivars where available"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy infected leaves at the first sign of disease",
      "Improve air circulation through wider spacing and pruning",
      "Avoid wetting foliage; water at the base of plants in the morning",
      "Rotate crops on a minimum three-year cycle"
    ],
    "where_on_plant": ["upper leaf surfaces (yellow patches)", "leaf undersides (fuzzy growth)"],
    "confirmation_tips": [
      "Check leaf undersides for greyish-purple fuzzy growth (not powdery)",
      "Angular patches bounded by leaf veins distinguish downy mildew from other blights"
    ],
    "when_to_escalate_bullets": [
      "Rapid defoliation of lettuce or brassica crops",
      "Onion foliage collapsing leading to undersized bulbs"
    ]
  }'::jsonb
),

(
  'late-blight',
  'fungal',
  'Late Blight',
  'Phytophthora infestans',
  'A devastating oomycete disease of potatoes and tomatoes that caused the Irish Potato Famine. It spreads rapidly in warm, humid conditions and can destroy an entire crop within days. Brown patches on leaves spread quickly and white mould appears on undersides. Tubers develop a reddish-brown rot.',
  'Dark brown-black watery patches on leaves and stems spreading rapidly in humid weather; white mouldy growth visible on leaf undersides; affected potato tubers develop firm reddish-brown rot beneath the skin.',
  5,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Monitor Blight Watch (blightwatch.co.uk) or Smith Period alerts.',
  '{
    "recognition_bullets": [
      "Dark brown-black watery patches on leaves, often starting at leaf tips and edges",
      "White mouldy growth on leaf undersides in humid conditions",
      "Brown-black lesions on stems causing collapse",
      "Rapid spread in warm humid weather (Smith Periods)",
      "Affected potato tubers show firm reddish-brown rot beneath the skin"
    ],
    "prevention_bullets": [
      "Grow early varieties that crop before blight typically strikes",
      "Choose blight-resistant varieties (e.g. Sarpo Mira, Carolus)",
      "Ensure good spacing and airflow between plants",
      "Monitor blight risk forecasts and act pre-emptively"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy infected foliage immediately at first signs",
      "Cut potato haulms to ground level if blight strikes before lifting tubers",
      "Wait 2-3 weeks after cutting haulms before harvesting tubers",
      "Grow tomatoes under cover to reduce leaf wetness"
    ],
    "where_on_plant": ["leaves", "stems", "tubers (potato)", "fruit (tomato)"],
    "confirmation_tips": [
      "White sporulation on leaf undersides confirms late blight (not early blight)",
      "Rapid spread in wet weather distinguishes it from other leaf spots"
    ],
    "when_to_escalate_bullets": [
      "Blight detected on stems (not just leaves) indicating rapid progression",
      "Multiple Smith Periods forecast with crop at vulnerable stage"
    ]
  }'::jsonb
),

(
  'early-blight',
  'fungal',
  'Early Blight',
  'Alternaria solani',
  'A fungal disease of tomatoes and potatoes causing dark concentric-ringed spots on older leaves first, progressing upwards. Less devastating than late blight but reduces yield and can affect fruit. Favoured by warm temperatures and alternating wet and dry periods.',
  'Dark brown spots with characteristic concentric rings (target-like pattern) on older lower leaves first, sometimes with yellowing around the spots.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Often confused with late blight but is slower-spreading and has distinctive target spots.',
  '{
    "recognition_bullets": [
      "Dark brown spots with concentric rings forming a target or bullseye pattern",
      "Lower older leaves affected first, progressing upwards",
      "Yellow halos may surround the brown spots",
      "Severely affected leaves yellow and drop",
      "Dark sunken lesions at the stem end of tomato fruit"
    ],
    "prevention_bullets": [
      "Remove lower leaves to prevent soil splash carrying spores to foliage",
      "Mulch around plants to reduce soil splash onto lower leaves",
      "Water at the base, avoiding wetting foliage",
      "Ensure good air circulation and do not overcrowd plants"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy affected lower leaves promptly",
      "Mulch to prevent rain splash spreading spores from soil to leaves",
      "Spray with bicarbonate of soda solution as a preventive measure",
      "Improve airflow by removing suckers and lower foliage on tomatoes"
    ],
    "where_on_plant": ["lower leaves first", "stems", "fruit (stem end)"],
    "confirmation_tips": [
      "Look for the distinctive concentric ring (bullseye) pattern within spots",
      "Lower-leaf-first progression distinguishes early blight from late blight"
    ],
    "when_to_escalate_bullets": [
      "Disease spreading rapidly to upper leaves reducing photosynthetic capacity",
      "Fruit infections causing significant crop losses"
    ]
  }'::jsonb
),

(
  'damping-off',
  'fungal',
  'Damping Off',
  'Pythium spp. / Rhizoctonia spp. / Fusarium spp.',
  'A complex of soil-borne fungal and oomycete diseases that attack seeds and seedlings, causing them to collapse at soil level. The stem base becomes soft, water-soaked, and pinched. Favoured by over-watering, poor drainage, low light, and overcrowding.',
  'Seedlings collapsing at soil level with a soft, pinched, water-soaked stem base; seeds failing to germinate in patches; a fine white mould sometimes visible on the compost surface.',
  4,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Prevention is the only practical approach; there is no cure for affected seedlings.',
  '{
    "recognition_bullets": [
      "Seedlings toppling over with a thin water-soaked stem at soil level",
      "Patches of seeds failing to germinate",
      "Cottony white mould on compost surface in severe cases",
      "Surviving seedlings may be stunted and poor",
      "Commonly occurs in overwatered, poorly ventilated conditions"
    ],
    "prevention_bullets": [
      "Use clean pots and fresh sterile seed compost",
      "Sow thinly and do not over-firm the compost",
      "Water from below using a tray rather than overhead",
      "Ensure good ventilation and light for seedlings"
    ],
    "treatment_pesticide_free": [
      "Remove affected seedlings immediately to prevent spread",
      "Reduce watering and improve ventilation",
      "Re-sow into fresh sterile compost in clean containers",
      "Water with chamomile tea as a mild antifungal drench"
    ],
    "where_on_plant": ["stem base at soil level", "seeds", "roots"],
    "confirmation_tips": [
      "The pinched, water-soaked stem base at soil level is diagnostic",
      "Seedlings fall over rather than being nibbled (distinguishes from pest damage)"
    ],
    "when_to_escalate_bullets": [
      "Entire trays of seedlings lost repeatedly",
      "Damping off occurring despite good hygiene practices"
    ]
  }'::jsonb
),

(
  'rust',
  'fungal',
  'Rust',
  'Pucciniales spp.',
  'A group of fungal diseases producing distinctive raised pustules on leaf undersides containing masses of orange, yellow, brown, or black spores. Many different rust species each specialise on particular host plants. Common on leeks, alliums, roses, hollyhocks, and fuchsias.',
  'Bright orange, yellow, or dark brown raised pustules (like small blisters) on leaf undersides and stems, with corresponding pale spots on upper surfaces.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Most rusts are host-specific and cannot spread between unrelated plant species.',
  '{
    "recognition_bullets": [
      "Raised orange, yellow, or brown pustules on leaf undersides",
      "Corresponding pale or yellow spots on upper leaf surfaces",
      "Spore pustules release coloured powder when rubbed",
      "Leaves may yellow and drop prematurely in severe infections",
      "Leek rust shows elongated orange pustules on leaf surfaces"
    ],
    "prevention_bullets": [
      "Ensure good spacing and airflow between plants",
      "Avoid overhead watering and excessive nitrogen",
      "Remove and destroy affected leaves promptly",
      "Choose resistant varieties where available"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy infected leaves at the first sign of pustules",
      "Improve air circulation by thinning overcrowded growth",
      "Avoid high-nitrogen feeds which produce soft susceptible growth",
      "Clear all debris at the end of the season and rotate crops"
    ],
    "where_on_plant": ["leaf undersides (pustules)", "upper leaf surfaces (spots)", "stems"],
    "confirmation_tips": [
      "Rub a pustule; coloured spore powder on your finger confirms rust",
      "Raised bumpy texture distinguishes rust from flat leaf spots"
    ],
    "when_to_escalate_bullets": [
      "Severe defoliation threatening plant survival",
      "Hollyhock rust making plants unsightly year after year"
    ]
  }'::jsonb
),

(
  'leaf-spot',
  'fungal',
  'Leaf Spot',
  'Various spp. (Septoria, Cercospora, Mycosphaerella)',
  'A general term for various fungal diseases that cause discrete spots or lesions on leaves, often with defined margins and sometimes with concentric zones or tiny fruiting bodies within the spots. Most leaf spots are cosmetic but heavy infections can cause defoliation.',
  'Discrete round or irregular brown, black, or purple spots on leaves, often with a defined margin and sometimes with a yellow halo or tiny black dots (pycnidia) within the spot.',
  2,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Many different fungi cause leaf spots; identification to species usually requires laboratory analysis.',
  '{
    "recognition_bullets": [
      "Discrete round or irregular spots on leaves, brown, black, or purple",
      "Spots often have a clear margin and may have a yellow halo",
      "Tiny black dots (fungal fruiting bodies) sometimes visible within spots",
      "Lower and inner leaves usually affected first",
      "Severe cases cause leaf yellowing and premature drop"
    ],
    "prevention_bullets": [
      "Clear fallen leaves and plant debris where spores overwinter",
      "Avoid overhead watering; water at the base of plants",
      "Space plants well for good airflow",
      "Practise crop rotation for vegetable leaf spots"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy badly spotted leaves",
      "Rake up and remove fallen affected leaves",
      "Improve air circulation around plants",
      "Apply a preventive bicarbonate of soda spray during vulnerable periods"
    ],
    "where_on_plant": ["leaves (mainly)", "sometimes stems and fruit"],
    "confirmation_tips": [
      "Spots with clearly defined margins suggest a leaf spot fungus",
      "Use a hand lens to look for tiny black pycnidia dots within the spots"
    ],
    "when_to_escalate_bullets": [
      "Heavy defoliation of trees or productive crops",
      "Celery leaf spot (Septoria) reducing crop yield significantly"
    ]
  }'::jsonb
),

(
  'root-rot',
  'fungal',
  'Root Rot',
  'Phytophthora spp. / Fusarium spp. / Pythium spp.',
  'A collective term for soil-borne diseases that attack plant roots, causing them to turn brown, soft, and mushy. Plants wilt despite wet soil, yellow, and decline. Overwatering and poor drainage are the primary predisposing factors. Affects a very wide range of plants.',
  'Plants wilting despite moist soil; roots are brown, soft, and mushy rather than white and firm when the plant is removed from the pot or dug up.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Improving drainage and watering practice is the key to prevention and recovery.',
  '{
    "recognition_bullets": [
      "Plants wilting even when compost or soil is moist",
      "Yellowing lower leaves dropping prematurely",
      "Roots brown, soft, and mushy instead of white and firm",
      "Foul smell from the root zone in severe cases",
      "Plant easily pulls from the soil due to root decay"
    ],
    "prevention_bullets": [
      "Ensure containers have adequate drainage holes",
      "Use well-draining compost and avoid waterlogging",
      "Water appropriately: allow the surface to dry between waterings",
      "Avoid planting too deeply"
    ],
    "treatment_pesticide_free": [
      "Improve drainage immediately; repot into fresh free-draining compost",
      "Trim away all soft brown roots with clean secateurs, retaining only firm white roots",
      "Reduce watering and allow the root zone to dry out somewhat",
      "Apply a mycorrhizal fungi inoculant when replanting to promote root health"
    ],
    "where_on_plant": ["roots", "stem base", "crown"],
    "confirmation_tips": [
      "Remove the plant from its pot and examine the roots directly",
      "Healthy roots are white or cream and firm; rotted roots are brown and mushy"
    ],
    "when_to_escalate_bullets": [
      "No healthy white roots remaining",
      "Rot spreading into the stem or crown"
    ]
  }'::jsonb
),

(
  'apple-scab',
  'fungal',
  'Apple Scab',
  'Venturia inaequalis',
  'A very common fungal disease of apples and crab apples causing olive-green to dark brown scabby patches on leaves and fruit. Infected fruit develops cracked corky lesions that reduce marketability. Severe infections cause premature defoliation and weakened trees.',
  'Olive-green to dark brown velvety patches on leaves, and dark scabby raised lesions on fruit that may crack as the apple grows.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Some apple varieties are scab-resistant (e.g. Discovery, Red Falstaff).',
  '{
    "recognition_bullets": [
      "Olive-green to dark brown velvety patches on leaves",
      "Dark brown scabby corky lesions on fruit",
      "Fruit may crack or become misshapen around scab lesions",
      "Premature leaf yellowing and drop in severe cases",
      "Worst in wet springs and summers"
    ],
    "prevention_bullets": [
      "Plant scab-resistant varieties (e.g. Discovery, Liberty, Red Falstaff)",
      "Rake up and destroy fallen leaves in autumn to reduce overwintering inoculum",
      "Prune for an open canopy with good air circulation",
      "Avoid overhead irrigation"
    ],
    "treatment_pesticide_free": [
      "Collect and destroy all fallen leaves in autumn and winter",
      "Prune to open the canopy and improve airflow",
      "Spray with bicarbonate of soda solution during the growing season",
      "Apply a seaweed feed to promote overall tree vigour and resistance"
    ],
    "where_on_plant": ["leaves", "fruit", "young shoots"],
    "confirmation_tips": [
      "Olive-green velvety texture on leaf spots confirms scab (not a general leaf spot)",
      "Corky raised lesions on fruit are diagnostic"
    ],
    "when_to_escalate_bullets": [
      "Severe defoliation year after year weakening the tree",
      "Majority of fruit crop affected and unmarketable"
    ]
  }'::jsonb
),

(
  'fire-blight',
  'bacterial',
  'Fire Blight',
  'Erwinia amylovora',
  'A serious bacterial disease of apple, pear, and related rosaceous plants that causes shoots, branches, and sometimes entire trees to appear scorched. Infected blossoms wilt and turn brown, and oozing amber-coloured bacterial droplets appear on infected tissue. A notifiable disease in some regions.',
  'Shoots and branches with wilted, blackened leaves that remain attached, looking as if scorched by fire; characteristic shepherd''s crook shape on affected shoot tips; amber bacterial ooze on infected bark in wet conditions.',
  5,
  true,
  ARRAY['UK','IE','EU','NA'],
  'A notifiable disease in the UK. Report suspected cases to APHA.',
  '{
    "recognition_bullets": [
      "Shoot tips wilting into a characteristic shepherd''s crook shape",
      "Leaves turning brown-black but remaining attached to the branch",
      "Branches appear scorched as if burned by fire",
      "Amber-coloured bacterial ooze droplets on bark in humid weather",
      "Blossoms turning brown and shrivelling in spring"
    ],
    "prevention_bullets": [
      "Plant resistant or tolerant varieties where available",
      "Avoid excessive nitrogen feeding which promotes soft susceptible growth",
      "Disinfect pruning tools between cuts with methylated spirits or bleach",
      "Do not prune during wet weather when bacteria spread easily"
    ],
    "treatment_pesticide_free": [
      "Prune out infected branches at least 30cm below the visible edge of infection",
      "Sterilise secateurs between each cut with methylated spirits",
      "Destroy all prunings by burning (do not compost)",
      "Report suspected fire blight to the relevant plant health authority"
    ],
    "where_on_plant": ["shoot tips", "blossoms", "branches", "trunk (cankers)"],
    "confirmation_tips": [
      "The shepherd''s crook shoot tip and retained brown leaves are highly characteristic",
      "Amber bacterial ooze on bark is diagnostic"
    ],
    "when_to_escalate_bullets": [
      "Infection reaching major branches or the trunk",
      "Multiple trees showing symptoms in an orchard"
    ]
  }'::jsonb
),

(
  'rose-black-spot',
  'fungal',
  'Rose Black Spot',
  'Diplocarpon rosae',
  'The most common disease of roses in the UK, causing distinctive black or dark purple spots with fringed margins on leaves, leading to yellowing and premature defoliation. Weakened plants produce fewer flowers. The fungus overwinters on fallen leaves and infected stems.',
  'Round black or dark purple spots with irregular fringed (radiating) margins on rose leaves, causing leaves to yellow and drop prematurely.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Particularly severe in wet seasons. Fungal spores spread by rain splash.',
  '{
    "recognition_bullets": [
      "Black or dark purple round spots on rose leaves",
      "Spots have distinctive irregular fringed or radiating margins",
      "Leaves turn yellow around the spots and drop prematurely",
      "Lower and inner leaves affected first",
      "Bare stems visible from the base upwards in severe cases"
    ],
    "prevention_bullets": [
      "Choose black-spot-resistant rose varieties",
      "Collect and destroy all fallen rose leaves in autumn",
      "Mulch around rose bushes in spring to bury overwintering spores",
      "Prune for an open shape with good air circulation"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy infected leaves as soon as spots appear",
      "Clear all fallen rose leaves regularly throughout the season",
      "Apply a thick mulch in spring to smother overwintering spores on soil",
      "Spray with bicarbonate of soda or milk solution as a preventive"
    ],
    "where_on_plant": ["leaves (mainly upper surface)", "young stems"],
    "confirmation_tips": [
      "The fringed (radiating) margin of the spots is diagnostic for black spot",
      "Yellowing of leaves around and between spots confirms the identification"
    ],
    "when_to_escalate_bullets": [
      "Complete defoliation by midsummer weakening the plant",
      "Repeated heavy infections over several years"
    ]
  }'::jsonb
),

(
  'botrytis-grey-mould',
  'fungal',
  'Botrytis (Grey Mould)',
  'Botrytis cinerea',
  'An extremely common fungal disease that attacks a very wide range of plants, causing fuzzy grey mould on flowers, fruit, leaves, and stems. It thrives in cool, damp, poorly ventilated conditions and enters through wounds or dying tissue. Particularly damaging to soft fruit, lettuce, and greenhouse crops.',
  'Fuzzy grey-brown mould covering affected tissue; commonly seen on dying flowers, damaged fruit, soft stems, and lettuce hearts. Affected tissue becomes soft and brown before the grey mould appears.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'One of the most widespread plant diseases; virtually any plant can be affected.',
  '{
    "recognition_bullets": [
      "Fuzzy grey-brown mould covering affected plant tissue",
      "Brown soft rot of flowers, fruit, and stems preceding the grey mould",
      "Commonly seen on strawberries, raspberries, and tomatoes",
      "Lettuce hearts rotting from the inside out",
      "Clouds of grey spores released when infected tissue is disturbed"
    ],
    "prevention_bullets": [
      "Ensure good air circulation; space plants well and ventilate greenhouses",
      "Remove dead flowers and dying tissue promptly (deadhead regularly)",
      "Avoid overcrowding and overhead watering",
      "Pick fruit promptly when ripe and handle carefully to avoid bruising"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy all infected material immediately",
      "Improve ventilation in greenhouses and polytunnels",
      "Space plants generously to allow good airflow",
      "Avoid watering in the evening; water in the morning to allow foliage to dry"
    ],
    "where_on_plant": ["flowers", "fruit", "leaves", "stems", "crowns"],
    "confirmation_tips": [
      "The distinctive fuzzy grey mould is unmistakable",
      "Tap the infected tissue; a cloud of grey spores confirms Botrytis"
    ],
    "when_to_escalate_bullets": [
      "Significant losses of fruit crops to grey mould",
      "Persistent Botrytis in greenhouse crops despite improved ventilation"
    ]
  }'::jsonb
),

(
  'clubroot',
  'fungal',
  'Clubroot',
  'Plasmodiophora brassicae',
  'A devastating soil-borne disease of brassicas that causes roots to swell into distorted clubs, severely restricting water and nutrient uptake. Plants wilt on warm days and become stunted. The pathogen can persist in soil for 20+ years, making it extremely difficult to eradicate.',
  'Swollen, distorted, club-shaped roots on brassica plants; above ground, plants wilt readily in warm weather, are stunted, and may have a reddish-purple tinge to foliage.',
  5,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Spores persist in soil for 20+ years. Lime soil to raise pH above 7.2 to suppress the disease.',
  '{
    "recognition_bullets": [
      "Swollen distorted club-shaped or knobbly roots",
      "Plants wilting in warm weather despite wet soil",
      "Stunted growth and poor crop development",
      "Reddish-purple discolouration of foliage",
      "Roots may rot and become foul-smelling as secondary infections take hold"
    ],
    "prevention_bullets": [
      "Lime acidic soils to raise pH above 7.2 (clubroot is suppressed in alkaline conditions)",
      "Improve drainage as waterlogged soil favours the disease",
      "Start brassica transplants in modules of sterile compost rather than direct sowing",
      "Do not bring in soil or plants from affected sites"
    ],
    "treatment_pesticide_free": [
      "There is no cure for clubroot in the soil; focus on prevention and management",
      "Raise soil pH with garden lime to above 7.2",
      "Grow brassica transplants in large modules (9cm pots) to develop strong root systems before planting out",
      "Remove and destroy (burn or bin) all infected root material; do not compost"
    ],
    "where_on_plant": ["roots (swollen clubs)", "whole plant (stunting, wilting)"],
    "confirmation_tips": [
      "Pull up a wilting brassica and examine the roots for characteristic swellings",
      "Distinguish from nitrogen-fixing nodules (legumes) or gall weevil damage"
    ],
    "when_to_escalate_bullets": [
      "Entire brassica crops failing on contaminated land",
      "Consider raised beds with imported clean soil as a long-term solution"
    ]
  }'::jsonb
),

-- ============================================================
-- OOMYCETE (3)
-- ============================================================

(
  'phytophthora',
  'oomycete',
  'Phytophthora Root Rot',
  'Phytophthora spp.',
  'A group of highly destructive water-mould pathogens that attack roots and stem bases of a wide range of plants, from bedding plants to mature trees. They thrive in wet, poorly drained soils. Different species cause different diseases, from sudden oak death to root rot of container plants.',
  'Plants wilting and declining despite adequate watering; dark brown discolouration of stem bases and roots; bark peeling away at the base of woody plants to reveal dead brown tissue.',
  5,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Numerous species; P. ramorum causes sudden oak death/larch disease.',
  '{
    "recognition_bullets": [
      "Plants wilting and declining, often starting on one side",
      "Dark brown or black discolouration at the stem base or collar",
      "Roots brown, mushy, and dead rather than white and firm",
      "Bark at the base of trees or shrubs may ooze dark liquid",
      "Foliage becoming sparse, yellow, and stunted"
    ],
    "prevention_bullets": [
      "Ensure excellent drainage in beds and containers",
      "Do not plant trees or shrubs too deeply",
      "Avoid waterlogging and compacted soil around root zones",
      "Buy plants from reputable nurseries with good hygiene practices"
    ],
    "treatment_pesticide_free": [
      "Improve drainage around affected plants",
      "Remove and destroy severely affected plants and surrounding soil",
      "Avoid replanting susceptible species in the same location",
      "Apply beneficial mycorrhizal fungi when replanting to promote root health"
    ],
    "where_on_plant": ["roots", "stem base (collar)", "bark at ground level"],
    "confirmation_tips": [
      "Scrape bark at the stem base; brown staining beneath indicates Phytophthora",
      "Laboratory testing may be needed for definitive identification"
    ],
    "when_to_escalate_bullets": [
      "Mature trees or hedging showing die-back symptoms",
      "Suspect Phytophthora ramorum or P. kernoviae (notifiable) on rhododendrons, oaks, or larches"
    ]
  }'::jsonb
),

(
  'pythium',
  'oomycete',
  'Pythium',
  'Pythium spp.',
  'A water-mould pathogen commonly associated with damping-off of seedlings and root rot in wet conditions. It attacks roots and stem bases, particularly in over-watered, poorly drained compost or soil. Very common in propagation environments and hydroponic systems.',
  'Seedlings collapsing at the base (damping off), or established plants showing brown, water-soaked roots with the outer root sheath slipping off easily.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Thrives in waterlogged conditions; good drainage is the best prevention.',
  '{
    "recognition_bullets": [
      "Seedlings collapsing with water-soaked bases (damping off)",
      "Brown mushy roots where the outer sheath slides off the inner core",
      "Stunted growth and yellowing of foliage",
      "Prevalent in overwatered or poorly drained compost",
      "White cotton-like mycelium may be visible in severe cases"
    ],
    "prevention_bullets": [
      "Use sterile compost and clean containers for propagation",
      "Do not overwater; allow compost to partially dry between waterings",
      "Ensure adequate drainage in all containers and beds",
      "Maintain good hygiene in propagation areas"
    ],
    "treatment_pesticide_free": [
      "Reduce watering immediately and improve drainage",
      "Remove and destroy affected plants and compost",
      "Repot surviving plants into fresh sterile free-draining compost",
      "Apply trichoderma-based biological fungicides as a root drench"
    ],
    "where_on_plant": ["roots", "stem base", "seeds (pre-emergence damping off)"],
    "confirmation_tips": [
      "Root outer sheath sliding off the inner core when gently pulled is characteristic",
      "Laboratory culture needed for definitive identification"
    ],
    "when_to_escalate_bullets": [
      "Persistent damping off despite improved hygiene",
      "Widespread root rot in a hydroponic or propagation system"
    ]
  }'::jsonb
),

(
  'peronospora',
  'oomycete',
  'Peronospora (Downy Mildew group)',
  'Peronospora spp.',
  'A genus of oomycete pathogens causing downy mildew on a wide range of hosts including spinach, beet, onions, and poppies. Species are typically host-specific. They produce characteristic furry greyish-purple sporulation on leaf undersides in humid conditions.',
  'Angular yellow patches on upper leaf surfaces with corresponding grey-violet fuzzy growth on the underside; leaves may brown and die in severe infections.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Each Peronospora species tends to be specific to a particular host genus.',
  '{
    "recognition_bullets": [
      "Angular yellow or brown patches on leaves, often bounded by veins",
      "Grey-violet fuzzy sporulation on leaf undersides",
      "Leaves browning and dying in severe cases",
      "Typically worst in cool damp conditions with poor airflow",
      "Spinach downy mildew can devastate crops rapidly"
    ],
    "prevention_bullets": [
      "Space plants generously for good air circulation",
      "Avoid overhead watering; water at the base in the morning",
      "Choose resistant varieties where available",
      "Practise crop rotation to reduce soil-borne inoculum"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy infected leaves promptly",
      "Thin overcrowded plantings to improve airflow",
      "Avoid evening watering; keep foliage dry",
      "Apply potassium bicarbonate spray as a preventive"
    ],
    "where_on_plant": ["leaves (upper surface yellow, lower surface fuzzy growth)"],
    "confirmation_tips": [
      "Furry growth on leaf undersides (not powdery) distinguishes from powdery mildew",
      "Angular patches bounded by veins are characteristic"
    ],
    "when_to_escalate_bullets": [
      "Rapid defoliation of spinach or beet crops",
      "Repeated infections despite crop rotation"
    ]
  }'::jsonb
),

-- ============================================================
-- BACTERIAL (4)
-- ============================================================

(
  'bacterial-canker',
  'bacterial',
  'Bacterial Canker',
  'Pseudomonas syringae pv. morsprunorum / pv. syringae',
  'A serious bacterial disease of cherries, plums, and other stone fruit (Prunus species) causing sunken oozing cankers on branches, dieback, and shot-hole symptoms on leaves. Infection enters through wounds and leaf scars in autumn and winter. Can kill young trees.',
  'Sunken, flattened cankers on branches oozing amber-coloured gum; associated dieback of affected branches; round brown spots on leaves that fall out to create a shot-hole appearance.',
  4,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Prune stone fruit in summer (June-August) when bacterial activity is lowest.',
  '{
    "recognition_bullets": [
      "Sunken flattened cankers on branches, often with gummy amber ooze",
      "Dieback of branches above cankers in spring",
      "Small round brown spots on leaves which fall out leaving shot-holes",
      "Blossom wilt and failure to break bud on affected branches",
      "Branches may be girdled and die back entirely"
    ],
    "prevention_bullets": [
      "Prune stone fruit only in summer (June to August) to avoid wet autumn infections",
      "Sterilise pruning tools between cuts",
      "Paint large pruning wounds with wound sealant",
      "Choose rootstocks and varieties with some canker resistance"
    ],
    "treatment_pesticide_free": [
      "Cut out cankered branches at least 30cm below visible infection in summer",
      "Sterilise secateurs with methylated spirits between each cut",
      "Remove and destroy all prunings; do not compost",
      "Promote overall tree health with balanced feeding and good drainage"
    ],
    "where_on_plant": ["branches (cankers)", "leaves (shot-holes)", "trunk"],
    "confirmation_tips": [
      "Amber gummy ooze from a sunken branch canker is highly suggestive",
      "Shot-hole leaves plus branch dieback together point to bacterial canker"
    ],
    "when_to_escalate_bullets": [
      "Canker on the main trunk threatening the entire tree",
      "Multiple major branches dying back"
    ]
  }'::jsonb
),

(
  'bacterial-leaf-spot',
  'bacterial',
  'Bacterial Leaf Spot',
  'Xanthomonas spp. / Pseudomonas spp.',
  'A group of bacterial diseases causing water-soaked spots on leaves that enlarge and turn brown or black, often with a yellow halo. They spread rapidly in wet weather and via contaminated seed, tools, and splashing water. Common on peppers, tomatoes, lettuce, and many ornamentals.',
  'Small water-soaked spots on leaves that enlarge, turn dark brown or black, and often develop a yellow halo; spots may coalesce in wet conditions, causing leaf blight.',
  3,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Often seed-borne; use certified disease-free seed where possible.',
  '{
    "recognition_bullets": [
      "Small water-soaked angular spots on leaves",
      "Spots turn brown or black as they enlarge, often with a yellow halo",
      "Spots may coalesce in wet weather, causing large blighted areas",
      "Leaf undersides may show a greasy or wet appearance",
      "Fruits may develop small raised scabby spots"
    ],
    "prevention_bullets": [
      "Use disease-free certified seed",
      "Avoid overhead watering; water at the base in the morning",
      "Practise crop rotation (minimum 2-3 years for affected crops)",
      "Do not work among wet plants as bacteria spread easily on hands and tools"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy infected leaves and plants promptly",
      "Avoid working among plants when foliage is wet",
      "Improve air circulation to help leaves dry quickly",
      "Copper-based sprays (where permitted in organic systems) may slow spread"
    ],
    "where_on_plant": ["leaves", "stems", "fruit"],
    "confirmation_tips": [
      "Water-soaked appearance of young spots is characteristic of bacterial infection",
      "Angular shape (bounded by veins) distinguishes from many fungal spots"
    ],
    "when_to_escalate_bullets": [
      "Rapid spread through a crop in wet weather",
      "Significant fruit spotting reducing harvest quality"
    ]
  }'::jsonb
),

(
  'crown-gall',
  'bacterial',
  'Crown Gall',
  'Agrobacterium tumefaciens',
  'A bacterial disease that causes rough, warty, tumour-like growths (galls) at the base (crown) of plants, on roots, and occasionally on stems. It enters through wounds and can persist in soil for years. Affects a wide range of woody and herbaceous plants including roses, fruit trees, and willows.',
  'Rough, round, warty growths (galls) at the base of the plant or on roots, ranging from pea-sized to several centimetres; initially pale and spongy, later turning hard and dark.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'The bacterium transfers part of its DNA into the plant cell, reprogramming it to form a gall.',
  '{
    "recognition_bullets": [
      "Rough warty rounded growths at the plant base or on roots",
      "Galls range from small (1cm) to very large (10cm+)",
      "Initially pale and spongy, becoming hard, dark, and woody over time",
      "May girdle the stem, restricting growth",
      "Plants may show reduced vigour but often survive"
    ],
    "prevention_bullets": [
      "Avoid wounding plants at the base during cultivation",
      "Inspect nursery plants for galls before purchase",
      "Do not replant susceptible species where crown gall has occurred",
      "Maintain good drainage to reduce stress on root systems"
    ],
    "treatment_pesticide_free": [
      "Mildly affected plants can often be left; they may outgrow the problem",
      "Remove and destroy severely affected plants",
      "Excise small galls with a clean knife and apply wound paint (success varies)",
      "Do not replant the same species in contaminated soil for several years"
    ],
    "where_on_plant": ["crown (soil level)", "roots", "graft unions", "lower stems"],
    "confirmation_tips": [
      "Galls at or just below soil level on the main stem are diagnostic",
      "Cut a gall open: crown gall is undifferentiated tissue, unlike burr or burl wood"
    ],
    "when_to_escalate_bullets": [
      "Gall girdling the main stem and restricting growth severely",
      "Multiple plants in a row affected suggesting soil contamination"
    ]
  }'::jsonb
),

(
  'soft-rot',
  'bacterial',
  'Soft Rot',
  'Pectobacterium spp. (Erwinia carotovora)',
  'A bacterial disease causing rapid watery decomposition of fleshy plant tissues, producing a foul-smelling mushy rot. It commonly affects stored root vegetables, onion bulbs, potato tubers, and the crowns of irises and other rhizomatous plants. Bacteria enter through wounds or insect damage.',
  'Rapid soft watery disintegration of fleshy plant tissue with a characteristic foul smell; commonly seen in stored root vegetables, onion necks, potato tubers, and iris rhizomes.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Often secondary to damage caused by pests, frost, or poor handling.',
  '{
    "recognition_bullets": [
      "Soft watery mushy collapse of fleshy tissues",
      "Strong foul or sour smell from affected tissue",
      "Discoloured (cream to brown) water-soaked tissue",
      "Common in stored potatoes, onions, carrots, and iris rhizomes",
      "Often follows physical damage, frost injury, or pest damage"
    ],
    "prevention_bullets": [
      "Handle harvested crops carefully to avoid bruising and wounds",
      "Cure onions and garlic thoroughly before storage",
      "Store root vegetables in cool, dry, well-ventilated conditions",
      "Remove damaged or diseased items before storage"
    ],
    "treatment_pesticide_free": [
      "Remove and destroy all affected plant material immediately",
      "Cut away rotted iris rhizome tissue back to clean white tissue and let it dry",
      "Improve storage conditions: cooler, drier, better ventilated",
      "Inspect stored crops regularly and remove any showing signs of rot"
    ],
    "where_on_plant": ["tubers", "bulbs", "rhizomes", "root vegetables", "crowns"],
    "confirmation_tips": [
      "The strong foul smell is diagnostic of bacterial soft rot",
      "Tissue collapses readily into a watery mush when pressed"
    ],
    "when_to_escalate_bullets": [
      "Soft rot spreading through stored crops in storage",
      "Entire iris clump collapsing from rhizome rot"
    ]
  }'::jsonb
),

-- ============================================================
-- ABIOTIC (9)
-- ============================================================

(
  'blossom-end-rot',
  'abiotic',
  'Blossom End Rot',
  NULL,
  'A physiological disorder primarily of tomatoes and peppers caused by a localised calcium deficiency in the developing fruit, usually triggered by irregular watering. The blossom end of the fruit develops a sunken, dark, leathery patch. It is not a disease and does not spread between plants.',
  'A dark brown or black sunken leathery patch at the blossom end (base) of tomato, pepper, or courgette fruit, often expanding as the fruit grows.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Caused by calcium transport issues due to erratic watering, not usually a soil calcium deficiency.',
  '{
    "recognition_bullets": [
      "Dark brown or black sunken patch at the bottom (blossom end) of the fruit",
      "Patch is dry and leathery, not soft or mouldy initially",
      "Affects individual fruit, often the first truss",
      "May develop secondary mould on the damaged area",
      "Not present on leaves or stems, only on fruit"
    ],
    "prevention_bullets": [
      "Water consistently and regularly; avoid cycles of drought and flood",
      "Mulch around plants to help maintain even soil moisture",
      "Do not over-feed with high-nitrogen fertilisers",
      "Grow in large containers (at least 10 litres) or open ground for more stable moisture"
    ],
    "treatment_pesticide_free": [
      "Establish a consistent watering routine immediately",
      "Apply a thick mulch to regulate soil moisture",
      "Remove affected fruit so the plant can redirect energy to healthy fruit",
      "Foliar calcium sprays may help in severe cases but addressing watering is primary"
    ],
    "where_on_plant": ["fruit (blossom end only)"],
    "confirmation_tips": [
      "The location at the very base of the fruit is diagnostic",
      "It is dry and leathery, not soft (which would suggest a different rot)"
    ],
    "when_to_escalate_bullets": [
      "Every fruit on multiple trusses affected despite regular watering",
      "Problem persisting into late season when watering is consistent"
    ]
  }'::jsonb
),

(
  'sunscald-leaf-scorch',
  'abiotic',
  'Sunscald & Leaf Scorch',
  NULL,
  'Damage caused by intense sunlight, often after a period of cloud or when plants are moved from shade to full sun without acclimatisation. Leaves develop pale bleached or brown scorched patches, and fruit can develop white sunken areas. Not a disease; purely a physiological response to UV and heat.',
  'Pale bleached or papery brown patches on leaves, particularly on the side facing the sun; fruit may show white or tan sunken patches on the exposed side.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Can affect plants moved suddenly from indoor to outdoor positions.',
  '{
    "recognition_bullets": [
      "Pale bleached or papery brown patches on leaves, mainly on the sun-facing side",
      "Scorching follows the outline of leaves or leaf sections exposed to direct sun",
      "Fruit developing white or tan sunken patches on the exposed side",
      "Damage often appears suddenly after a heatwave or after moving plants outside",
      "Not associated with any pest, mould, or spreading pattern"
    ],
    "prevention_bullets": [
      "Harden off plants gradually when moving from indoor to outdoor positions",
      "Provide temporary shade (fleece, shade netting) during heatwaves",
      "Ensure plants are well watered as drought exacerbates scorch",
      "Maintain good leaf cover on tomato and pepper plants to shade fruit"
    ],
    "treatment_pesticide_free": [
      "Provide temporary shading during intense sun and heatwaves",
      "Water thoroughly in the morning to prevent additional drought stress",
      "Do not remove scorched leaves until the plant has produced replacement growth",
      "Move container plants to a position with afternoon shade"
    ],
    "where_on_plant": ["leaves (sun-facing side)", "fruit (exposed side)"],
    "confirmation_tips": [
      "Damage is only on the sun-facing side of the leaf or fruit",
      "No signs of pests, mould, or spreading to shaded parts"
    ],
    "when_to_escalate_bullets": [
      "Extensive leaf loss weakening the plant",
      "Repeated scorching events on the same plant"
    ]
  }'::jsonb
),

(
  'frost-damage',
  'abiotic',
  'Frost Damage',
  NULL,
  'Injury caused by sub-zero temperatures damaging plant cells, particularly on soft new growth, blossom, and tender plants. Symptoms range from blackened shoot tips to wilted translucent foliage and bark splitting on woody plants. Late spring frosts are especially damaging to fruit blossom.',
  'Blackened, water-soaked, or translucent foliage on tender growth; browned and shrivelled blossom; bark may split or crack on woody stems. Damage appears overnight following a frost event.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Late spring frosts (April-May in the UK) are the most damaging to gardens.',
  '{
    "recognition_bullets": [
      "Blackened, water-soaked, or limp foliage on new growth",
      "Translucent or glassy appearance of frozen then thawed leaves",
      "Browned and shrivelled flower blossoms",
      "Bark splitting or cracking on young stems, especially on south-facing sides",
      "Damage appears overnight following a frost event"
    ],
    "prevention_bullets": [
      "Cover vulnerable plants with horticultural fleece on frost-risk nights",
      "Do not plant tender plants out before the last frost date for your area",
      "Avoid planting fruit trees in known frost pockets",
      "Delay pruning spring-flowering shrubs until frost risk has passed"
    ],
    "treatment_pesticide_free": [
      "Do not prune frost-damaged growth immediately; wait until new growth shows where wood is alive",
      "Protect damaged plants from further frost events",
      "Water carefully; damaged roots may not function properly",
      "Feed lightly once new growth begins to support recovery"
    ],
    "where_on_plant": ["new growth", "flower buds and blossoms", "leaves", "bark"],
    "confirmation_tips": [
      "Damage coinciding with a known frost event is the key indicator",
      "Blackening limited to the most exposed and tender parts"
    ],
    "when_to_escalate_bullets": [
      "Repeated late frost damage killing fruit tree blossoms for multiple years",
      "Bark splitting leading to dieback or disease entry"
    ]
  }'::jsonb
),

(
  'heat-stress',
  'abiotic',
  'Heat Stress',
  NULL,
  'Physiological damage caused by excessively high temperatures, particularly in greenhouses and during heatwaves. Symptoms include wilting, leaf curling, flower drop, poor fruit set, and sunscald. Cool-season crops such as lettuce, peas, and spinach are especially vulnerable.',
  'Wilting despite adequate soil moisture; upward curling of leaves; flower and fruit drop; bolting of leafy crops; bleached or scorched leaf patches.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Climate change is making heat stress increasingly relevant in UK gardens.',
  '{
    "recognition_bullets": [
      "Wilting during the hottest part of the day despite moist soil",
      "Leaf edges curling upward or inward",
      "Flower drop (especially on tomatoes, peppers, beans)",
      "Poor fruit set during heatwave periods",
      "Lettuce, spinach, and coriander bolting prematurely"
    ],
    "prevention_bullets": [
      "Provide shade netting or temporary shading during heatwaves",
      "Mulch generously to keep roots cool and retain moisture",
      "Water deeply in the early morning or evening",
      "Ventilate greenhouses well; open all doors and vents"
    ],
    "treatment_pesticide_free": [
      "Water deeply and consistently, ideally early morning",
      "Apply mulch to cool the root zone and conserve moisture",
      "Provide temporary shade using shade cloth, netting, or strategically placed screens",
      "Damp down greenhouse paths and staging to lower the temperature"
    ],
    "where_on_plant": ["leaves (curling, wilting)", "flowers (drop)", "fruit (poor set, sunscald)"],
    "confirmation_tips": [
      "Symptoms correlate with high-temperature events",
      "Wilting recovers in the evening when temperatures drop"
    ],
    "when_to_escalate_bullets": [
      "Sustained heat preventing any fruit set over multiple weeks",
      "Plants collapsing and failing to recover overnight"
    ]
  }'::jsonb
),

(
  'overwatering-poor-drainage',
  'abiotic',
  'Overwatering & Poor Drainage',
  NULL,
  'Damage caused by roots sitting in waterlogged soil, depriving them of oxygen and leading to root suffocation and rot. Symptoms mimic drought (wilting, yellowing) because damaged roots cannot take up water. Containerised plants and heavy clay soils are particularly susceptible.',
  'Yellowing lower leaves, wilting despite wet soil, soft brown roots, and waterlogged compost or soil with a sour smell.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'One of the most common causes of houseplant and container plant death.',
  '{
    "recognition_bullets": [
      "Plant wilting despite very wet soil or compost",
      "Lower leaves turning yellow and dropping",
      "Compost surface staying constantly wet or developing green algae",
      "Roots brown and mushy rather than white and firm",
      "Sour or stagnant smell from the pot or root zone"
    ],
    "prevention_bullets": [
      "Ensure all containers have adequate drainage holes",
      "Use well-structured compost with perlite or grit for drainage",
      "Water only when the top centimetre of compost has dried",
      "Stand pots on feet or gravel to prevent them sitting in water"
    ],
    "treatment_pesticide_free": [
      "Stop watering immediately and allow the compost to dry out",
      "Remove the plant from its pot and let the root ball breathe",
      "Trim away brown mushy roots and repot in fresh free-draining compost",
      "Improve drainage in garden beds by incorporating organic matter and grit"
    ],
    "where_on_plant": ["roots", "lower leaves", "stem base"],
    "confirmation_tips": [
      "Check the compost moisture: if it is sodden and the plant is wilting, overwatering is likely",
      "Tip the plant out to examine the roots"
    ],
    "when_to_escalate_bullets": [
      "No healthy roots remaining when plant is removed from pot",
      "Persistent waterlogging in beds requiring drainage intervention"
    ]
  }'::jsonb
),

(
  'wind-scorch',
  'abiotic',
  'Wind Scorch',
  NULL,
  'Damage caused by persistent or strong winds desiccating foliage faster than roots can replace moisture, resulting in browning of leaf edges and tips. Exposed sites, coastal gardens, and newly planted specimens are particularly vulnerable. Evergreens in winter are especially at risk.',
  'Brown, dry, papery leaf margins and tips, predominantly on the windward side of the plant; leaves may curl inward and the plant may lean away from the prevailing wind.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Particularly damaging in winter when roots are less active and wind speeds are higher.',
  '{
    "recognition_bullets": [
      "Brown dry leaf margins and tips, worst on the windward side",
      "Leaves curling inward to reduce surface area",
      "Plant leaning or growing asymmetrically away from prevailing wind",
      "Evergreens showing browning on exposed side in late winter",
      "Young or newly planted trees and shrubs most affected"
    ],
    "prevention_bullets": [
      "Plant windbreaks or hedges to filter wind before it reaches vulnerable plants",
      "Use temporary windbreak netting to protect new plantings",
      "Choose wind-tolerant species for exposed positions",
      "Mulch generously to maintain root moisture"
    ],
    "treatment_pesticide_free": [
      "Install temporary windbreak netting or screening",
      "Water well, especially in winter when cold drying winds can cause desiccation",
      "Do not prune wind-damaged growth until spring when new growth shows the extent of damage",
      "Mulch around the base to conserve moisture"
    ],
    "where_on_plant": ["leaf margins and tips", "windward side of plant"],
    "confirmation_tips": [
      "Damage is predominantly on the windward or exposed side of the plant",
      "No pests or disease present; damage correlates with wind exposure"
    ],
    "when_to_escalate_bullets": [
      "Young trees repeatedly failing to establish in an exposed position",
      "Valuable evergreen hedging turning brown on the windward side"
    ]
  }'::jsonb
),

(
  'nutrient-deficiency-general',
  'abiotic',
  'General Nutrient Deficiency',
  NULL,
  'A broad category covering multiple nutrient shortages that cause a range of visual symptoms including yellowing, purpling, poor growth, and leaf deformation. Most commonly caused by depleted soil, pH lock-out, or poor root health. Regular soil testing and balanced feeding help prevent deficiencies.',
  'Pale or yellow foliage, stunted growth, purpling of leaves, interveinal chlorosis, or poor flowering and fruiting without any evident pest or disease cause.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'A soil test is the best way to identify specific deficiencies.',
  '{
    "recognition_bullets": [
      "General yellowing, pallor, or stunted growth",
      "Purple or reddish tints to foliage (phosphorus deficiency)",
      "Interveinal yellowing (chlorosis) with veins remaining green (iron or manganese deficiency)",
      "Poor flowering, fruiting, or seed set (potassium or phosphorus deficiency)",
      "Distorted new growth or die-back of growing tips (calcium or boron deficiency)"
    ],
    "prevention_bullets": [
      "Apply a balanced general-purpose fertiliser at the start of the growing season",
      "Test soil pH and nutrient levels periodically",
      "Incorporate well-rotted organic matter annually to maintain soil health",
      "Ensure soil pH is appropriate for the plants being grown"
    ],
    "treatment_pesticide_free": [
      "Apply a balanced liquid feed for a quick response",
      "Correct soil pH if it is preventing nutrient uptake (lime for acid soils, sulphur for alkaline)",
      "Top-dress with well-rotted compost or manure",
      "Use specific amendments (e.g. Epsom salts for magnesium, seaweed for trace elements)"
    ],
    "where_on_plant": ["leaves (various patterns)", "stems", "fruit", "roots"],
    "confirmation_tips": [
      "No pests or pathogens present; symptoms do not spread to neighbours",
      "A soil test is the definitive way to identify specific deficiencies"
    ],
    "when_to_escalate_bullets": [
      "Symptoms persist despite balanced feeding and pH adjustment",
      "Widespread poor growth across different plant species suggesting a fundamental soil issue"
    ]
  }'::jsonb
),

(
  'drought-stress',
  'abiotic',
  'Drought Stress',
  NULL,
  'Damage caused by insufficient water availability to plants, resulting in wilting, leaf scorch, premature leaf drop, and reduced flowering and fruiting. Increasingly common during UK summers, especially on light sandy soils and in containers. Prolonged drought weakens plants and makes them more susceptible to pests and diseases.',
  'Wilting foliage that does not recover in the evening; dry crispy brown leaf margins; premature leaf drop, particularly of older lower leaves; dry cracked soil.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Climate change is making drought stress an increasingly common issue.',
  '{
    "recognition_bullets": [
      "Wilting that does not fully recover in the evening",
      "Dry, crispy brown leaf edges and tips",
      "Premature leaf drop, particularly older leaves",
      "Soil visibly dry, cracked, and pulling away from pot edges",
      "Stunted growth, poor fruit set, and small fruit"
    ],
    "prevention_bullets": [
      "Mulch beds and borders generously (5-10cm) with organic matter",
      "Install irrigation or soaker hoses for vulnerable areas",
      "Choose drought-tolerant plants for dry areas of the garden",
      "Improve soil structure with organic matter to increase water retention"
    ],
    "treatment_pesticide_free": [
      "Water deeply and thoroughly, allowing water to soak right through the root zone",
      "Apply mulch immediately after watering to retain moisture",
      "Prioritise watering newly planted and fruiting plants",
      "Water containers twice daily in extreme heat (morning and evening)"
    ],
    "where_on_plant": ["leaf margins", "older lower leaves", "fruit (small, aborted)", "roots"],
    "confirmation_tips": [
      "Soil is dry to a significant depth when probed",
      "Wilting correlates with dry weather and recovers after thorough watering"
    ],
    "when_to_escalate_bullets": [
      "Established trees showing canopy dieback from drought",
      "Newly planted hedging or trees failing despite supplementary watering"
    ]
  }'::jsonb
),

(
  'waterlogging',
  'abiotic',
  'Waterlogging',
  NULL,
  'Prolonged saturation of soil with water, depriving plant roots of oxygen and leading to root death, yellowing, and eventual plant decline. Heavy clay soils, compacted ground, and areas with a high water table are most at risk. Differs from overwatering in that it refers to garden soil conditions rather than container management.',
  'Yellowing foliage and poor growth in areas where water lies on the surface or soil remains saturated; moss and liverwort colonising bare soil; plants pulling up easily with dead roots.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Increasingly problematic with wetter winters in many UK regions.',
  '{
    "recognition_bullets": [
      "Standing water on the soil surface after rain",
      "Yellowing plants in low-lying areas of the garden",
      "Moss, liverwort, and algae colonising bare wet soil",
      "Root systems dead and blackened when dug up",
      "Sour anaerobic smell when soil is dug"
    ],
    "prevention_bullets": [
      "Improve drainage by incorporating organic matter and grit into heavy soils",
      "Install land drains or a French drain in persistently waterlogged areas",
      "Create raised beds for growing in poorly drained areas",
      "Choose moisture-tolerant plants for wet spots (willow, dogwood, marsh marigold)"
    ],
    "treatment_pesticide_free": [
      "Fork over compacted soil to break up panning and improve aeration",
      "Add coarse grit and organic matter to heavy clay soil",
      "Install raised beds filled with imported topsoil for vegetable growing",
      "Divert surface water away from vulnerable planting areas"
    ],
    "where_on_plant": ["roots (dead, black)", "lower leaves (yellow)", "whole plant (declining)"],
    "confirmation_tips": [
      "Water standing on the soil surface or soil remaining saturated for days after rain",
      "Dig a hole 30cm deep; if it fills with water, the area is waterlogged"
    ],
    "when_to_escalate_bullets": [
      "Entire beds or borders unusable due to persistent waterlogging",
      "Mature trees showing crown dieback from waterlogging"
    ]
  }'::jsonb
),

-- ============================================================
-- NUTRIENT (1)
-- ============================================================

(
  'nitrogen-deficiency',
  'nutrient',
  'Nitrogen Deficiency',
  NULL,
  'A common nutrient deficiency causing overall pale green or yellow foliage, starting with the oldest (lower) leaves and progressing upward. Plants grow slowly, remain stunted, and produce poor crops. Nitrogen is highly mobile in soil and readily leached by rain, particularly on light soils.',
  'Uniform pale green to yellow colouring of older lower leaves progressing upward; stunted spindly growth; poor leaf development and reduced flowering or fruiting.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Nitrogen is the nutrient most commonly deficient in garden soils.',
  '{
    "recognition_bullets": [
      "Uniform pale green or yellow colouring, starting with lower older leaves",
      "Oldest leaves may turn completely yellow and drop",
      "Stunted spindly growth with thin weak stems",
      "Reduced leaf size and poor canopy development",
      "Poor flowering and fruit set"
    ],
    "prevention_bullets": [
      "Apply a balanced fertiliser at the start of the growing season",
      "Mulch annually with well-rotted compost or manure",
      "Grow nitrogen-fixing green manures (clover, field beans) over winter",
      "Avoid excessive watering which leaches nitrogen from the root zone"
    ],
    "treatment_pesticide_free": [
      "Apply a quick-acting liquid feed high in nitrogen (e.g. comfrey tea, nettle tea)",
      "Side-dress with blood, fish, and bone meal or pelleted chicken manure",
      "Foliar feed with dilute liquid seaweed for rapid uptake",
      "Mulch with well-rotted garden compost to slowly release nitrogen"
    ],
    "where_on_plant": ["lower leaves (first)", "whole plant (stunting)"],
    "confirmation_tips": [
      "Uniform yellowing starting from the base distinguishes nitrogen deficiency from iron deficiency (which affects new growth first)",
      "Response to nitrogen feeding within 1-2 weeks confirms the diagnosis"
    ],
    "when_to_escalate_bullets": [
      "Symptoms persist despite nitrogen application (consider pH lock-out or root damage)",
      "Widespread poor growth across the garden suggesting fundamental soil issues"
    ]
  }'::jsonb
),

-- ============================================================
-- OTHER (5)
-- ============================================================

(
  'nematodes',
  'nematode',
  'Plant Parasitic Nematodes',
  'Meloidogyne spp. / Ditylenchus spp. / Pratylenchus spp.',
  'Microscopic worm-like organisms that feed on plant roots, stems, or leaves, causing stunted growth, root galling, and general decline. Root-knot nematodes are the most common, causing characteristic swellings on roots. They are difficult to detect without digging up affected plants.',
  'Stunted, yellowing plants that wilt easily; when dug up, roots show irregular swellings or knots (root-knot nematode) or stunted and discoloured root systems.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Not to be confused with beneficial nematodes used for pest control.',
  '{
    "recognition_bullets": [
      "Stunted, yellowing plants in patches",
      "Plants wilt readily in warm weather despite adequate moisture",
      "Root-knot nematodes cause irregular knobbly swellings on roots",
      "Root lesion nematodes cause brown discoloured roots",
      "Stem and bulb nematodes cause swollen distorted stems and bulbs"
    ],
    "prevention_bullets": [
      "Practise crop rotation (minimum 4 years for susceptible crops)",
      "Grow French marigolds (Tagetes patula) which suppress root-knot nematodes",
      "Use resistant rootstocks for grafted vegetables",
      "Maintain high levels of soil organic matter to support nematode predators"
    ],
    "treatment_pesticide_free": [
      "Rotate crops on a long cycle (4+ years) to starve nematode populations",
      "Grow Tagetes patula (French marigolds) as a biofumigant cover crop",
      "Incorporate mustard green manure and dig in to release biofumigant compounds",
      "Solarise soil in summer by covering with clear polythene for 6-8 weeks"
    ],
    "where_on_plant": ["roots (galls, lesions)", "stems (swelling)", "bulbs (distortion)"],
    "confirmation_tips": [
      "Dig up an affected plant and examine roots for characteristic knots or galls",
      "Laboratory analysis of soil samples can confirm nematode species and levels"
    ],
    "when_to_escalate_bullets": [
      "Widespread crop failure across beds due to root-knot nematode",
      "Potato cyst nematode confirmed in soil (specific management required)"
    ]
  }'::jsonb
),

(
  'bolting',
  'other',
  'Bolting',
  NULL,
  'The premature production of flowers and seeds triggered by stress, typically temperature fluctuations, day length changes, or drought. Leafy crops (lettuce, spinach, coriander) and root vegetables (beetroot, onions) are most affected. Once bolting begins, the edible parts become bitter and tough.',
  'A central flower stalk shooting up rapidly from the plant centre; leaves becoming smaller, tougher, and bitter-tasting; roots of root vegetables becoming woody.',
  2,
  false,
  ARRAY['UK','IE','EU','NA'],
  'A physiological response to stress rather than a pest or disease.',
  '{
    "recognition_bullets": [
      "A central flower stalk elongating rapidly from the plant",
      "Leaves becoming smaller, tougher, and bitter",
      "Root vegetables developing woody, fibrous roots",
      "Onions producing a hard flower stalk through the centre of the bulb",
      "Commonly triggered by cold spells, drought, or long days"
    ],
    "prevention_bullets": [
      "Choose bolt-resistant varieties for early and late-season sowings",
      "Sow at the correct time for each crop to avoid temperature triggers",
      "Water consistently to avoid drought stress",
      "Avoid transplanting shock by hardening off seedlings properly"
    ],
    "treatment_pesticide_free": [
      "Harvest immediately once bolting begins; the crop will only deteriorate further",
      "Remove the flower stalk on onions and use those bulbs first (they will not store)",
      "Let one or two bolt to save seed if desired",
      "Re-sow with bolt-resistant varieties for a replacement crop"
    ],
    "where_on_plant": ["centre of the plant (flower stalk)", "leaves (becoming tough)", "roots (becoming woody)"],
    "confirmation_tips": [
      "A rapidly elongating central stem with flower buds is unmistakable",
      "Taste a leaf: bitterness confirms the crop is past its best"
    ],
    "when_to_escalate_bullets": [
      "Entire rows bolting before reaching a usable size",
      "Persistent bolting issues suggesting variety choice or timing needs review"
    ]
  }'::jsonb
),

(
  'bird-damage',
  'other',
  'Bird Damage',
  NULL,
  'Damage caused by birds pecking at fruit, seedlings, buds, and leaves. Pigeons are the worst offenders on brassicas, stripping leaves to the midrib. Bullfinches eat fruit tree buds in spring, blackbirds take soft fruit, and many species pull up newly sown seeds and seedlings.',
  'Leaves torn or stripped to midribs (pigeons); fruit pecked with distinctive beak marks; seedlings pulled up; flower buds stripped from branches in spring.',
  3,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Netting is the most reliable protection.',
  '{
    "recognition_bullets": [
      "Brassica leaves torn and stripped to the midrib (pigeon damage)",
      "V-shaped beak marks in soft fruit (strawberries, cherries, tomatoes)",
      "Flower buds stripped from fruit trees in late winter (bullfinch damage)",
      "Seedlings pulled up and scattered after sowing",
      "Peas and beans pecked at emergence"
    ],
    "prevention_bullets": [
      "Net crops with bird netting, ensuring it is well secured and does not trap birds",
      "Use a fruit cage for permanent soft fruit protection",
      "Cover newly sown beds with fleece or netting until seedlings are established",
      "Erect visual deterrents (CD discs, reflective tape) though these lose effectiveness over time"
    ],
    "treatment_pesticide_free": [
      "Cover brassicas with netting throughout the growing season",
      "Build or buy a fruit cage for soft fruit",
      "Use cloches or fleece over seedbeds until plants establish",
      "Combine multiple deterrents (visual, auditory) and rotate them regularly"
    ],
    "where_on_plant": ["leaves (stripped)", "fruit (pecked)", "buds (eaten)", "seedlings (pulled up)"],
    "confirmation_tips": [
      "Distinctive beak marks and tearing pattern differs from caterpillar or slug damage",
      "Damage occurs during daylight hours"
    ],
    "when_to_escalate_bullets": [
      "Repeated total loss of brassica crops to pigeons",
      "Fruit crops completely consumed before harvest"
    ]
  }'::jsonb
),

(
  'deer-browsing',
  'other',
  'Deer Browsing',
  NULL,
  'Feeding damage by deer, which browse on a wide range of garden plants, tearing shoots and stripping bark. Damage is characterised by ragged torn edges (deer lack upper front teeth and tear rather than cut). Roses, hostas, fruit trees, and vegetable crops are commonly targeted.',
  'Ragged torn shoot tips and leaves (torn, not cleanly cut); bark stripped from young trees; droppings and hoof prints nearby.',
  4,
  false,
  ARRAY['UK','IE','EU','NA'],
  'Deer are crepuscular, most active at dawn and dusk.',
  '{
    "recognition_bullets": [
      "Ragged torn edges on browsed shoots (deer tear rather than cut)",
      "Browsing line at a uniform height (up to 1.5m for muntjac, 1.8m for roe deer)",
      "Bark stripped or frayed on young tree trunks",
      "Hoof prints and droppings (small dark pellets) in the area",
      "Rose shoots, hostas, and soft growth preferentially targeted"
    ],
    "prevention_bullets": [
      "Fence the garden with deer-proof fencing (minimum 1.8m for roe, 2m for fallow deer)",
      "Protect individual trees with tree guards or spiral guards",
      "Plant deer-resistant species in vulnerable areas (lavender, foxglove, ferns)",
      "Use scent deterrents (human hair, soap bars) though effectiveness varies"
    ],
    "treatment_pesticide_free": [
      "Install deer-proof fencing as the only reliably effective long-term solution",
      "Protect individual trees and shrubs with wire mesh guards",
      "Apply proprietary deer repellent sprays to vulnerable plants (reapply after rain)",
      "Consider motion-activated deterrents (sprinklers, lights)"
    ],
    "where_on_plant": ["shoot tips", "leaves", "bark (young trees)", "flower buds"],
    "confirmation_tips": [
      "Ragged torn browse line at a consistent height is characteristic",
      "Look for hoof prints (slots) and droppings to confirm deer presence"
    ],
    "when_to_escalate_bullets": [
      "Deer entering the garden nightly and causing severe damage",
      "Young trees being killed by bark stripping"
    ]
  }'::jsonb
),

(
  'viral-mosaic',
  'viral',
  'Viral Mosaic',
  'Various (TMV, CMV, PVY)',
  'A group of plant viruses causing distinctive mottled patterns of light and dark green, yellow, or white on leaves. Spread by aphids, contaminated tools, seed, or handling. Infected plants may be stunted, produce distorted fruit, and yield poorly. There is no cure for plant viruses.',
  'Irregular mottled pattern of light green, yellow, and dark green patches on leaves; leaves may be distorted, puckered, or reduced in size; plants stunted with poor fruit set.',
  4,
  true,
  ARRAY['UK','IE','EU','NA'],
  'Tobacco mosaic virus can persist on tools and hands; wash thoroughly between plants.',
  '{
    "recognition_bullets": [
      "Irregular mosaic pattern of light and dark green or yellow patches on leaves",
      "Leaves may be puckered, distorted, or narrowed",
      "Stunted growth and reduced vigour",
      "Fruit may be distorted, mottled, or reduced in size",
      "Symptoms often more visible on new growth"
    ],
    "prevention_bullets": [
      "Control aphid vectors promptly to reduce virus transmission",
      "Use certified virus-free seed and planting material",
      "Wash hands and sterilise tools between plants, especially with tomatoes",
      "Remove and destroy infected plants promptly to reduce spread"
    ],
    "treatment_pesticide_free": [
      "There is no cure for plant viruses; remove and destroy infected plants",
      "Control aphid populations to reduce further spread",
      "Do not save seed from infected plants",
      "Replace with virus-resistant varieties where available"
    ],
    "where_on_plant": ["leaves (mosaic pattern)", "fruit (distorted)", "whole plant (stunted)"],
    "confirmation_tips": [
      "The irregular mosaic pattern is distinctive; unlike nutrient deficiency, it is asymmetric",
      "Symptoms worsen over time and do not respond to feeding"
    ],
    "when_to_escalate_bullets": [
      "Virus spreading through a crop via aphid transmission",
      "Valuable perennial plants infected"
    ]
  }'::jsonb
)

ON CONFLICT (slug) DO NOTHING;
