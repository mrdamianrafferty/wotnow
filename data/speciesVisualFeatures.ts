/**
 * Visual identification features for fish species
 * Used by AI fish identification to improve accuracy
 *
 * Each species has 2-3 key distinguishing visual characteristics
 * that are easily visible in photos (shape, pattern, color, fins)
 */

export interface VisualFeatures {
  /** 2-3 key visual features, comma-separated, under 60 chars total */
  features: string;
}

/**
 * Visual features lookup by species name (case-insensitive matching)
 */
export const SPECIES_VISUAL_FEATURES: Record<string, VisualFeatures> = {
  // European/Atlantic species
  'Sea Bass': { features: 'Silver body, spiny dorsal fin, large mouth' },
  'Atlantic Cod': { features: 'Brown-green mottled, chin barbel, 3 dorsal fins' },
  'Mackerel': { features: 'Blue-green striped back, forked tail, streamlined' },
  'Pollock': { features: 'Dark back, pale lateral line, small chin barbel' },
  'Whiting': { features: 'Silver body, black spot at pectoral, small barbel' },
  'Plaice': { features: 'Flat body, orange spots, brown upper side' },
  'Atlantic Salmon': { features: 'Silver sides, black X-shaped spots, forked tail' },
  'Sea Trout': { features: 'Silver body, black X-shaped spots, square tail' },
  'Brill': { features: 'Flat oval body, dark freckles, no tubercles' },
  'Turbot': { features: 'Flat diamond body, bony tubercles, mottled brown' },
  'Flounder': { features: 'Flat body, rough skin, orange spots possible' },
  'Dab': { features: 'Flat body, curved lateral line, rough scales' },
  'Sole': { features: 'Flat elongated body, dark upper, rounded snout' },
  'Bogue': { features: 'Silver elongated body, dark stripes, small mouth' },
  'Two-banded Seabream': { features: 'Silvery, two dark vertical bands, oval body' },
  'Black Seabream': { features: 'Gray-black oval body, spiny dorsal, no stripes' },
  'Gilthead Seabream': { features: 'Gold bar on forehead, silvery, deep body' },
  'Red Seabream': { features: 'Pink-red body, large eyes, humped head' },
  'Conger Eel': { features: 'Long cylindrical body, no pelvic fins, large jaw' },
  'Garfish': { features: 'Long thin body, needle-like jaws, green bones' },
  'Mullet': { features: 'Silver body, two dorsal fins, small mouth' },
  'Painted Comber': { features: 'Orange-brown stripes, blue lines on head, small' },
  'Tope Shark': { features: 'Gray slender body, white underside, pointed snout' },
  'Bull Huss': { features: 'Brown with dark spots, blunt head, rough skin' },
  'Common Smoothhound': { features: 'Gray smooth skin, no spots, rounded snout' },
  'Blue Shark': { features: 'Bright blue top, white underside, long pectorals' },
  'Thresher Shark': { features: 'Long tail (50% length), dark top, huge tail' },
  'Common Stingray': { features: 'Diamond-shaped body, long tail spine, flat' },
  'Thornback Ray': { features: 'Diamond body, thorny spines, spotted pattern' },
  'Cuckoo Ray': { features: 'Diamond body, yellow-orange spots, wavy edges' },
  'Blonde Ray': { features: 'Sandy color, small dark spots, smooth edges' },
  'Common Octopus': { features: 'Eight arms, color-changing skin, round head' },
  'Common Cuttlefish': { features: 'Flat oval body, color-changing, internal shell' },
  'Common Squid': { features: 'Long tubular body, eight arms + two tentacles' },
  'Atlantic Bonito': { features: 'Striped back, streamlined, forked tail' },
  'Albacore Tuna': { features: 'Very long pectoral fins, metallic blue back' },
  'Bluefin Tuna': { features: 'Massive body, short pectorals, dark blue-black' },
  'Bigeye Tuna': { features: 'Large eyes, deep body, yellow finlets' },
  'Yellowfin Tuna': { features: 'Long yellow dorsal/anal fins, yellow sides' },
  'Skipjack Tuna': { features: 'Dark stripes on belly, small size, torpedo body' },
  'Swordfish': { features: 'Long flat sword bill, tall dorsal, no scales' },
  'Spearfish': { features: 'Short rounded bill, tall dorsal, streamlined' },
  'Blue Marlin': { features: 'Long pointed bill, tall dorsal, blue stripes' },
  'White Marlin': { features: 'Rounded bill tip, pale stripes, rounded dorsal' },
  'Blueline Tilefish': { features: 'Blue-green back, yellow spots, long dorsal' },
  'Greater Amberjack': { features: 'Dark stripe through eye, bronze sides, powerful' },
  'Lesser Amberjack': { features: 'Dark stripe through eye, smaller than greater' },
  'Atlantic Horse Mackerel': { features: 'Scutes along lateral line, forked tail, slim' },
  'Atlantic Chub Mackerel': { features: 'Wavy stripes, spotted belly, forked tail' },
  'John Dory': { features: 'Flat body, large black eye-spot, spiny fins' },
  'Red Mullet': { features: 'Red-pink color, two chin barbels, high forehead' },
  'Wrasse': { features: 'Bright colors, thick lips, continuous dorsal' },
  'Ballan Wrasse': { features: 'Large size, mottled green-brown, thick lips' },
  'Corkwing Wrasse': { features: 'Small, dark spot on tail base, colorful' },
  'Goldsinny Wrasse': { features: 'Small, orange-brown, black spot on dorsal' },
  'Blackbelly Rosefish': { features: 'Red-orange body, black peritoneum, spiny' },
  'Barrelfish': { features: 'Dark gray-black, deep body, rounded profile' },
  'Red Porgy': { features: 'Pink-red body, yellow spots, high forehead' },
  'Annular Seabream': { features: 'Silvery, dark tail band, deep body' },

  // North American Atlantic/Gulf species
  'Bluefish': { features: 'Blue-green back, sharp teeth, streamlined aggressive' },
  'Striped Bass': { features: '7-8 horizontal black stripes, silver body' },
  'Red Drum (Redfish)': { features: 'Bronze-red body, black spot(s) on tail base' },
  'Black Drum': { features: 'Gray-black body, chin barbels, high back' },
  'Spotted Seatrout (Speckled Trout)': { features: 'Black spots on back/fins, silver body, soft' },
  'Spanish Mackerel': { features: 'Gold-orange spots, streamlined, forked tail' },
  'King Mackerel': { features: 'No spots on body, lateral line drops, large' },
  'Cero Mackerel': { features: 'Yellow-bronze stripes, streamlined, long' },
  'Atlantic Tarpon': { features: 'Large silver scales, upturned mouth, last ray' },
  'Common Snook': { features: 'Black lateral line, yellow fins, pike-like jaw' },
  'Cobia': { features: 'Dark brown, flat head, white belly, remora-like' },
  'Permit': { features: 'Deep silvery body, black under fins, forked tail' },
  'Bonefish': { features: 'Silver torpedo body, conical snout, forked tail' },
  'Atlantic Croaker': { features: 'Barbels on chin, spots on back, arched back' },
  'Sheepshead': { features: '5-7 dark vertical bars, sheep-like teeth' },
  'Tripletail': { features: 'Three-lobed tail appearance, mottled brown-black' },
  'Hogfish': { features: 'Long snout, first dorsal spines, pink-orange' },
  'Mutton Snapper': { features: 'Blue line under eye, red-orange, black spot' },
  'Lane Snapper': { features: 'Yellow lines, red-pink, black spot' },
  'Mangrove Snapper': { features: 'Gray-red, dark stripe through eye' },
  'Cubera Snapper': { features: 'Large thick lips, reddish, massive size' },
  'Yellowtail Snapper': { features: 'Yellow stripe, yellow tail, streamlined' },
  'Vermilion Snapper': { features: 'Deep red-orange body, short snout, small' },
  'Red Snapper': { features: 'Bright red body, triangular anal fin' },
  'Red Grouper': { features: 'Reddish-brown, blotchy, squared tail' },
  'Black Grouper': { features: 'Dark gray with black blotches, rectangular' },
  'Gag Grouper': { features: 'Gray-brown with worm-like markings' },
  'Goliath Grouper': { features: 'Massive size, brown-yellow, blunt head' },
  'Nassau Grouper': { features: 'Forked tail, vertical bars, color-changing' },
  'Scamp Grouper': { features: 'Brown with grouped spots, yellow fins' },
  'Yellowfin Grouper': { features: 'Red-brown with yellow fins, elongated' },
  'Tiger Grouper': { features: 'Vertical tiger stripes, color-changing' },
  'American Lobster': { features: 'Large claws, greenish-brown, long antennae' },
  'Blue Crab': { features: 'Bright blue claws, H-shaped marking, spines' },
  'Stone Crab': { features: 'Large black-tipped claws, unequal claw size' },
  'Longfin Inshore Squid': { features: 'Fins 2/3 of mantle length, translucent' },

  // Pacific North American species
  'California Halibut': { features: 'Flat both-eyed, mottled brown, large mouth' },
  'California Yellowtail': { features: 'Yellow tail/fins, blue-green back, streamlined' },
  'Pacific Bonito': { features: 'Oblique stripes on back, metallic blue' },
  'Pacific Barracuda': { features: 'Long cylindrical, large jaw with teeth, silvery' },
  'White Seabass (Corvina)': { features: 'Gray-blue back, yellow fins, elongated' },
  'Yellowfin Croaker': { features: 'Yellow fins, wavy lines, small barbels' },
  'Spotfin Croaker': { features: 'Black spot on pectoral, gray-silver' },
  'California Corbina': { features: 'Single chin barbel, metallic blue-gray' },
  'California Sheephead': { features: 'Black head/tail, red mid, white chin (male)' },
  'Kelp Bass': { features: 'Brown-olive with pale blotches, rounded tail' },
  'Barred Sand Bass': { features: 'Vertical gray bars, silvery, tapered' },
  'Giant Sea Bass': { features: 'Massive dark gray-black, humped head' },
  'Lingcod': { features: 'Large mouth with teeth, mottled brown-blue' },
  'Cabezon': { features: 'Large blobby head, mottled brown-red, no scales' },
  'Kelp Greenling': { features: 'Five lateral lines, frilly head cirri, mottled' },
  'Pacific Sanddab': { features: 'Small flat, mottled brown, left-eyed' },
  'California Barracuda': { features: 'Long cylindrical, sharp teeth, silvery' },
  'Pacific Mackerel': { features: 'Blue-green wavy stripes, streamlined' },
  'Pacific Sierra Mackerel': { features: 'Yellow spots on sides, forked tail' },
  'Barred Surfperch': { features: 'Vertical brassy bars, silver, compressed body' },
  'Redtail Surfperch': { features: 'Red-orange tail/pelvic fins, deep body' },
  'Steelhead (Sea-run Rainbow Trout)': { features: 'Pink stripe, black spots, torpedo body' },
  'Chinook Salmon': { features: 'Black mouth/gums, spots on back and tail' },
  'Coho Salmon': { features: 'White gums, black spots on upper tail only' },
  'Chum Salmon': { features: 'No black spots, purple tiger stripes (spawning)' },
  'Pink Salmon': { features: 'Large black oval spots, small scales' },
  'Sockeye Salmon': { features: 'Blue-green back, no spots, red at spawn' },
  'Opaleye': { features: 'Oval gray-green, bright blue eye spot' },
  'Halfmoon': { features: 'Dark blue-black, crescent tail, small head' },
  'Rock Wrasse': { features: 'Mottled brown-red, thick lips, continuous dorsal' },
  'California Scorpionfish': { features: 'Mottled red-brown, spiny head, venomous' },
  'Bocaccio': { features: 'Orange-red rockfish, large mouth, long jaw' },
  'Blue Rockfish': { features: 'Dark blue-black, yellow mottling on sides' },
  'Copper Rockfish': { features: 'Copper-orange, white blotch on rear, pink fins' },
  'Vermilion Rockfish': { features: 'Bright red-orange, rough scales, large eyes' },
  'Yelloweye Rockfish': { features: 'Yellow eyes, red-orange body, rough head' },
  'Black Rockfish': { features: 'Black-gray with white mottling, spiny fins' },
  'Dungeness Crab': { features: 'Purple-brown shell, white-tipped claws, 10 points' },
  'Market Squid': { features: 'Translucent, fins 50% of mantle, torpedo body' },
  'California Spiny Lobster': { features: 'No claws, long antennae, red-brown spiny' },
  'Common Thresher': { features: 'Tail same length as body, large pectoral fins' },
  'Pacific Dog Snapper': { features: 'Large canine teeth, silvery with yellow' },
  'Leopard Grouper (Cabrilla)': { features: 'Red-brown with dark spots, thick lips' },
  'Gulf Grouper': { features: 'Mottled brown-gray, massive head, thick body' },
  'Almaco Jack (Kahala)': { features: 'Deep body, amber-brown, long anal fin' },
  'Barred Pargo': { features: 'Vertical dark bars, deep body, snapper-like' },

  // Hawaiian species
  'Giant Trevally (Ulua)': { features: 'Massive silver-black, steep forehead, powerful' },
  'Bluefin Trevally (Omilu)': { features: 'Blue fins, yellow-green body, steep head' },
  'Uku (Green Jobfish)': { features: 'Blue-green back, pink belly, snapper-shaped' },
  'Manybar Goatfish': { features: 'Red-pink with dark bars, two chin barbels' },
  'Mahi-mahi (Dolphinfish)': { features: 'Brilliant blue-green-yellow, blunt head (male)' },
  'Wahoo (Ono)': { features: 'Vertical blue bars, long slender, sharp teeth' },
  'Black Durgon (Triggerfish)': { features: 'Black body, blue lines on head, compressed' },

  // Sharks
  'Blacktip Shark': { features: 'Black-tipped fins, bronze-gray body, streamlined' },
  'Bull Shark': { features: 'Blunt snout, stout gray body, no markings' },
  'Tiger Shark': { features: 'Dark tiger stripes, blunt snout, large size' },
  'Hammerhead Shark': { features: 'Hammer-shaped head, gray body, tall dorsal' },
  'Scalloped Hammerhead': { features: 'Scalloped front edge on hammer, tall dorsal' },
  'Great White Shark': { features: 'Conical snout, black eyes, huge size' },
  'Mako Shark': { features: 'Pointed snout, metallic blue, visible teeth' },
  'Sandbar Shark': { features: 'Very tall first dorsal, rounded snout, gray' },
  'Lemon Shark': { features: 'Yellow-brown, two similar-sized dorsals, blunt snout' },
  'Nurse Shark': { features: 'Catfish-like barbels, small eyes, sluggish brown' },

  // Generic/unknown fallback
  'Unknown': { features: 'Unable to identify from image quality or angle' },
};

/**
 * Get visual features for a species name (case-insensitive)
 * Returns generic features if species not found
 */
export function getVisualFeatures(speciesName: string): string {
  // Direct lookup
  if (SPECIES_VISUAL_FEATURES[speciesName]) {
    return SPECIES_VISUAL_FEATURES[speciesName].features;
  }

  // Case-insensitive lookup
  const normalizedName = speciesName.toLowerCase();
  for (const [key, value] of Object.entries(SPECIES_VISUAL_FEATURES)) {
    if (key.toLowerCase() === normalizedName) {
      return value.features;
    }
  }

  // Partial match (e.g., "Atlantic Mackerel" matches "Mackerel")
  for (const [key, value] of Object.entries(SPECIES_VISUAL_FEATURES)) {
    if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
      return value.features;
    }
  }

  // Fallback: return body shape hint
  return 'Look at body shape, fin structure, color patterns';
}
