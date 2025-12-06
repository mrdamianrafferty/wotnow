// apps/findr-web/lib/ethics/speciesEthics.ts

export type EthicalTier = 0 | 1 | 2;

export type EthicalProfile =
  | 'general_finfish'
  | 'deep_benthic'
  | 'shark_ray'
  | 'big_game'
  | 'salmonid'
  | 'invertebrate';

export interface EthicalGuidance {
  headline: string;
  summary: string;
  tips: string[];
}

// Base guidance matrix – tweak copy as you like.
// You can extend this later per-profile if you want different summaries per profile.
export const ETHICS_MATRIX: Record<
  EthicalTier,
  Record<EthicalProfile, EthicalGuidance>
> = {
  0: {
    general_finfish: {
      headline: 'Low concern – still worth treating kindly',
      summary:
        'This species is not currently flagged as threatened at a global level. You can usually keep fish within local rules, but good handling still helps released fish survive and keeps stocks healthy.',
      tips: [
        'Use barbless or circle hooks where you can – they hook in the mouth more often and come out quickly.',
        'Land fish promptly on tackle that is not under-gunned – long, exhausting fights increase delayed mortality.',
        'Wet your hands and nets before touching a fish so you do not strip its protective slime.',
        'Keep fish in the water for unhooking where possible; if you lift them, support head and belly and limit air exposure to a few seconds.',
        'Never squeeze gills or eyes, and avoid dropping fish onto rocks, sand, or decks.',
      ],
    },
    deep_benthic: {
      headline: 'Deep-reef species – handle gently and think depth',
      summary:
        'Deep-living reef and bottom species are more vulnerable to barotrauma when brought up from depth. Careful release methods can make a big difference to survival.',
      tips: [
        'If fish are bloated, cannot swim down, or have stomachs protruding, they are showing barotrauma from depth.',
        'Use a descending device or release weight to return affected fish to depth quickly.',
        'Only vent fish where recommended and when clear signs of barotrauma are present; follow local guidance on technique.',
        'Avoid repeated drops on the same deep mark if you are seeing lots of undersized fish.',
      ],
    },
    shark_ray: {
      headline: 'Sharks and rays – maximum respect handling',
      summary:
        'Sharks and rays are slow-growing and easy to injure when landed. Even when stocks are stable, good handling makes a huge difference.',
      tips: [
        'Avoid gaffs for any shark or ray you plan to release; use strong leaders and a de-hooker or big net instead.',
        'Where possible, keep them in the water at the side of the boat or in the surf while you unhook.',
        'If you must bring one on board, use a cool, wet, soft surface and support the body – never lift by tail alone.',
        'Keep handling time to an absolute minimum and release facing tide or waves so water flows through the gills.',
      ],
    },
    big_game: {
      headline: 'Big gamefish – heavy tackle, quick release',
      summary:
        'Large pelagic gamefish can be robust, but long fights and rough handling still increase mortality. Fish heavy, unhook quickly, and get them moving again fast.',
      tips: [
        'Use tackle that lets you fight fish hard and finish quickly rather than under-gunning for sport.',
        'Keep big fish in the water alongside the boat where you can, and avoid dragging them fully on board.',
        'Support head and belly if you must lift a fish; do not hang heavy fish vertically from the jaw.',
        'Have cameras ready so air exposure is kept to a few seconds, not minutes.',
      ],
    },
    salmonid: {
      headline: 'Cool-water river fish – temperature-sensitive',
      summary:
        'Salmon, trout, and other cool-water river fish are extra sensitive to water temperature and handling. Short fights and gentle releases matter most.',
      tips: [
        'Avoid targeting them in very warm, low-flow conditions – recovery is much harder.',
        'Use single, barbless hooks and firm tackle to shorten the fight.',
        'Keep fish in the water in a wetted net; lift just briefly for a photo, then return them.',
        'Revive fish facing upstream in the current until they kick away strongly.',
      ],
    },
    invertebrate: {
      headline: 'Crabs, lobsters, and squid – rules and respect',
      summary:
        'For shellfish and cephalopods, size limits, sex rules, and quick dispatch matter more than classic catch-and-release.',
      tips: [
        'Respect size, sex, and berried-female rules – big breeders are vital for future stocks.',
        'Dispatch any kept animals quickly and humanely; do not leave them to slowly suffocate in the sun.',
        'Avoid ghost gear – check pots regularly and recover lost lines and traps when you can.',
        'Return unwanted bycatch gently and as close as possible to where it was caught.',
      ],
    },
  },
  1: {
    general_finfish: {
      headline: 'Under pressure – lean towards catch and release',
      summary:
        'This species is under some conservation pressure. Selective harvest may still be allowed, but releasing fish in good condition is the best default.',
      tips: [
        'Treat keep limits as a maximum, not a target – only keep what you will actually eat.',
        'Prioritise barbless or circle hooks and quick unhooking to reduce injury.',
        'Minimise air exposure – have tools and camera ready before lifting fish.',
        'Avoid heavily hammering the same small area when you are finding lots of similar-sized fish.',
      ],
    },
    deep_benthic: {
      headline: 'Deep-reef under pressure – descend or let them be',
      summary:
        'Deep bottom species under pressure are easily lost to barotrauma. If you are seeing many small fish, it is often kinder to move on.',
      tips: [
        'Stop or move if you are steadily catching undersized or out-of-season deep fish.',
        'Use descending devices as standard for deep releases; barotrauma kills slowly when fish cannot get back down.',
        'Keep drop times and playing time short to reduce stress and gas expansion.',
        'Consider fishing shallower structure or different techniques when conditions make deep releases risky.',
      ],
    },
    shark_ray: {
      headline: 'Sharks and rays of concern – gentle release only',
      summary:
        'This shark or ray is under pressure in parts of its range. Treat every capture as release-only unless local rules clearly say otherwise.',
      tips: [
        'Plan ahead with heavy tackle, long-nose pliers, and a safe work area at water level.',
        'Avoid lifting larger animals fully clear of the water; unhook beside the boat or in the shallows where possible.',
        'Cut the trace close to the hook rather than wrestling deep hooks in the throat.',
        'Keep photos fast and keep hands away from gills, spiracles, and eyes.',
      ],
    },
    big_game: {
      headline: 'Iconic gamefish – release is usually best',
      summary:
        'Large, slow-growing gamefish under pressure are best treated as release-only trophies. When harvest is allowed, keep it rare and meaningful.',
      tips: [
        'Move on after one good fish rather than filling the deck with the same species.',
        'Ask yourself if today really needs a kill fish, or if a photo and a story will do.',
        'Use non-offset circle hooks for bait where recommended to reduce deep hooking.',
        'Revive fish thoroughly beside the boat before letting them go.',
      ],
    },
    salmonid: {
      headline: 'Salmonids under pressure – protect each run',
      summary:
        'Wild salmon and sea trout stocks are fragile in many rivers. Handle them as if every fish matters to the future of the run.',
      tips: [
        'Treat catch-and-release as the default for wild fish even where a small kill quota exists.',
        'Avoid dragging fish onto banks or gravel; keep them in the water in a soft net.',
        'Use knotless meshes and barbless singles to minimise scale and fin damage.',
        'Skip sessions in extreme heat or drought when survival odds are low.',
      ],
    },
    invertebrate: {
      headline: 'Vulnerable shellfish – selective harvest',
      summary:
        'Some shellfish stocks are under local pressure. Take only what you need and leave big breeders and berried females to carry the stock.',
      tips: [
        'Be strict about returning berried females and oversize “trophy” animals.',
        'Spread effort rather than hammering the same small patch of ground.',
        'Check local closures and protected areas for invertebrates before setting pots or diving.',
        'Avoid leaving gear unattended for long periods – soak time matters.',
      ],
    },
  },
  2: {
    general_finfish: {
      headline: 'High-concern species – release strongly recommended',
      summary:
        'This species is considered threatened or highly vulnerable in parts of its range. Keeping one may be legal in some places, but releasing them in top condition is the best default.',
      tips: [
        'Treat every fish as release-only unless local guidance clearly says otherwise.',
        'Avoid specifically targeting them where stocks are known to be weak.',
        'Handle as little as possible; unhook in the water if you can.',
        'Share your knowledge with other anglers – polite peer pressure helps.',
      ],
    },
    deep_benthic: {
      headline: 'Threatened deepwater fish – think twice before dropping',
      summary:
        'Deepwater species that are already under pressure are very hard to release safely. In many cases the kindest option is not to target them deliberately.',
      tips: [
        'Avoid depths where barotrauma makes survival unlikely for release-only fish.',
        'When bycatch happens, use descending gear immediately and minimise handling.',
        'Consider moving spots or changing tactics if you keep hitting the same vulnerable species.',
        'Stay on top of closures and depth restrictions designed to protect deepwater stocks.',
      ],
    },
    shark_ray: {
      headline: 'Threatened sharks and rays – strictly catch and release',
      summary:
        'This shark or ray is classed as threatened. Many regions require release by law; even where they do not, ethical practice is release-only.',
      tips: [
        'Use tackle and rigs designed for quick, clean release: strong gear, simple traces, non-offset circles where recommended.',
        'Keep animals in the water and avoid hauling large individuals onto piers or rocks.',
        'Cut heavy mono or wire close to the hook if unhooking is risky for you or the fish.',
        'Support campaigns and regulations that protect critical nursery and pupping grounds.',
      ],
    },
    big_game: {
      headline: 'Threatened big gamefish – photo, not fillet',
      summary:
        'Large pelagic species in this group are high-value and often high-risk from a conservation point of view. The responsible choice is usually a quick photo and a strong release.',
      tips: [
        'Skip gaffs and flying gaffs for any fish you plan to let go; use release tools or tail ropes.',
        'Keep the fish in the water for tagging, measuring, and photos whenever possible.',
        'Limit boat traffic and fight time around tired fish to reduce shark predation on release.',
        'Treat any harvest allowance as a last resort, not a target to fill.',
      ],
    },
    salmonid: {
      headline: 'Threatened salmonids – handle as if each fish is critical',
      summary:
        'Wild runs of this species are in trouble in many catchments. Thoughtful handling and voluntary release policies can genuinely help.',
      tips: [
        'Do not fish fragile rivers in extreme conditions – low flows and heat stack the odds against fish.',
        'Use barbless singles and soft nets, and keep fish in the water even for photos when possible.',
        'Support local conservation rules and voluntary codes; they exist for a reason.',
        'Report tagged or injured fish to local biologists where schemes are in place.',
      ],
    },
    invertebrate: {
      headline: 'At-risk shellfish – harvest only if rules say so',
      summary:
        'Some shellfish and crustaceans are heavily overfished or locally protected. When in doubt, err on the side of returning them and reducing pot pressure.',
      tips: [
        'Respect closed seasons, no-take zones, and slot limits designed to rebuild stocks.',
        'Use escape gaps and biodegradable fasteners in pots to reduce ghost fishing.',
        'Return large, old breeders and berried females even where it is legal to keep them.',
        'Consider alternative targets if your favourite ground is clearly depleted.',
      ],
    },
  },
};

export function resolveEthicalTierFromStatus(conservationStatus?: string | null): EthicalTier {
  if (!conservationStatus) return 0;

  const status = conservationStatus.trim().toUpperCase();

  // Treat Vulnerable, Endangered and Critically Endangered as highest caution
  if (status.startsWith('CR') || status.startsWith('EN') || status.startsWith('VU')) {
    return 2;
  }

  // Near Threatened gets a mid-tier caution
  if (status.startsWith('NT')) {
    return 1;
  }

  // Least Concern / Not Evaluated / Data Deficient fall back to baseline
  return 0;
}

interface SpeciesEthicsInput {
  conservationStatus?: string | null;
  profileOverride?: EthicalProfile | null;
}

/**
 * Resolve an ethical guidance bundle for a given species.
 * For now we primarily key off conservation status and let callers
 * optionally override the profile (e.g. shark_ray, deep_benthic).
 */
export function getEthicalGuidanceForSpecies(
  input: SpeciesEthicsInput
): { tier: EthicalTier; profile: EthicalProfile; guidance: EthicalGuidance } {
  const tier = resolveEthicalTierFromStatus(input.conservationStatus);
  const profile: EthicalProfile = input.profileOverride ?? 'general_finfish';

  const tierMap = ETHICS_MATRIX[tier] ?? ETHICS_MATRIX[0];
  const guidance = tierMap[profile] ?? tierMap['general_finfish'];

  return { tier, profile, guidance };
}