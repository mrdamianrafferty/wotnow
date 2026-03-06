/**
 * Alert Guidance Content
 *
 * Detailed gardening guidance for each alert type.
 * Used by the /grow/guidance/[type] page.
 */

export interface GuidanceSection {
  heading: string;
  body: string;
}

export interface AlertGuidance {
  slug: string;
  title: string;
  subtitle: string;
  sections: GuidanceSection[];
  relatedTypes: string[];
}

export const ALERT_GUIDANCE: Record<string, AlertGuidance> = {
  slug_activity: {
    slug: 'slug_activity',
    title: 'Slugs & Snails',
    subtitle: 'Managing slugs without harming wildlife',
    sections: [
      {
        heading: 'Why now?',
        body: 'Slugs are most active on warm, damp evenings - especially after rain. They feed at night and hide in cool, moist spots during the day. A run of mild, wet weather is prime slug time.',
      },
      {
        heading: 'Quick wins tonight',
        body: 'Go out after dark with a torch and pick slugs off plants by hand. Drop them into a bucket of soapy water, or relocate them well away from your garden. Check under pots, boards and dense foliage where they hide during the day.',
      },
      {
        heading: 'Longer-term defences',
        body: 'Encourage natural predators: frogs, toads, hedgehogs, thrushes, and ground beetles all eat slugs. Create habitat for them with a small pond, log pile, or hedgehog house. Copper tape around pots can deter slugs. Wool pellets and sharp grit mulches make surfaces uncomfortable for them to cross.',
      },
      {
        heading: 'Beer traps',
        body: 'Sink a jar or yoghurt pot into the soil so the rim is level with the surface. Fill with cheap beer or a yeast-sugar-water mix. Slugs are attracted, fall in and drown. Empty and refill every few days.',
      },
      {
        heading: 'Plants to protect',
        body: 'Hostas, lettuce, strawberries, dahlias, delphiniums, and young seedlings are slug favourites. Prioritise protection around these. Established, tougher-leaved plants are usually fine.',
      },
    ],
    relatedTypes: ['aphid_conditions'],
  },

  aphid_conditions: {
    slug: 'aphid_conditions',
    title: 'Aphids',
    subtitle: 'Controlling aphids organically',
    sections: [
      {
        heading: 'Why now?',
        body: 'Aphids breed rapidly in warm, calm weather. A single aphid can produce dozens of offspring in a week without mating. Populations can explode in just a few days of favourable conditions.',
      },
      {
        heading: 'Inspect today',
        body: 'Check the growing tips and undersides of leaves on roses, beans, peppers, tomatoes and brassicas. Look for clusters of small green, black or pink insects, and sticky "honeydew" residue on leaves below.',
      },
      {
        heading: 'Organic controls',
        body: 'Blast aphids off with a strong jet of water - most will not find their way back. For heavier infestations, spray with diluted washing-up liquid (1 tsp per litre). Neem oil spray also works well. Always spray in the evening to avoid scorching leaves.',
      },
      {
        heading: 'Natural allies',
        body: 'Ladybirds, lacewings, hoverfly larvae and parasitic wasps are voracious aphid predators. Plant umbellifers (dill, fennel, yarrow) and marigolds to attract them. Avoid broad-spectrum pesticides that kill these beneficial insects.',
      },
      {
        heading: 'Prevention',
        body: 'Companion planting with strong-scented herbs (chives, garlic, mint) can deter aphids. Avoid over-feeding with nitrogen, which produces the soft, sappy growth aphids love.',
      },
    ],
    relatedTypes: ['slug_activity', 'caterpillar_conditions'],
  },

  late_blight_risk: {
    slug: 'late_blight_risk',
    title: 'Late Blight',
    subtitle: 'Protecting tomatoes and potatoes from Phytophthora',
    sections: [
      {
        heading: 'Why now?',
        body: 'Late blight (Phytophthora infestans) thrives in humid conditions between 15-22 degrees C with prolonged wet weather. The spores spread on the wind and through rain splash. Once established, it can destroy a crop in days.',
      },
      {
        heading: 'What to look for',
        body: 'Brown or black lesions on leaves, often starting at the edges or tips. White fuzzy growth on the underside of leaves in humid conditions. Brown patches on stems. On tomatoes, brown patches on fruit that quickly rot.',
      },
      {
        heading: 'Immediate action',
        body: 'Remove and destroy (do not compost) any affected leaves or stems immediately. Apply a copper-based fungicide such as Bordeaux mixture to remaining foliage. Improve air circulation by removing lower leaves and thinning crowded growth.',
      },
      {
        heading: 'Prevention',
        body: 'Water at soil level, never over the foliage. Space plants generously for airflow. Remove lower leaves that touch the soil. Choose blight-resistant varieties like "Crimson Crush" (tomato) or "Sarpo Mira" (potato). In severe blight years, harvest potatoes early before the disease reaches the tubers.',
      },
      {
        heading: 'If it spreads',
        body: 'For potatoes, cut the haulm (top growth) to ground level and leave tubers in the ground for 2 weeks before harvesting - this lets the skin set and prevents spores reaching the tubers. For tomatoes, harvest any fruit showing colour and ripen indoors.',
      },
    ],
    relatedTypes: ['powdery_mildew_risk', 'botrytis_risk'],
  },

  powdery_mildew_risk: {
    slug: 'powdery_mildew_risk',
    title: 'Powdery Mildew',
    subtitle: 'Treating and preventing white fungal growth',
    sections: [
      {
        heading: 'Why now?',
        body: 'Powdery mildew thrives in warm days with cool, humid nights and no rain. Paradoxically, dry soil stress makes plants more susceptible, while the fungus itself needs humid air. A string of dry, warm days with dewy mornings is classic mildew weather.',
      },
      {
        heading: 'What to look for',
        body: 'White or grey powdery patches on leaves, stems and sometimes fruit. Usually starts on upper leaf surfaces. Affected leaves may curl, yellow and drop early. Courgettes, cucumbers, squash, roses, and peas are most susceptible.',
      },
      {
        heading: 'Treatment',
        body: 'Milk spray is surprisingly effective: mix 1 part milk to 9 parts water and spray affected plants in the morning. The proteins in milk react with sunlight to create a brief antiseptic effect. Alternatively, use a sulphur-based fungicide. Remove badly affected leaves.',
      },
      {
        heading: 'Prevention',
        body: 'Water at the base of plants to keep roots moist - stressed, dry plants are more vulnerable. Improve air circulation by spacing plants and pruning for an open habit. Avoid late-evening watering that leaves foliage damp overnight.',
      },
    ],
    relatedTypes: ['late_blight_risk', 'botrytis_risk'],
  },

  botrytis_risk: {
    slug: 'botrytis_risk',
    title: 'Grey Mould (Botrytis)',
    subtitle: 'Preventing and managing botrytis grey mould',
    sections: [
      {
        heading: 'Why now?',
        body: 'Botrytis (grey mould) thrives in cool, damp, still conditions. It enters plants through wounds, dead tissue or flowers, then spreads rapidly in humid air. Poorly ventilated greenhouses and dense planting are particularly at risk.',
      },
      {
        heading: 'What to look for',
        body: 'Fuzzy grey mould on flowers, fruit, stems or leaves. Soft, brown rot on strawberries, tomatoes and lettuce. Often starts on dead or dying tissue and spreads to living material.',
      },
      {
        heading: 'Immediate action',
        body: 'Remove all dead flowers, fallen leaves and decaying material. Cut out infected parts well below the visible mould. Improve ventilation - open greenhouse vents, thin dense growth, and space plants wider apart.',
      },
      {
        heading: 'Prevention',
        body: 'Good hygiene is the best defence. Clear up dead material regularly. Water at soil level and in the morning so foliage dries before evening. Avoid bruising fruit when harvesting. In greenhouses, keep air moving with vents or a small fan.',
      },
    ],
    relatedTypes: ['late_blight_risk', 'powdery_mildew_risk'],
  },

  frost_damage: {
    slug: 'frost_damage',
    title: 'Frost Protection',
    subtitle: 'Keeping plants safe from cold snaps',
    sections: [
      {
        heading: 'Why now?',
        body: 'Frost is forecast for your area. Even a light frost (0 to -2 degrees C) can kill tender plants, while a hard frost (below -5 degrees C) can damage even hardy plants if they have started into soft new growth.',
      },
      {
        heading: 'Protect tonight',
        body: 'Cover tender plants with horticultural fleece, old sheets, or cloches before dark. The covering traps heat radiating from the soil. Weight down edges so wind does not lift it. Move containers against a house wall or into a porch.',
      },
      {
        heading: 'If frost has already hit',
        body: 'Do not touch frosted leaves - let them thaw naturally. Shade affected plants from morning sun if possible, as rapid thawing causes more damage than slow. Wait several days before cutting back damaged growth, as it may recover.',
      },
      {
        heading: 'Longer term',
        body: 'Hold off planting out tender crops (tomatoes, courgettes, beans, peppers) until your last frost date has passed. Harden off seedlings gradually over 7-10 days before planting out. Keep fleece handy through late spring for unexpected cold snaps.',
      },
    ],
    relatedTypes: ['wind_damage'],
  },

  wind_damage: {
    slug: 'wind_damage',
    title: 'Wind Protection',
    subtitle: 'Securing plants and structures in high winds',
    sections: [
      {
        heading: 'Why now?',
        body: 'Strong winds are forecast. Wind can snap stems, rock root systems, desiccate foliage, and topple containers. Tall plants, climbers, and anything newly planted are most vulnerable.',
      },
      {
        heading: 'Before the wind arrives',
        body: 'Stake tall plants (sunflowers, dahlias, sweetcorn, delphiniums). Check existing ties are firm but not cutting into stems. Move containers to a sheltered spot - against a wall or into a porch. Secure greenhouse vents and doors.',
      },
      {
        heading: 'During high winds',
        body: 'Stay out of the garden - falling branches and flying pots are dangerous. Do not attempt repairs until the wind dies down.',
      },
      {
        heading: 'After the wind',
        body: 'Re-firm any plants that have been rocked loose in the soil. Prune broken branches cleanly. Water wind-stressed plants, as wind dries soil and foliage rapidly. Check ties and supports have not come loose.',
      },
      {
        heading: 'Permanent windbreaks',
        body: 'A permeable windbreak (hedge, fence with gaps, or windbreak netting) is better than a solid wall, which creates damaging turbulence on the lee side. Plant hedges 30-50% permeable for the best shelter.',
      },
    ],
    relatedTypes: ['frost_damage', 'drought_stress'],
  },

  heat_stress: {
    slug: 'heat_stress',
    title: 'Heat & Sun Protection',
    subtitle: 'Helping plants survive hot spells',
    sections: [
      {
        heading: 'Why now?',
        body: 'Temperatures above 30 degrees C stress most garden plants. Photosynthesis slows, water demand soars, and soft-leaved plants wilt. Consecutive hot days compound the stress as soil moisture drops.',
      },
      {
        heading: 'Watering strategy',
        body: 'Water deeply at dawn and dusk, not during midday heat when water evaporates fast and droplets can scorch leaves. A deep soak every 2-3 days is better than a light daily sprinkle. Focus on the root zone, not the foliage.',
      },
      {
        heading: 'Shade and mulch',
        body: 'Rig temporary shade cloth or old net curtains over lettuce, spinach and other leafy greens. Mulch all bare soil with 5-8cm of compost, straw or bark to lock in moisture and keep roots cool. Move pots into afternoon shade.',
      },
      {
        heading: 'Signs of heat stress',
        body: 'Wilting in the afternoon is normal and plants usually recover overnight. Persistent wilting by morning means the plant is seriously water-stressed. Scorched leaf edges, blossom drop on tomatoes, and bolting lettuce are all heat-stress signs.',
      },
    ],
    relatedTypes: ['drought_stress'],
  },

  drought_stress: {
    slug: 'drought_stress',
    title: 'Dry Spell Management',
    subtitle: 'Making the most of limited water',
    sections: [
      {
        heading: 'Why now?',
        body: 'No significant rain is expected for several days. As soil moisture drops, plants compete for water and shallow-rooted crops suffer first. Containers dry out fastest.',
      },
      {
        heading: 'Watering priorities',
        body: 'Triage your watering: newly planted, containers, and fruiting crops (tomatoes, beans, courgettes) need water most. Established shrubs and perennials can usually cope. Lawns will go brown but recover when rain returns.',
      },
      {
        heading: 'Water wisely',
        body: 'Water deeply every 2-3 days rather than a light daily sprinkle. Deep watering encourages roots to grow down to where moisture persists. Use a watering can at the base of plants rather than a hose or sprinkler. Water in the evening to reduce evaporation.',
      },
      {
        heading: 'Conserve moisture',
        body: 'Mulch all bare soil - even a thin layer of grass clippings helps. Hoe weeds that compete for water. Group containers together so they shade each other. Consider sinking a cut-off plastic bottle next to thirsty plants and filling it to deliver water directly to the roots.',
      },
      {
        heading: 'Rainwater harvesting',
        body: 'If you do not already have water butts, now is the reminder to install them before autumn. Even a single 200-litre butt on a downpipe can provide several weeks of watering in a dry spell.',
      },
    ],
    relatedTypes: ['heat_stress'],
  },

  // Aliases for weather engine alert types
  caterpillar_conditions: {
    slug: 'caterpillar_conditions',
    title: 'Caterpillars',
    subtitle: 'Managing caterpillar damage on brassicas',
    sections: [
      {
        heading: 'Why now?',
        body: 'Warm, settled weather brings egg-laying butterflies and moths. Cabbage white butterflies are the main culprit, laying clusters of yellow eggs on the undersides of brassica leaves.',
      },
      {
        heading: 'Inspect today',
        body: 'Turn over leaves on cabbages, broccoli, kale and nasturtiums. Look for clusters of yellow eggs or small green caterpillars. Pick off by hand and squash eggs before they hatch.',
      },
      {
        heading: 'Prevention',
        body: 'Cover brassicas with fine mesh or Enviromesh netting to prevent butterflies laying eggs. This is the most effective organic control. Companion planting with nasturtiums can act as a sacrificial trap crop.',
      },
    ],
    relatedTypes: ['aphid_conditions', 'slug_activity'],
  },

  rust_risk: {
    slug: 'rust_risk',
    title: 'Rust Disease',
    subtitle: 'Identifying and managing rust on plants',
    sections: [
      {
        heading: 'Why now?',
        body: 'Rust fungi thrive in warm, humid conditions. Spores spread on the wind and through water splash. Prolonged leaf wetness and crowded planting increase the risk.',
      },
      {
        heading: 'What to look for',
        body: 'Orange, yellow or brown raised pustules on the undersides of leaves. Upper leaf surface may show yellow spots corresponding to the pustules below. Common on roses, hollyhocks, leeks, garlic, and fuchsias.',
      },
      {
        heading: 'Treatment',
        body: 'Remove and destroy affected leaves immediately - do not compost them. Improve air circulation around plants. For severe cases, use a fungicide labelled for rust. On leeks and garlic, trim back affected outer leaves.',
      },
    ],
    relatedTypes: ['powdery_mildew_risk', 'late_blight_risk'],
  },
};

export function getGuidanceForType(type: string): AlertGuidance | null {
  return ALERT_GUIDANCE[type] || null;
}

export function getAllGuidanceSlugs(): string[] {
  return Object.keys(ALERT_GUIDANCE);
}
