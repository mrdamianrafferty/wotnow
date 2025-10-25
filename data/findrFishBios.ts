export interface FishBioEntry {
  species: string;
  bio: string;
}

// Translation is now handled by TranslatedFishBio component using React Context

const RAW_BIOS: FishBioEntry[] = [
  { species: 'Ballan Wrasse', bio: 'Catch me during the day, especially on a flooding tide over kelp and rock. Always hungry — swipe right if you’ve got crab...' },
  { species: 'Black Seabream', bio: 'I can party from dawn and through the day. Swipe right if you’ve got shellfish or worm baits...' },
  { species: 'Brill', bio: 'Find me on dawn/dusk drifts along sandbank edges. Love a moonlit dinner — whole sandeel seals the deal...' },
  { species: 'Cod (Coastal)', bio: 'Catch me when the lights go down; autumn–winter inshore peaks. Bring lug or rag and I’m yours...' },
  { species: 'Common Cuttlefish', bio: 'Shine your love-light in spring. I turn up at dusk and night — swipe right if you’ve got cuttle/squid jigs...' },
  { species: 'Common Ling', bio: 'Catch me at dusk and dark over rough ground year-round. Big on group dates — large fish baits welcome...' },
  { species: 'Common Octopus', bio: 'Catch me at night and low light; autumn–winter peaks in many areas. Egi-style jigs and a tide change are enough...' },
  { species: 'Common Squid', bio: 'Find me at dusk and night under lights. Into jigs — keep it moving...' },
  { species: 'Conger Eel', bio: 'Looking for someone who gets me. I come out at night, year-round. Bonus points if you’ve got whole fish or squid...' },
  { species: 'Cuckoo Wrasse', bio: 'Daylight flirt over broken ground with kelp and boulders. Swipe right if you’ve got a small crab or prawn...' },
  { species: 'Dab', bio: 'Daylight drifter on clean sand. Big on group dates — small worms do nicely...' },
  { species: 'Dentex', bio: 'Daytime hunter over reefs. Let’s keep it casual — lively fish baits and a tide change are enough...' },
  { species: 'Dover Sole', bio: 'I flat-out love the night on clean sand. Swipe right if you’ve got worms...' },
  { species: 'Flathead Grey Mullet', bio: 'Catch me at dawn or evening on calm days. I love a chase… that ends with bread...' },
  { species: 'Flounder', bio: 'Meet me in murky water when the lights go down; autumn–winter is my season. Worms plus a tide change get me...' },
  { species: 'Garfish (Needlefish)', bio: 'Surface socialite by day and dusk; under lights at night too. Not into small talk — only small float baits or tiny lures...' },
  { species: 'Gilthead Seabream', bio: 'On the prowl at dawn/dusk in warm spells. Always hungry — bring crab...' },
  { species: 'Greater Amberjack', bio: 'Dawn and late afternoon, summer into autumn. Into short flings with livebaits...' },
  { species: 'Greater Weever', bio: 'Sunny, calm days over warm sand — dusk works too. Partial to small worms. (Handle with care!)..' },
  { species: 'Grey Mullet', bio: 'Evening and dawn on calm, clear days; sight-feeder by day. Bread course works every time...' },
  { species: 'Haddock', bio: 'Daylight and dusk; inshore is strongest autumn to spring. Big on group dates — a nice worm, please...' },
  { species: 'Herring', bio: 'When the lights go down in winter and spring, I shine. Really into fine nets and small sabikis...' },
  { species: 'Horse Mackerel', bio: 'Dusk to night under lights; first light too. Tiny lures or sabikis — keep it lively...' },
  { species: 'John Dory', bio: 'Daylight stalker on reefs and wrecks (dawn’s a winner). Bonus points if it’s something lively...' },
  { species: 'Little Tunny', bio: 'First light and late afternoon — I’m there when bait showers. Shower me with fancy metals...' },
  { species: 'Mackerel', bio: 'Sun’s out, shoals in; dawn/evening peaks in summer. Sucker for feathers and fast retrieves...' },
  { species: 'Megrim', bio: 'Daytime drifts over clean ground. Love a moonlit supper later — small fish strips are my type...' },
  { species: 'Parrotfish', bio: 'Daylight grazer on clear, calm reefs. Keep it simple — shellfish snacks and we’re good...' },
  { species: 'Plaice', bio: 'Sun on my back by day; I’ll stay out late too. A nice worm works every time...' },
  { species: 'Pollack', bio: 'Dawn/dusk prowler on kelp-topped reefs; overcast days fish great with lures. Soft plastics — take me there...' },
  { species: 'Red Mullet', bio: 'Daytime feeder; dawn on calm, clear days is best. Small worms and a tide nudge — say no more...' },
  { species: 'Red Seabream', bio: 'Sun-lover with serious appetite. Always hungry — bring crab...' },
  { species: 'Saithe (Pollachius virens)', bio: 'Dawn/dusk prowler; overcast days sing with lures. Swipe right for metal jigs...' },
  { species: 'Saithe/Pollock', bio: 'Reef runner at dawn/dusk; overcast lure days are chef’s kiss. Fancy metals? I’m in...' },
  { species: 'Sand Eel', bio: 'Daylight or dusk when my gang runs beaches; under lights in some harbours. Show me tiny sabikis...' },
  { species: 'Sardine', bio: 'Night under lights; dawn when shoals push in. More into fine nets than big rods...' },
  { species: 'Sea Bass', bio: 'On the prowl at dawn/dusk in warm spells or after a blow. Love a chase — end it with crab...' },
  { species: 'Sea Bream (Dorada)', bio: 'Dawn/dusk in the warm months. Not into small talk — bring good crab...' },
  { species: 'Sea Trout', bio: 'Dawn/dusk chaser; at night in clear, calm conditions. Spin me or fly me — your call...' },
  { species: 'Small-spotted Catshark (Dogfish)', bio: 'Night crawler on mixed ground. Love a moonlit dinner — smelly fish or squid, don’t be shy...' },
  { species: 'Spotted Bass', bio: 'Dawn/dusk in warm months; quiet beaches at night. If you’ve got crab, I’m yours...' },
  { species: 'Sprat', bio: 'Winter nights under lights — that’s my vibe. Fine nets and tiny hooks, please...' },
  { species: 'Thornback Ray', bio: 'Dusk/night with a moving tide. Catch me if you can — whole squid works wonders...' },
  { species: 'Tub Gurnard', bio: 'Daytime crosser of banks and patches. Small fish strips or prawn — I won’t say no...' },
  { species: 'Turbot (Small)', bio: 'Dawn/dusk drifts along sandbank shoulders. Whole sandeel gets me every time...' },
  { species: 'Whiting', bio: 'Night and low light, even when it’s cold inshore. Not into small talk — just small strips of mackerel or squid...' },
  { species: 'Wrasse (various)', bio: 'Daylight over kelp and rock, especially on the flood. Love a chase that ends with crab or prawn...' },

  // American Species (100 species)
  { species: 'California Sheephead', bio: "Daylight reef lover with a serious shellfish addiction. Swipe right if you've got crab or urchin." },  
  { species: 'Gag Grouper', bio: 'Dawn/dusk structure hunter autumn to spring. Love a good live bait — mullet or pinfish seal the deal...' },
  { species: 'Sheepshead', bio: 'Daylight dock-dweller with a thing for barnacles. Bring fiddler crabs and I\'m yours...' },
  { species: 'Market Squid', bio: 'Night-shift squad under lights; best when moons dark. Keep it jigging and we\'re good...' },
  { species: 'Mangrove Snapper', bio: 'Dusk/night around structure year-round. Not into small talk — live shrimp works every time...' },
  { species: 'Cubera Snapper', bio: "Dawn/dusk heavyweight on deep reefs. Bonus points if you've got whole live fish." },
  { species: 'Longfin Inshore Squid', bio: 'Night under pier lights spring to fall. Fast jigs, faster retrieves — let\'s keep it lively...' },
  { species: 'Pacific Sierra Mackerel', bio: 'Early morning surface chaser in warm months. Metal spoons and I\'m done for.'},
  { species: 'Red Drum', bio: 'Dawn/dusk in the shallows, especially incoming tide. Love a cut mullet or live crab...' },
  { species: 'Almaco Jack', bio: 'Sunrise and late afternoon summer runs. Livebaits get me every time — don\'t be shy...' },
  { species: 'Vermilion Snapper', bio: 'Daytime and dusk over deep structure. Small cut baits and a moving tide — say no more...' },
  { species: 'Blue Crab', bio: 'Evening and night in eelgrass beds. Chicken necks work, but I\'m worth better...' },
  { species: 'Scalloped Hammerhead', bio: 'Dawn and late afternoon in summer. Big baits, big rewards — whole fish preferred...' },
  { species: 'Permit', bio: 'Daylight flats cruiser on incoming tide. Love a challenge — live crabs are my weakness...' },
  { species: 'American Lobster', bio: 'Night crawler on rocky bottom year-round. Into the chase — bring smelly fish baits...' },
  { species: 'Barred Surfperch', bio: 'Daylight surf dweller when waves are up. Sand crabs or small worms, please...' },
  { species: 'Spanish Mackerel', bio: 'Early morning surface blitz spring to fall. Fast retrieves with small metals — I\'m in...' },
  { species: 'Black Grouper', bio: 'Dawn/dusk on deep reefs and wrecks. Not picky but live bait gets priority...' },
  { species: 'California Yellowtail', bio: 'Sunrise and sunset year-round. Livebaits or jigs — either way, keep it moving...' },
  { species: 'Pacific Bonito', bio: 'Morning surface runs when bait\'s thick. Feathers or metals, fast retrieves only...' },
  { species: 'Redtail Surfperch', bio: 'Daytime surf zone in calm conditions. Small worms or sand crabs work wonders...' },
  { species: 'Manybar Goatfish', bio: 'Daylight bottom browser on sand near reefs. Small shrimp or cut fish — simple as that...' },
  { species: 'Common Thresher', bio: 'Dawn and late afternoon offshore. Whole mackerel or live bait — go big...' },
  { species: 'California Corbina', bio: 'Dawn/dusk surf cruiser on sandy beaches. Blood worms or sand crabs are my jam...' },
  { species: 'Atlantic Tarpon', bio: "Dawn/dusk and night in warm months. Livebaits or flies — show me what you've got..." },
  { species: 'Pacific Dog Snapper', bio: 'Dusk to night around rocky structure. Live or cut bait with a moving tide works...' },
  { species: 'Nassau Grouper', bio: 'Dawn/dusk on reef ledges. Livebaits preferred — whole fish if you\'re serious...' },
  { species: 'Barred Pargo', bio: 'Early morning and late afternoon on rocky reefs. Cut bait or small lures get my attention...' },
  { species: 'Pacific White Seabass', bio: 'Dawn/dusk and night spring to fall. Live squid or sardines — don\'t show up empty-handed...' },
  { species: 'Black Durgon', bio: 'Daylight on deep reefs. Keep it simple — cut fish or squid works fine...' },
  { species: 'Bluefin Trevally', bio: 'Dawn and late afternoon on reef edges. Livebaits or poppers — let\'s make it exciting...' },
  { species: 'Kelp Greenling', bio: 'Daylight kelp dweller with a soft spot for shrimp. Small baits, shallow water — you know the drill...' },
  { species: 'Steelhead', bio: 'Dawn/dusk river runner winter to spring. Flies, lures, or roe — your choice...' },
  { species: 'Yellowtail Snapper', bio: 'Daylight and dusk on reef edges. Small live baits or cut fish — keep it fresh...' },
  { species: 'King Mackerel', bio: 'Early morning trolls spring to fall. Live baits or fast-moving lures — show me speed...' },
  { species: 'Leopard Grouper', bio: 'Dawn/dusk rocky reef specialist. Livebaits preferred but I won\'t turn down cut fish...' },
  { species: 'Blacktip Shark', bio: 'Dawn and late afternoon in warm months. Whole fish or cut baits — the smellier the better...' },
  { species: 'Blue Shark', bio: 'Daylight offshore cruiser summer to fall. Oily fish baits and chum — let\'s go...' },
  { species: 'Black Drum', bio: 'Dawn/dusk bottom feeder on incoming tide. Crab or cut shrimp gets me every time...' },
  { species: 'Bonefish', bio: 'Daylight flats ghost on rising tide. Flies, jigs, or live shrimp — stealth is key...' },
  { species: 'Tiger Shark', bio: 'Dawn/dusk and night year-round. Big baits, big attitude — whole fish welcome...' },
  { species: 'Gulf Grouper', bio: 'Dawn and late afternoon on rocky points. Livebaits preferred — mullet or sardines work...' },
  { species: 'Bull Shark', bio: 'Dawn/dusk in estuaries and surf. Not picky — whole fish or bloody chunks work...' },
  { species: 'Albacore Tuna', bio: 'Early morning offshore summer to fall. Fast trolls or jigs — keep it moving...' },
  { species: 'Cabezon', bio: 'Daylight rocky bottom dweller. Swipe right if you\'ve got shrimp or small fish...' },
  { species: 'Scamp Grouper', bio: 'Dawn/dusk deep reef resident. Livebaits or cut fish with a moving tide — I\'m in...' },
  { species: 'Pacific Sanddab', bio: 'Daylight sandy bottom cruiser. Small cut baits or worms work fine — nothing fancy...' },
  { species: 'Uku', bio: 'Dawn and late afternoon on deep reefs. Small fish or squid strips — keep it simple...' },
  { species: 'Cero Mackerel', bio: 'Early morning reef runner spring to summer. Fast lures or live pilchards seal the deal...' },
  { species: 'Barrelfish', bio: 'Daylight deep drifter over structure. Cut squid or fish — I\'m not complicated...' },
  { species: 'Spotted Seatrout', bio: 'Dawn/dusk in grassy shallows. Live shrimp or soft plastics — either way works...' },
  { species: 'Bigeye Tuna', bio: 'Night shift offshore specialist. Deep jigs or livebaits — go big or go home...' },
  { species: 'Blueline Tilefish', bio: 'Daylight deep bottom dweller. Cut squid or fish strips — simple as that...' },
  { species: 'Blue Marlin', bio: 'Daylight offshore legend summer months. Big lures, bigger baits — show me what you\'ve got...' },
  { species: 'Dungeness Crab', bio: 'Night crawler on sandy/muddy bottom. Fish carcasses work — the stinkier the better...' },
  { species: 'Red Grouper', bio: 'Dawn/dusk bottom structure lover. Livebaits preferred but cut fish works too...' },
  { species: 'Tripletail', bio: 'Daylight drifter near surface structure. Live shrimp or small crabs get my attention...' },
  { species: 'Stone Crab', bio: 'Night forager on hard bottom. Fish heads or chicken — not picky about cuisine...' },
  { species: 'Common Snook', bio: 'Dawn/dusk mangrove cruiser on moving tide. Live pilchards or plugs — let\'s do this....' },
  { species: 'Chinook Salmon', bio: 'Dawn and late afternoon fall to spring. Herring, anchovies, or spoons — show me flash...' },
  { species: 'Chum Salmon', bio: 'Daylight fall runner near river mouths. Streamers or small spoons work fine...' },
  { species: 'Coho Salmon', bio: 'Dawn/dusk fall coastal runs. Spoons, spinners, or herring — keep it shiny...' },
  { species: 'Cobia', bio: 'Dawn/dusk structure cruiser spring to fall. Live eels or large jigs seal the deal...' },
  { species: 'Goliath Grouper', bio: 'Dawn/dusk mega-structure specialist. Not for keeping — catch and admire only...' },
  { species: 'Giant Trevally', bio: 'Dawn and late afternoon on reef edges. Big poppers or livebaits — bring your A-game...' },
  { species: 'Hogfish', bio: 'Daylight sandy reef cruiser. Shrimp or small crabs — nothing complicated...' },
  { species: 'Lingcod', bio: 'Daylight rocky bottom predator. Live or artificial fish — either way, make it big...' },
  { species: 'Jack Crevalle', bio: 'Dawn/dusk power hunter year-round. Topwater plugs or livebait — I love a good fight...' },
  { species: 'Florida Pompano', bio: 'Daylight surf dweller on sandy beaches. Sand fleas or small jigs work wonders...' },
  { species: 'Mahi-mahi', bio: 'Daylight offshore beauty spring to fall. Livebaits, poppers, or flashy lures — surprise me...' },
  { species: 'Pacific Dover Sole', bio: 'Daylight bottom dweller on soft substrate. Small worms or clam strips — keep it simple...' },
  { species: 'Mutton Snapper', bio: 'Dusk and night on reef edges. Live or cut baits with a tide change work...' },
  { species: 'Silver Hake', bio: 'Dusk and night in deeper water. Small cut fish or squid strips do the trick...' },
  { species: 'Winter Flounder', bio: 'Daylight bottom feeder late winter to spring. Bloodworms or clams — classics work...' },
  { species: 'White Marlin', bio: 'Daylight offshore sprinter summer months. Ballyhoo or small lures — keep it fast...' },
  { species: 'Blackfin Tuna', bio: 'Early morning offshore runs year-round. Small jigs or cedar plugs work great...' },
  { species: 'Summer Flounder', bio: 'Daylight and dusk spring to fall. Live minnows or squid strips seal the deal...' },
  { species: 'Golden Tilefish', bio: 'Daylight deep canyon dweller. Cut squid or clams — I\'m not complicated...' },
  { species: 'Atlantic Halibut', bio: 'Daylight deep bottom hunter. Whole fish or large cut baits — go big...' },
  { species: 'Pacific Herring', bio: 'Night runs under lights or dawn schools. Tiny jigs or nets — numbers game...' },
  { species: 'Atlantic Menhaden', bio: 'Daylight schooling filter feeder. Castnet territory — more bait than catch...' },
  { species: 'Striped Marlin', bio: 'Daylight offshore cruiser in warm months. Livebaits or skirted lures — let\'s go fast...' },
  { species: 'Pacific Halibut', bio: 'Daylight deep bottom giant spring to fall. Whole fish or large baits — size matters...' },
  { species: 'Pink Salmon', bio: 'Daylight river runner late summer. Spoons or flies in pink — I\'m on brand...' },
  { species: 'Petrale Sole', bio: 'Daylight soft-bottom cruiser. Anchovies or small worms work fine...' },
  { species: 'Queen Snapper', bio: 'Dusk and night on deep ledges. Cut fish or squid strips with good current...' },
  { species: 'Roosterfish', bio: 'Daylight surf and beach cruiser. Livebaits or poppers — make it exciting...' },
  { species: 'Skipjack Tuna', bio: 'Early morning surface blitz year-round. Small metals or feathers — fast retrieves only...' },
  { species: 'Shortfin Mako', bio: 'Daylight offshore speed demon. Whole mackerel or fast-moving lures — let\'s race...' },
  { species: 'Snowy Grouper', bio: 'Daylight deep structure specialist. Cut fish or squid — depth is everything...' },
  { species: 'Red Snapper', bio: 'Daylight and dusk bottom structure classic. Live or cut baits — can\'t go wrong...' },
  { species: 'Sockeye Salmon', bio: 'Daylight river entry summer to fall. Flies or small spoons in red — it\'s my color...' },
  { species: 'Striped Bass', bio: 'Dawn/dusk coastal cruiser spring and fall. Livebaits, plugs, or eels — I love variety...' },
  { species: 'Swordfish', bio: 'Night shift deep-drop legend. Whole squid or large fish — go deep or go home...' },
  { species: 'Wahoo', bio: 'Early morning offshore speedster. High-speed lures or livebaits — don\'t slow down...' },
  { species: 'Wenchman', bio: 'Dusk and night on deep ledges. Cut fish with good current — timing is key...' },
  { species: 'Wreckfish', bio: 'Daylight deep wreck dweller. Large cut baits or whole fish — depth matters...' },
  { species: 'Warsaw Grouper', bio: 'Dawn/dusk deep structure heavyweight. Whole fish baits — I\'m worth the effort...' },
  { species: 'Yellowedge Grouper', bio: 'Daylight deep canyon resident. Cut squid or fish — depth and patience required...' },
  { species: 'Yellowfin Tuna', bio: 'Daylight offshore powerhouse year-round. Livebaits, poppers, or jigs — show me what you\'ve got...' },
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
