export interface FishBioEntry {
  species: string;
  bio: string;
}

// Translation is now handled by TranslatedFishBio component using React Context

const RAW_BIOS: FishBioEntry[] = [
  { species: 'Ballan Wrasse', bio: 'Catch me during the day, especially on a flooding tide over kelp and rock. Always hungry — swipe right if you’ve got crab.' },
  { species: 'Black Seabream', bio: 'I can party from dawn and through the day. Swipe right if you’ve got shellfish or worm baits.' },
  { species: 'Brill', bio: 'Find me on dawn/dusk drifts along sandbank edges. Love a moonlit dinner — whole sandeel seals the deal.' },
  { species: 'Cod (Coastal)', bio: 'Catch me when the lights go down; autumn–winter inshore peaks. Bring lug or rag and I’m yours.' },
  { species: 'Common Cuttlefish', bio: 'Shine your love-light in spring. I turn up at dusk and night — swipe right if you’ve got cuttle/squid jigs.' },
  { species: 'Common Ling', bio: 'Catch me at dusk and dark over rough ground year-round. Big on group dates — large fish baits welcome.' },
  { species: 'Common Octopus', bio: 'Catch me at night and low light; autumn–winter peaks in many areas. Egi-style jigs and a tide change are enough.' },
  { species: 'Common Squid', bio: 'Find me at dusk and night under lights. Into jigs — keep it moving.' },
  { species: 'Conger Eel', bio: 'Looking for someone who gets me. I come out at night, year-round. Bonus points if you’ve got whole fish or squid.' },
  { species: 'Cuckoo Wrasse', bio: 'Daylight flirt over broken ground with kelp and boulders. Swipe right if you’ve got a small crab or prawn.' },
  { species: 'Dab', bio: 'Daylight drifter on clean sand. Big on group dates — small worms do nicely.' },
  { species: 'Dentex', bio: 'Daytime hunter over reefs. Let’s keep it casual — lively fish baits and a tide change are enough.' },
  { species: 'Dover Sole', bio: 'I flat-out love the night on clean sand. Swipe right if you’ve got worms.' },
  { species: 'Flathead Grey Mullet', bio: 'Catch me at dawn or evening on calm days. I love a chase… that ends with bread.' },
  { species: 'Flounder', bio: 'Meet me in murky water when the lights go down; autumn–winter is my season. Worms plus a tide change get me.' },
  { species: 'Garfish (Needlefish)', bio: 'Surface socialite by day and dusk; under lights at night too. Not into small talk — only small float baits or tiny lures.' },
  { species: 'Gilthead Seabream', bio: 'On the prowl at dawn/dusk in warm spells. Always hungry — bring crab.' },
  { species: 'Greater Amberjack', bio: 'Dawn and late afternoon, summer into autumn. Into short flings with livebaits.' },
  { species: 'Greater Weever', bio: 'Sunny, calm days over warm sand — dusk works too. Partial to small worms. (Handle with care!)' },
  { species: 'Grey Mullet', bio: 'Evening and dawn on calm, clear days; sight-feeder by day. Bread course works every time.' },
  { species: 'Haddock', bio: 'Daylight and dusk; inshore is strongest autumn to spring. Big on group dates — a nice worm, please.' },
  { species: 'Herring', bio: 'When the lights go down in winter and spring, I shine. Really into fine nets and small sabikis.' },
  { species: 'Horse Mackerel', bio: 'Dusk to night under lights; first light too. Tiny lures or sabikis — keep it lively.' },
  { species: 'John Dory', bio: 'Daylight stalker on reefs and wrecks (dawn’s a winner). Bonus points if it’s something lively.' },
  { species: 'Little Tunny', bio: 'First light and late afternoon — I’m there when bait showers. Shower me with fancy metals.' },
  { species: 'Mackerel', bio: 'Sun’s out, shoals in; dawn/evening peaks in summer. Sucker for feathers and fast retrieves.' },
  { species: 'Megrim', bio: 'Daytime drifts over clean ground. Love a moonlit supper later — small fish strips are my type.' },
  { species: 'Parrotfish', bio: 'Daylight grazer on clear, calm reefs. Keep it simple — shellfish snacks and we’re good.' },
  { species: 'Plaice', bio: 'Sun on my back by day; I’ll stay out late too. A nice worm works every time.' },
  { species: 'Pollack', bio: 'Dawn/dusk prowler on kelp-topped reefs; overcast days fish great with lures. Soft plastics — take me there.' },
  { species: 'Red Mullet', bio: 'Daytime feeder; dawn on calm, clear days is best. Small worms and a tide nudge — say no more.' },
  { species: 'Red Seabream', bio: 'Sun-lover with serious appetite. Always hungry — bring crab.' },
  { species: 'Saithe (Pollachius virens)', bio: 'Dawn/dusk prowler; overcast days sing with lures. Swipe right for metal jigs.' },
  { species: 'Saithe/Pollock', bio: 'Reef runner at dawn/dusk; overcast lure days are chef’s kiss. Fancy metals? I’m in.' },
  { species: 'Sand Eel', bio: 'Daylight or dusk when my gang runs beaches; under lights in some harbours. Show me tiny sabikis.' },
  { species: 'Sardine', bio: 'Night under lights; dawn when shoals push in. More into fine nets than big rods.' },
  { species: 'Sea Bass', bio: 'On the prowl at dawn/dusk in warm spells or after a blow. Love a chase — end it with crab.' },
  { species: 'Sea Bream (Dorada)', bio: 'Dawn/dusk in the warm months. Not into small talk — bring good crab.' },
  { species: 'Sea Trout', bio: 'Dawn/dusk chaser; at night in clear, calm conditions. Spin me or fly me — your call.' },
  { species: 'Small-spotted Catshark (Dogfish)', bio: 'Night crawler on mixed ground. Love a moonlit dinner — smelly fish or squid, don’t be shy.' },
  { species: 'Spotted Bass', bio: 'Dawn/dusk in warm months; quiet beaches at night. If you’ve got crab, I’m yours.' },
  { species: 'Sprat', bio: 'Winter nights under lights — that’s my vibe. Fine nets and tiny hooks, please.' },
  { species: 'Thornback Ray', bio: 'Dusk/night with a moving tide. Catch me if you can — whole squid works wonders.' },
  { species: 'Tub Gurnard', bio: 'Daytime crosser of banks and patches. Small fish strips or prawn — I won’t say no.' },
  { species: 'Turbot (Small)', bio: 'Dawn/dusk drifts along sandbank shoulders. Whole sandeel gets me every time.' },
  { species: 'Whiting', bio: 'Night and low light, even when it’s cold inshore. Not into small talk — just small strips of mackerel or squid.' },
  { species: 'Wrasse (various)', bio: 'Daylight over kelp and rock, especially on the flood. Love a chase that ends with crab or prawn.' },
];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function registerKey(map: Record<string, string>, key: string, bio: string) {
  if (!key || map[key]) return;
  map[key] = bio.trim();
}

const FINDR_FISH_BIOS: Record<string, string> = RAW_BIOS.reduce<Record<string, string>>((acc, entry) => {
  const variants = new Set<string>();
  variants.add(entry.species);

  const noParens = entry.species.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (noParens !== entry.species) {
    variants.add(noParens);
  }

  if (entry.species.includes('/')) {
    entry.species
      .split('/')
      .map((part) => part.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim())
      .forEach((part) => {
        if (part) variants.add(part);
      });
  }

  variants.forEach((variant) => {
    const normalized = normalizeKey(variant);
    registerKey(acc, normalized, entry.bio);
  });

  return acc;
}, {});

export function getFindrFishBio(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const normalized = normalizeKey(name);
  if (!normalized) return undefined;
  return FINDR_FISH_BIOS[normalized];
}

export const findrFishBios = FINDR_FISH_BIOS;
